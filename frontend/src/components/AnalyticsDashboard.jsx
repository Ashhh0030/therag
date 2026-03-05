import { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// We must register the Chart.js components in React before using them
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

export default function AnalyticsDashboard({ currentUser, snapshotsEnabled }) {
    const [sessions, setSessions] = useState([]);
    const [selectedSession, setSelectedSession] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSessions();
    }, [currentUser]);

    const fetchSessions = async () => {
        try {
            // Admin sees all, Therapist/Patient sees filtered (simplified for frontend)
            const url = currentUser.role === 'admin' 
                ? '/api/sessions' 
                : `/api/sessions?therapistId=${currentUser.id}`;
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.success) {
                setSessions(data.sessions);
            }
        } catch (error) {
            console.error("Error loading analytics:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation(); // Prevent clicking the row from selecting the session
        if (window.confirm('Delete this session log?')) {
            await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
            if (selectedSession && selectedSession._id === id) setSelectedSession(null);
            fetchSessions();
        }
    };

    // --- Chart Data Preparation ---
    // --- Chart Data Preparation ---
    const getChartData = (emotionsData) => {
        const labels = emotionsData.map(e => new Date(e.timestamp).toLocaleTimeString([], {minute: '2-digit', second:'2-digit'}));
        const extract = (emotion) => emotionsData.map(e => (e.expressions[emotion] * 100).toFixed(1));

        return {
            labels,
            datasets: [
                { label: 'Happy', data: extract('happy'), borderColor: '#00ff88', backgroundColor: 'rgba(0, 255, 136, 0.1)', tension: 0.4 },
                { label: 'Sad', data: extract('sad'), borderColor: '#00ccff', backgroundColor: 'rgba(0, 204, 255, 0.1)', tension: 0.4 },
                { label: 'Neutral', data: extract('neutral'), borderColor: '#a0a0a0', backgroundColor: 'rgba(160, 160, 160, 0.1)', tension: 0.4 },
                { label: 'Angry', data: extract('angry'), borderColor: '#ff4444', backgroundColor: 'rgba(255, 68, 68, 0.1)', tension: 0.4, hidden: true },
                { label: 'Fearful', data: extract('fearful'), borderColor: '#ff9900', backgroundColor: 'rgba(255, 153, 0, 0.1)', tension: 0.4, hidden: true },
                { label: 'Disgusted', data: extract('disgusted'), borderColor: '#9933ff', backgroundColor: 'rgba(153, 51, 255, 0.1)', tension: 0.4, hidden: true },
                { label: 'Surprised', data: extract('surprised'), borderColor: '#ffff00', backgroundColor: 'rgba(255, 255, 0, 0.1)', tension: 0.4, hidden: true }
            ]
        };
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: { 
            y: { beginAtZero: true, max: 100, ticks: { color: '#a0a0a0' }, grid: { color: 'rgba(255,255,255,0.1)' } }, 
            x: { ticks: { color: '#a0a0a0' }, grid: { display: false } } 
        },
        plugins: { 
            legend: { labels: { color: '#ffffff', boxWidth: 12 }, position: 'bottom' } 
        }
    };

    // Group sessions by roomId (Patient ID) for the sidebar
    const groupedSessions = sessions.reduce((acc, session) => { 
        if(!acc[session.roomId]) acc[session.roomId] = []; 
        acc[session.roomId].push(session); 
        return acc; 
    }, {});

    return (
        <div className="dynamic-glass-panel content-box" style={{ width: '100%', maxWidth: '1200px', display: 'flex', gap: '30px', padding: '30px', minHeight: '600px', textAlign: 'left' }}>
            
            {/* LEFT SIDEBAR: Session List */}
            <div style={{ flex: '1', borderRight: '1px solid rgba(255,255,255,0.1)', paddingRight: '20px', overflowY: 'auto', maxHeight: '550px' }}>
                <h3 style={{ marginBottom: '20px', color: 'var(--text-secondary)' }}>Select Session</h3>
                
                {loading ? <p>Loading data...</p> : sessions.length === 0 ? <p>No sessions recorded.</p> : null}

                {Object.entries(groupedSessions).map(([roomId, patientSessions]) => (
                    <div key={roomId} style={{ marginBottom: '25px' }}>
                        <h4 style={{ color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px', marginBottom: '10px' }}>
                            👤 Room: {roomId}
                        </h4>
                        
                        {patientSessions.map(session => (
                            <div 
                                key={session._id} 
                                onClick={() => setSelectedSession(session)}
                                style={{ 
                                    display: 'flex', justifyContent: 'space-between', padding: '12px', 
                                    background: selectedSession?._id === session._id ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255,255,255,0.03)', 
                                    border: selectedSession?._id === session._id ? '1px solid rgba(0, 255, 136, 0.3)' : '1px solid transparent',
                                    borderRadius: '8px', marginBottom: '8px', cursor: 'pointer', transition: '0.2s'
                                }}
                            >
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    {new Date(session.startTime).toLocaleDateString()} - {new Date(session.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </span>
                                {(currentUser.role === 'admin' || currentUser.role === 'therapist') && (
                                    <button onClick={(e) => handleDelete(e, session._id)} style={{ background: 'none', border: 'none', cursor: 'pointer' }} title="Delete Session">🗑️</button>
                                )}
                            </div>
                        ))}
                    </div>
                ))}
            </div>

            {/* RIGHT MAIN VIEW: Chart & Snapshots */}
            <div style={{ flex: '3', display: 'flex', flexDirection: 'column', overflowY: 'auto', paddingRight: '10px' }}>
                {!selectedSession ? (
                    <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                        <p style={{ color: 'var(--text-secondary)' }}>Select a session from the sidebar to view data.</p>
                    </div>
                ) : (
                    <>
                        {/* The Chart */}
                        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '20px', borderRadius: '15px', marginBottom: '20px', height: '350px' }}>
                            <Line data={getChartData(selectedSession.emotions)} options={chartOptions} />
                        </div>

                        {/* The Snapshot Gallery */}
                        {(currentUser.role === 'admin' || snapshotsEnabled) && (
                            <>
                                <h3>Session Snapshots</h3>
                                <div style={{ display: 'flex', gap: '15px', overflowX: 'auto', padding: '15px 0', borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '10px' }}>
                                    {selectedSession.emotions.filter(e => e.image).length === 0 ? (
                                        <p style={{ color: 'var(--text-secondary)' }}>No snapshots captured for this session.</p>
                                    ) : (
                                        selectedSession.emotions.filter(e => e.image).map((entry, idx) => (
                                            <div key={idx} style={{ minWidth: '120px', textAlign: 'center' }}>
                                                <img src={entry.image} alt="Snapshot" style={{ width: '120px', borderRadius: '8px', border: '1px solid var(--glass-border)' }} />
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '5px' }}>
                                                    {new Date(entry.timestamp).toLocaleTimeString([], {minute: '2-digit', second:'2-digit'})}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}