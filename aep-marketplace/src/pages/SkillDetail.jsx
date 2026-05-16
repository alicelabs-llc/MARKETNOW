import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getSkill } from '../data/skills';
import { createCheckoutSession, isAuthenticated, getUser, getToken } from '../api/client';

export default function SkillDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [skill, setSkill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseResult, setPurchaseResult] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (isAuthenticated()) setUser(getUser());
    const handler = () => {
      if (isAuthenticated()) setUser(getUser()); else setUser(null);
    };
    window.addEventListener('auth-change', handler);
    return () => window.removeEventListener('auth-change', handler);
  }, []);

  useEffect(() => {
    loadSkill();
  }, [id]);

  const loadSkill = async () => {
    try {
      setLoading(true);
      const found = await getSkill(id);
      if (found) {
        setSkill(found);
      } else {
        setError('Skill not found');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!isAuthenticated()) {
      navigate('/?login=true');
      return;
    }

    setPurchasing(true);
    setError('');
    try {
      const result = await createCheckoutSession(skill.id);
      setPurchaseResult(result);

      // If Stripe URL, redirect
      if (result.url) {
        window.location.href = result.url;
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-2 border-[#00F299] border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-zinc-500 font-mono text-sm">Loading skill...</p>
        </div>
      </div>
    );
  }

  if (error && !skill) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center premium-card p-8">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-red-400 mb-4">{error}</p>
          <button onClick={() => navigate('/registry')} className="px-6 py-3 bg-[#00F299]/10 border border-[#00F299]/30 rounded-xl text-[#00F299] text-sm">
            BACK TO REGISTRY
          </button>
        </div>
      </div>
    );
  }

  if (!skill) return null;

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-[1440px] mx-auto px-6">
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => navigate('/registry')}
          className="mb-8 text-zinc-400 hover:text-white text-sm transition-colors flex items-center gap-2"
        >
          ← BACK TO REGISTRY
        </motion.button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2"
          >
            <div className="premium-card p-8">
              <div className="flex items-start gap-6 mb-6">
                <div className="text-6xl shrink-0">{skill.icon}</div>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-3 py-1 rounded-lg bg-white/5 text-[11px] font-mono text-zinc-400 border border-white/5">
                      {skill.category.toUpperCase()}
                    </span>
                    <span className="text-zinc-600 text-xs font-mono">v{skill.version}</span>
                  </div>
                  <h1 className="text-3xl font-bold text-white mb-2">{skill.name}</h1>
                  <p className="text-zinc-400">{skill.longDescription}</p>
                </div>
              </div>

              {/* Features */}
              <div className="mb-8">
                <h3 className="text-sm text-zinc-500 font-mono tracking-wider mb-3 uppercase">Features</h3>
                <div className="flex flex-wrap gap-2">
                  {skill.features.map((f) => (
                    <span key={f} className="px-3 py-1.5 rounded-lg bg-[#00F299]/5 border border-[#00F299]/20 text-[11px] text-[#00F299] font-mono">
                      {f}
                    </span>
                  ))}
                </div>
              </div>

              {/* Routes */}
              <div className="mb-8">
                <h3 className="text-sm text-zinc-500 font-mono tracking-wider mb-3 uppercase">MCP Routes</h3>
                <div className="flex flex-wrap gap-2">
                  {skill.routes.map((r) => (
                    <code key={r} className="px-3 py-1.5 rounded-lg bg-black/40 border border-white/5 text-[11px] text-zinc-400 font-mono">
                      /{r}
                    </code>
                  ))}
                </div>
              </div>

              {/* Author */}
              <div className="text-sm text-zinc-500">
                By <span className="text-zinc-300">{skill.author}</span>
              </div>
            </div>

            {/* Reviews */}
            <div className="mt-6 premium-card p-8">
              <h3 className="text-white font-semibold mb-6">REVIEWS ({skill.reviews.length})</h3>
              <div className="space-y-4">
                {skill.reviews.map((review, i) => (
                  <div key={i} className="p-4 rounded-xl bg-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white text-sm font-mono">{review.user}</span>
                      <span className="text-[#00F299] text-xs">{'★'.repeat(review.rating)}</span>
                    </div>
                    <p className="text-zinc-400 text-sm">{review.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-1"
          >
            <div className="premium-card p-6 sticky top-28">
              <div className="text-center mb-6">
                <div className="text-4xl font-bold text-white mb-1">${skill.price.toFixed(2)}</div>
                <div className="text-zinc-500 text-sm">or {skill.credits} credits</div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Rating</span>
                  <span className="text-white">★ {skill.rating}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Users</span>
                  <span className="text-white">{skill.users.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Version</span>
                  <span className="text-white font-mono">{skill.version}</span>
                </div>
              </div>

              {purchaseResult ? (
                <div className="text-center p-4 rounded-xl bg-[#00F299]/10 border border-[#00F299]/20">
                  <div className="text-2xl mb-2">✅</div>
                  <p className="text-[#00F299] text-sm font-semibold mb-1">Purchase Successful!</p>
                  <p className="text-zinc-400 text-xs font-mono">License: {purchaseResult.purchase?.license}</p>
                  <button
                    onClick={() => navigate('/vault')}
                    className="mt-3 px-4 py-2 bg-[#00F299] text-black text-xs font-semibold rounded-lg hover:bg-[#00F299]/90 transition-all"
                  >
                    VIEW IN VAULT
                  </button>
                </div>
              ) : (
                <button
                  onClick={handlePurchase}
                  disabled={purchasing}
                  className={`w-full py-4 rounded-xl font-semibold text-sm transition-all duration-300 ${
                    purchasing
                      ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                      : 'bg-[#00F299] text-black hover:bg-[#00F299]/90 hover:scale-[1.02] active:scale-[0.98]'
                  }`}
                >
                  {purchasing ? 'PROCESSING...' : isAuthenticated() ? 'PURCHASE NOW →' : 'SIGN IN TO PURCHASE'}
                </button>
              )}

              {error && (
                <div className="mt-4 text-center text-red-400 text-xs">{error}</div>
              )}

              {!user && (
                <p className="mt-4 text-center text-zinc-600 text-[10px]">
                  Sign in to purchase and access your vault
                </p>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
