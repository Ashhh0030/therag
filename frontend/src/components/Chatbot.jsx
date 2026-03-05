import { useState, useRef, useEffect } from 'react';

export default function Chatbot() {
    const [messages, setMessages] = useState([
        { id: 1, text: "Hello! I am your AI assistant. How are you feeling today? I'm here to support you between your therapy sessions.", sender: 'ai' }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);

    // Auto-scroll to bottom when a new message is added
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isTyping]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        const userText = inputValue; // Store it before clearing
        
        // 1. Add User Message to UI
        const newUserMsg = { id: Date.now(), text: userText, sender: 'user' };
        setMessages(prev => [...prev, newUserMsg]);
        setInputValue('');
        setIsTyping(true);

        try {
            // 2. Send the message to your Node backend
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userText })
            });
            const data = await response.json();

            // 3. Add AI Response to UI
            const newAiMsg = { id: Date.now() + 1, text: data.text, sender: 'ai' };
            setMessages(prev => [...prev, newAiMsg]);
        } catch (error) {
            const errorMsg = { id: Date.now() + 1, text: "Connection error. Please try again.", sender: 'ai' };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="dynamic-glass-panel content-box" style={{ width: '100%', maxWidth: '800px', padding: '30px', display: 'flex', flexDirection: 'column', height: '600px' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '10px' }}>AI Chatbot Assistant</h2>
            <hr style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '10px 0 20px 0' }} />
            
            {/* Chat History Window */}
            <div style={{ 
                flex: 1, background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '20px', 
                overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px',
                border: '1px solid rgba(255,255,255,0.05)', marginBottom: '20px'
            }}>
                {messages.map((msg) => (
                    <div key={msg.id} style={{
                        alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                        background: msg.sender === 'user' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 255, 136, 0.1)',
                        border: msg.sender === 'user' ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(0, 255, 136, 0.3)',
                        padding: '12px 18px',
                        borderRadius: '15px',
                        maxWidth: '80%',
                        textAlign: 'left',
                        color: '#fff',
                        fontSize: '0.95rem',
                        lineHeight: '1.4'
                    }}>
                        {msg.text}
                    </div>
                ))}
                
                {isTyping && (
                    <div style={{ alignSelf: 'flex-start', color: '#00ff88', fontStyle: 'italic', fontSize: '0.85rem', padding: '10px' }}>
                        AI is typing...
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '10px' }}>
                <input 
                    type="text" 
                    className="glass-input" 
                    placeholder="Type your message..." 
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    style={{ flex: 1, margin: 0 }}
                />
                <button type="submit" className="glass-btn primary-btn" style={{ margin: 0, padding: '0 25px', borderRadius: '8px' }}>
                    Send
                </button>
            </form>
        </div>
    );
}