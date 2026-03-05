import VideoRoom from './components/VideoRoom';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import ManagementPanel from './components/ManagementPanel';
import Chatbot from './components/Chatbot';
import AppointmentBooking from './components/AppointmentBooking';
import DashboardHome from './components/DashboardHome';
import { useState, useRef } from 'react';
import BackgroundEffects from './components/BackgroundEffects';
import LoginModal from './components/LoginModal';
import Sidebar from './components/Sidebar'; // <-- Import the Sidebar
import './index.css';

function App() {
  // Initialize state by checking LocalStorage first!
  const [currentUser, setCurrentUser] = useState(() => {
      const savedUser = localStorage.getItem('therasense_user');
      return savedUser ? JSON.parse(savedUser) : null;
  });
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  
  // NEW: State to track which page the user is currently viewing
  const [currentView, setCurrentView] = useState('dashboard'); 
  
  const containerRef = useRef(null);

  const handleMouseMove = (e) => {
    document.documentElement.style.setProperty('--mouse-x', `${e.clientX}px`);
    document.documentElement.style.setProperty('--mouse-y', `${e.clientY}px`);
    if (containerRef.current) {
      containerRef.current.style.setProperty('--mouse-x', `${e.clientX}px`);
      containerRef.current.style.setProperty('--mouse-y', `${e.clientY}px`);
    }
  };

  const handleStartLogin = () => {
    setIsPulling(true);
    setTimeout(() => {
      setShowLoginModal(true);
      setIsPulling(false);
    }, 550);
  };

  const handleLogout = () => {
    localStorage.removeItem('therasense_user'); // Erase from browser memory
    setCurrentUser(null);
    setCurrentView('dashboard'); 
  };

  return (
    <div ref={containerRef} onMouseMove={handleMouseMove} style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <BackgroundEffects />
      
      <div style={{ position: 'relative', zIndex: 10, width: '100%', height: '100%' }}>
          {!currentUser ? (
              <main className="container">
                  <header className="dynamic-glass-header">
                      <div className="logo">TheraSense</div>
                  </header>

                  {!showLoginModal ? (
                      <>
                        <div className={`dynamic-glass-panel content-box ${isPulling ? 'pull-together' : ''}`} style={{ '--pull-distance': '100px' }}>
                            <h1>Welcome to TheraSense</h1>
                            <p>Enhancing remote mental health care through emotion-aware technology.</p>
                        </div>
                        
                        <div className={`action-area ${isPulling ? 'pull-together' : ''}`} style={{ '--pull-distance': '-200px' }}>
                            <button onClick={handleStartLogin} className="glass-btn primary-btn">Login to Platform</button>
                        </div>
                      </>
                  ) : (
                      <div className="dynamic-glass-panel login-box login-emerge">
                        <LoginModal 
                          onLoginSuccess={(user) => { 
                              localStorage.setItem('therasense_user', JSON.stringify(user)); // Save to browser
                              setCurrentUser(user); 
                              setShowLoginModal(false); 
                          }} 
                          onCancel={() => setShowLoginModal(false)} 
                      />
                      </div>
                  )}
              </main>
          ) : (
              // --- LOGGED IN DASHBOARD AREA ---
              <main className="container" style={{ alignItems: 'center', justifyContent: 'center' }}>
                  
                  {/* Notice how the Sidebar is placed inside the Header! */}
                  <header className="dynamic-glass-header" style={{ justifyContent: 'flex-start' }}>
                      <Sidebar 
                          role={currentUser.role} 
                          onNavigate={setCurrentView} 
                          onLogout={handleLogout} 
                      />
                      <div className="logo">TheraSense</div>
                  </header>

                  {/* DYNAMIC RENDERING: React swaps this content based on the Sidebar! */}
                  {currentView === 'dashboard' && (
                    <>
                        {/* Patients just see a welcome message, Therapists/Admins see their Control Panel */}
                        <>
                          {currentUser.role === 'patient' ? (
                              <DashboardHome currentUser={currentUser} />
                          ) : (
                              <ManagementPanel currentUser={currentUser} />
                          )}
                        </>
                    </>
                )}

{/* We also want the Admin's "System Settings" sidebar link to show this panel */}
{currentView === 'settings' && (
    <ManagementPanel currentUser={currentUser} />
)}

                  {currentView === 'teleconsultation' && (
                    <VideoRoom 
                        currentUser={currentUser} 
                        snapshotsEnabled={true} // Or map this to a state if you load it from settings
                    />
                )}

                {/* Renders the Analytics component for all roles that view history */}
                {(currentView === 'reports' || currentView === 'history' || currentView === 'global_logs') && (
                    <AnalyticsDashboard 
                        currentUser={currentUser} 
                        snapshotsEnabled={true} 
                    />
                )}

                  {currentView === 'booking' && (
                      <AppointmentBooking currentUser={currentUser} />
                  )}
                  
                  {currentView === 'chatbot' && (
                      <Chatbot />
                  )}
              </main>
          )}
      </div>
    </div>
  );
}

export default App;