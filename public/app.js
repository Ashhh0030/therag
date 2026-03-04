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
// Handle Logout
document.querySelectorAll('.close-btn').forEach(btn => {
    if(btn.id !== 'close-login-btn') {
        btn.addEventListener('click', () => {
            
            // Tell the server to save the DB log before we leave!
            socket.emit('end-session', ROOM_ID); 
            
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
        // Run the AI analysis 10 times per second
        // Run the AI analysis 10 times per second
        let frameCounter = 0; // Keeps track of how many frames have passed

        setInterval(async () => {
            if (remoteVideo.paused || remoteVideo.ended) return;

            const detections = await faceapi.detectAllFaces(remoteVideo, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks()
                .withFaceExpressions();

            const resizedDetections = faceapi.resizeResults(detections, displaySize);
            canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
            faceapi.draw.drawDetections(canvas, resizedDetections);
            faceapi.draw.drawFaceExpressions(canvas, resizedDetections);

            if (detections.length > 0) {
                const expressions = detections[0].expressions;
                let snapshot = null;

                // NEW: Capture an image every 5 seconds (50 frames @ 100ms interval)
                if (frameCounter % 50 === 0) {
                    const snapCanvas = document.createElement('canvas');
                    snapCanvas.width = remoteVideo.videoWidth;
                    snapCanvas.height = remoteVideo.videoHeight;
                    const snapCtx = snapCanvas.getContext('2d');
                    
                    // Draw the video frame onto the hidden canvas
                    snapCtx.drawImage(remoteVideo, 0, 0, snapCanvas.width, snapCanvas.height);
                    
                    // Convert the canvas to a JPEG string (0.5 = 50% quality to save space)
                    snapshot = snapCanvas.toDataURL('image/jpeg', 0.5); 
                }
                
                frameCounter++;

                socket.emit('emotion-update', { 
                    room: ROOM_ID, 
                    expressions: expressions,
                    image: snapshot // Send the image (will be null unless it's the 5th second)
                });
            }
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

// --- ANALYTICS DASHBOARD LOGIC ---
const analyticsModal = document.getElementById('analytics-modal');
const closeAnalyticsBtn = document.getElementById('close-analytics-btn');
const viewAnalyticsBtn = document.getElementById('view-analytics-btn');
let emotionChartInstance = null; 

if(viewAnalyticsBtn) {
    viewAnalyticsBtn.addEventListener('click', async () => {
        analyticsModal.classList.remove('hidden');
        await loadAnalyticsData();
    });
}

if(closeAnalyticsBtn) {
    closeAnalyticsBtn.addEventListener('click', () => {
        analyticsModal.classList.add('hidden');
    });
}

async function loadAnalyticsData() {
    try {
        const response = await fetch(`/api/sessions`);
        const data = await response.json();

        if (data.success) {
            renderAnalyticsSidebar(data.sessions);
            // Reset main view
            document.getElementById('analytics-main-view').innerHTML = `
                <div style="display: flex; height: 100%; align-items: center; justify-content: center;">
                    <p style="color: var(--text-secondary); text-align: center;">Select a session from the sidebar to view data.</p>
                </div>`;
        } else {
            alert("Error loading history.");
        }
    } catch (error) {
        console.error("Error loading analytics:", error);
    }
}

function renderAnalyticsSidebar(sessions) {
    const sidebar = document.getElementById('analytics-sidebar');
    sidebar.innerHTML = '';
    
    if(sessions.length === 0) {
        sidebar.innerHTML = '<p style="color: var(--text-secondary); font-size: 0.9rem;">No sessions recorded yet.</p>';
        return;
    }

    // Group sessions by their Room ID (which acts as the Patient identifier)
    const grouped = sessions.reduce((acc, session) => {
        if(!acc[session.roomId]) acc[session.roomId] = [];
        acc[session.roomId].push(session);
        return acc;
    }, {});

    for (const [patientId, patientSessions] of Object.entries(grouped)) {
        const patientDiv = document.createElement('div');
        patientDiv.style.marginBottom = '25px';
        
        const patientHeader = document.createElement('h4');
        patientHeader.innerText = `👤 Patient: ${patientId}`;
        patientHeader.style.color = '#fff';
        patientHeader.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
        patientHeader.style.paddingBottom = '8px';
        patientHeader.style.marginBottom = '10px';
        patientDiv.appendChild(patientHeader);

        patientSessions.forEach(session => {
            const sessionRow = document.createElement('div');
            sessionRow.style.display = 'flex';
            sessionRow.style.justifyContent = 'space-between';
            sessionRow.style.alignItems = 'center';
            sessionRow.style.padding = '10px';
            sessionRow.style.background = 'rgba(255,255,255,0.03)';
            sessionRow.style.borderRadius = '8px';
            sessionRow.style.marginBottom = '8px';
            sessionRow.style.cursor = 'pointer';
            sessionRow.style.transition = 'background 0.2s';

            sessionRow.onmouseover = () => sessionRow.style.background = 'rgba(255,255,255,0.08)';
            sessionRow.onmouseout = () => sessionRow.style.background = 'rgba(255,255,255,0.03)';

            const dateText = document.createElement('span');
            dateText.style.fontSize = '0.85rem';
            dateText.style.color = 'var(--text-secondary)';
            dateText.innerText = new Date(session.startTime).toLocaleDateString() + ' ' + new Date(session.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

            const delBtn = document.createElement('button');
            delBtn.innerText = '🗑️';
            delBtn.style.background = 'none';
            delBtn.style.border = 'none';
            delBtn.style.cursor = 'pointer';
            delBtn.style.fontSize = '1.1rem';
            delBtn.title = 'Delete Session';

            // Delete Logic
            delBtn.addEventListener('click', async (e) => {
                e.stopPropagation(); 
                if(confirm('Are you sure you want to permanently delete this session log?')) {
                    await fetch(`/api/sessions/${session._id}`, { method: 'DELETE' });
                    loadAnalyticsData(); // Refresh the list!
                }
            });

            // View Logic
            sessionRow.addEventListener('click', () => renderSessionDetails(session));

            sessionRow.appendChild(dateText);
            sessionRow.appendChild(delBtn);
            patientDiv.appendChild(sessionRow);
        });

        sidebar.appendChild(patientDiv);
    }
}

function renderSessionDetails(session) {
    const mainView = document.getElementById('analytics-main-view');
    mainView.innerHTML = `
        <div style="background: rgba(0,0,0,0.3); padding: 20px; border-radius: 15px; margin-bottom: 20px;">
            <canvas id="emotion-chart"></canvas>
        </div>
        <h3>Session Snapshots</h3>
        <div id="snapshot-gallery" style="display: flex; gap: 15px; overflow-x: auto; padding: 15px 0; border-top: 1px solid rgba(255,255,255,0.1); margin-top: 10px;"></div>
    `;
    plotChart(session.emotions);
    displaySnapshots(session.emotions);
}

function plotChart(emotionsData) {
    const ctx = document.getElementById('emotion-chart').getContext('2d');
    if (emotionChartInstance) emotionChartInstance.destroy();

    const labels = emotionsData.map(e => new Date(e.timestamp).toLocaleTimeString([], {minute: '2-digit', second:'2-digit'}));
    
    // Helper function to extract a specific emotion percentage safely
    const extract = (emotion) => emotionsData.map(e => (e.expressions[emotion] * 100).toFixed(1));

    emotionChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                { label: 'Happy', data: extract('happy'), borderColor: '#00ff88', backgroundColor: 'rgba(0, 255, 136, 0.1)', tension: 0.4 },
                { label: 'Sad', data: extract('sad'), borderColor: '#00ccff', backgroundColor: 'rgba(0, 204, 255, 0.1)', tension: 0.4 },
                { label: 'Neutral', data: extract('neutral'), borderColor: '#a0a0a0', backgroundColor: 'rgba(160, 160, 160, 0.1)', tension: 0.4 },
                { label: 'Angry', data: extract('angry'), borderColor: '#ff4444', backgroundColor: 'rgba(255, 68, 68, 0.1)', tension: 0.4, hidden: true },
                { label: 'Disgusted', data: extract('disgusted'), borderColor: '#9933ff', backgroundColor: 'rgba(153, 51, 255, 0.1)', tension: 0.4, hidden: true },
                { label: 'Surprised', data: extract('surprised'), borderColor: '#ffff00', backgroundColor: 'rgba(255, 255, 0, 0.1)', tension: 0.4, hidden: true },
                { label: 'Fearful', data: extract('fearful'), borderColor: '#ff9900', backgroundColor: 'rgba(255, 153, 0, 0.1)', tension: 0.4, hidden: true }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: { beginAtZero: true, max: 100, ticks: { color: '#a0a0a0' }, grid: { color: 'rgba(255,255,255,0.1)' } },
                x: { ticks: { color: '#a0a0a0', maxTicksLimit: 10 }, grid: { display: false } }
            },
            plugins: {
                legend: { 
                    labels: { color: '#ffffff', boxWidth: 12 }, 
                    position: 'bottom',
                    // Adds a tooltip instructing the user they can click to toggle
                    title: { display: true, text: 'Click a label to toggle visibility', color: '#a0a0a0', font: {size: 10} }
                }
            }
        }
    });
}

function displaySnapshots(emotionsData) {
    const snapshotGallery = document.getElementById('snapshot-gallery');
    snapshotGallery.innerHTML = ''; 
    
    const entriesWithImages = emotionsData.filter(e => e.image);

    if (entriesWithImages.length === 0) {
        snapshotGallery.innerHTML = '<p style="color: var(--text-secondary);">No snapshots captured during this session.</p>';
        return;
    }

    entriesWithImages.forEach(entry => {
        const wrapper = document.createElement('div');
        wrapper.style.minWidth = '120px';
        wrapper.style.textAlign = 'center';

        const img = document.createElement('img');
        img.src = entry.image;
        img.style.width = '120px';
        img.style.borderRadius = '8px';
        img.style.border = '1px solid var(--glass-border)';

        const timeLabel = document.createElement('div');
        timeLabel.innerText = new Date(entry.timestamp).toLocaleTimeString([], {minute: '2-digit', second:'2-digit'});
        timeLabel.style.fontSize = '0.8rem';
        timeLabel.style.color = 'var(--text-secondary)';
        timeLabel.style.marginTop = '5px';

        wrapper.appendChild(img);
        wrapper.appendChild(timeLabel);
        snapshotGallery.appendChild(wrapper);
    });
}