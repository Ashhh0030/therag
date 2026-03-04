// server.js
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const http = require('http'); 
const { Server } = require('socket.io'); 

const app = express();
const server = http.createServer(app); 
const io = new Server(server); 
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// --- MONGODB CONNECTION ---
mongoose.connect('mongodb://127.0.0.1:27017/therasense_db')
    .then(() => {
        console.log('✅ Connected to MongoDB successfully.');
        createDefaultAccounts();
    })
    .catch(err => console.error('❌ MongoDB connection error:', err));

// --- SCHEMAS ---
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'therapist', 'patient'], required: true },
    therapistId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } // Ties patients to a therapist
});
const User = mongoose.model('User', userSchema);

const sessionLogSchema = new mongoose.Schema({
    roomId: String,
    therapistId: String, // Ties the log to the therapist
    startTime: { type: Date, default: Date.now },
    endTime: Date,
    emotions: [{
        timestamp: { type: Date, default: Date.now },
        expressions: Object,
        image: String 
    }]
});
const SessionLog = mongoose.model('SessionLog', sessionLogSchema);

const settingSchema = new mongoose.Schema({ snapshotsEnabled: { type: Boolean, default: true } });
const Setting = mongoose.model('Setting', settingSchema);

const activeSessions = {}; 

// --- SETUP DEFAULTS ---
async function createDefaultAccounts() {
    // Admin setup
    const admin = await User.findOne({ username: 'admin' });
    if (!admin) await User.create({ username: 'admin', password: 'adminahh', role: 'admin' });
    
    // Therapist setup
    const therapist = await User.findOne({ username: 'therapist' });
    if (!therapist) await User.create({ username: 'therapist', password: '123', role: 'therapist' });

    // Settings setup
    const setting = await Setting.findOne();
    if (!setting) await Setting.create({ snapshotsEnabled: true });
}

// --- API ROUTES ---

// 1. Login (Returns settings too)
// 1. Login (Allows Admin to log in via Therapist tab)
app.post('/api/login', async (req, res) => {
    try {
        const { username, password, role } = req.body;
        // Find user by username and password only
        const user = await User.findOne({ username, password });
        
        if (user) {
            // Allow login if roles match, OR if an admin is logging in via the therapist tab
            if (user.role === role || (user.role === 'admin' && role === 'therapist')) {
                const setting = await Setting.findOne();
                res.json({ success: true, user: { id: user._id, username: user.username, role: user.role }, snapshotsEnabled: setting.snapshotsEnabled });
            } else {
                res.status(401).json({ success: false, message: 'Invalid role for this user' });
            }
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
});

// 2. Get Patients (Admin gets all, Therapist gets only theirs)
app.get('/api/patients', async (req, res) => {
    try {
        const filter = req.query.therapistId ? { role: 'patient', therapistId: req.query.therapistId } : { role: 'patient' };
        const patients = await User.find(filter, 'username _id');
        res.json({ success: true, patients });
    } catch (error) { res.status(500).json({ success: false, message: 'Database error' }); }
});

// 3. Create Patient (Tied to therapist)
app.post('/api/patients', async (req, res) => {
    try {
        const { username, password, therapistId } = req.body;
        const newPatient = await User.create({ username, password, role: 'patient', therapistId });
        res.json({ success: true, id: newPatient._id, username: newPatient.username });
    } catch (error) { res.status(400).json({ success: false, message: 'Username already exists' }); }
});

// 4. Create Therapist (Admin Only)
app.post('/api/therapists', async (req, res) => {
    try {
        const { username, password } = req.body;
        await User.create({ username, password, role: 'therapist' });
        res.json({ success: true });
    } catch (error) { res.status(400).json({ success: false, message: 'Username already exists' }); }
});

// 5. Get Sessions (Admin gets all, Therapist gets only theirs)
app.get('/api/sessions', async (req, res) => {
    try {
        const filter = req.query.therapistId ? { therapistId: req.query.therapistId } : {};
        const sessions = await SessionLog.find(filter).sort({ startTime: -1 });
        res.json({ success: true, sessions });
    } catch (error) { res.status(500).json({ success: false, message: 'Database error' }); }
});

// 6. Delete Session Log
app.delete('/api/sessions/:id', async (req, res) => {
    try {
        await SessionLog.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) { res.status(500).json({ success: false, message: 'Database error' }); }
});

// 7. Toggle Snapshots (Admin Only)
app.post('/api/settings/snapshots', async (req, res) => {
    try {
        await Setting.updateOne({}, { snapshotsEnabled: req.body.enabled });
        res.json({ success: true });
    } catch (error) { res.status(500).json({ success: false }); }
});

// --- WEBRTC & SOCKET LOGIC ---
io.on('connection', (socket) => {
    socket.on('join-room', (data) => {
        socket.join(data.roomId);
        socket.to(data.roomId).emit('user-joined', socket.id);
        
        if (!activeSessions[data.roomId]) {
            activeSessions[data.roomId] = { roomId: data.roomId, startTime: new Date(), emotions: [] };
        }
        if (data.therapistId) activeSessions[data.roomId].therapistId = data.therapistId;
    });

    socket.on('emotion-update', (data) => {
        if (activeSessions[data.room]) {
            activeSessions[data.room].emotions.push({ timestamp: new Date(), expressions: data.expressions, image: data.image });
        }
    });

    socket.on('end-session', async (roomId) => {
        if (activeSessions[roomId]) {
            activeSessions[roomId].endTime = new Date();
            try { await SessionLog.create(activeSessions[roomId]); } catch (e) { console.error('Save failed', e); }
            delete activeSessions[roomId];
        }
    });

    socket.on('offer', (data) => socket.to(data.room).emit('offer', data));
    socket.on('answer', (data) => socket.to(data.room).emit('answer', data));
    socket.on('ice-candidate', (data) => socket.to(data.room).emit('ice-candidate', data));
});

server.listen(PORT, () => console.log(`🚀 TheraSense running on http://localhost:${PORT}`));