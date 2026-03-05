import { useState, useEffect } from 'react';

export default function ManagementPanel({ currentUser }) {
    // State for Therapist tools
    const [patients, setPatients] = useState([]);
    const [patientId, setPatientId] = useState('');
    const [patientPwd, setPatientPwd] = useState('');

    // State for Admin tools
    const [therapistId, setTherapistId] = useState('');
    const [therapistPwd, setTherapistPwd] = useState('');
    const [snapshotsEnabled, setSnapshotsEnabled] = useState(true);

    useEffect(() => {
        if (currentUser.role === 'therapist') {
            fetchPatients();
        }
    }, [currentUser]);

    const fetchPatients = async () => {
        try {
            const response = await fetch(`/api/patients?therapistId=${currentUser.id}`);
            const data = await response.json();
            if (data.success) setPatients(data.patients);
        } catch (error) {
            console.error("Failed to fetch patients", error);
        }
    };

    const handleCreatePatient = async (e) => {
        e.preventDefault();
        const response = await fetch('/api/patients', {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: patientId, password: patientPwd, therapistId: currentUser.id })
        });
        const data = await response.json();
        if (data.success) {
            alert('Patient created successfully!');
            setPatientId('');
            setPatientPwd('');
            fetchPatients();
        } else {
            alert('Username already exists.');
        }
    };

    const handleCreateTherapist = async (e) => {
        e.preventDefault();
        const response = await fetch('/api/therapists', {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: therapistId, password: therapistPwd })
        });
        const data = await response.json();
        if (data.success) {
            alert('Therapist created successfully!');
            setTherapistId('');
            setTherapistPwd('');
        } else {
            alert('Username already exists.');
        }
    };

    const toggleSnapshots = async () => {
        const newState = !snapshotsEnabled;
        setSnapshotsEnabled(newState);
        await fetch('/api/settings/snapshots', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ enabled: newState }) 
        });
    };

    return (
        <div className="dynamic-glass-panel content-box" style={{ width: '100%', padding: '40px', textAlign: 'left' }}>
            
            {/* ================= THERAPIST VIEW ================= */}
            {currentUser.role === 'therapist' && (
                <>
                    <h2>Therapist Control Panel</h2>
                    <hr style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '20px 0' }} />
                    <div style={{ display: 'flex', gap: '40px', justifyContent: 'space-between' }}>
                        
                        <div style={{ flex: 1 }}>
                            <h3>My Patients</h3>
                            <ul style={{ marginTop: '15px', listStyle: 'none', color: 'var(--text-secondary)' }}>
                                {patients.length === 0 ? <li>No patients registered yet.</li> : 
                                    patients.map(p => (
                                        <li key={p._id} style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            👤 {p.username}
                                        </li>
                                    ))
                                }
                            </ul>
                        </div>

                        <div style={{ flex: 1, borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '40px' }}>
                            <h3>Create Patient Credential</h3>
                            <form onSubmit={handleCreatePatient} style={{ marginTop: '15px' }}>
                                <div className="input-group">
                                    <input type="text" className="glass-input" placeholder="New Patient ID" value={patientId} onChange={e => setPatientId(e.target.value)} required />
                                </div>
                                <div className="input-group">
                                    <input type="password" className="glass-input" placeholder="Temporary Password" value={patientPwd} onChange={e => setPatientPwd(e.target.value)} required />
                                </div>
                                <button type="submit" className="glass-btn submit-btn" style={{ marginTop: '10px' }}>Create Patient</button>
                            </form>
                        </div>
                    </div>
                </>
            )}

            {/* ================= ADMIN VIEW ================= */}
            {currentUser.role === 'admin' && (
                <>
                    <h2>Admin Control Panel</h2>
                    <hr style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '20px 0' }} />
                    <div style={{ display: 'flex', gap: '40px', justifyContent: 'space-between' }}>
                        
                        <div style={{ flex: 1 }}>
                            <h3>System Settings</h3>
                            <div style={{ marginTop: '15px', background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '12px' }}>
                                <p style={{ marginBottom: '10px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Enable or disable Therapist access to session photo snapshots.</p>
                                <button 
                                    onClick={toggleSnapshots} 
                                    className="glass-btn" 
                                    style={{ width: '100%', borderColor: snapshotsEnabled ? '#00ff88' : '#ff4444', color: snapshotsEnabled ? '#00ff88' : '#ff4444' }}
                                >
                                    Snapshots: {snapshotsEnabled ? 'ENABLED' : 'DISABLED'}
                                </button>
                            </div>
                        </div>

                        <div style={{ flex: 1, borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '40px' }}>
                            <h3>Create Therapist Account</h3>
                            <form onSubmit={handleCreateTherapist} style={{ marginTop: '15px' }}>
                                <div className="input-group">
                                    <input type="text" className="glass-input" placeholder="Therapist Username" value={therapistId} onChange={e => setTherapistId(e.target.value)} required />
                                </div>
                                <div className="input-group">
                                    <input type="password" className="glass-input" placeholder="Password" value={therapistPwd} onChange={e => setTherapistPwd(e.target.value)} required />
                                </div>
                                <button type="submit" className="glass-btn submit-btn" style={{ marginTop: '10px' }}>Create Therapist</button>
                            </form>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}