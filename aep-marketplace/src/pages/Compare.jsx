import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const COMPARISON = [
  {
    feature: 'Catalog size',
    marketnow: '8,560 skills',
    smithery: '~3,000 servers',
    glama: '~5,000 servers',
    mcpRegistry: '~64.7M entries (1,691 unique)',
    winner: 'mcpRegistry (size) / MarketNow (signal)',
  },
  {
    feature: 'Security audit',
    marketnow: 'Sentinel L1.5 (6-point scan on every skill)',
    smithery: 'Quality score (proprietary)',
    glama: 'Safety score (proprietary)',
    mcpRegistry: 'None (raw registry)',
    winner: 'MarketNow (transparent methodology)',
  },
  {
    feature: 'Review status transparency',
    marketnow: 'auto-scanned | human-reviewed | maintainer-verified (per skill)',
    smithery: 'Quality score only',
    glama: 'Safety score only',
    mcpRegistry: 'None',
    winner: 'MarketNow',
  },
  {
    feature: 'Payment protocol',
    marketnow: 'x402 (HTTP 402) + Stripe',
    smithery: 'None (free)',
    glama: 'None (free)',
    mcpRegistry: 'None',
    winner: 'MarketNow (commerce-ready)',
  },
  {
    feature: 'Agent spending authorization',
    marketnow: 'AP2-compatible mandates (human-in-loop default)',
    smithery: 'None',
    glama: 'None',
    mcpRegistry: 'None',
    winner: 'MarketNow',
  },
  {
    feature: 'Human-in-the-loop',
    marketnow: 'DEFAULT (notify mode). Silent requires explicit opt-in.',
    smithery: 'N/A',
    glama: 'N/A',
    mcpRegistry: 'N/A',
    winner: 'MarketNow',
  },
  {
    feature: 'Public audit log',
    marketnow: 'Every mandate transaction = git commit',
    smithery: 'No',
    glama: 'No',
    mcpRegistry: 'No',
    winner: 'MarketNow',
  },
  {
    feature: 'Open source',
    marketnow: 'MIT (full code, public repo)',
    smithery: 'No (proprietary)',
    glama: 'No (proprietary)',
    mcpRegistry: 'Open source (registry only)',
    winner: 'MarketNow + mcpRegistry',
  },
  {
    feature: 'Identity verification',
    marketnow: 'Planning (MCP Registry namespace verification)',
    smithery: 'No',
    glama: 'No',
    mcpRegistry: 'GitHub OAuth / DNS verification',
    winner: 'mcpRegistry (MarketNow integrating)',
  },
  {
    feature: 'Price model',
    marketnow: '$0.99–$9.99 one-time per skill. 43 free.',
    smithery: 'Free (hosted MCP servers)',
    glama: 'Free (directory)',
    mcpRegistry: 'Free (registry)',
    winner: 'Depends on use case',
  },
  {
    feature: 'Languages',
    marketnow: 'EN, ES, ZH, PT, FR (system prompts)',
    smithery: 'EN only',
    glama: 'EN only',
    mcpRegistry: 'N/A',
    winner: 'MarketNow',
  },
  {
    feature: 'Use case',
    marketnow: 'Trust layer for agent commerce',
    smithery: 'Hosted MCP servers (no install)',
    glama: 'Discovery directory',
    mcpRegistry: 'Canonical namespace registry',
    winner: 'Different purposes',
  },
];

export default function Compare() {
  return (
    <div className="min-h-screen pt-20 pb-20 px-4 md:px-8">
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00F299]/10 border border-[#00F299]/20 mb-4">
            <span className="text-[#00F299] text-[10px] font-mono tracking-wider">COMPETITIVE COMPARISON</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">MarketNow vs Smithery vs Glama vs MCP Registry</h1>
          <p className="text-zinc-400 text-lg max-w-2xl">
            Honest comparison. We're not the biggest — we're the trust layer. Each platform serves a different purpose. Here's exactly what each does.
          </p>
        </motion.div>

        {/* The big picture */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="premium-card p-6 mb-8">
          <h2 className="text-white text-sm font-mono tracking-wider mb-4 uppercase">The four platforms, summarized</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-[#00F299]/5 border border-[#00F299]/20">
              <div className="text-[#00F299] text-xs font-mono mb-2">MARKETNOW</div>
              <div className="text-white text-sm font-bold mb-1">Trust layer for agent commerce</div>
              <div className="text-zinc-400 text-xs">Security audits + payments + mandates. For agents that need to spend real money safely.</div>
            </div>
            <div className="p-4 rounded-xl bg-black/40 border border-white/5">
              <div className="text-zinc-400 text-xs font-mono mb-2">SMITHERY</div>
              <div className="text-white text-sm font-bold mb-1">Hosted MCP servers</div>
              <div className="text-zinc-400 text-xs">No-install MCP servers. Free. Good for trying without setup.</div>
            </div>
            <div className="p-4 rounded-xl bg-black/40 border border-white/5">
              <div className="text-zinc-400 text-xs font-mono mb-2">GLAMA</div>
              <div className="text-white text-sm font-bold mb-1">Discovery directory</div>
              <div className="text-zinc-400 text-xs">Browse MCP servers. Free. Good for finding what exists.</div>
            </div>
            <div className="p-4 rounded-xl bg-black/40 border border-white/5">
              <div className="text-zinc-400 text-xs font-mono mb-2">MCP REGISTRY</div>
              <div className="text-white text-sm font-bold mb-1">Canonical namespace registry</div>
              <div className="text-zinc-400 text-xs">Linux Foundation. Namespace verification. The source of truth.</div>
            </div>
          </div>
          <p className="text-zinc-500 text-xs mt-4">
            <strong className="text-zinc-300">Key insight:</strong> MarketNow doesn't compete with the others — it's a layer on top. Use the MCP Registry for identity, Smithery for hosted access, Glama for discovery, and MarketNow for trust (security, payments, mandates).
          </p>
        </motion.div>

        {/* Feature comparison table */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="premium-card p-6 mb-8 overflow-x-auto">
          <h2 className="text-white text-sm font-mono tracking-wider mb-4 uppercase">Feature-by-feature comparison</h2>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-2 text-zinc-400 font-mono">Feature</th>
                <th className="text-left py-3 px-2 text-[#00F299] font-mono">MarketNow</th>
                <th className="text-left py-3 px-2 text-zinc-400 font-mono">Smithery</th>
                <th className="text-left py-3 px-2 text-zinc-400 font-mono">Glama</th>
                <th className="text-left py-3 px-2 text-zinc-400 font-mono">MCP Registry</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row, i) => (
                <tr key={i} className="border-b border-white/5">
                  <td className="py-3 px-2 text-zinc-300 font-bold">{row.feature}</td>
                  <td className="py-3 px-2 text-[#00F299]">{row.marketnow}</td>
                  <td className="py-3 px-2 text-zinc-400">{row.smithery}</td>
                  <td className="py-3 px-2 text-zinc-400">{row.glama}</td>
                  <td className="py-3 px-2 text-zinc-400">{row.mcpRegistry}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>

        {/* When to use what */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="premium-card p-6 mb-8">
          <h2 className="text-white text-sm font-mono tracking-wider mb-4 uppercase">When to use which</h2>
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-black/40">
              <div className="text-[#00F299] text-xs font-mono mb-1">USE MARKETNOW IF:</div>
              <div className="text-zinc-300 text-sm">You're building an agent that needs to buy skills with real money (USDC or credit card). You need security audits. You need spending controls (mandates). You want a public audit log.</div>
            </div>
            <div className="p-3 rounded-lg bg-black/40">
              <div className="text-zinc-400 text-xs font-mono mb-1">USE SMITHERY IF:</div>
              <div className="text-zinc-300 text-sm">You want to try MCP servers without installing anything. Free hosted access. Good for experimentation.</div>
            </div>
            <div className="p-3 rounded-lg bg-black/40">
              <div className="text-zinc-400 text-xs font-mono mb-1">USE GLAMA IF:</div>
              <div className="text-zinc-300 text-sm">You want to browse and discover MCP servers. Free directory. Good for research.</div>
            </div>
            <div className="p-3 rounded-lg bg-black/40">
              <div className="text-zinc-400 text-xs font-mono mb-1">USE MCP REGISTRY IF:</div>
              <div className="text-zinc-300 text-sm">You're a tool publisher and want canonical namespace verification (GitHub OAuth / DNS). The source of truth for "is this really from anthropics/mcp-server-foo?"</div>
            </div>
          </div>
        </motion.div>

        {/* Honest disclosure */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="premium-card p-6">
          <h2 className="text-white text-sm font-mono tracking-wider mb-3 uppercase">Honest disclosure</h2>
          <ul className="space-y-2 text-sm text-zinc-400">
            <li className="flex gap-2">
              <span className="text-[#00F299]">✓</span>
              <span>Smithery and Glama have more traffic than us today. We're new (launched 2026).</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#00F299]">✓</span>
              <span>The MCP Registry is the canonical source. We're not competing with it — we're integrating with it for namespace verification.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#00F299]">✓</span>
              <span>Our Sentinel L1.5 audit is self-declared (we wrote the scanner). Independent audit pending until revenue.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#00F299]">✓</span>
              <span>We have 0 maintainer-verified skills today. The program is designed but not launched.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#00F299]">✓</span>
              <span>x402 and AP2 are "implementing" — not fully compliant yet. See /standards.</span>
            </li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-3 text-xs">
            <Link to="/trust" className="text-[#00F299] hover:underline">→ Trust roadmap</Link>
            <Link to="/standards" className="text-zinc-400 hover:underline">→ Standards</Link>
            <Link to="/catalog" className="text-zinc-400 hover:underline">→ Catalog transparency</Link>
            <Link to="/" className="text-zinc-400 hover:underline">→ Back to home</Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
