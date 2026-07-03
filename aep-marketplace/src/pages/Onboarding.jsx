import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const STEPS = [
  {
    n: 1,
    title: 'Prepare your MCP server',
    what: 'Make sure your MCP server is in a public GitHub repo with a clear README.',
    checklist: [
      'GitHub repo is public',
      'README.md with install instructions',
      'License file (MIT recommended)',
      'package.json with name, version, description',
      'At least one release tag (v1.0.0+)',
    ],
  },
  {
    n: 2,
    title: 'Run Sentinel L1.5 on your server',
    what: 'Before submitting, run our open source security scanner. Fix any issues found.',
    command: 'curl -X POST https://marketnow.site/api/audit-skill \\\n  -H "Content-Type: application/json" \\\n  -d \'{"repo_url": "https://github.com/yourname/your-mcp-server"}\'',
    checks: [
      'AUTH — Add authentication if missing',
      'Tool description injection — Remove prompt injection patterns',
      'Input validation — Validate all inputs',
      'CORS — Restrict to known origins',
      'OAuth scopes — Use minimal scopes',
      'Rate limiting — Don\'t leak rate limit info in errors',
    ],
    tip: 'A Sentinel score of 7+ is good. Below 4, fix the issues before submitting.',
  },
  {
    n: 3,
    title: 'Submit to MarketNow',
    what: 'Use our submission portal. We require the GitHub repo URL — we pull stars, last commit, and maintainer info automatically.',
    link: '/submit',
    fields: [
      'GitHub repo URL (required)',
      'Skill name and description',
      'Category (58 to choose from)',
      'Price ($0.99–$9.99, or free)',
      'System prompt (for agents to use your skill)',
      'Setup requirements (env vars, API keys needed)',
    ],
    tip: 'Free skills get listed faster. Paid skills require a Stripe Connect account for payouts.',
  },
  {
    n: 4,
    title: 'Wait for review',
    what: 'Sentinel L1.5 runs automatically. Human review takes 24-48h for paid skills, faster for free.',
    statuses: [
      { status: 'auto-scanned', desc: 'Sentinel ran. Your skill is listed but marked as auto-scanned. This is the default.' },
      { status: 'human-reviewed', desc: 'A human at AliceLabs inspected your repo. Higher trust badge.' },
      { status: 'maintainer-verified', desc: 'You signed a claim of authorship with GPG. Highest trust. Program launching soon.' },
    ],
  },
  {
    n: 5,
    title: 'Earn from sales',
    what: 'When someone buys your skill, you keep 80%. We take 20% commission. Payouts monthly via Stripe Connect.',
    math: [
      'Skill price: $2.99',
      'Your earnings: $2.39 (80%)',
      'MarketNow commission: $0.60 (20%)',
      'Affiliate commission: $0.15 (5%, if referred)',
    ],
    link: '/pricing',
  },
];

export default function Onboarding() {
  return (
    <div className="min-h-screen pt-20 pb-20 px-4 md:px-8">
      <div className="max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00F299]/10 border border-[#00F299]/20 mb-4">
            <span className="text-[#00F299] text-[10px] font-mono tracking-wider">SELLER ONBOARDING</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">How to publish your first MCP skill</h1>
          <p className="text-zinc-400 text-lg">
            5 steps to get your MCP server listed on MarketNow. From GitHub repo to earning money.
          </p>
        </motion.div>

        <div className="space-y-6">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.n}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="premium-card p-6"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#00F299]/20 border border-[#00F299]/40 flex items-center justify-center font-bold text-[#00F299] font-mono">
                  {step.n}
                </div>
                <div className="flex-1">
                  <h2 className="text-white text-lg font-bold mb-1">{step.title}</h2>
                  <p className="text-zinc-400 text-sm">{step.what}</p>
                </div>
              </div>

              {step.checklist && (
                <ul className="space-y-1 mb-4 ml-14">
                  {step.checklist.map((c, j) => (
                    <li key={j} className="text-zinc-300 text-xs flex gap-2">
                      <span className="text-[#00F299]">☐</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              )}

              {step.command && (
                <div className="ml-14 mb-4 p-3 rounded-lg bg-black/40">
                  <div className="text-zinc-500 text-[10px] mb-1 font-mono">RUN:</div>
                  <pre className="text-[#00F299] text-xs font-mono overflow-x-auto whitespace-pre-wrap">{step.command}</pre>
                </div>
              )}

              {step.checks && (
                <div className="ml-14 mb-4">
                  <div className="text-zinc-500 text-[10px] mb-2 font-mono">6 SECURITY CHECKS:</div>
                  <ul className="space-y-1">
                    {step.checks.map((c, j) => (
                      <li key={j} className="text-zinc-300 text-xs flex gap-2">
                        <span className="text-[#00F299]">🛡️</span>
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {step.fields && (
                <div className="ml-14 mb-4">
                  <div className="text-zinc-500 text-[10px] mb-2 font-mono">FIELDS TO FILL:</div>
                  <ul className="space-y-1">
                    {step.fields.map((f, j) => (
                      <li key={j} className="text-zinc-300 text-xs flex gap-2">
                        <span className="text-[#00d1ff]">→</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {step.statuses && (
                <div className="ml-14 mb-4 space-y-2">
                  {step.statuses.map(s => (
                    <div key={s.status} className="p-3 rounded-lg bg-black/40">
                      <code className="text-[#00F299] text-xs font-mono">{s.status}</code>
                      <p className="text-zinc-400 text-xs mt-1">{s.desc}</p>
                    </div>
                  ))}
                </div>
              )}

              {step.math && (
                <div className="ml-14 mb-4 p-3 rounded-lg bg-black/40">
                  <div className="text-zinc-500 text-[10px] mb-2 font-mono">PAYOUT EXAMPLE ($2.99 skill):</div>
                  {step.math.map((m, j) => (
                    <div key={j} className="text-zinc-300 text-xs font-mono">{m}</div>
                  ))}
                </div>
              )}

              {step.tip && (
                <div className="ml-14 p-3 rounded-lg bg-[#00d1ff]/5 border border-[#00d1ff]/10">
                  <div className="text-[#00d1ff] text-[10px] mb-1 font-mono">TIP:</div>
                  <p className="text-zinc-300 text-xs">{step.tip}</p>
                </div>
              )}

              {step.link && (
                <div className="ml-14 mt-3">
                  <Link to={step.link} className="text-[#00F299] text-xs hover:underline">
                    → {step.link === '/submit' ? 'Submit your skill' : step.link === '/pricing' ? 'See pricing tiers' : 'Learn more'}
                  </Link>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-8 premium-card p-6">
          <h3 className="text-white text-sm font-mono tracking-wider mb-3 uppercase">Ready to publish?</h3>
          <p className="text-zinc-400 text-sm mb-4">
            Start with a free skill — it's the fastest way to get listed and build reputation. Once you have a track record, add paid skills.
          </p>
          <div className="flex gap-3 flex-wrap">
            <Link to="/submit" className="px-5 py-2.5 bg-[#00F299] text-black font-bold rounded-lg hover:bg-[#00F299]/90 text-sm">
              SUBMIT YOUR SKILL →
            </Link>
            <Link to="/pricing" className="px-5 py-2.5 border border-white/10 text-white font-medium rounded-lg hover:bg-white/5 text-sm">
              See pricing
            </Link>
            <Link to="/buyers-guide" className="px-5 py-2.5 border border-white/10 text-white font-medium rounded-lg hover:bg-white/5 text-sm">
              Buyer's guide
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
