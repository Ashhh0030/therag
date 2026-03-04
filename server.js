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
        createDefaultTherapist();
    })
    .catch(err => console.error('❌ MongoDB connection error:', err));

// --- USER SCHEMA ---
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['therapist', 'patient'], required: true },
    therapistId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

const User = mongoose.model('User', userSchema);

// --- NEW: SESSION LOG SCHEMA ---
const sessionLogSchema = new mongoose.Schema({
    roomId: String,
    startTime: { type: Date, default: Date.now },
    endTime: Date,
    emotions: [{
        timestamp: { type: Date, default: Date.now },
        expressions: Object, // Stores { happy: 0.9, sad: 0.01, etc. }
        image: String // NEW: Will store the Base64 image snapshot
    }]
});

const SessionLog = mongoose.model('SessionLog', sessionLogSchema);

// In-memory storage to hold the live data until the session ends
const activeSessions = {}; 

async function createDefaultTherapist() {
    const existing = await User.findOne({ username: 'therapist' });
    if (!existing) {
        await User.create({ username: 'therapist', password: '123', role: 'therapist' });
        console.log('✅ Default therapist account created with password "123".');
    } else if (existing.password !== '123') {
        existing.password = '123';
        await existing.save();
        console.log('🔄 Default therapist password updated to "123".');
    }
}

// --- API ROUTES ---
app.post('/api/login', async (req, res) => {
    try {
        const { username, password, role } = req.body;
        const user = await User.findOne({ username, password, role });
        if (user) res.json({ success: true, user: { id: user._id, username: user.username, role: user.role } });
        else res.status(401).json({ success: false, message: 'Invalid credentials' });
    } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
});

app.get('/api/patients', async (req, res) => {
    try {
        const patients = await User.find({ role: 'patient' }, 'username _id');
        res.json({ success: true, patients });
    } catch (error) { res.status(500).json({ success: false, message: 'Database error' }); }
});

app.post('/api/patients', async (req, res) => {
    try {
        const { username, password } = req.body;
        const newPatient = await User.create({ username, password, role: 'patient' });
        res.json({ success: true, id: newPatient._id, username: newPatient.username });
    } catch (error) {
        if (error.code === 11000) return res.status(400).json({ success: false, message: 'Username already exists' });
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// 4. Get ALL session logs (for the Analytics Dashboard)
app.get('/api/sessions', async (req, res) => {
    try {
        // Fetch all sessions, newest first
        const sessions = await SessionLog.find().sort({ startTime: -1 });
        res.json({ success: true, sessions });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

// 5. Delete a specific session log
app.delete('/api/sessions/:id', async (req, res) => {
    try {
        await SessionLog.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

// --- WEBRTC SIGNALING & DATA LOGGING (SOCKET.IO) ---
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Join a specific consultation room
    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        socket.to(roomId).emit('user-joined', socket.id);
        
        // Start recording the session if it hasn't started yet
        if (!activeSessions[roomId]) {
            activeSessions[roomId] = {
                roomId: roomId,
                startTime: new Date(),
                emotions: []
            };
            console.log(`⏺️ Started recording data for room: ${roomId}`);
        }
    });

    // Receive live emotion data from the Therapist's AI
    // Receive live emotion data from the Therapist's AI
    socket.on('emotion-update', (data) => {
        if (activeSessions[data.room]) {
            activeSessions[data.room].emotions.push({
                timestamp: new Date(),
                expressions: data.expressions,
                image: data.image || null // NEW: Save the image if one was sent this frame
            });
        }
    });

    // Save the massive data log to MongoDB when the session ends
    socket.on('end-session', async (roomId) => {
        if (activeSessions[roomId]) {
            activeSessions[roomId].endTime = new Date();
            
            try {
                // Dump the entire memory array into the database at once!
                await SessionLog.create(activeSessions[roomId]);
                console.log(`✅ Session log permanently saved for room: ${roomId}`);
            } catch (error) {
                console.error('❌ Failed to save session log:', error);
            }
            
            // Clear the temporary memory
            delete activeSessions[roomId];
        }
    });

    // Relay WebRTC Handshake Data
    socket.on('offer', (data) => socket.to(data.room).emit('offer', data));
    socket.on('answer', (data) => socket.to(data.room).emit('answer', data));
    socket.on('ice-candidate', (data) => socket.to(data.room).emit('ice-candidate', data));

    socket.on('disconnect', () => console.log('User disconnected:', socket.id));
});

// Start the server using the HTTP server, not app!
server.listen(PORT, () => {
    console.log(`🚀 TheraSense server running at http://localhost:${PORT}`);
});