import { useState } from 'react';

export default function AppointmentBooking({ currentUser }) {
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedTime, setSelectedTime] = useState(null);
    const [isBooked, setIsBooked] = useState(false);

    // Mock time slots - in a real app, these would come from your backend!
    const timeSlots = [
        "09:00 AM", "10:00 AM", "11:30 AM", 
        "01:00 PM", "02:30 PM", "04:00 PM"
    ];

    const handleBooking = async (e) => {
        e.preventDefault();
        if (!selectedDate || !selectedTime) return;

        try {
            const response = await fetch('/api/appointments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    patientId: currentUser.id, 
                    // In a fully built app, you'd select the therapist. 
                    // For now, we'll link it to the patient's assigned therapist if available, or leave it null.
                    therapistId: currentUser.therapistId || null, 
                    date: selectedDate, 
                    time: selectedTime 
                })
            });
            const data = await response.json();
            
            if (data.success) {
                setIsBooked(true);
            }
        } catch (error) {
            console.error("Booking failed:", error);
            alert("Error booking appointment. Please try again.");
        }
    };

    // --- SUCCESS STATE ---
    if (isBooked) {
        return (
            <div className="dynamic-glass-panel content-box text-center" style={{ padding: '50px', maxWidth: '600px' }}>
                <h1 style={{ fontSize: '4rem', margin: '0 0 20px 0' }}>✅</h1>
                <h2 style={{ color: '#00ff88', marginBottom: '15px' }}>Appointment Confirmed!</h2>
                <p style={{ color: 'var(--text-secondary)' }}>
                    Your session is booked for <strong style={{color: '#fff'}}>{selectedDate}</strong> at <strong style={{color: '#fff'}}>{selectedTime}</strong>.
                </p>
                <button onClick={() => setIsBooked(false)} className="glass-btn primary-btn" style={{ marginTop: '30px' }}>
                    Book Another Session
                </button>
            </div>
        );
    }

    // --- BOOKING FORM STATE ---
    return (
        <div className="dynamic-glass-panel content-box" style={{ width: '100%', maxWidth: '800px', padding: '40px', textAlign: 'left' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '10px' }}>Schedule a Session</h2>
            <hr style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '10px 0 30px 0' }} />
            
            <form onSubmit={handleBooking}>
                {/* Date Picker */}
                <div className="input-group" style={{ marginBottom: '30px' }}>
                    <label style={{ fontSize: '1.1rem', color: '#fff' }}>1. Select a Date</label>
                    <input 
                        type="date" 
                        className="glass-input" 
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]} // Prevents booking in the past
                        style={{ marginTop: '10px', colorScheme: 'dark', cursor: 'pointer' }}
                        required
                    />
                </div>

                {/* Time Slot Grid */}
                <div className="input-group" style={{ marginBottom: '40px' }}>
                    <label style={{ fontSize: '1.1rem', color: '#fff', display: 'block', marginBottom: '15px' }}>
                        2. Select a Time Slot
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '15px' }}>
                        {timeSlots.map((time, index) => (
                            <div 
                                key={index}
                                onClick={() => setSelectedTime(time)}
                                style={{
                                    padding: '15px 10px',
                                    textAlign: 'center',
                                    borderRadius: '10px',
                                    cursor: 'pointer',
                                    background: selectedTime === time ? 'rgba(0, 255, 136, 0.2)' : 'rgba(0,0,0,0.3)',
                                    border: selectedTime === time ? '1px solid #00ff88' : '1px solid rgba(255,255,255,0.1)',
                                    color: selectedTime === time ? '#00ff88' : 'var(--text-secondary)',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                {time}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Submit Button */}
                <button 
                    type="submit" 
                    className="glass-btn submit-btn" 
                    style={{ 
                        padding: '15px', 
                        fontSize: '1.1rem', 
                        background: (selectedDate && selectedTime) ? 'rgba(0, 255, 136, 0.2)' : 'rgba(255,255,255,0.05)',
                        borderColor: (selectedDate && selectedTime) ? '#00ff88' : 'rgba(255,255,255,0.1)',
                        color: (selectedDate && selectedTime) ? '#fff' : 'var(--text-secondary)'
                    }}
                    disabled={!selectedDate || !selectedTime}
                >
                    Confirm Booking
                </button>
            </form>
        </div>
    );
}