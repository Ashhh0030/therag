import { useEffect, useRef } from 'react';

export default function BackgroundEffects() {
    const canvasRef = useRef(null);
    const glowRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const cursorGlow = glowRef.current;

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
        let animationFrameId;

        // Mouse tracking for particles and glow
        const handleMouseMove = (event) => {
            mouse.x = event.clientX;
            mouse.y = event.clientY;
            if (cursorGlow) {
                cursorGlow.style.left = event.clientX + 'px';
                cursorGlow.style.top = event.clientY + 'px';
            }
        };

        window.addEventListener('mousemove', handleMouseMove);

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

        const init = () => {
            particlesArray = []; 
            canvas.width = window.innerWidth; 
            canvas.height = window.innerHeight;
            for (let y = -SPACING; y < canvas.height + SPACING; y += SPACING) {
                for (let x = -SPACING; x < canvas.width + SPACING; x += SPACING) { 
                    particlesArray.push(new Particle(x, y)); 
                }
            }
        };

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height); 
            let time = Date.now();
            delayedMouse.x += (mouse.x - delayedMouse.x) * 0.12; 
            delayedMouse.y += (mouse.y - delayedMouse.y) * 0.12;
            for (let i = 0; i < particlesArray.length; i++) particlesArray[i].draw(time);
            animationFrameId = requestAnimationFrame(animate);
        };

        const handleResize = () => {
            canvas.width = window.innerWidth; 
            canvas.height = window.innerHeight; 
            init();
        };
        
        window.addEventListener('resize', handleResize);
        
        init(); 
        animate();

        // CLEANUP: React requires us to clean up event listeners when the component is hidden!
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <>
            <canvas ref={canvasRef} id="particle-canvas"></canvas>
            <div ref={glowRef} id="cursor-glow"></div>
        </>
    );
}