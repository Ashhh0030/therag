// --- NAVBAR REVEAL EFFECT ---
const navBar = document.getElementById('nav-bar');

navBar.addEventListener('mousemove', (e) => {
    // Get the cursor position relative to the navbar itself
    const rect = navBar.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Update the CSS variables to move the radial mask
    navBar.style.setProperty('--mouse-x', `${x}px`);
    navBar.style.setProperty('--mouse-y', `${y}px`);
});

navBar.addEventListener('mouseleave', () => {
    // Throw the mask far off-screen when the mouse leaves the navbar
    navBar.style.setProperty('--mouse-x', `-1000px`);
    navBar.style.setProperty('--mouse-y', `-1000px`);
});

// --- EXISTING BACKGROUND LOGIC BELOW ---

const canvas = document.getElementById('particle-canvas');
const ctx = canvas.getContext('2d');
const cursorGlow = document.getElementById('cursor-glow');

let particlesArray = [];
const SPACING = 30; 
const BASE_FLAKE_RADIUS = 350; 
const MAX_LENGTH = 14; 
const DOT_SIZE = 2; 
const LIFESPAN_MS = 2000; 

// Base dot opacity and maximum flake opacity
const BASE_OPACITY = 0.35; 
const MAX_OPACITY = 0.90; 

let mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
let delayedMouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

window.addEventListener('mousemove', function(event) {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
    
    if(cursorGlow) {
        cursorGlow.style.left = event.clientX + 'px';
        cursorGlow.style.top = event.clientY + 'px';
    }
});

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    init(); 
});

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

    delayedMouse.x += (mouse.x - delayedMouse.x) * 0.05;
    delayedMouse.y += (mouse.y - delayedMouse.y) * 0.05;

    for (let i = 0; i < particlesArray.length; i++) {
        particlesArray[i].draw(time);
    }

    requestAnimationFrame(animate);
}

init();
animate();

// --- EXISTING LOGIN LOGIC BELOW THIS LINE ---

const showLoginBtn = document.getElementById('show-login-btn');
const closeLoginBtn = document.getElementById('close-login-btn');
const loginModal = document.getElementById('login-modal');
const loginForm = document.getElementById('login-form');
const landingPage = document.getElementById('landing-page');
const dashboard = document.getElementById('dashboard');
const dashboardTitle = document.getElementById('dashboard-title');
const logoutBtn = document.getElementById('logout-btn');
const tabBtns = document.querySelectorAll('.tab-btn');

let currentRole = 'therapist'; 

showLoginBtn.addEventListener('click', () => loginModal.classList.remove('hidden'));
closeLoginBtn.addEventListener('click', () => loginModal.classList.add('hidden'));

tabBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        tabBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentRole = e.target.getAttribute('data-role');
    });
});

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const userid = document.getElementById('userid').value;
    const password = document.getElementById('password').value;

    if (currentRole === 'therapist' && userid === 'therapist' && password === '12345678') {
        alert('Login Successful!');
        showDashboard('Therapist Dashboard');
    } else if (currentRole === 'patient') {
        alert('Patient login will be implemented in the database phase.');
    } else {
        alert('Invalid credentials.');
    }
});

function showDashboard(title) {
    loginModal.classList.add('hidden');
    landingPage.classList.add('hidden');
    dashboard.classList.remove('hidden');
    dashboardTitle.innerText = title;
}

logoutBtn.addEventListener('click', () => {
    dashboard.classList.add('hidden');
    landingPage.classList.remove('hidden');
    loginForm.reset();
});