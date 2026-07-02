import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState, useEffect, useRef, useCallback } from 'react';
import { isAuthenticated, getUser, logout } from '../api/client';
import AuthModal from './AuthModal';

// Grouped nav structure with dropdowns
const NAV_GROUPS = [
  {
    label: 'MARKETPLACE',
    items: [
      { path: '/registry', label: 'Browse Skills' },
      { path: '/submit', label: 'Publish a Skill' },
      { path: '/pricing', label: 'Pricing' },
    ],
  },
  {
    label: 'TRUST',
    items: [
      { path: '/trust', label: 'Trust Roadmap' },
      { path: '/standards', label: 'Standards (x402, AP2)' },
      { path: '/security', label: 'Sentinel L1.5' },
      { path: '/sentinel-roadmap', label: 'Sentinel Roadmap (L2+)' },
      { path: '/compare', label: 'vs Smithery vs Glama' },
      { path: '/listings', label: 'External Listings' },
    ],
  },
  {
    label: 'RESOURCES',
    items: [
      { path: '/blog', label: 'Blog' },
      { path: '/buyers-guide', label: 'Buyer\'s Guide' },
      { path: '/onboarding', label: 'Seller Onboarding' },
      { path: '/catalog', label: 'Catalog Transparency' },
      { path: '/embed', label: 'Badges' },
      { path: '/handshake', label: 'API Docs' },
      { path: '/policies', label: 'Terms & Policies' },
    ],
  },
  {
    label: 'ACCOUNT',
    items: [
      { path: '/mandates', label: 'Mandates' },
      { path: '/vault', label: 'My Vault' },
      { path: '/dashboard', label: 'Dashboard' },
      { path: '/about', label: 'About Us' },
    ],
  },
];

const CLICK_TARGET = 7;
const CLICK_WINDOW = 4000;

export default function Navbar() {
  const location = useLocation();
  const [authOpen, setAuthOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [openGroup, setOpenGroup] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const clickCountRef = useRef(0);
  const clickTimerRef = useRef(null);
  const dropdownRef = useRef(null);

  // Secret trigger: 7 clicks on logo
  const handleLogoClick = useCallback(() => {
    clickCountRef.current += 1;
    if (clickCountRef.current === 1) {
      clickTimerRef.current = setTimeout(() => { clickCountRef.current = 0; }, CLICK_WINDOW);
    }
    if (clickCountRef.current >= CLICK_TARGET) {
      clearTimeout(clickTimerRef.current);
      clickCountRef.current = 0;
      window.dispatchEvent(new CustomEvent('open-admin'));
    }
  }, []);

  // Secret keyboard shortcut: Ctrl+Shift+M
  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'M') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('open-admin'));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (isAuthenticated()) {
      setUser(getUser());
    }
    const handler = () => {
      if (isAuthenticated()) {
        setUser(getUser());
      } else {
        setUser(null);
      }
    };
    window.addEventListener('auth-change', handler);
    return () => window.removeEventListener('auth-change', handler);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpenGroup(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
    setOpenGroup(null);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    setUser(null);
    window.dispatchEvent(new Event('auth-change'));
  };

  const isActive = (path) => {
    if (path === '/registry' && location.pathname.startsWith('/skill')) return true;
    return location.pathname === path;
  };

  const isGroupActive = (group) => {
    return group.items.some(item => isActive(item.path));
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-[1000] bg-black/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-[1440px] mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <button onClick={handleLogoClick} className="flex items-center gap-2 group">
              <img src="/favicon.svg" alt="MarketNow" className="w-8 h-8" />
              <span className="text-white font-bold text-sm tracking-tight hidden sm:block">MarketNow</span>
            </button>
          </div>

          {/* Desktop nav with dropdowns */}
          <div className="hidden lg:flex items-center gap-1" ref={dropdownRef}>
            {NAV_GROUPS.map((group) => (
              <div key={group.label} className="relative">
                <button
                  onClick={() => setOpenGroup(openGroup === group.label ? null : group.label)}
                  onMouseEnter={() => setOpenGroup(group.label)}
                  className={`px-3 py-2 text-xs font-mono tracking-wider transition-colors rounded-lg flex items-center gap-1 ${
                    isGroupActive(group) || openGroup === group.label
                      ? 'text-[#00F299] bg-[#00F299]/5'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {group.label}
                  <span className={`text-[8px] transition-transform ${openGroup === group.label ? 'rotate-180' : ''}`}>▼</span>
                </button>
                {openGroup === group.label && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 mt-1 min-w-[200px] bg-black/95 border border-white/10 rounded-xl shadow-2xl py-2 backdrop-blur-xl"
                    onMouseLeave={() => setOpenGroup(null)}
                  >
                    {group.items.map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`block px-4 py-2 text-xs transition-colors ${
                          isActive(item.path)
                            ? 'text-[#00F299] bg-[#00F299]/5'
                            : 'text-zinc-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </motion.div>
                )}
              </div>
            ))}
          </div>

          {/* Auth section */}
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <span className="text-[#00F299] text-xs font-mono hidden sm:block">
                  {user.username}
                </span>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white border border-white/10 rounded-lg hover:bg-white/5 transition-all"
                >
                  SIGN OUT
                </button>
              </>
            ) : (
              <button
                onClick={() => setAuthOpen(true)}
                className="px-4 py-1.5 text-xs font-bold bg-[#00F299] text-black rounded-lg hover:bg-[#00F299]/90 transition-all"
              >
                SIGN IN
              </button>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 text-white"
            >
              {mobileOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="lg:hidden border-t border-white/5 bg-black/95 max-h-[80vh] overflow-y-auto"
          >
            <div className="px-4 py-4 space-y-4">
              {NAV_GROUPS.map((group) => (
                <div key={group.label}>
                  <div className="text-zinc-600 text-[10px] font-mono tracking-wider mb-2">{group.label}</div>
                  <div className="space-y-1">
                    {group.items.map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`block px-3 py-2 text-sm rounded-lg ${
                          isActive(item.path)
                            ? 'text-[#00F299] bg-[#00F299]/5'
                            : 'text-zinc-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </nav>

      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        onAuthSuccess={() => window.dispatchEvent(new Event('auth-change'))}
      />
    </>
  );
}
