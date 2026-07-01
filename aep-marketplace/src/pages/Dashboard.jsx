import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { isAuthenticated, getUser } from '../api/client';
import {
  getMyAffiliateCode,
  buildAffiliateUrl,
  calculateAffiliatePayout,
  calculateSellerEarnings,
  calculateCommission,
} from '../utils/affiliate';

/**
 * MarketNow — Seller & Affiliate Dashboard
 *
 * Permite a vendedores y afiliados:
 *  - Ver su código de afiliado
 *  - Generar links de afiliado para cualquier skill
 *  - Calcular comisiones y payouts
 *  - Ver sus skills enviadas (trackeadas via GitHub Issues)
 *
 * NOTA: En GitHub Pages no hay backend, así que las "stats de ventas"
 * se simulan. Para datos reales, integrar con Stripe Connect y
 * una base de datos de orders.
 */
export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [affiliateCode, setAffiliateCode] = useState('');
  const [skillId, setSkillId] = useState('');
  const [generatedUrl, setGeneratedUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) {
      const u = getUser();
      setUser(u);
      setAffiliateCode(getMyAffiliateCode(u?.username));
    }
  }, []);

  const handleGenerate = (e) => {
    e.preventDefault();
    if (!skillId.trim()) return;
    setGeneratedUrl(buildAffiliateUrl(skillId.trim(), affiliateCode));
  };

  const copy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isAuthenticated()) {
    return (
      <div className="min-h-screen pt-24 pb-16">
        <div className="max-w-[1440px] mx-auto px-6">
          <div className="premium-card p-12 text-center">
            <div className="text-6xl mb-4">🔐</div>
            <h2 className="text-2xl font-bold text-white mb-2">SIGN IN REQUIRED</h2>
            <p className="text-zinc-400 mb-6">Sign in to access your seller and affiliate dashboard.</p>
            <Link to="/?login=true" className="inline-block px-8 py-3 bg-[#00F299] text-black font-semibold rounded-xl hover:bg-[#00F299]/90 transition-all">
              SIGN IN
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Earnings calculator state
  const [calcPrice, setCalcPrice] = useState(2.99);

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-[1440px] mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <h1 className="text-4xl font-bold text-white mb-2">
            SELLER <span className="text-[#00F299]">DASHBOARD</span>
          </h1>
          <p className="text-zinc-400">Manage your skills, track earnings, and generate affiliate links.</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Affiliate Code */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="premium-card p-8"
          >
            <h2 className="text-xl font-bold text-white mb-4">YOUR AFFILIATE CODE</h2>
            <p className="text-zinc-400 text-sm mb-6">
              Share this code. When someone buys a skill via your affiliate link,
              you earn <span className="text-[#00F299]">5% of the sale price</span>.
            </p>

            <div className="p-4 rounded-xl bg-black/40 border border-white/5 mb-6">
              <code className="text-[#00F299] text-lg font-mono">{affiliateCode}</code>
            </div>

            <form onSubmit={handleGenerate} className="space-y-3">
              <label className="text-zinc-400 text-sm block">Generate affiliate link for a skill:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="mn-ai-00001"
                  value={skillId}
                  onChange={(e) => setSkillId(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:border-[#00F299]/50 focus:outline-none font-mono text-sm"
                />
                <button
                  type="submit"
                  className="px-6 py-3 bg-[#00F299] text-black font-bold rounded-xl hover:bg-[#00F299]/90 transition-all"
                >
                  GENERATE
                </button>
              </div>
            </form>

            {generatedUrl && (
              <div className="mt-4 p-4 rounded-xl bg-[#00F299]/5 border border-[#00F299]/20">
                <div className="text-[10px] text-zinc-500 font-mono mb-2">AFFILIATE LINK</div>
                <div className="flex items-center gap-2">
                  <code className="text-white text-xs font-mono break-all flex-1">{generatedUrl}</code>
                  <button
                    onClick={() => copy(generatedUrl)}
                    className="px-3 py-1 rounded-lg bg-[#00F299]/10 text-[#00F299] text-xs font-mono hover:bg-[#00F299]/20 transition-all shrink-0"
                  >
                    {copied ? '✓' : '📋 COPY'}
                  </button>
                </div>
              </div>
            )}
          </motion.div>

          {/* Earnings Calculator */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="premium-card p-8"
          >
            <h2 className="text-xl font-bold text-white mb-4">EARNINGS CALCULATOR</h2>
            <p className="text-zinc-400 text-sm mb-6">
              See how much everyone earns per sale. MarketNow takes 20% commission,
              sellers keep 80%, affiliates earn 5% of the sale price.
            </p>

            <div className="mb-6">
              <label className="text-zinc-400 text-sm block mb-2">Skill price (USD)</label>
              <input
                type="range"
                min="0.99"
                max="9.99"
                step="0.01"
                value={calcPrice}
                onChange={(e) => setCalcPrice(parseFloat(e.target.value))}
                className="w-full accent-[#00F299]"
              />
              <div className="text-3xl font-bold text-white font-mono mt-2">${calcPrice.toFixed(2)}</div>
            </div>

            <div className="space-y-3">
              {[
                { label: 'Seller receives (80%)', value: calculateSellerEarnings(calcPrice), color: 'text-[#00F299]', icon: '💰' },
                { label: 'MarketNow commission (20%)', value: calculateCommission(calcPrice), color: 'text-white', icon: '🏢' },
                { label: 'Affiliate earns (5%)', value: calculateAffiliatePayout(calcPrice), color: 'text-[#00d1ff]', icon: '🤝' },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{row.icon}</span>
                    <span className="text-zinc-400 text-sm">{row.label}</span>
                  </div>
                  <span className={`text-lg font-bold font-mono ${row.color}`}>
                    ${row.value.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-6 p-3 rounded-lg bg-[#00F299]/5 border border-[#00F299]/20 text-xs text-zinc-400 leading-relaxed">
              💡 <strong className="text-[#00F299]">Tip:</strong> Payouts are processed monthly
              via Stripe Connect. Minimum payout threshold: $50.
            </div>
          </motion.div>
        </div>

        {/* Quick links */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          {[
            { to: '/submit', icon: '➕', title: 'Submit a Skill', desc: 'Sell your MCP server to 5,000+ agents' },
            { to: '/vault', icon: '📦', title: 'My Vault', desc: 'Manage your purchased skills' },
            { to: '/registry', icon: '🛒', title: 'Browse Registry', desc: 'Find skills to buy or affiliate' },
          ].map((card) => (
            <Link
              key={card.to}
              to={card.to}
              className="premium-card p-5 hover:border-[#00F299]/30 transition-all group"
            >
              <div className="text-3xl mb-3">{card.icon}</div>
              <h3 className="text-white font-semibold text-sm mb-1 group-hover:text-[#00F299] transition-colors">{card.title}</h3>
              <p className="text-zinc-400 text-xs">{card.desc}</p>
            </Link>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
