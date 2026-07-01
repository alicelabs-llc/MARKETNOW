import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { setAuth } from '../api/client';

/**
 * MarketNow — Auth Modal (static / client-side version)
 *
 * GitHub Pages has no backend, so auth is done client-side:
 *  - "Register" creates a user in localStorage (no real verification)
 *  - "Login" checks the user exists in localStorage and password matches
 *  - This is NOT secure — it's only for demo / personal use on a static site
 *  - For production with real auth, deploy the Express backend separately
 */
export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Simulate network delay for UX
      await new Promise(r => setTimeout(r, 400));

      const usersRaw = localStorage.getItem('mn_users');
      const users = usersRaw ? JSON.parse(usersRaw) : [];

      if (mode === 'register') {
        if (users.find(u => u.email === form.email)) {
          throw new Error('An account with this email already exists');
        }
        const newUser = {
          id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          username: form.username,
          email: form.email,
          password: form.password, // NOTE: plain text, NOT secure — demo only
          createdAt: new Date().toISOString(),
        };
        users.push(newUser);
        localStorage.setItem('mn_users', JSON.stringify(users));
        const token = `mn_token_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        setAuth(token, { id: newUser.id, username: newUser.username, email: newUser.email });
        onAuthSuccess({ id: newUser.id, username: newUser.username, email: newUser.email });
      } else {
        // login
        const user = users.find(u => u.email === form.email);
        if (!user || user.password !== form.password) {
          throw new Error('Invalid email or password');
        }
        const token = `mn_token_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        setAuth(token, { id: user.id, username: user.username, email: user.email });
        onAuthSuccess({ id: user.id, username: user.username, email: user.email });
      }

      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="premium-card w-full max-w-md mx-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">
                {mode === 'login' ? 'SIGN IN' : 'CREATE ACCOUNT'}
              </h2>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <div>
                  <label className="text-zinc-400 text-sm block mb-1.5">Username</label>
                  <input
                    type="text"
                    placeholder="your_username"
                    value={form.username}
                    onChange={e => setForm({ ...form, username: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:border-[#00F299]/50 focus:outline-none transition-all"
                    required
                  />
                </div>
              )}

              <div>
                <label className="text-zinc-400 text-sm block mb-1.5">Email</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:border-[#00F299]/50 focus:outline-none transition-all"
                  required
                />
              </div>

              <div>
                <label className="text-zinc-400 text-sm block mb-1.5">Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:border-[#00F299]/50 focus:outline-none transition-all"
                  required
                  minLength={6}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-[#00F299] text-black font-semibold rounded-xl hover:bg-[#00F299]/90 hover:scale-[1.01] active:scale-[0.98] transition-all duration-300 disabled:opacity-50"
              >
                {loading ? 'Processing...' : mode === 'login' ? 'SIGN IN' : 'CREATE ACCOUNT'}
              </button>
            </form>

            <div className="mt-4 text-center">
              <button
                onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
                className="text-zinc-500 hover:text-[#00F299] text-sm transition-colors"
              >
                {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
