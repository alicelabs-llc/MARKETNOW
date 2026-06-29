import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

// Components
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import BackgroundOrbs from './components/BackgroundOrbs';
import AuthModal from './components/AuthModal';
import AdminModal from './components/AdminModal';
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
  const [adminOpen, setAdminOpen] = useState(false);

  // GitHub Pages SPA fallback:
  // When a user hits /registry directly, GitHub Pages serves 404.html
  // which redirects to /?p=/registry. We need to convert that back to
  // the real path so React Router can handle it.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const p = params.get('p');
    if (p) {
      // Remove ?p= from URL and replace with the actual path
      params.delete('p');
      const remaining = params.toString();
      const newUrl = p + (remaining ? '?' + remaining : '');
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  // Check URL params for login trigger
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('login') === 'true') {
      setAuthOpen(true);
      window.history.replaceState({}, '', '/');
    }
  }, []);

  // Listen for secret admin trigger event
  useEffect(() => {
    const handler = () => setAdminOpen(true);
    window.addEventListener('open-admin', handler);
    return () => window.removeEventListener('open-admin', handler);
  }, []);

  const handleAuthSuccess = () => {
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
          {/* /dashboard is intentionally removed — access only via secret trigger */}
          <Route path="/dashboard" element={<Navigate to="/" replace />} />
        </Routes>

        <AuthModal
          isOpen={authOpen}
          onClose={() => setAuthOpen(false)}
          onAuthSuccess={handleAuthSuccess}
        />

        {/* Hidden admin panel — only visible after secret trigger */}
        <AdminModal
          isOpen={adminOpen}
          onClose={() => setAdminOpen(false)}
        />
      </div>
    </BrowserRouter>
  );
}

export default App;
