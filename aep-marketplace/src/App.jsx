import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

// Components
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import BackgroundOrbs from './components/BackgroundOrbs';
import AuthModal from './components/AuthModal';
import { setAuth, getUser } from './api/client';

// Pages
import Registry from './pages/Registry';
import SkillDetail from './pages/SkillDetail';
import Vault from './pages/Vault';
import Governance from './pages/Governance';
import Security from './pages/Security';
import Handshake from './pages/Handshake';
import Policies from './pages/Policies';

function App() {
  const [authOpen, setAuthOpen] = useState(false);

  // Check URL params for login trigger
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('login') === 'true') {
      setAuthOpen(true);
      // Clean URL
      window.history.replaceState({}, '', '/');
    }
  }, []);

  const handleAuthSuccess = (userData) => {
    window.dispatchEvent(new Event('auth-change'));
  };

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-black text-white overflow-x-hidden">
        <BackgroundOrbs />

        <Navbar />

        <Routes>
          <Route path="/" element={<Hero onSignIn={() => setAuthOpen(true)} />} />
          <Route path="/skills" element={<Navigate to="/registry" replace />} />
          <Route path="/registry" element={<Registry />} />
          <Route path="/skill/:id" element={<SkillDetail />} />
          <Route path="/vault" element={<Vault />} />
          <Route path="/governance" element={<Governance />} />
          <Route path="/security" element={<Security />} />
          <Route path="/handshake" element={<Handshake />} />
          <Route path="/policies" element={<Policies />} />
        </Routes>

        <AuthModal
          isOpen={authOpen}
          onClose={() => setAuthOpen(false)}
          onAuthSuccess={handleAuthSuccess}
        />
      </div>
    </BrowserRouter>
  );
}

export default App;
