const canvas = document.getElementById('particle-canvas');
const ctx = canvas.getContext('2d');
const cursorGlow = document.getElementById('cursor-glow');
const navBar = document.getElementById('nav-bar'); 
const welcomeBox = document.getElementById('welcome-box'); // Get the welcome box

let particlesArray = [];
const SPACING = 30; 
const BASE_FLAKE_RADIUS = 350; 
const MAX_LENGTH = 14; 
const DOT_SIZE = 2; 
const LIFESPAN_MS = 2000; 

const BASE_OPACITY = 0.35; 
const MAX_OPACITY = 0.90; 

let mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
let delayedMouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

// --- LOAD AI EMOTION MODELS ---
// Using the official GitHub hosted models to prevent CDN blocking
const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';

Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
]).then(() => {
    console.log("✅ Face-API Neural Networks Loaded Successfully");
}).catch(err => console.error("❌ Failed to load AI models", err));

// ... rest of your code ...
window.addEventListener('mousemove', function(event) {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
    
    if(cursorGlow) {
        cursorGlow.style.left = event.clientX + 'px';
        cursorGlow.style.top = event.clientY + 'px';
    }

    // Update Navbar mask
    if(navBar) {
        navBar.style.setProperty('--mouse-x', `${event.clientX}px`);
        navBar.style.setProperty('--mouse-y', `${event.clientY}px`);
    }

    // Update Welcome Box mask (requires math because it's not pinned to top-left)
    if(welcomeBox) {
        const rect = welcomeBox.getBoundingClientRect();
        // Calculate mouse position relative to the box's top-left corner
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        welcomeBox.style.setProperty('--mouse-x', `${x}px`);
        welcomeBox.style.setProperty('--mouse-y', `${y}px`);
    }
});

// When the mouse leaves the browser window entirely
window.addEventListener('mouseout', () => {
    if(navBar) {
        navBar.style.setProperty('--mouse-x', `-1000px`);
        navBar.style.setProperty('--mouse-y', `-1000px`);
    }
    if(welcomeBox) {
        welcomeBox.style.setProperty('--mouse-x', `-1000px`);
        welcomeBox.style.setProperty('--mouse-y', `-1000px`);
    }
});

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    init(); 
});

// ... class Particle { ... KEEP EVERYTHING BELOW THIS LINE AS IS ...

class Particle {
    constructor(x, y) {
        // "Home" coordinates for the dot
        this.baseX = x; 
        this.baseY = y; 
        
        // Physical coordinates
        this.x = x;
        this.y = y;
        
        // Hovering / Drifting parameters
        this.driftOffsetX = Math.random() * Math.PI * 2;
        this.driftOffsetY = Math.random() * Math.PI * 2;
        this.driftSpeedX = 0.0003 + Math.random() * 0.0004; 
        this.driftSpeedY = 0.0003 + Math.random() * 0.0004;
        this.driftRange = 10 + Math.random() * 15; 
        
        // Flake breathing parameters
        this.breathOffset = Math.random() * Math.PI * 2;
        this.breathSpeed = 0.002 + Math.random() * 0.0015;

        // Memory variables for aftereffect
        this.lastActiveTime = 0;
        this.lastLength = DOT_SIZE;
        this.lastAngle = 0;
    }

    draw(time) {
        // --- 1. HOVERING MOVEMENT ---
        this.x = this.baseX + Math.sin(time * this.driftSpeedX + this.driftOffsetX) * this.driftRange;
        this.y = this.baseY + Math.cos(time * this.driftSpeedY + this.driftOffsetY) * this.driftRange;

        let dx = this.x - delayedMouse.x;
        let dy = this.y - delayedMouse.y;
        let distance = Math.sqrt(dx * dx + dy * dy);
        let angleToCenter = Math.atan2(dy, dx);

        // --- 2. LENS CALCULATION ---
        let wave1 = Math.sin(angleToCenter * 3 + time * 0.0015) * 15; 
        let wave2 = Math.cos(angleToCenter * 5 - time * 0.001) * 8;
        
        let dynamicFlakeRadius = BASE_FLAKE_RADIUS + wave1 + wave2;
        let dynamicPeakRadius = dynamicFlakeRadius * 0.8; 

        let length = DOT_SIZE;
        let drawAngle = this.lastAngle;
        let isFlake = false;

        if (distance < dynamicFlakeRadius) {
            this.lastActiveTime = time; 
            isFlake = true;
            drawAngle = angleToCenter;
            this.lastAngle = drawAngle; 

            if (distance <= dynamicPeakRadius) {
                let stretchRatio = Math.pow(distance / dynamicPeakRadius, 3);
                length = DOT_SIZE + (MAX_LENGTH - DOT_SIZE) * stretchRatio;
            } else {
                let shrinkRatio = (dynamicFlakeRadius - distance) / (dynamicFlakeRadius - dynamicPeakRadius);
                length = DOT_SIZE + (MAX_LENGTH - DOT_SIZE) * shrinkRatio;
            }
            this.lastLength = length; 
        } else {
            let timeSinceActive = time - this.lastActiveTime;
            if (timeSinceActive < LIFESPAN_MS && this.lastLength > DOT_SIZE) {
                isFlake = true;
                let decayRatio = 1 - (timeSinceActive / LIFESPAN_MS);
                length = DOT_SIZE + (this.lastLength - DOT_SIZE) * decayRatio;
            }
        }

        if (isFlake) {
            let breath = 1 + 0.2 * Math.sin(time * this.breathSpeed + this.breathOffset);
            length *= breath;
        }

        // --- 3. DYNAMIC OPACITY CALCULATION ---
        // Find out what percentage of the max length this flake currently is
        // We cap it between 0 and 1 so it doesn't break if the breathing pushes it slightly over MAX_LENGTH
        let stretchFactor = Math.min(1, Math.max(0, (length - DOT_SIZE) / (MAX_LENGTH - DOT_SIZE)));
        let currentOpacity = BASE_OPACITY + (MAX_OPACITY - BASE_OPACITY) * stretchFactor;

        // --- 4. DRAW TO CANVAS ---
        ctx.save();
        ctx.translate(this.x, this.y);

        if (isFlake && length > DOT_SIZE + 0.5) {
            ctx.rotate(drawAngle);
            ctx.beginPath();
            ctx.lineCap = 'round';
            ctx.lineWidth = 1.8;
            ctx.strokeStyle = `rgba(160, 160, 160, ${currentOpacity})`; // Apply the dynamic glow
            ctx.moveTo(-length / 2, 0);
            ctx.lineTo(length / 2, 0);
            ctx.stroke();
        } else {
            ctx.beginPath();
            ctx.arc(0, 0, DOT_SIZE / 2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(160, 160, 160, ${BASE_OPACITY})`; // Apply the brighter base dot
            ctx.fill();
        }

        ctx.restore();
    }
}

function init() {
    particlesArray = [];
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    for (let y = -SPACING; y < canvas.height + SPACING; y += SPACING) {
        for (let x = -SPACING; x < canvas.width + SPACING; x += SPACING) {
            particlesArray.push(new Particle(x, y));
        }
    }
}

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let time = Date.now();

    // Changed 0.05 to 0.08 to make it slightly faster and reduce the delay
    delayedMouse.x += (mouse.x - delayedMouse.x) * 0.12;
    delayedMouse.y += (mouse.y - delayedMouse.y) * 0.12;

    for (let i = 0; i < particlesArray.length; i++) {
        particlesArray[i].draw(time);
    }

    requestAnimationFrame(animate);
}

init();
animate();

// --- EXISTING LOGIN LOGIC BELOW THIS LINE ---

// --- DATABASE & DASHBOARD LOGIC ---

const showLoginBtn = document.getElementById('show-login-btn');
const closeLoginBtn = document.getElementById('close-login-btn');
const loginModal = document.getElementById('login-modal');
const loginForm = document.getElementById('login-form');
const landingPage = document.getElementById('landing-page');
const dashboardContainer = document.getElementById('dashboard');
const therapistDashboard = document.getElementById('therapist-dashboard');
const patientDashboard = document.getElementById('patient-dashboard');
const tabBtns = document.querySelectorAll('.tab-btn');
const patientListUl = document.getElementById('patient-list');
const createPatientForm = document.getElementById('create-patient-form');

let currentRole = 'therapist'; 

// Toggle Login Modal
showLoginBtn.addEventListener('click', () => loginModal.classList.remove('hidden'));
closeLoginBtn.addEventListener('click', () => loginModal.classList.add('hidden'));

// Handle Role Tabs
tabBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        tabBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentRole = e.target.getAttribute('data-role');
    });
});

// Handle MongoDB Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('userid').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, role: currentRole })
        });

        const data = await response.json();

        if (data.success) {
            loginModal.classList.add('hidden');
            landingPage.classList.add('hidden');
            dashboardContainer.classList.remove('hidden');

            // --- ADD THIS LINE ---
            setupVideoUI(data.user.role);

            if (data.user.role === 'therapist') {
                therapistDashboard.classList.remove('hidden');
                loadPatients(); // Fetch patients from MongoDB
            } else {
                patientDashboard.classList.remove('hidden');
            }
        } else {
            alert('Invalid credentials. Please try again.');
        }
    } catch (error) {
        console.error('Login error:', error);
    }
});

// Fetch patients from MongoDB
async function loadPatients() {
    const response = await fetch('/api/patients');
    const data = await response.json();
    
    patientListUl.innerHTML = '';
    if (data.patients.length === 0) {
        patientListUl.innerHTML = '<li>No patients registered yet.</li>';
    } else {
        data.patients.forEach(patient => {
            const li = document.createElement('li');
            li.style.padding = "10px 0";
            li.style.borderBottom = "1px solid rgba(255,255,255,0.05)";
            li.innerText = `👤 ${patient.username}`;
            patientListUl.appendChild(li);
        });
    }
}

// Handle Patient Creation
createPatientForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('new-patient-id').value;
    const password = document.getElementById('new-patient-pwd').value;

    const response = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    const data = await response.json();
    if (data.success) {
        alert('Patient created successfully!');
        createPatientForm.reset();
        loadPatients(); // Refresh the list to show the new patient
    } else {
        alert(data.message);
    }
});

// Handle Logout
document.querySelectorAll('.close-btn').forEach(btn => {
    if(btn.id !== 'close-login-btn') {
        btn.addEventListener('click', () => {
            dashboardContainer.classList.add('hidden');
            therapistDashboard.classList.add('hidden');
            patientDashboard.classList.add('hidden');
            landingPage.classList.remove('hidden');
            loginForm.reset();
        });
    }
});

// --- WEBRTC & CAMERA LOGIC ---
const socket = io(); 
let localStream;
let peerConnection;
const ROOM_ID = 'therasense-demo-room'; // We use a fixed room for this demo

// STUN servers help browsers find each other's IP addresses over the internet
const rtcConfig = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

// UI Elements mapped dynamically based on who logs in
let localVideoElement, remoteVideoElement, joinCallBtn;

// Setup UI elements based on Role
function setupVideoUI(role) {
    if (role === 'therapist') {
        localVideoElement = document.getElementById('therapist-local-video');
        remoteVideoElement = document.getElementById('therapist-remote-video');
        joinCallBtn = document.getElementById('therapist-join-call');
    } else {
        localVideoElement = document.getElementById('patient-local-video');
        remoteVideoElement = document.getElementById('patient-remote-video');
        joinCallBtn = document.getElementById('patient-join-call');
    }

    // Remove old listeners to prevent duplicates
    const newJoinBtn = joinCallBtn.cloneNode(true);
    joinCallBtn.parentNode.replaceChild(newJoinBtn, joinCallBtn);
    joinCallBtn = newJoinBtn;

    joinCallBtn.addEventListener('click', startCall);
}

// 1. Get Camera and Join Room
async function startCall() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideoElement.srcObject = localStream;
        joinCallBtn.innerText = "Camera Active - Waiting for peer...";
        joinCallBtn.disabled = true;
        
        socket.emit('join-room', ROOM_ID);
    } catch (error) {
        alert('Could not access camera/microphone.');
    }
}

// 2. Initialize the Peer Connection
function createPeerConnection() {
    peerConnection = new RTCPeerConnection(rtcConfig);

    // Send our video tracks to the peer
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

    // When we receive their video track, show it in the remote video element
    peerConnection.ontrack = (event) => {
        remoteVideoElement.srcObject = event.streams[0];
        joinCallBtn.innerText = "Connected!";
    };

    // When we find a network path (ICE), send it to the peer via Socket.io
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('ice-candidate', { room: ROOM_ID, candidate: event.candidate });
        }
    };
}

// --- AI VIDEO ANALYSIS (THERAPIST SIDE) ---
const videoWrapper = document.getElementById('video-wrapper');

if (videoWrapper) {
    const remoteVideo = document.getElementById('therapist-remote-video');

    remoteVideo.addEventListener('play', () => {
        // Create a canvas element and place it over the video
        const canvas = faceapi.createCanvasFromMedia(remoteVideo);
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.borderRadius = '12px';
        videoWrapper.append(canvas);

        // Match the canvas size to the video dimensions
        const displaySize = { width: remoteVideo.clientWidth, height: remoteVideo.clientHeight };
        faceapi.matchDimensions(canvas, displaySize);

        // Run the AI analysis 10 times per second
        setInterval(async () => {
            if (remoteVideo.paused || remoteVideo.ended) return;

            // Detect faces, landmarks, and expressions
            const detections = await faceapi.detectAllFaces(remoteVideo, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks()
                .withFaceExpressions();

            // Resize the bounding boxes to match our UI
            const resizedDetections = faceapi.resizeResults(detections, displaySize);

            // Clear the previous frame's drawings
            canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

            // Draw the new bounding boxes and emotion percentages!
            faceapi.draw.drawDetections(canvas, resizedDetections);
            faceapi.draw.drawFaceExpressions(canvas, resizedDetections);
        }, 100);
    });
}

// --- SOCKET.IO SIGNALING HANDLERS ---

// When the OTHER person joins the room, we create an Offer
socket.on('user-joined', async () => {
    createPeerConnection();
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('offer', { room: ROOM_ID, offer: offer });
});

// When we receive an Offer, we create an Answer
socket.on('offer', async (data) => {
    createPeerConnection();
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('answer', { room: ROOM_ID, answer: answer });
});

// When we receive an Answer, we save it
socket.on('answer', async (data) => {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
});

// When we receive a network path (ICE), we add it
socket.on('ice-candidate', async (data) => {
    try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
    } catch (e) {
        console.error('Error adding received ice candidate', e);
    }
});