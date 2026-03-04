// server.js
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const http = require('http'); // NEW
const { Server } = require('socket.io'); // NEW

const app = express();
const server = http.createServer(app); // NEW: Wrap Express in HTTP server
const io = new Server(server); // NEW: Attach Socket.io to the server
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

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['therapist', 'patient'], required: true },
    therapistId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

const User = mongoose.model('User', userSchema);

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

// --- WEBRTC SIGNALING (SOCKET.IO) ---
io.on('connection', (socket) => {
    console.log('A user connected for signaling:', socket.id);

    // Join a specific consultation room
    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        socket.to(roomId).emit('user-joined', socket.id);
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
