const canvas = document.getElementById('particle-canvas');
const ctx = canvas.getContext('2d');
const cursorGlow = document.getElementById('cursor-glow');
const navBar = document.getElementById('nav-bar'); 
const welcomeBox = document.getElementById('welcome-box'); 

let particlesArray = [];
const SPACING = 30; const BASE_FLAKE_RADIUS = 350; const MAX_LENGTH = 14; 
const DOT_SIZE = 2; const LIFESPAN_MS = 2000; const BASE_OPACITY = 0.35; const MAX_OPACITY = 0.90; 
let mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
let delayedMouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

// --- LOAD AI MODELS ---
const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
]).then(() => console.log("✅ AI Models Loaded")).catch(err => console.error("❌ AI error", err));

// --- GLOBAL MOUSE TRACKING ---
window.addEventListener('mousemove', function(event) {
    mouse.x = event.clientX; mouse.y = event.clientY;
    if(cursorGlow) { cursorGlow.style.left = event.clientX + 'px'; cursorGlow.style.top = event.clientY + 'px'; }
    if(navBar) { navBar.style.setProperty('--mouse-x', `${event.clientX}px`); navBar.style.setProperty('--mouse-y', `${event.clientY}px`); }
    if(welcomeBox) {
        const rect = welcomeBox.getBoundingClientRect();
        welcomeBox.style.setProperty('--mouse-x', `${event.clientX - rect.left}px`);
        welcomeBox.style.setProperty('--mouse-y', `${event.clientY - rect.top}px`);
    }
});

window.addEventListener('resize', () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; init(); });

// --- PARTICLES ---
class Particle {
    constructor(x, y) {
        this.baseX = x; this.baseY = y; this.x = x; this.y = y;
        this.driftOffsetX = Math.random() * Math.PI * 2; this.driftOffsetY = Math.random() * Math.PI * 2;
        this.driftSpeedX = 0.0003 + Math.random() * 0.0004; this.driftSpeedY = 0.0003 + Math.random() * 0.0004;
        this.driftRange = 10 + Math.random() * 15; 
        this.breathOffset = Math.random() * Math.PI * 2; this.breathSpeed = 0.002 + Math.random() * 0.0015;
        this.lastActiveTime = 0; this.lastLength = DOT_SIZE; this.lastAngle = 0;
    }
    draw(time) {
        this.x = this.baseX + Math.sin(time * this.driftSpeedX + this.driftOffsetX) * this.driftRange;
        this.y = this.baseY + Math.cos(time * this.driftSpeedY + this.driftOffsetY) * this.driftRange;
        let dx = this.x - delayedMouse.x, dy = this.y - delayedMouse.y;
        let distance = Math.sqrt(dx * dx + dy * dy);
        let angleToCenter = Math.atan2(dy, dx);
        let dynamicFlakeRadius = BASE_FLAKE_RADIUS + Math.sin(angleToCenter * 3 + time * 0.0015) * 15 + Math.cos(angleToCenter * 5 - time * 0.001) * 8;
        let dynamicPeakRadius = dynamicFlakeRadius * 0.8; 
        let length = DOT_SIZE, drawAngle = this.lastAngle, isFlake = false;

        if (distance < dynamicFlakeRadius) {
            this.lastActiveTime = time; isFlake = true; drawAngle = angleToCenter; this.lastAngle = drawAngle; 
            if (distance <= dynamicPeakRadius) length = DOT_SIZE + (MAX_LENGTH - DOT_SIZE) * Math.pow(distance / dynamicPeakRadius, 3);
            else length = DOT_SIZE + (MAX_LENGTH - DOT_SIZE) * ((dynamicFlakeRadius - distance) / (dynamicFlakeRadius - dynamicPeakRadius));
            this.lastLength = length; 
        } else {
            let timeSinceActive = time - this.lastActiveTime;
            if (timeSinceActive < LIFESPAN_MS && this.lastLength > DOT_SIZE) {
                isFlake = true; length = DOT_SIZE + (this.lastLength - DOT_SIZE) * (1 - (timeSinceActive / LIFESPAN_MS));
            }
        }
        if (isFlake) length *= 1 + 0.2 * Math.sin(time * this.breathSpeed + this.breathOffset);
        let currentOpacity = BASE_OPACITY + (MAX_OPACITY - BASE_OPACITY) * Math.min(1, Math.max(0, (length - DOT_SIZE) / (MAX_LENGTH - DOT_SIZE)));
        
        ctx.save(); ctx.translate(this.x, this.y);
        if (isFlake && length > DOT_SIZE + 0.5) {
            ctx.rotate(drawAngle); ctx.beginPath(); ctx.lineCap = 'round'; ctx.lineWidth = 1.8;
            ctx.strokeStyle = `rgba(160, 160, 160, ${currentOpacity})`; ctx.moveTo(-length / 2, 0); ctx.lineTo(length / 2, 0); ctx.stroke();
        } else {
            ctx.beginPath(); ctx.arc(0, 0, DOT_SIZE / 2, 0, Math.PI * 2); ctx.fillStyle = `rgba(160, 160, 160, ${BASE_OPACITY})`; ctx.fill();
        }
        ctx.restore();
    }
}
function init() {
    particlesArray = []; canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    for (let y = -SPACING; y < canvas.height + SPACING; y += SPACING) {
        for (let x = -SPACING; x < canvas.width + SPACING; x += SPACING) { particlesArray.push(new Particle(x, y)); }
    }
}
function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); let time = Date.now();
    delayedMouse.x += (mouse.x - delayedMouse.x) * 0.12; delayedMouse.y += (mouse.y - delayedMouse.y) * 0.12;
    for (let i = 0; i < particlesArray.length; i++) particlesArray[i].draw(time);
    requestAnimationFrame(animate);
}
init(); animate();

// --- STATE & AUTHENTICATION ---
let currentRole = 'therapist'; 
let currentUser = null;
let globalSnapshotsEnabled = true;

const showLoginBtn = document.getElementById('show-login-btn');
const closeLoginBtn = document.getElementById('close-login-btn');
const loginModal = document.getElementById('login-modal');
const loginForm = document.getElementById('login-form');
const landingPage = document.getElementById('landing-page');
const dashboardContainer = document.getElementById('dashboard');

// NEW: Sidebar Elements
const hamburgerBtn = document.getElementById('hamburger-btn');
const sideNav = document.getElementById('side-nav');
const closeNavBtn = document.getElementById('close-nav-btn');
const navLinksContainer = document.getElementById('nav-links-container');

showLoginBtn.addEventListener('click', () => loginModal.classList.remove('hidden'));
closeLoginBtn.addEventListener('click', () => loginModal.classList.add('hidden'));

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentRole = e.target.getAttribute('data-role');
    });
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('userid').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('/api/login', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, role: currentRole })
        });
        const data = await response.json();

        if (data.success) {
            currentUser = data.user;
            globalSnapshotsEnabled = data.snapshotsEnabled;
            
            loginModal.classList.add('hidden');
            landingPage.classList.add('hidden');
            dashboardContainer.classList.remove('hidden');
            
            // Show hamburger menu
            hamburgerBtn.classList.remove('hidden');
            buildSidebarMenu(currentUser.role);

            // Hide all dashboards first
            document.getElementById('admin-settings-view').classList.add('hidden');
            document.getElementById('therapist-dashboard').classList.add('hidden');
            document.getElementById('patient-dashboard').classList.add('hidden');

            if (currentUser.role === 'admin') {
                document.getElementById('admin-settings-view').classList.remove('hidden');
                updateSnapshotToggleUI(globalSnapshotsEnabled);
            } else if (currentUser.role === 'therapist') {
                document.getElementById('therapist-dashboard').classList.remove('hidden');
                setupVideoUI('therapist');
                loadPatients(); 
            } else {
                document.getElementById('patient-dashboard').classList.remove('hidden');
                switchPatientView('view-teleconsultation'); // Default view
                setupVideoUI('patient');
            }
        } else { alert('Invalid credentials.'); }
    } catch (error) { console.error('Login error:', error); }
});

// --- NEW: SIDEBAR NAVIGATION LOGIC ---
hamburgerBtn.addEventListener('click', () => {
    sideNav.classList.remove('hidden');
    setTimeout(() => sideNav.classList.add('open'), 10);
});

closeNavBtn.addEventListener('click', closeSidebar);

function closeSidebar() {
    sideNav.classList.remove('open');
    setTimeout(() => sideNav.classList.add('hidden'), 300);
}

function buildSidebarMenu(role) {
    navLinksContainer.innerHTML = ''; // Clear old links
    let links = [];

    if (role === 'patient') {
        links = [
            { name: '🎥 Teleconsultation Room', action: () => switchPatientView('view-teleconsultation') },
            { name: '📅 Appointment Booking', action: () => switchPatientView('view-booking') },
            { name: '🤖 Chatbot Assistant', action: () => switchPatientView('view-chatbot') },
            { name: '📊 Session Reports', action: () => { document.getElementById('analytics-modal').classList.remove('hidden'); loadAnalyticsData(); } }
        ];
    } else if (role === 'therapist') {
        links = [
            { name: '🎥 Teleconsultation Room', action: () => {} }, // Default view for therapist
            { name: '📊 Session History', action: () => { document.getElementById('analytics-modal').classList.remove('hidden'); loadAnalyticsData(); } }
        ];
    } else if (role === 'admin') {
        links = [
            { name: '⚙️ System Settings', action: () => {} },
            { name: '📊 Global Session Logs', action: () => { document.getElementById('analytics-modal').classList.remove('hidden'); loadAnalyticsData(); } }
        ];
    }

    links.forEach(link => {
        const btn = document.createElement('button');
        btn.className = 'glass-btn nav-item';
        btn.innerText = link.name;
        btn.addEventListener('click', () => {
            link.action();
            closeSidebar();
        });
        navLinksContainer.appendChild(btn);
    });
}

function switchPatientView(viewId) {
    // Hide all patient views
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active-view'));
    // Show the selected one
    document.getElementById(viewId).classList.add('active-view');
}

// --- ADMIN SPECIFIC LOGIC ---
document.getElementById('create-therapist-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('new-therapist-id').value;
    const password = document.getElementById('new-therapist-pwd').value;
    const response = await fetch('/api/therapists', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    if ((await response.json()).success) { alert('Therapist created!'); e.target.reset(); } 
    else { alert('Username already exists.'); }
});

const toggleBtn = document.getElementById('toggle-snapshots-btn');
toggleBtn?.addEventListener('click', async () => {
    globalSnapshotsEnabled = !globalSnapshotsEnabled;
    await fetch('/api/settings/snapshots', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: globalSnapshotsEnabled }) });
    updateSnapshotToggleUI(globalSnapshotsEnabled);
});

function updateSnapshotToggleUI(isEnabled) {
    if(toggleBtn) {
        toggleBtn.innerText = isEnabled ? "Snapshots: ENABLED" : "Snapshots: DISABLED";
        toggleBtn.style.borderColor = isEnabled ? "#00ff88" : "#ff4444";
        toggleBtn.style.color = isEnabled ? "#00ff88" : "#ff4444";
    }
}

// --- THERAPIST SPECIFIC LOGIC ---
async function loadPatients() {
    const response = await fetch(`/api/patients?therapistId=${currentUser.id}`);
    const data = await response.json();
    const patientListUl = document.getElementById('patient-list');
    patientListUl.innerHTML = '';
    if (data.patients.length === 0) patientListUl.innerHTML = '<li>No patients registered yet.</li>';
    else {
        data.patients.forEach(patient => {
            const li = document.createElement('li');
            li.style.padding = "10px 0"; li.style.borderBottom = "1px solid rgba(255,255,255,0.05)";
            li.innerText = `👤 ${patient.username}`; patientListUl.appendChild(li);
        });
    }
}

document.getElementById('create-patient-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('new-patient-id').value;
    const password = document.getElementById('new-patient-pwd').value;
    const response = await fetch('/api/patients', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, therapistId: currentUser.id })
    });
    if ((await response.json()).success) { alert('Patient created!'); e.target.reset(); loadPatients(); } 
    else { alert('Username exists.'); }
});

// --- LOGOUT ---
document.querySelectorAll('.logout-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        if(socket) socket.emit('end-session', ROOM_ID); 
        closeSidebar();
        hamburgerBtn.classList.add('hidden');
        dashboardContainer.classList.add('hidden');
        landingPage.classList.remove('hidden');
        loginForm.reset();
        currentUser = null;
    });
});

// --- WEBRTC & AI VIDEO PIPELINE ---
const socket = io(); 
let localStream, peerConnection;
const ROOM_ID = 'therasense-demo-room'; 
const rtcConfig = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
let localVideoElement, remoteVideoElement, joinCallBtn;

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
    const newJoinBtn = joinCallBtn.cloneNode(true);
    joinCallBtn.parentNode.replaceChild(newJoinBtn, joinCallBtn);
    joinCallBtn = newJoinBtn;
    joinCallBtn.addEventListener('click', startCall);
}

async function startCall() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideoElement.srcObject = localStream;
        joinCallBtn.innerText = "Camera Active - Waiting for peer..."; joinCallBtn.disabled = true;
        socket.emit('join-room', { roomId: ROOM_ID, therapistId: currentUser?.role === 'therapist' ? currentUser.id : null });
    } catch (error) { alert('Could not access camera/microphone.'); }
}

function createPeerConnection() {
    peerConnection = new RTCPeerConnection(rtcConfig);
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
    peerConnection.ontrack = (event) => { remoteVideoElement.srcObject = event.streams[0]; joinCallBtn.innerText = "Connected!"; };
    peerConnection.onicecandidate = (event) => { if (event.candidate) socket.emit('ice-candidate', { room: ROOM_ID, candidate: event.candidate }); };
}

const videoWrapper = document.getElementById('video-wrapper');
if (videoWrapper) {
    const remoteVideo = document.getElementById('therapist-remote-video');
    remoteVideo.addEventListener('play', () => {
        const canvas = faceapi.createCanvasFromMedia(remoteVideo);
        canvas.style.position = 'absolute'; canvas.style.top = '0'; canvas.style.left = '0'; canvas.style.borderRadius = '12px';
        videoWrapper.append(canvas);
        const displaySize = { width: remoteVideo.clientWidth, height: remoteVideo.clientHeight };
        faceapi.matchDimensions(canvas, displaySize);

        let frameCounter = 0;
        const ctx = canvas.getContext('2d');

        setInterval(async () => {
            if (remoteVideo.paused || remoteVideo.ended) return;
            const detections = await faceapi.detectAllFaces(remoteVideo, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceExpressions();
            const resizedDetections = faceapi.resizeResults(detections, displaySize);
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (resizedDetections.length > 0) {
                const detection = resizedDetections[0];
                const box = detection.detection.box;
                const expressions = detection.expressions;

                // --- CUSTOM SCI-FI HUD OVERLAY ---
                ctx.strokeStyle = '#00ff88'; ctx.lineWidth = 2; ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 8;
                const len = 20; const { x, y, width, height } = box;
                ctx.beginPath();
                ctx.moveTo(x, y + len); ctx.lineTo(x, y); ctx.lineTo(x + len, y);
                ctx.moveTo(x + width - len, y); ctx.lineTo(x + width, y); ctx.lineTo(x + width, y + len);
                ctx.moveTo(x + width, y + height - len); ctx.lineTo(x + width, y + height); ctx.lineTo(x + width - len, y + height);
                ctx.moveTo(x, y + height - len); ctx.lineTo(x, y + height); ctx.lineTo(x + len, y + height);
                ctx.stroke();

                ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'; ctx.lineWidth = 1; ctx.strokeRect(x, y, width, height);

                const sortedEmotions = Object.entries(expressions).sort((a, b) => b[1] - a[1]).slice(0, 3);
                const panelWidth = 120; const panelHeight = 55; 
                let finalPanelX = x + width + 15; 
                if (finalPanelX + panelWidth > canvas.width) finalPanelX = x - panelWidth - 15;
                if (finalPanelX < 0) finalPanelX = 10;
                let finalPanelY = Math.max(10, Math.min(canvas.height - panelHeight - 10, y));

                ctx.fillStyle = 'rgba(10, 10, 10, 0.6)'; ctx.beginPath();
                ctx.roundRect(finalPanelX, finalPanelY, panelWidth, panelHeight, 8); ctx.fill();
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'; ctx.stroke();

                let textY = finalPanelY + 14; ctx.font = '11px sans-serif';
                sortedEmotions.forEach(([emotion, value], index) => {
                    const percentage = Math.round(value * 100);
                    ctx.fillStyle = index === 0 ? '#00ff88' : '#a0a0a0'; 
                    ctx.fillText(`${emotion.toUpperCase()}:`, finalPanelX + 12, textY);
                    ctx.textAlign = 'right'; ctx.fillText(`${percentage}%`, finalPanelX + panelWidth - 12, textY);
                    ctx.textAlign = 'left'; textY += 16; 
                });

                let snapshot = null;
                if (frameCounter % 50 === 0 && globalSnapshotsEnabled) {
                    const snapCanvas = document.createElement('canvas');
                    snapCanvas.width = remoteVideo.videoWidth; snapCanvas.height = remoteVideo.videoHeight;
                    snapCanvas.getContext('2d').drawImage(remoteVideo, 0, 0, snapCanvas.width, snapCanvas.height);
                    snapshot = snapCanvas.toDataURL('image/jpeg', 0.5); 
                }
                frameCounter++;
                socket.emit('emotion-update', { room: ROOM_ID, expressions: expressions, image: snapshot });
            }
        }, 100);
    });
}

socket.on('user-joined', async () => {
    createPeerConnection(); const offer = await peerConnection.createOffer(); await peerConnection.setLocalDescription(offer);
    socket.emit('offer', { room: ROOM_ID, offer: offer });
});
socket.on('offer', async (data) => {
    createPeerConnection(); await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
    const answer = await peerConnection.createAnswer(); await peerConnection.setLocalDescription(answer);
    socket.emit('answer', { room: ROOM_ID, answer: answer });
});
socket.on('answer', async (data) => { await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer)); });
socket.on('ice-candidate', async (data) => { await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate)); });

// --- ANALYTICS UI ---
const analyticsModal = document.getElementById('analytics-modal');
let emotionChartInstance = null; 

document.querySelectorAll('.view-analytics-btn').forEach(btn => {
    btn.addEventListener('click', async () => { analyticsModal.classList.remove('hidden'); await loadAnalyticsData(); });
});
document.getElementById('close-analytics-btn')?.addEventListener('click', () => analyticsModal.classList.add('hidden'));

async function loadAnalyticsData() {
    try {
        const fetchUrl = currentUser.role === 'admin' ? '/api/sessions' : `/api/sessions?therapistId=${currentUser.id}`;
        const response = await fetch(fetchUrl);
        const data = await response.json();
        if (data.success) renderAnalyticsSidebar(data.sessions);
    } catch (error) { console.error("Error loading analytics:", error); }
}

function renderAnalyticsSidebar(sessions) {
    const sidebar = document.getElementById('analytics-sidebar'); sidebar.innerHTML = '';
    if(sessions.length === 0) { sidebar.innerHTML = '<p style="color: var(--text-secondary);">No sessions recorded yet.</p>'; return; }

    const grouped = sessions.reduce((acc, session) => { if(!acc[session.roomId]) acc[session.roomId] = []; acc[session.roomId].push(session); return acc; }, {});

    for (const [patientId, patientSessions] of Object.entries(grouped)) {
        const patientDiv = document.createElement('div'); patientDiv.style.marginBottom = '25px';
        const patientHeader = document.createElement('h4'); patientHeader.innerText = `👤 ${patientId}`; patientHeader.style.color = '#fff'; patientHeader.style.borderBottom = '1px solid rgba(255,255,255,0.1)'; patientHeader.style.paddingBottom = '8px'; patientHeader.style.marginBottom = '10px';
        patientDiv.appendChild(patientHeader);

        patientSessions.forEach(session => {
            const sessionRow = document.createElement('div');
            sessionRow.style.display = 'flex'; sessionRow.style.justifyContent = 'space-between'; sessionRow.style.padding = '10px'; sessionRow.style.background = 'rgba(255,255,255,0.03)'; sessionRow.style.borderRadius = '8px'; sessionRow.style.marginBottom = '8px'; sessionRow.style.cursor = 'pointer';
            
            const dateText = document.createElement('span'); dateText.style.fontSize = '0.85rem'; dateText.style.color = 'var(--text-secondary)'; dateText.innerText = new Date(session.startTime).toLocaleDateString() + ' ' + new Date(session.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
            const delBtn = document.createElement('button'); delBtn.innerText = '🗑️'; delBtn.style.background = 'none'; delBtn.style.border = 'none'; delBtn.style.cursor = 'pointer'; delBtn.title = 'Delete Session';
            delBtn.addEventListener('click', async (e) => {
                e.stopPropagation(); 
                if(confirm('Delete this session log?')) { await fetch(`/api/sessions/${session._id}`, { method: 'DELETE' }); loadAnalyticsData(); }
            });

            sessionRow.addEventListener('click', () => renderSessionDetails(session));
            sessionRow.appendChild(dateText); sessionRow.appendChild(delBtn); patientDiv.appendChild(sessionRow);
        });
        sidebar.appendChild(patientDiv);
    }
}

function renderSessionDetails(session) {
    const mainView = document.getElementById('analytics-main-view');
    let htmlContent = `<div style="background: rgba(0,0,0,0.3); padding: 20px; border-radius: 15px; margin-bottom: 20px;"><canvas id="emotion-chart"></canvas></div>`;
    if (currentUser.role === 'admin' || globalSnapshotsEnabled) {
        htmlContent += `<h3>Session Snapshots</h3><div id="snapshot-gallery" style="display: flex; gap: 15px; overflow-x: auto; padding: 15px 0; border-top: 1px solid rgba(255,255,255,0.1); margin-top: 10px;"></div>`;
    }
    mainView.innerHTML = htmlContent;
    plotChart(session.emotions);
    if (currentUser.role === 'admin' || globalSnapshotsEnabled) displaySnapshots(session.emotions);
}

function plotChart(emotionsData) {
    const ctx = document.getElementById('emotion-chart').getContext('2d');
    if (emotionChartInstance) emotionChartInstance.destroy();
    const labels = emotionsData.map(e => new Date(e.timestamp).toLocaleTimeString([], {minute: '2-digit', second:'2-digit'}));
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
            scales: { y: { beginAtZero: true, max: 100, ticks: { color: '#a0a0a0' }, grid: { color: 'rgba(255,255,255,0.1)' } }, x: { ticks: { color: '#a0a0a0' }, grid: { display: false } } },
            plugins: { legend: { labels: { color: '#ffffff', boxWidth: 12 }, position: 'bottom', title: { display: true, text: 'Click a label to toggle visibility', color: '#a0a0a0', font: {size: 10} } } }
        }
    });
}

function displaySnapshots(emotionsData) {
    const snapshotGallery = document.getElementById('snapshot-gallery');
    const entries = emotionsData.filter(e => e.image);
    if (entries.length === 0) { snapshotGallery.innerHTML = '<p style="color: var(--text-secondary);">No snapshots captured.</p>'; return; }

    entries.forEach(entry => {
        const wrapper = document.createElement('div'); wrapper.style.minWidth = '120px'; wrapper.style.textAlign = 'center';
        const img = document.createElement('img'); img.src = entry.image; img.style.width = '120px'; img.style.borderRadius = '8px'; img.style.border = '1px solid var(--glass-border)';
        const timeLabel = document.createElement('div'); timeLabel.innerText = new Date(entry.timestamp).toLocaleTimeString([], {minute: '2-digit', second:'2-digit'}); timeLabel.style.fontSize = '0.8rem'; timeLabel.style.color = 'var(--text-secondary)'; timeLabel.style.marginTop = '5px';
        wrapper.appendChild(img); wrapper.appendChild(timeLabel); snapshotGallery.appendChild(wrapper);
    });
}