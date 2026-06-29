import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getSkill } from '../data/skills';
import { hasMetaMask, connectWallet, cryptoCheckout } from '../utils/crypto';

// Helper to normalize a skill to always have safe default fields
function normalizeSkill(s) {
  if (!s) return null;
  return {
    ...s,
    name: s.name || s.slug || s.id || 'Unknown Skill',
    icon: s.icon || '🧩',
    category: s.category || 'Developer Tools',
    version: s.version || '1.0.0',
    author: s.author && s.author !== 'AEP Community' ? s.author : 'Open Source Community',
    price: typeof s.price === 'number' ? s.price : parseFloat(s.price) || 0,
    features: Array.isArray(s.features) && s.features.length > 0
      ? s.features
      : (s.tags || []).slice(0, 4),
    routes: Array.isArray(s.routes) && s.routes.length > 0 ? s.routes : [],
    reviews: Array.isArray(s.reviews) && s.reviews.length > 0 ? s.reviews : [],
    description: s.description || `${s.name || s.id} — MCP server available on MarketNow.`,
    longDescription: s.longDescription || s.description || `${s.name || s.id} is a verified MCP server available on MarketNow. Connect it to Claude, Cursor, or any MCP-compatible agent runtime.`,
    tagline: s.tagline || `Real MCP server · ${s.category || 'Developer Tools'} · Open Source`,
    slug: s.slug || s.id,
    sentinel_score: s.sentinel_score ?? 6,
    install: s.install || `npx -y @marketnow/install ${s.slug || s.id}`,
    verified: s.verified ?? true,
  };
}

export default function SkillDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [skill, setSkill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseResult, setPurchaseResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [copiedInstall, setCopiedInstall] = useState(false);
  const [walletAddr, setWalletAddr] = useState(null);
  const [purchaseStep, setPurchaseStep] = useState('');

  const handleCopyBadge = () => {
    const md = `[![Available on MarketNow](https://marketnow.site/badge.svg)](https://marketnow.site/skill/${skill?.slug || id})`;
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyInstall = () => {
    navigator.clipboard.writeText(skill.install);
    setCopiedInstall(true);
    setTimeout(() => setCopiedInstall(false), 2000);
  };

  useEffect(() => {
    loadSkill();
  }, [id]);

  const loadSkill = async () => {
    try {
      setLoading(true);
      const found = await getSkill(id);
      if (found) {
        setSkill(normalizeSkill(found));
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
        setError('Install MetaMask first to pay with USDC on Base');
        return;
      }
      const addr = await connectWallet();
      setWalletAddr(addr);
      setError('');
    } catch (err) {
      setError(err.message || 'Error connecting MetaMask');
    }
  };

  const handlePurchase = async () => {
    if (!hasMetaMask()) {
      window.open('https://metamask.io/download/', '_blank');
      setError('Install MetaMask to pay with USDC on Base');
      return;
    }

    const price = parseFloat(skill.price);
    if (!price || price <= 0) {
      setError('This skill is free — no payment required');
      return;
    }

    setPurchasing(true);
    setError('');
    try {
      setPurchaseStep('Connecting MetaMask...');
      const addr = await connectWallet();
      setWalletAddr(addr);

      setPurchaseStep(`Sending $${price.toFixed(2)} USDC to MarketNow...`);
      const result = await cryptoCheckout(skill.slug || skill.id, price);

      setPurchaseResult({
        ...result,
        purchase: { license: result.access_token || result.order_id },
      });
      setPurchaseStep('');
    } catch (err) {
      if (err.code === 4001) {
        setError('Transaction cancelled by user');
      } else {
        setError(err.message || 'Payment error');
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

  const isFree = !skill.price || skill.price === 0;

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
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span className="px-3 py-1 rounded-lg bg-white/5 text-[11px] font-mono text-zinc-400 border border-white/5">
                      {skill.category.toUpperCase()}
                    </span>
                    <span className="text-zinc-600 text-xs font-mono">v{skill.version}</span>
                    {skill.verified && (
                      <span className="px-2 py-0.5 rounded bg-[#00F299]/10 text-[#00F299] text-[10px] font-mono border border-[#00F299]/20">
                        ✓ VERIFIED
                      </span>
                    )}
                    {skill.sentinel_score >= 8 && (
                      <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 text-[10px] font-mono border border-purple-500/20">
                        🛡️ SENTINEL {skill.sentinel_score}/10
                      </span>
                    )}
                  </div>
                  <h1 className="text-3xl font-bold text-white mb-2 break-words">{skill.name}</h1>
                  <p className="text-zinc-400 text-sm">{skill.tagline}</p>
                </div>
              </div>

              {/* Description */}
              <div className="mb-8">
                <h3 className="text-sm text-zinc-500 font-mono tracking-wider mb-3 uppercase">About</h3>
                <p className="text-zinc-300 text-sm leading-relaxed">{skill.longDescription}</p>
              </div>

              {/* Install command */}
              <div className="mb-8">
                <h3 className="text-sm text-zinc-500 font-mono tracking-wider mb-3 uppercase">Install</h3>
                <div
                  onClick={handleCopyInstall}
                  className="flex items-center justify-between gap-4 p-4 rounded-xl bg-black/60 border border-white/5 cursor-pointer hover:border-[#00F299]/30 transition-all group"
                >
                  <code className="text-[#00F299] text-sm font-mono break-all">{skill.install}</code>
                  <span className="text-zinc-600 text-xs font-mono shrink-0 group-hover:text-[#00F299] transition-colors">
                    {copiedInstall ? '✅ COPIED' : '📋 COPY'}
                  </span>
                </div>
              </div>

              {/* Features */}
              {skill.features.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-sm text-zinc-500 font-mono tracking-wider mb-3 uppercase">Features</h3>
                  <div className="flex flex-wrap gap-2">
                    {skill.features.map((f, i) => (
                      <span key={i} className="px-3 py-1.5 rounded-lg bg-[#00F299]/5 border border-[#00F299]/20 text-[11px] text-[#00F299] font-mono">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {Array.isArray(skill.tags) && skill.tags.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-sm text-zinc-500 font-mono tracking-wider mb-3 uppercase">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {skill.tags.map((t, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-md bg-white/5 border border-white/5 text-[10px] text-zinc-500 font-mono">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* MCP Routes (only if present) */}
              {skill.routes.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-sm text-zinc-500 font-mono tracking-wider mb-3 uppercase">MCP Routes</h3>
                  <div className="flex flex-wrap gap-2">
                    {skill.routes.map((r, i) => (
                      <code key={i} className="px-3 py-1.5 rounded-lg bg-black/40 border border-white/5 text-[11px] text-zinc-400 font-mono">
                        /{r}
                      </code>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="pt-6 border-t border-white/5">
                <div className="text-sm text-zinc-500">
                  By <span className="text-zinc-300">{skill.author}</span>
                </div>
              </div>
            </div>

            {/* Reviews (only if present) */}
            {skill.reviews.length > 0 && (
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
            )}
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
                {isFree ? (
                  <>
                    <div className="text-4xl font-bold text-[#00F299] mb-1">FREE</div>
                    <div className="text-zinc-500 text-sm">Open source · No payment required</div>
                  </>
                ) : (
                  <>
                    <div className="text-4xl font-bold text-white mb-1">${skill.price.toFixed(2)}</div>
                    <div className="text-zinc-500 text-sm">One-time payment · Lifetime license</div>
                  </>
                )}
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Version</span>
                  <span className="text-white font-mono">{skill.version}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Sentinel Score</span>
                  <span className="text-purple-400 font-mono">{skill.sentinel_score}/10</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">License</span>
                  <span className="text-white font-mono">Open Source</span>
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
              ) : isFree ? (
                <div className="space-y-3">
                  <button
                    onClick={handleCopyInstall}
                    className="w-full py-4 rounded-xl font-semibold text-sm transition-all duration-300 bg-[#00F299] text-black hover:bg-[#00F299]/90 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {copiedInstall ? '✅ COPIED!' : '📋 COPY INSTALL COMMAND'}
                  </button>
                  <p className="text-center text-zinc-700 text-[9px] font-mono">
                    Free · Open Source · Install with npx
                  </p>
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
                    Pay with USDC · Base Network · Verified on-chain
                  </p>
                </div>
              )}

              {error && (
                <div className="mt-4 text-center text-red-400 text-xs">{error}</div>
              )}

              {/* Badge Copier */}
              <div className="mt-6 pt-6 border-t border-white/5">
                <h4 className="text-[10px] text-zinc-500 font-mono tracking-wider mb-3 uppercase text-center">Promote this skill</h4>
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
