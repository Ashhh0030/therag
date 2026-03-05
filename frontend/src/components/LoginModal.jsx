import { useState } from 'react';

export default function LoginModal({ onLoginSuccess, onCancel }) {
    // React State to keep track of what the user is typing
    const [role, setRole] = useState('therapist');
    const [userId, setUserId] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        
        try {
            // Because of our Vite proxy, this securely hits your Node.js backend!
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: userId, password, role })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Pass the data back up to App.jsx
                onLoginSuccess(data.user, data.snapshotsEnabled);
            } else {
                setError('Invalid credentials. Please try again.');
            }
        } catch (err) {
            setError('Server error connecting to backend.');
        }
    };

    // Inside LoginModal.jsx
    return (
        <div style={{ width: '100%' }}>
            <h2>Sign In</h2>
            <div className="tabs">
                <button className={`glass-btn tab-btn ${role === 'therapist' ? 'active' : ''}`} onClick={() => setRole('therapist')}>Therapist</button>
                <button className={`glass-btn tab-btn ${role === 'patient' ? 'active' : ''}`} onClick={() => setRole('patient')}>Patient</button>
            </div>
        
            {error && <p style={{ color: '#ff4444', fontSize: '0.8rem' }}>{error}</p>}
        
            <form onSubmit={handleSubmit}>
                <div className="input-group">
                    <label>User ID</label>
                    <input type="text" className="glass-input" value={userId} onChange={(e) => setUserId(e.target.value)} required />
                </div>
                <div className="input-group">
                    <label>Password</label>
                    <input type="password" className="glass-input" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <button type="submit" className="glass-btn submit-btn">Login</button>
            </form>
            <button onClick={onCancel} className="glass-btn close-btn">Back</button>
        </div>
    );
}