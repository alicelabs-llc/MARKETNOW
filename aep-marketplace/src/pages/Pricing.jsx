import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import BackgroundOrbs from '../components/BackgroundOrbs';
import { TIERS, ADDONS, COMMISSION, STORAGE_FEE } from '../utils/monetization';

/**
 * MarketNow — Pricing Page
 *
 * Modelo de monetización completo:
 * - Compradores: pagan precio de skill ($0.99-$9.99)
 * - Vendedores: FREE (3 skills) / PRO ($9.99/mo) / ENTERPRISE ($49.99/mo)
 * - Add-ons: Featured listing, Verified Seller badge, Priority Review
 * - Afiliados: 5% comisión por venta referida
 */
export default function Pricing() {
  const [billing, setBilling] = useState('monthly'); // monthly | yearly
  const yearlyDiscount = 0.20; // 20% off yearly

  return (
    <div className="relative min-h-screen">
      <BackgroundOrbs />
      <div className="relative z-10 max-w-[1440px] mx-auto px-6 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            PRICING FOR <span className="text-[#00F299]">SELLERS</span>
          </h1>
          <p className="text-zinc-400 max-w-2xl mx-auto">
            List your MCP skills on the world's largest agent marketplace.
            Start free with 3 skills — upgrade when you're ready to scale.
            Buyers always pay one-time per skill ($0.99–$9.99), no subscriptions for them.
          </p>
        </motion.div>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <button
            onClick={() => setBilling('monthly')}
            className={`px-5 py-2 rounded-lg text-sm font-mono transition-all ${
              billing === 'monthly'
                ? 'bg-[#00F299]/20 text-[#00F299] border border-[#00F299]/40'
                : 'bg-white/5 text-zinc-400 border border-white/10'
            }`}
          >
            MONTHLY
          </button>
          <button
            onClick={() => setBilling('yearly')}
            className={`px-5 py-2 rounded-lg text-sm font-mono transition-all ${
              billing === 'yearly'
                ? 'bg-[#00F299]/20 text-[#00F299] border border-[#00F299]/40'
                : 'bg-white/5 text-zinc-400 border border-white/10'
            }`}
          >
            YEARLY <span className="text-[#00F299] text-[10px]">-20%</span>
          </button>
        </div>

        {/* Seller Tiers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {Object.values(TIERS).map((tier, i) => {
            const monthlyPrice = tier.price;
            const yearlyPrice = monthlyPrice * 12 * (1 - yearlyDiscount);
            const displayPrice = billing === 'yearly' ? yearlyPrice / 12 : monthlyPrice;

            return (
              <motion.div
                key={tier.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`premium-card p-8 relative ${
                  tier.name === 'PRO' ? 'border-[#00F299]/40 shadow-lg shadow-[#00F299]/10' : ''
                }`}
              >
                {tier.name === 'PRO' && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[#00F299] text-black text-[10px] font-bold tracking-wider">
                    MOST POPULAR
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-white mb-2">{tier.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-white font-mono">
                      ${displayPrice.toFixed(2)}
                    </span>
                    <span className="text-zinc-500 text-sm">
                      /{tier.period === 'forever' ? 'forever' : 'mo'}
                    </span>
                  </div>
                  {billing === 'yearly' && tier.price > 0 && (
                    <div className="text-[#00F299] text-xs mt-1 font-mono">
                      Save ${(monthlyPrice - displayPrice).toFixed(2)}/mo with yearly billing
                    </div>
                  )}
                </div>

                <div className="mb-6 p-3 rounded-xl bg-white/5 border border-white/5">
                  <div className="text-[10px] text-zinc-500 font-mono tracking-wider uppercase mb-1">
                    Skills Included
                  </div>
                  <div className="text-white font-bold text-lg">
                    {tier.maxSkills === Infinity ? '∞' : tier.maxSkills}
                    <span className="text-zinc-500 text-sm font-normal ml-1">skills</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-8">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-zinc-300">
                      <span className="text-[#00F299] mt-0.5 shrink-0">✓</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  to="/submit"
                  className={`block w-full py-3 text-center font-bold rounded-xl transition-all ${
                    tier.name === 'FREE'
                      ? 'border border-white/10 text-white hover:bg-white/5'
                      : tier.name === 'PRO'
                      ? 'bg-[#00F299] text-black hover:bg-[#00F299]/90'
                      : 'bg-[#a892ff] text-black hover:bg-[#a892ff]/90'
                  }`}
                >
                  {tier.name === 'FREE' ? 'START FREE' : `UPGRADE TO ${tier.name}`}
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* Storage fee notice */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="premium-card p-6 mb-12"
        >
          <div className="flex items-start gap-4">
            <span className="text-3xl">💾</span>
            <div>
              <h3 className="text-white font-semibold mb-1">Storage Fee (FREE tier only)</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                FREE tier includes your first <strong className="text-white">{STORAGE_FEE.freeThreshold} skills at no cost</strong>.
                After that, a storage fee of <strong className="text-[#00F299]">${STORAGE_FEE.pricePerSkill.toFixed(2)} per skill per {STORAGE_FEE.period}</strong> applies.
                This covers hosting, Sentinel scanning, and continuous monitoring of your skills.
                <strong className="text-white"> PRO and ENTERPRISE tiers include unlimited storage</strong> — no per-skill fees.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Add-ons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-white mb-2 text-center">ADD-ONS</h2>
          <p className="text-zinc-400 text-sm mb-8 text-center">Boost your skills with one-time purchases</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.values(ADDONS).map((addon, i) => (
              <motion.div
                key={addon.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="premium-card p-6"
              >
                <h3 className="text-white font-semibold mb-2">{addon.name}</h3>
                <div className="flex items-baseline gap-1 mb-3">
                  <span className="text-2xl font-bold text-[#00F299] font-mono">${addon.price.toFixed(2)}</span>
                  <span className="text-zinc-500 text-xs">/ {addon.period}</span>
                </div>
                <p className="text-zinc-400 text-xs leading-relaxed">{addon.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Commission breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="premium-card p-8 mb-16"
        >
          <h2 className="text-2xl font-bold text-white mb-2 text-center">COMMISSION BREAKDOWN</h2>
          <p className="text-zinc-400 text-sm mb-8 text-center">
            For every skill sold, here's how the revenue is split
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-6 rounded-xl bg-white/5 border border-white/5 text-center">
              <div className="text-4xl mb-2">💰</div>
              <div className="text-3xl font-bold text-[#00F299] font-mono">
                {(COMMISSION.seller * 100).toFixed(0)}%
              </div>
              <div className="text-white font-semibold text-sm mt-1">Seller</div>
              <div className="text-zinc-500 text-xs mt-1">Receives the majority of each sale</div>
            </div>
            <div className="p-6 rounded-xl bg-white/5 border border-white/5 text-center">
              <div className="text-4xl mb-2">🏢</div>
              <div className="text-3xl font-bold text-white font-mono">
                {(COMMISSION.marketnow * 100).toFixed(0)}%
              </div>
              <div className="text-white font-semibold text-sm mt-1">MarketNow</div>
              <div className="text-zinc-500 text-xs mt-1">Hosting, scanning, marketplace ops</div>
            </div>
            <div className="p-6 rounded-xl bg-white/5 border border-white/5 text-center">
              <div className="text-4xl mb-2">🤝</div>
              <div className="text-3xl font-bold text-[#00d1ff] font-mono">
                {(COMMISSION.affiliate * 100).toFixed(0)}%
              </div>
              <div className="text-white font-semibold text-sm mt-1">Affiliate</div>
              <div className="text-zinc-500 text-xs mt-1">Earned by referrers (optional)</div>
            </div>
          </div>
          <div className="mt-6 text-center text-zinc-500 text-xs">
            Example: A skill sold at $2.99 → Seller gets $2.39 · MarketNow gets $0.60 · Affiliate gets $0.15
          </div>
        </motion.div>

        {/* Affiliate CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="premium-card p-8 mb-16 text-center"
        >
          <h2 className="text-2xl font-bold text-white mb-2">BECOME AN AFFILIATE</h2>
          <p className="text-zinc-400 text-sm mb-6 max-w-xl mx-auto">
            Earn <strong className="text-[#00d1ff]">5% commission</strong> on every sale you refer.
            Share your affiliate link, and when someone buys via your link, you get paid.
            Monthly payouts via Stripe Connect (minimum $50 threshold).
          </p>
          <Link
            to="/dashboard"
            className="inline-block px-8 py-3 bg-[#00d1ff] text-black font-bold rounded-xl hover:bg-[#00d1ff]/90 transition-all"
          >
            GET YOUR AFFILIATE LINK →
          </Link>
        </motion.div>

        {/* FAQ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mx-auto"
        >
          <h2 className="text-2xl font-bold text-white mb-6 text-center">FREQUENTLY ASKED QUESTIONS</h2>
          <div className="space-y-4">
            {[
              {
                q: 'Do buyers need a subscription?',
                a: 'No. Buyers always pay a one-time price per skill ($0.99–$9.99). No subscriptions, no credits, no recurring billing for buyers. The seller tiers on this page are only for people who want to LIST skills for sale.',
              },
              {
                q: 'What happens if I exceed my free tier limit?',
                a: `FREE tier includes 3 skills. If you want to list more, you can either upgrade to PRO ($9.99/mo for 25 skills) or pay a storage fee of $${STORAGE_FEE.pricePerSkill.toFixed(2)}/skill/month for each additional skill.`,
              },
              {
                q: 'How do I get paid as a seller?',
                a: 'Payouts are processed monthly via Stripe Connect. You\'ll receive 80% of each sale price. Minimum payout threshold is $50. Sign up for Stripe Connect from your dashboard after your first sale.',
              },
              {
                q: 'Can I list my skill for free?',
                a: 'Yes — your first 3 skills are completely free to list. You only pay if you want to list more, or if you want add-ons like Featured Listing or Verified Seller badge.',
              },
              {
                q: 'What is the Verified Seller badge?',
                a: 'A one-time $19.99 purchase that adds a ✓ Verified badge to all your skills. Requires KYC verification (government ID). Boosts buyer trust and conversion rates significantly.',
              },
              {
                q: 'How does the affiliate program work?',
                a: 'Generate your unique affiliate code from /dashboard. Share links with your code (?ref=aff_xxxxx). When someone buys via your link, you earn 5% of the sale price. Payouts are monthly via Stripe Connect (min $50).',
              },
              {
                q: 'Can agents buy skills programmatically?',
                a: 'Yes! Agents can use our public API at /api/skills.json to discover skills, then complete the purchase via /api/checkout/create-session. The MarketNow MCP server (npx -y marketnow-mcp) lets agents search directly from their runtime.',
              },
              {
                q: 'Do you offer custom enterprise plans?',
                a: 'Yes. For teams listing 100+ skills or with custom requirements (on-prem deployment, custom commission rates, SSO), contact us at contact@alicelabs.site for a custom quote.',
              },
            ].map((item, i) => (
              <details key={i} className="premium-card p-5 group">
                <summary className="text-white font-semibold text-sm cursor-pointer flex items-center justify-between">
                  {item.q}
                  <span className="text-zinc-500 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <p className="text-zinc-400 text-sm mt-3 leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </motion.div>

        {/* Final CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mt-16"
        >
          <h2 className="text-3xl font-bold text-white mb-4">READY TO START SELLING?</h2>
          <p className="text-zinc-400 mb-8">List your first 3 skills free. No credit card required.</p>
          <Link
            to="/submit"
            className="inline-block px-10 py-4 bg-[#00F299] text-black font-bold rounded-xl hover:bg-[#00F299]/90 hover:scale-[1.02] transition-all shadow-lg shadow-[#00F299]/20"
          >
            SUBMIT YOUR FIRST SKILL →
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
