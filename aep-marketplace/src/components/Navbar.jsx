import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { isAuthenticated, getUser, logout } from '../api/client';
import { useLang } from '../context/LanguageContext.jsx';
import AuthModal from './AuthModal';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, lang, toggleLang } = useLang();
  const [authOpen, setAuthOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [openGroup, setOpenGroup] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropdownRef = useRef(null);

  const NAV_GROUPS = [
    {
      label: t('nav.marketplace'),
      items: [
        { path: '/registry', label: t('nav.browse') },
        { path: '/submit', label: t('nav.publish') },
        { path: '/pricing', label: t('nav.pricing') },
      ],
    },
    {
      label: t('nav.trust'),
      items: [
        { path: '/trust', label: t('nav.trustRoadmap') },
        { path: '/standards', label: t('nav.standards') },
        { path: '/security', label: t('nav.sentinel') },
        { path: '/compare', label: t('nav.compare') },
        { path: '/listings', label: t('nav.listings') },
      ],
    },
    {
      label: t('nav.resources'),
      items: [
        { path: '/blog', label: t('nav.blog') },
        { path: '/buyers-guide', label: t('nav.buyersGuide') },
        { path: '/onboarding', label: t('nav.onboarding') },
        { path: '/catalog', label: t('nav.catalog') },
        { path: '/embed', label: t('nav.badges') },
        { path: '/handshake', label: t('nav.apiDocs') },
        { path: '/policies', label: t('nav.terms') },
      ],
    },
    {
      label: t('nav.account'),
      items: [
        { path: '/mandates', label: t('nav.mandates') },
        { path: '/vault', label: t('nav.vault') },
        { path: '/dashboard', label: t('nav.dashboard') },
        { path: '/about', label: t('nav.about') },
      ],
    },
  ];

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
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('auth-change', handler);
      window.removeEventListener('storage', handler);
    };
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

  const handleAuthSuccess = (userData) => {
    setUser(userData);
    window.dispatchEvent(new Event('auth-change'));
  };

  const handleLogout = () => {
    logout();
    setUser(null);
    window.dispatchEvent(new Event('auth-change'));
  };

  const goHome = () => {
    navigate('/');
  };

  const isActive = (path) => {
    if (path === '/registry' && location.pathname.startsWith('/skill')) return true;
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const isGroupActive = (group) => {
    return group.items.some(item => isActive(item.path));
  };

  return (
    <>
      <nav className="sticky top-0 z-[1000] glass-panel border-b border-white/5">
        <div className="max-w-[1440px] mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          {/* Logo + name — click navigates home */}
          <button
            type="button"
            onClick={goHome}
            className="flex items-center gap-2 shrink-0 cursor-pointer group focus:outline-none"
            title={t('nav.goHome')}
            aria-label="MarketNow home"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#00F299] to-[#00d1ff] flex items-center justify-center text-black font-bold text-lg select-none group-hover:scale-105 transition-transform">
              M
            </div>
            <span className="text-white font-bold text-sm tracking-tight hidden sm:block">
              MARKET<span className="text-[#00F299]">NOW</span>
            </span>
          </button>

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

          {/* Auth + language section */}
          <div className="flex items-center gap-2">
            {/* Language toggle */}
            <button
              onClick={toggleLang}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-mono font-bold text-zinc-400 hover:text-[#00F299] border border-white/10 rounded-lg hover:border-[#00F299]/30 transition-all"
              title={lang === 'en' ? 'Cambiar a Español' : 'Switch to English'}
              aria-label="Toggle language"
            >
              <span className="text-sm">{lang === 'en' ? '🇺🇸' : '🇪🇸'}</span>
              <span>{lang.toUpperCase()}</span>
            </button>

            {user ? (
              <>
                <span className="text-[#00F299] text-xs font-mono hidden sm:block">
                  {user.username}
                </span>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white border border-white/10 rounded-lg hover:bg-white/5 transition-all"
                >
                  {t('nav.signOut')}
                </button>
              </>
            ) : (
              <button
                onClick={() => setAuthOpen(true)}
                className="px-4 py-1.5 text-xs font-bold bg-[#00F299] text-black rounded-lg hover:bg-[#00F299]/90 transition-all"
              >
                {t('nav.signIn')}
              </button>
            )}

            <Link
              to="/handshake"
              className="hidden md:flex items-center gap-2 px-4 py-1.5 border border-[#00F299]/30 rounded-full text-xs font-mono tracking-wider text-[#00F299] hover:bg-[#00F299]/10 hover:border-[#00F299]/50 transition-all duration-300"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#00F299] animate-pulse" />
              {t('nav.api')}
            </Link>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 text-white"
              aria-label={t('nav.toggleMenu')}
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
        onAuthSuccess={handleAuthSuccess}
      />
    </>
  );
}
