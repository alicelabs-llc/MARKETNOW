import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { isAuthenticated, getUser } from '../api/client';
import { Link } from 'react-router-dom';

/**
 * MarketNow — Vault (static version with Stripe redirect handling)
 *
 * Detects Stripe checkout success redirect (?success=true&skillId=X&sessionId=Y)
 * and saves the purchase to localStorage so it appears in the vault.
 */
export default function Vault() {
  const [purchases, setPurchases] = useState([]);
  const [user, setUser] = useState(null);
  const [justPurchased, setJustPurchased] = useState(null);

  useEffect(() => {
    if (isAuthenticated()) {
      setUser(getUser());
    }

    // Check if we're returning from a successful Stripe checkout
    // (works even without login — Stripe redirects everyone here)
    const params = new URLSearchParams(window.location.search);
    const success = params.get('success') === 'true';
    const skillId = params.get('skillId');
    const sessionId = params.get('sessionId');

    if (success && skillId) {
      // Save the purchase to localStorage
      try {
        const raw = localStorage.getItem('mn_purchases');
        const existing = raw ? JSON.parse(raw) : [];

        // Check if this purchase already exists (avoid duplicates)
        if (!existing.find(p => p.sessionId === sessionId)) {
          const newPurchase = {
            id: sessionId || `pur_${Date.now()}`,
            skillId,
            sessionId,
            purchasedAt: new Date().toISOString(),
            status: 'Active',
          };
          existing.push(newPurchase);
          localStorage.setItem('mn_purchases', JSON.stringify(existing));
          setJustPurchased(newPurchase);
        }
      } catch (e) {
        console.error('Error saving purchase:', e);
      }

      // Clean the URL (remove ?success=true&skillId=X&sessionId=Y)
      params.delete('success');
      params.delete('skillId');
      params.delete('sessionId');
      const remaining = params.toString();
      const newUrl = window.location.pathname + (remaining ? '?' + remaining : '');
      window.history.replaceState({}, '', newUrl);
    }

    // Load all purchases (even if not authenticated — for Stripe redirect flow)
    try {
      const raw = localStorage.getItem('mn_purchases');
      setPurchases(raw ? JSON.parse(raw) : []);
    } catch {
      setPurchases([]);
    }
  }, []);

  if (!isAuthenticated() && !justPurchased) {
    return (
      <div className="min-h-screen pt-24 pb-16">
        <div className="max-w-[1440px] mx-auto px-6">
          <div className="premium-card p-12 text-center">
            <div className="text-6xl mb-4">🔐</div>
            <h2 className="text-2xl font-bold text-white mb-2">VAULT LOCKED</h2>
            <p className="text-zinc-400 mb-6">Sign in to access your purchased skills</p>
            <Link to="/?login=true" className="inline-block px-8 py-3 bg-[#00F299] text-black font-semibold rounded-xl hover:bg-[#00F299]/90 transition-all">
              SIGN IN
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // If just purchased but not authenticated, show success + ask to sign in to save
  if (!isAuthenticated() && justPurchased) {
    return (
      <div className="min-h-screen pt-24 pb-16">
        <div className="max-w-[1440px] mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="premium-card p-12 text-center"
          >
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-[#00F299] mb-2">PAYMENT SUCCESSFUL!</h2>
            <p className="text-zinc-400 mb-2">
              Your purchase of skill <code className="text-white font-mono">{justPurchased.skillId}</code> has been confirmed.
            </p>
            <p className="text-zinc-500 text-xs mb-6 font-mono">
              Session: {justPurchased.sessionId?.slice(0, 40)}...
            </p>
            <p className="text-zinc-400 text-sm mb-6">
              Sign in to permanently save this purchase to your vault and get your license key.
            </p>
            <Link to="/?login=true" className="inline-block px-8 py-3 bg-[#00F299] text-black font-semibold rounded-xl hover:bg-[#00F299]/90 transition-all">
              SIGN IN TO SAVE
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-[1440px] mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              MY <span className="text-[#00F299]">VAULT</span>
            </h1>
            <p className="text-zinc-400 text-sm">
              Manage your purchased skills and licenses
            </p>
          </div>
          {user && (
            <div className="text-right">
              <div className="text-[#00F299] text-sm font-semibold">{user.username}</div>
              <div className="text-zinc-500 text-xs font-mono">{purchases.length} skill{purchases.length === 1 ? '' : 's'} purchased</div>
            </div>
          )}
        </motion.div>

        {/* Success banner after Stripe checkout */}
        {justPurchased && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-5 rounded-xl bg-[#00F299]/10 border border-[#00F299]/30 flex items-center gap-4"
          >
            <span className="text-3xl">✅</span>
            <div>
              <h3 className="text-[#00F299] font-bold text-sm">PAYMENT SUCCESSFUL!</h3>
              <p className="text-zinc-400 text-xs mt-1">
                Your purchase of skill <code className="text-white">{justPurchased.skillId}</code> has been confirmed.
                Session ID: <code className="text-zinc-500">{justPurchased.sessionId?.slice(0, 30)}...</code>
              </p>
            </div>
          </motion.div>
        )}

        {purchases.length === 0 ? (
          <div className="premium-card p-12 text-center">
            <div className="text-6xl mb-4">📦</div>
            <h2 className="text-xl font-semibold text-white mb-2">Your Vault is Empty</h2>
            <p className="text-zinc-400 mb-6">Purchase skills from the registry to see them here</p>
            <Link to="/registry" className="inline-block px-8 py-3 bg-[#00F299] text-black font-semibold rounded-xl hover:bg-[#00F299]/90 transition-all">
              BROWSE REGISTRY
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {purchases.map((p, i) => (
              <motion.div
                key={p.id || i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="premium-card p-5 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="text-3xl">{p.skill?.icon || '🧩'}</div>
                  <div>
                    <h3 className="text-white font-semibold">{p.skillName || p.skillId || 'Unknown skill'}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[#00F299] text-xs font-mono">{p.license || 'N/A'}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                        p.status === 'Active' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-zinc-500/10 text-zinc-400'
                      }`}>
                        {p.status || 'Active'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-zinc-500 text-[10px] font-mono">PURCHASED</div>
                  <div className="text-zinc-400 text-xs">{p.purchasedAt ? new Date(p.purchasedAt).toLocaleDateString() : '—'}</div>
                  {typeof p.price === 'number' && (
                    <div className="text-[#00F299] text-xs font-mono mt-1">${p.price.toFixed(2)}</div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
