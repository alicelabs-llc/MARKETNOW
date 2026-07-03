import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { isAuthenticated, getUser, logout } from '../api/client';
import AuthModal from './AuthModal';

const navLinks = [
  { path: '/registry', label: 'REGISTRY' },
  { path: '/submit', label: 'SUBMIT SKILL' },
  { path: '/standards', label: 'STANDARDS' },
  { path: '/mandates', label: 'MANDATES' },
  { path: '/trust', label: 'TRUST' },
  { path: '/pricing', label: 'PRICING' },
  { path: '/dashboard', label: 'DASHBOARD' },
  { path: '/vault', label: 'MY VAULT' },
  { path: '/security', label: 'SECURITY' },
  { path: '/about', label: 'ABOUT' },
  { path: '/handshake', label: 'API' },
  { path: '/policies', label: 'POLICIES' },
];

// Admin access shortcuts (no longer 7-click on logo):
//   Primary: Ctrl+Shift+M
//   Easter egg backup: Konami code (↑↑↓↓←→←→BA)
const KONAMI_SEQUENCE = [
  'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
  'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a',
];

function triggerAdmin() {
  window.dispatchEvent(new CustomEvent('open-admin'));
}

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [authOpen, setAuthOpen] = useState(false);
  const [user, setUser] = useState(null);
  const konamiRef = useRef([]);

  // Admin shortcut: Ctrl+Shift+M (primary) + Konami code (easter egg backup)
  useEffect(() => {
    const handler = (e) => {
      // Primary shortcut: Ctrl+Shift+M
      if (e.ctrlKey && e.shiftKey && (e.key === 'M' || e.key === 'm')) {
        e.preventDefault();
        triggerAdmin();
        return;
      }
      // Easter egg backup: Konami code
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      konamiRef.current = [...konamiRef.current, key].slice(-KONAMI_SEQUENCE.length);
      if (konamiRef.current.length === KONAMI_SEQUENCE.length &&
          konamiRef.current.every((k, i) => k === KONAMI_SEQUENCE[i])) {
        triggerAdmin();
        konamiRef.current = [];
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (isAuthenticated()) {
      setUser(getUser());
    }
    // Listen for auth changes
    const handler = () => {
      if (isAuthenticated()) {
        setUser(getUser());
      } else {
        setUser(null);
      }
    };
    window.addEventListener('auth-change', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('auth-change', handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  const handleAuthSuccess = (userData) => {
    setUser(userData);
    window.dispatchEvent(new Event('auth-change'));
  };

  const handleLogout = () => {
    logout();
    setUser(null);
    window.dispatchEvent(new Event('auth-change'));
  };

  // Click on logo OR name → navigate to home (no admin trigger on click)
  const goHome = () => {
    navigate('/');
  };

  return (
    <>
      <nav className="sticky top-0 z-[1000] glass-panel border-b border-white/5">
        <div className="max-w-[1440px] mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo + name — both navigate to home. Admin access via Ctrl+Shift+M or Konami code. */}
          <button
            type="button"
            onClick={goHome}
            className="flex items-center gap-3 shrink-0 cursor-pointer group focus:outline-none"
            title="MarketNow — Go to home (Admin: Ctrl+Shift+M)"
            aria-label="MarketNow home"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00F299] to-[#00d1ff] flex items-center justify-center text-black font-bold text-lg select-none group-hover:scale-105 transition-transform">
              M
            </div>
            <div className="text-left">
              <div className="text-white font-semibold tracking-wide text-sm">
                MARKET<span className="text-[#00F299]">NOW</span>
              </div>
              <div className="text-[10px] text-zinc-500 font-mono tracking-widest">
                AGENT SKILL MARKETPLACE
              </div>
            </div>
          </button>

          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = location.pathname.startsWith(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`relative px-4 py-2 text-xs font-medium tracking-wider rounded-lg transition-all duration-300 ${
                    isActive
                      ? 'text-white bg-white/10'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute bottom-0 left-4 right-4 h-0.5 bg-[#00F299] rounded-full"
                    />
                  )}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-xs text-zinc-400 hidden sm:block">
                  <span className="text-[#00F299] font-mono">{user.username}</span>
                </span>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 border border-white/10 rounded-lg text-xs text-zinc-400 hover:text-white hover:border-white/20 transition-all"
                >
                  LOGOUT
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAuthOpen(true)}
                className="px-5 py-2 bg-[#00F299]/10 border border-[#00F299]/30 rounded-xl text-xs font-semibold tracking-wider text-[#00F299] hover:bg-[#00F299]/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
              >
                SIGN IN
              </button>
            )}

            <Link
              to="/handshake"
              className="hidden sm:flex items-center gap-2 px-5 py-2 border border-[#00F299]/30 rounded-full text-xs font-mono tracking-wider text-[#00F299] hover:bg-[#00F299]/10 hover:border-[#00F299]/50 transition-all duration-300"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#00F299] animate-pulse" />
              API ACCESS
            </Link>
          </div>
        </div>
      </nav>

      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />
    </>
  );
}
