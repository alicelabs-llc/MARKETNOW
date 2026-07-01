import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

// Components
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import BackgroundOrbs from './components/BackgroundOrbs';
import AuthModal from './components/AuthModal';
import AdminModal from './components/AdminModal';
import { setAuth, getUser } from './api/client';
import { captureAffiliateRef } from './utils/affiliate';

// Pages
import Registry from './pages/Registry';
import SkillDetail from './pages/SkillDetail';
import Vault from './pages/Vault';
import Governance from './pages/Governance';
import Security from './pages/Security';
import Handshake from './pages/Handshake';
import Policies from './pages/Policies';
import Submit from './pages/Submit';
import Dashboard from './pages/Dashboard';
import Pricing from './pages/Pricing';
import AgentLanding from "./pages/AgentLanding";
import Mandates from "./pages/Mandates";
import Trust from "./pages/Trust";
import About from "./pages/About";
import Catalog from "./pages/Catalog";

function App() {
  const [authOpen, setAuthOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);

  // Capture affiliate ref from URL on first load
  useEffect(() => {
    captureAffiliateRef();
  }, []);

  // GitHub Pages SPA fallback:
  // When a user hits /registry directly, GitHub Pages serves 404.html
  // which redirects to /?p=/registry. We need to convert that back to
  // the real path so React Router can handle it.
  // SECURITY: strict validation — only allow relative paths starting with '/'
  // and NOT starting with '//', '/\', or protocol-relative URLs. Prevents
  // open-redirect phishing via ?p=//evil.com
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const p = params.get('p');
    if (p) {
      // Strict allowlist of known internal routes
      const ALLOWED_ROUTES = [
        '/registry', '/vault', '/governance', '/security',
        '/handshake', '/policies', '/submit', '/pricing', '/dashboard', '/mandates',
        '/trust', '/about', '/catalog',
      ];
      // Allow /skill/:id pattern (starts with /skill/)
      const isSkillRoute = p.startsWith('/skill/') && p.length > 7 && p.length < 100;
      const isAllowedRoute = ALLOWED_ROUTES.includes(p);

      if (isAllowedRoute || isSkillRoute) {
        params.delete('p');
        const remaining = params.toString();
        const newUrl = p + (remaining ? '?' + remaining : '');
        window.history.replaceState({}, '', newUrl);
      } else {
        // Reject anything else — redirect to home
        console.warn('Rejected suspicious ?p= parameter:', p);
        window.history.replaceState({}, '', '/');
      }
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
          <Route path="/" element={<AgentLanding />} />
          <Route path="/skills" element={<Navigate to="/registry" replace />} />
          <Route path="/registry" element={<Registry />} />
          <Route path="/skill/:id" element={<SkillDetail />} />
          <Route path="/vault" element={<Vault />} />
          <Route path="/governance" element={<Governance />} />
          <Route path="/security" element={<Security />} />
          <Route path="/handshake" element={<Handshake />} />
          <Route path="/policies" element={<Policies />} />
          <Route path="/submit" element={<Submit />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/agents" element={<AgentLanding />} />
          <Route path="/mandates" element={<Mandates />} />
          <Route path="/trust" element={<Trust />} />
          <Route path="/about" element={<About />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/dashboard" element={<Dashboard />} />
          {/* /dashboard is now publicly accessible */}
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

