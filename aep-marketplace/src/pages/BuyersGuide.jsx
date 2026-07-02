import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const STEPS = [
  {
    n: 1,
    title: 'Check the review_status',
    what: 'Every skill on MarketNow has a review_status field. Look for it on the skill detail page.',
    values: [
      { value: 'auto-scanned', desc: 'Sentinel L1.5 ran automated checks. No human reviewed. Most skills are here (8,517). Safe to install, but treat with appropriate caution.', color: '#fbbf24' },
      { value: 'human-reviewed', desc: 'A human at AliceLabs inspected the GitHub repo, code, and Sentinel report. Higher trust. 43 skills today.', color: '#00F299' },
      { value: 'maintainer-verified', desc: 'The GitHub maintainer signed a claim of authorship (GPG). Highest trust. 0 skills today (program not launched).', color: '#00d1ff' },
    ],
    tip: 'If a skill is auto-scanned only, read the Sentinel report carefully before installing.',
  },
  {
    n: 2,
    title: 'Read the Sentinel L1.5 report',
    what: 'Sentinel runs 6 security checks. The report shows what passed, what failed, and the score (0-10).',
    checks: [
      'AUTH — Does the server require authentication?',
      'Tool description injection — Are there prompt injection patterns?',
      'Input validation — Does it validate inputs?',
      'CORS — Is the CORS policy permissive?',
      'OAuth scopes — Are scopes minimal?',
      'Rate limiting — Does it leak rate limit info in errors?',
    ],
    tip: 'A score of 7+ is good. Below 4, read the failed checks before installing.',
  },
  {
    n: 3,
    title: 'Check declared permissions',
    what: 'Every skill declares what it needs: network, filesystem, env_vars, subprocess.',
    example: {
      network: ['DISCORD_API_KEY'],
      filesystem: [],
      env_vars: ['DISCORD_TOKEN'],
      subprocess: true,
    },
    tip: 'If a skill requests subprocess:true and you don\'t expect it, that\'s a red flag. Permissions are declarative today (not enforced at runtime) — treat them as advisory.',
  },
  {
    n: 4,
    title: 'Check the source',
    what: 'Every skill links to its upstream GitHub repo. Visit it.',
    checks: [
      'Stars (more = more eyeballs)',
      'Last commit (recent = maintained)',
      'Open issues (read them — security issues are a red flag)',
      'Maintainer account age (new accounts = higher risk)',
      'License (MIT, Apache-2.0 = safe; GPL = check compatibility)',
    ],
    tip: 'A skill with 0 stars, last commit 2 years ago, and a maintainer account created last week is high risk — regardless of Sentinel score.',
  },
  {
    n: 5,
    title: 'Check the install command',
    what: 'MarketNow install commands use npx. Verify the package name matches the GitHub repo.',
    good: 'npx -y @marketnow/install <slug> (MarketNow wrapper, verified)',
    caution: 'npx -y some-random-package (check the npm registry — is it the same author as GitHub?)',
    tip: 'If the install command points to a different npm package than the GitHub repo suggests, that\'s a supply chain risk.',
  },
  {
    n: 6,
    title: 'Start with free skills',
    what: '43 skills are free — no payment, no mandate, no signup. Test MarketNow with these first.',
    tip: 'Free skills are human-reviewed. They\'re the safest place to start.',
    link: '/registry?filter=free',
  },
  {
    n: 7,
    title: 'For paid skills, use a mandate',
    what: 'If you\'re an agent buying paid skills, create a mandate first. Default mode is "notify" — you get an alert on every purchase.',
    tip: 'Start with a low limit ($5-10) and a low per-purchase cap ($1-2). Increase only after you trust the workflow.',
    link: '/mandates',
  },
];

export default function BuyersGuide() {
  return (
    <div className="min-h-screen pt-20 pb-20 px-4 md:px-8">
      <div className="max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00F299]/10 border border-[#00F299]/20 mb-4">
            <span className="text-[#00F299] text-[10px] font-mono tracking-wider">BUYER'S GUIDE</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">How to choose a secure MCP skill</h1>
          <p className="text-zinc-400 text-lg">
            7 steps to evaluate an MCP server before installing it. Written for developers and AI agents who need to make trust decisions.
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

              {step.values && (
                <div className="space-y-2 mb-4 ml-14">
                  {step.values.map(v => (
                    <div key={v.value} className="p-3 rounded-lg bg-black/40 border-l-2" style={{ borderColor: v.color }}>
                      <code className="text-xs font-mono font-bold" style={{ color: v.color }}>{v.value}</code>
                      <p className="text-zinc-400 text-xs mt-1">{v.desc}</p>
                    </div>
                  ))}
                </div>
              )}

              {step.checks && (
                <ul className="space-y-1 mb-4 ml-14">
                  {step.checks.map((c, j) => (
                    <li key={j} className="text-zinc-300 text-xs flex gap-2">
                      <span className="text-[#00F299]">✓</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              )}

              {step.example && (
                <div className="ml-14 mb-4 p-3 rounded-lg bg-black/40">
                  <div className="text-zinc-500 text-[10px] mb-1 font-mono">EXAMPLE PERMISSIONS:</div>
                  <pre className="text-[#00F299] text-xs font-mono overflow-x-auto">{JSON.stringify(step.example, null, 2)}</pre>
                </div>
              )}

              {step.good && (
                <div className="ml-14 mb-2 p-3 rounded-lg bg-[#00F299]/5 border border-[#00F299]/10">
                  <div className="text-[#00F299] text-[10px] mb-1 font-mono">GOOD:</div>
                  <code className="text-zinc-300 text-xs">{step.good}</code>
                </div>
              )}

              {step.caution && (
                <div className="ml-14 mb-4 p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/10">
                  <div className="text-yellow-400 text-[10px] mb-1 font-mono">CAUTION:</div>
                  <code className="text-zinc-300 text-xs">{step.caution}</code>
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
                  <Link to={step.link} className="text-[#00F299] text-xs hover:underline">→ {step.link === '/mandates' ? 'Create a mandate' : 'Browse free skills'}</Link>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-8 premium-card p-6">
          <h3 className="text-white text-sm font-mono tracking-wider mb-3 uppercase">The bottom line</h3>
          <p className="text-zinc-400 text-sm leading-relaxed mb-3">
            There's no such thing as "100% safe" when installing third-party code. But you can reduce risk significantly by:
          </p>
          <ol className="space-y-1 text-sm text-zinc-400 list-decimal list-inside">
            <li>Checking review_status (prefer human-reviewed)</li>
            <li>Reading the Sentinel report (score 7+ is good)</li>
            <li>Verifying declared permissions (subprocess:true is a yellow flag)</li>
            <li>Visiting the GitHub repo (stars, activity, license)</li>
            <li>Starting with free skills (they're human-reviewed)</li>
            <li>Using mandates with low limits for paid skills</li>
          </ol>
          <div className="mt-4 flex flex-wrap gap-3 text-xs">
            <Link to="/registry" className="text-[#00F299] hover:underline">→ Browse skills</Link>
            <Link to="/trust" className="text-zinc-400 hover:underline">→ Trust roadmap</Link>
            <Link to="/security" className="text-zinc-400 hover:underline">→ Sentinel methodology</Link>
            <Link to="/compare" className="text-zinc-400 hover:underline">→ vs Smithery vs Glama</Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
