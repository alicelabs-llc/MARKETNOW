import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { fetchVault, isAuthenticated, getUser } from '../api/client';
import { Link } from 'react-router-dom';

export default function Vault() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (isAuthenticated()) {
      setUser(getUser());
      loadVault();
    } else {
      setLoading(false);
    }
  }, []);

  const loadVault = async () => {
    try {
      setLoading(true);
      const data = await fetchVault();
      setPurchases(data.purchases);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated()) {
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
              <div className="text-zinc-500 text-xs font-mono">{user.credits} credits</div>
            </div>
          )}
        </motion.div>

        {error && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
            <button onClick={loadVault} className="ml-3 underline">Retry</button>
          </div>
        )}

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block w-8 h-8 border-2 border-[#00F299] border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-zinc-500 font-mono text-sm">Loading vault...</p>
          </div>
        ) : purchases.length === 0 ? (
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
                key={p.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="premium-card p-5 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="text-3xl">{p.skill?.icon || '🧩'}</div>
                  <div>
                    <h3 className="text-white font-semibold">{p.skillName}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[#00F299] text-xs font-mono">{p.license}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                        p.status === 'Active' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-zinc-500/10 text-zinc-400'
                      }`}>
                        {p.status}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-zinc-500 text-[10px] font-mono">PURCHASED</div>
                  <div className="text-zinc-400 text-xs">{new Date(p.purchasedAt).toLocaleDateString()}</div>
                  <div className="text-[#00F299] text-xs font-mono mt-1">${p.price.toFixed(2)}</div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
