import { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import { io } from 'socket.io-client';

const ROOM_ID = 'therasense-demo-room';
const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';

export default function VideoRoom({ currentUser, snapshotsEnabled }) {
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const wrapperRef = useRef(null);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [callStatus, setCallStatus] = useState('Ready to Join');
    const [socket, setSocket] = useState(null);
    const peerConnectionRef = useRef(null);
    const localStreamRef = useRef(null);
    const [isAudioMuted, setIsAudioMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);

    // 1. Load AI Models on Mount
    useEffect(() => {
        const loadModels = async () => {
            try {
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
                ]);
                setModelsLoaded(true);
            } catch (err) {
                console.error("Failed to load AI models", err);
            }
        };
        loadModels();
    }, []);

    // 2. Setup Socket and WebRTC
    useEffect(() => {
        const newSocket = io(); // Connects via Vite proxy to your backend
        setSocket(newSocket);

        newSocket.on('user-joined', async () => {
            createPeerConnection(newSocket);
            const offer = await peerConnectionRef.current.createOffer();
            await peerConnectionRef.current.setLocalDescription(offer);
            newSocket.emit('offer', { room: ROOM_ID, offer });
        });

        newSocket.on('offer', async (data) => {
            createPeerConnection(newSocket);
            await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.offer));
            const answer = await peerConnectionRef.current.createAnswer();
            await peerConnectionRef.current.setLocalDescription(answer);
            newSocket.emit('answer', { room: ROOM_ID, answer });
        });

        newSocket.on('answer', async (data) => {
            await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
        });

        newSocket.on('ice-candidate', async (data) => {
            if (peerConnectionRef.current) {
                await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
            }
        });

        return () => {
            newSocket.disconnect();
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const createPeerConnection = (currentSocket) => {
        const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
        peerConnectionRef.current = pc;

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current));
        }

        pc.ontrack = (event) => {
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = event.streams[0];
                setCallStatus('Connected!');
            }
        };

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                currentSocket.emit('ice-candidate', { room: ROOM_ID, candidate: event.candidate });
            }
        };
    };

    // --- CALL CONTROLS ---
    const toggleAudio = () => {
        if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsAudioMuted(!audioTrack.enabled);
            }
        }
    };

    const toggleVideo = () => {
        if (localStreamRef.current) {
            const videoTrack = localStreamRef.current.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsVideoOff(!videoTrack.enabled);
            }
        }
    };

    const endCall = () => {
        // 1. Stop all hardware tracks (turns off the camera light)
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
        }
        // 2. Close the Peer-to-Peer connection
        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
        }
        // 3. Tell the backend the session is over (triggers saving data to DB)
        if (socket) {
            socket.emit('end-session', ROOM_ID);
        }
        // 4. Clear the video elements and reset UI state
        if (localVideoRef.current) localVideoRef.current.srcObject = null;
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
        
        setCallStatus('Ready to Join');
        setIsAudioMuted(false);
        setIsVideoOff(false);
    };

    const startCall = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            localStreamRef.current = stream;
            if (localVideoRef.current) localVideoRef.current.srcObject = stream;
            
            setCallStatus('Waiting for peer...');
            socket.emit('join-room', { 
                roomId: ROOM_ID, 
                therapistId: currentUser.role === 'therapist' ? currentUser.id : null 
            });
        } catch (error) {
            alert('Could not access camera/microphone.');
        }
    };

    // 3. AI HUD Drawing Logic
    const handleRemoteVideoPlay = () => {
        if (!modelsLoaded || !remoteVideoRef.current || !wrapperRef.current) return;

        const video = remoteVideoRef.current;
        const canvas = faceapi.createCanvasFromMedia(video);
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.borderRadius = '12px';
        wrapperRef.current.append(canvas);

        const displaySize = { width: video.clientWidth, height: video.clientHeight };
        faceapi.matchDimensions(canvas, displaySize);
        const ctx = canvas.getContext('2d');
        let frameCounter = 0;

        const interval = setInterval(async () => {
            if (video.paused || video.ended) return;
            
            const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
                                          .withFaceLandmarks()
                                          .withFaceExpressions();
            const resizedDetections = faceapi.resizeResults(detections, displaySize);
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (resizedDetections.length > 0) {
                const detection = resizedDetections[0];
                const { x, y, width, height } = detection.detection.box;
                const expressions = detection.expressions;

                // Sci-Fi HUD Overlay
                ctx.strokeStyle = '#00ff88'; ctx.lineWidth = 2; ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 8;
                const len = 20;
                ctx.beginPath();
                ctx.moveTo(x, y + len); ctx.lineTo(x, y); ctx.lineTo(x + len, y);
                ctx.moveTo(x + width - len, y); ctx.lineTo(x + width, y); ctx.lineTo(x + width, y + len);
                ctx.moveTo(x + width, y + height - len); ctx.lineTo(x + width, y + height); ctx.lineTo(x + width - len, y + height);
                ctx.moveTo(x, y + height - len); ctx.lineTo(x, y + height); ctx.lineTo(x + len, y + height);
                ctx.stroke();

                ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'; ctx.lineWidth = 1; ctx.strokeRect(x, y, width, height);

                // Emotion Data Box
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
                    ctx.fillStyle = index === 0 ? '#00ff88' : '#a0a0a0'; 
                    ctx.fillText(`${emotion.toUpperCase()}:`, finalPanelX + 12, textY);
                    ctx.textAlign = 'right'; ctx.fillText(`${Math.round(value * 100)}%`, finalPanelX + panelWidth - 12, textY);
                    ctx.textAlign = 'left'; textY += 16; 
                });

                // Send data to backend
                let snapshot = null;
                // Removed snapshotsEnabled - it will now ALWAYS capture images for the database
                if (frameCounter % 50 === 0 && socket) {
                    const snapCanvas = document.createElement('canvas');
                    snapCanvas.width = video.videoWidth; snapCanvas.height = video.videoHeight;
                    snapCanvas.getContext('2d').drawImage(video, 0, 0, snapCanvas.width, snapCanvas.height);
                    snapshot = snapCanvas.toDataURL('image/jpeg', 0.5); 
                }
                frameCounter++;
                if (socket) socket.emit('emotion-update', { room: ROOM_ID, expressions, image: snapshot });
            }
        }, 100);

        return () => clearInterval(interval);
    };

    return (
        <div className="dynamic-glass-panel content-box text-center">
            <h2>Live Teleconsultation</h2>
            <hr style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '20px 0' }} />
            
            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginTop: '20px', flexWrap: 'wrap' }}>
                <video 
                    ref={localVideoRef} 
                    autoPlay 
                    muted 
                    style={{ transform: 'scaleX(-1)', width: '300px', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.5)' }}
                />
                
                <div ref={wrapperRef} style={{ position: 'relative', width: '300px', height: 'fit-content' }}>
                    <video 
                        ref={remoteVideoRef} 
                        autoPlay 
                        onPlay={handleRemoteVideoPlay}
                        style={{ width: '100%', borderRadius: '12px', border: '1px solid var(--glass-border)', display: 'block', background: 'rgba(0,0,0,0.5)' }}
                    />
                </div>
            </div>

            {/* Call Controls Bar */}
            <div style={{ marginTop: '30px', display: 'flex', gap: '15px', justifyContent: 'center' }}>
                {callStatus === 'Ready to Join' ? (
                    <button 
                        onClick={startCall} 
                        className="glass-btn primary-btn"
                        disabled={!modelsLoaded}
                    >
                        {!modelsLoaded ? 'Loading AI...' : 'Join Call'}
                    </button>
                ) : (
                    <>
                        <button 
                            onClick={toggleAudio} 
                            className="glass-btn" 
                            style={{ backgroundColor: isAudioMuted ? 'rgba(255, 68, 68, 0.2)' : 'var(--glass-bg)' }}
                        >
                            {isAudioMuted ? '🔇 Unmute' : '🎙️ Mute'}
                        </button>
                        
                        <button 
                            onClick={toggleVideo} 
                            className="glass-btn" 
                            style={{ backgroundColor: isVideoOff ? 'rgba(255, 68, 68, 0.2)' : 'var(--glass-bg)' }}
                        >
                            {isVideoOff ? '🚫 Video Off' : '📷 Video On'}
                        </button>
                        
                        <button 
                            onClick={endCall} 
                            className="glass-btn" 
                            style={{ backgroundColor: 'rgba(255, 68, 68, 0.2)', borderColor: '#ff4444', color: '#ff4444' }}
                        >
                            ❌ End Call
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}