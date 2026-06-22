import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getSkill } from '../data/skills';
import { isAuthenticated, getUser, getToken } from '../api/client';
import { hasMetaMask, connectWallet, cryptoCheckout, PAYMENT_WALLET } from '../utils/crypto';

export default function SkillDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [skill, setSkill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseResult, setPurchaseResult] = useState(null);
  const [user, setUser] = useState(null);
  const [copied, setCopied] = useState(false);
  const [walletAddr, setWalletAddr] = useState(null);
  const [purchaseStep, setPurchaseStep] = useState('');

  const handleCopyBadge = () => {
    const md = `[![Available on MarketNow](https://marketnow.site/badge.svg)](https://marketnow.site/skill/${skill?.slug || id})`;
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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

  const handleConnectWallet = async () => {
    try {
      if (!hasMetaMask()) {
        window.open('https://metamask.io/download/', '_blank');
        setError('Instala MetaMask primero');
        return;
      }
      const addr = await connectWallet();
      setWalletAddr(addr);
      setError('');
    } catch (err) {
      setError(err.message || 'Error al conectar MetaMask');
    }
  };

  const handlePurchase = async () => {
    if (!hasMetaMask()) {
      window.open('https://metamask.io/download/', '_blank');
      setError('Instala MetaMask para pagar con USDC en Base');
      return;
    }

    const price = parseFloat(skill.price);
    if (!price || price <= 0) {
      setError('Este skill es gratuito — no requiere pago');
      return;
    }

    setPurchasing(true);
    setError('');
    try {
      setPurchaseStep('Conectando MetaMask...');
      const addr = await connectWallet();
      setWalletAddr(addr);

      setPurchaseStep(`Enviando $${price.toFixed(2)} USDC a MarketNow...`);
      const result = await cryptoCheckout(skill.slug || skill.id, price);

      setPurchaseResult({
        ...result,
        purchase: { license: result.access_token || result.order_id },
      });
      setPurchaseStep('');
    } catch (err) {
      if (err.code === 4001) {
        setError('Transacción cancelada por el usuario');
      } else {
        setError(err.message || 'Error en el pago');
      }
      setPurchaseStep('');
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
                  <p className="text-[#00F299] text-sm font-semibold mb-1">Purchase Verified On-Chain!</p>
                  <p className="text-zinc-400 text-xs font-mono mb-1">Order: {purchaseResult.order_id}</p>
                  {purchaseResult.txHash && (
                    <a
                      href={purchaseResult.explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#00d1ff] text-[10px] font-mono hover:underline block mb-2"
                    >
                      TX: {purchaseResult.txHash.slice(0, 10)}...{purchaseResult.txHash.slice(-8)} ↗
                    </a>
                  )}
                  <p className="text-zinc-500 text-[10px] font-mono">Token: {purchaseResult.access_token}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Wallet connect */}
                  {!walletAddr ? (
                    <button
                      onClick={handleConnectWallet}
                      className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-300 bg-white/5 border border-white/10 text-white hover:border-[#00F299]/50 hover:bg-[#00F299]/5"
                    >
                      🦊 CONNECT METAMASK
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#00F299]/5 border border-[#00F299]/20">
                      <span className="w-2 h-2 rounded-full bg-[#00F299] animate-pulse" />
                      <span className="text-[10px] font-mono text-zinc-400 truncate">{walletAddr}</span>
                    </div>
                  )}

                  {/* Purchase button */}
                  <button
                    onClick={handlePurchase}
                    disabled={purchasing}
                    className={`w-full py-4 rounded-xl font-semibold text-sm transition-all duration-300 ${
                      purchasing
                        ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                        : 'bg-[#00F299] text-black hover:bg-[#00F299]/90 hover:scale-[1.02] active:scale-[0.98]'
                    }`}
                  >
                    {purchasing
                      ? (purchaseStep || 'PROCESSING...')
                      : `PAY $${skill.price.toFixed(2)} USDC →`
                    }
                  </button>

                  <p className="text-center text-zinc-700 text-[9px] font-mono">
                    Pago en USDC · Base Network · Verificado on-chain
                  </p>
                </div>
              )}

              {error && (
                <div className="mt-4 text-center text-red-400 text-xs">{error}</div>
              )}

              {/* Badge Copier */}
              <div className="mt-6 pt-6 border-t border-white/5">
                <h4 className="text-[10px] text-zinc-500 font-mono tracking-wider mb-3 uppercase text-center">Promote your skill</h4>
                <div className="p-4 rounded-xl bg-black/40 border border-white/5 text-center transition-all hover:border-[#00F299]/30 hover:shadow-[0_0_15px_rgba(0,242,153,0.1)]">
                  <img src="https://marketnow.site/badge.svg" alt="MarketNow Badge" className="mx-auto mb-4 h-6" />
                  <button
                    onClick={handleCopyBadge}
                    className={`w-full py-2 text-xs font-mono rounded-lg transition-all border ${
                      copied 
                        ? 'bg-[#00F299]/20 text-[#00F299] border-[#00F299]/50' 
                        : 'bg-white/5 hover:bg-white/10 text-zinc-300 border-white/10'
                    }`}
                  >
                    {copied ? '✅ COPIED MARKDOWN' : '📄 COPY BADGE MD'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
