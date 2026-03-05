import { useState, useEffect } from 'react';

export default function DashboardHome({ currentUser }) {
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAppointments = async () => {
            try {
                const response = await fetch(`/api/appointments/${currentUser.id}`);
                const data = await response.json();
                if (data.success) {
                    setAppointments(data.appointments);
                }
            } catch (error) {
                console.error("Failed to fetch appointments", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAppointments();
    }, [currentUser.id]);

    return (
        <div className="dynamic-glass-panel content-box" style={{ width: '100%', maxWidth: '800px', padding: '40px', textAlign: 'left' }}>
            <h2 style={{ color: '#00ff88', marginBottom: '10px' }}>Welcome back, {currentUser.username}</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '30px' }}>Here is an overview of your upcoming schedule.</p>

            <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px', marginBottom: '20px' }}>
                📅 Upcoming Appointments
            </h3>

            {loading ? (
                <p>Loading your schedule...</p>
            ) : appointments.length === 0 ? (
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '30px', borderRadius: '12px', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.1)' }}>
                    <p style={{ color: 'var(--text-secondary)' }}>You have no upcoming appointments.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {appointments.map((apt) => (
                        <div key={apt._id} style={{ 
                            background: 'rgba(255,255,255,0.05)', 
                            borderLeft: '4px solid #00ff88', 
                            padding: '20px', 
                            borderRadius: '8px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div>
                                <h4 style={{ margin: '0 0 5px 0', fontSize: '1.1rem' }}>{new Date(apt.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</h4>
                                <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{apt.time}</p>
                            </div>
                            <div style={{ background: 'rgba(0, 255, 136, 0.1)', color: '#00ff88', padding: '5px 15px', borderRadius: '20px', fontSize: '0.85rem' }}>
                                {apt.status}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}