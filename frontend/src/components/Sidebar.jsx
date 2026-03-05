import { useState } from 'react';

export default function Sidebar({ role, onNavigate, onLogout }) {
    const [isOpen, setIsOpen] = useState(false);

    // Helper to close sidebar after clicking a link
    const handleNav = (view) => {
        onNavigate(view);
        setIsOpen(false);
    };

    return (
        <>
            {/* The Hamburger Button */}
            <button 
                onClick={() => setIsOpen(true)} 
                className="glass-btn" 
                style={{ padding: '8px 15px', marginRight: '20px', fontSize: '1.5rem', border: 'none', background: 'transparent', boxShadow: 'none' }}
            >
                ☰
            </button>

            {/* The Sliding Menu */}
            <div className={`side-nav ${isOpen ? 'open' : ''}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '20px' }}>
                    <h2 style={{ margin: 0, color: '#fff' }}>Menu</h2>
                    <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.8rem', cursor: 'pointer' }}>✕</button>
                </div>

                // Inside Sidebar.jsx, update the menu links section:

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {/* ADD THIS NEW BUTTON HERE FOR ALL ROLES */}
                    <button className="glass-btn nav-item" onClick={() => handleNav('dashboard')}>
                        🏠 Dashboard Home
                    </button>

                    {/* The rest of your role-specific buttons remain exactly the same */}
                    {role === 'patient' && (
                        <>
                            <button className="glass-btn nav-item" onClick={() => handleNav('teleconsultation')}>🎥 Teleconsultation Room</button>
                            <button className="glass-btn nav-item" onClick={() => handleNav('booking')}>📅 Appointment Booking</button>
                            <button className="glass-btn nav-item" onClick={() => handleNav('chatbot')}>🤖 Chatbot Assistant</button>
                            <button className="glass-btn nav-item" onClick={() => handleNav('reports')}>📊 Session Reports</button>
                        </>
                    )}
                    {role === 'therapist' && (
                        <>
                            <button className="glass-btn nav-item" onClick={() => handleNav('teleconsultation')}>🎥 Teleconsultation Room</button>
                            <button className="glass-btn nav-item" onClick={() => handleNav('history')}>📊 Session History</button>
                        </>
                    )}
                    {role === 'admin' && (
                        <>
                            <button className="glass-btn nav-item" onClick={() => handleNav('settings')}>⚙️ System Settings</button>
                            <button className="glass-btn nav-item" onClick={() => handleNav('global_logs')}>📊 Global Session Logs</button>
                        </>
                    )}
                </div>

                <div style={{ marginTop: 'auto' }}>
                    <button onClick={onLogout} className="glass-btn close-btn" style={{ width: '100%' }}>Logout</button>
                </div>
            </div>
        </>
    );
}