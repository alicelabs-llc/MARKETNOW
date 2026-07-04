import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const LISTINGS = [
  {
    name: 'npm (marketnow-mcp)',
    url: 'https://www.npmjs.com/package/marketnow-mcp',
    status: 'updated',
    version: '1.4.0',
    lastChecked: '2026-07-04',
    whatWeFixed: [
      'v1.2.0: description said "8,535+ verified skills" → "8,560 MCP-compatible skills"',
      'v1.3.0: added "trust layer for agent commerce" positioning',
      'v1.4.0: description now includes "Sentinel L2, x402 (USDC on Base), AP2 mandates, AliceLabs LLC"',
      'v1.4.0: removed "open-source" and "mit" keywords (license is MNNC-1.0, not MIT)',
      'v1.4.0: added "trust-layer" and "aliceLabs" keywords',
      'License field: MIT → MNNC-1.0 (corrected in v1.4.0 source)',
    ],
    notes: 'npm package v1.4.0 published 2026-07-04. Old versions (1.1.0–1.3.0) are immutable in the registry — they cannot be changed. v1.4.0 is the canonical version with correct data. Mirrors propagate within 24h.',
  },
  {
    name: 'Smithery',
    url: 'https://smithery.ai/servers/eddyflores100/marketnow',
    status: 'partially-correct',
    version: 'N/A',
    lastChecked: '2026-07-04',
    whatWeFixed: [
      'Smithery pulls from our server-card.json at /.well-known/mcp/server-card.json',
      'Our server-card.json is up to date with current numbers (8,560 skills, USDC on Base, MNNC-1.0)',
    ],
    knownDiscrepancies: [
      'Smithery HTML still shows "8,535" in some cached views (their crawler may not have re-indexed yet)',
    ],
    notes: 'Smithery quality score: 84/100. Listing should reflect current data once Smithery re-crawls our server-card.json. Their cache TTL is typically 24-48h.',
  },
  {
    name: 'mcp.so',
    url: 'https://mcp.so/server/marketnow-mcp---aep-agent-exchange-protocol/edgarfloresguerra2011-a11y',
    status: 'stale',
    version: 'N/A',
    lastChecked: '2026-07-04',
    whatWeFixed: [
      'Opened GitHub issue #2977 on chatmcp/mcpso repo requesting listing update',
      'Created /.well-known/mcp-marketplace.json with canonical metadata any scraper can pull',
      'Updated GitHub repo README with canonical metadata table for crawlers',
      'mcp.so is behind Cloudflare anti-bot protection — cannot be updated programmatically',
      'Listing owner must update manually via mcp.so dashboard (requires login as @edgarfloresguerra2011-a11y)',
    ],
    knownDiscrepancies: [
      'Listing says "13,859 verified MCP-compatible skills" — should be 8,560',
      'Listing says "agent-to-agent crypto payments (ETH/BSC/SOL/BTC)" — we only support USDC on Base, NOT ETH/BSC/SOL/BTC directly',
      'Listing says "open registry with no manual approval needed" — we removed this framing; human-in-loop is now the default for mandates',
      'Listing says "largest open MCP skill marketplace" — we no longer claim to be the largest; we position as the trust layer',
      'Listing says "MIT license" — actual license is MNNC-1.0 (source-available, non-commercial)',
    ],
    notes: 'mcp.so is operated by chatmcp (GitHub: chatmcp/mcpso). The listing owner (Edison Flores) has not yet logged in to mcp.so to edit the listing directly. The listing can be edited via the mcp.so dashboard.',
  },
  {
    name: 'Glama.ai',
    url: 'https://glama.ai/mcp/connectors?query=MarketNow+MCP',
    status: 'listed',
    version: 'N/A',
    lastChecked: '2026-07-04',
    whatWeFixed: [
      'Glama.ai now returns results for "MarketNow MCP" search',
      'Glama crawls our server-card.json and GitHub repo for metadata',
    ],
    notes: 'Glama.ai appears to have indexed MarketNow. Verify the listing shows current numbers (8,560 skills, USDC on Base, MNNC-1.0). If stale, Glama\'s crawler should refresh within 7-14 days.',
  },
  {
    name: 'PulseMCP',
    url: 'https://www.pulsemcp.com',
    status: 'unknown',
    version: 'N/A',
    lastChecked: '2026-07-04',
    whatWeFixed: [
      'PulseMCP returned 403 (anti-bot protection). Cannot verify if we are listed.',
    ],
    notes: 'If listed on PulseMCP, the listing should match our current positioning. We will verify when we can.',
  },
  {
    name: 'Official MCP Registry',
    url: 'https://registry.modelcontextprotocol.io',
    status: 'not-registered',
    version: 'N/A',
    lastChecked: '2026-07-04',
    whatWeFixed: [
      'We are not yet registered in the official MCP registry (registry.modelcontextprotocol.io).',
      'Registration requires namespace verification via GitHub OAuth or DNS — see /standards.',
    ],
    notes: 'Registration in the official registry is on our roadmap. Once registered, our listing there will be the canonical source of truth that other directories can pull from.',
  },
];

const STATUS_META = {
  updated: { color: '#00F299', label: 'UPDATED' },
  'partially-correct': { color: '#00d1ff', label: 'PARTIALLY CORRECT' },
  stale: { color: '#ef4444', label: 'STALE — NEEDS UPDATE' },
  listed: { color: '#00F299', label: 'LISTED' },
  'not-listed': { color: '#a78bfa', label: 'NOT LISTED' },
  unknown: { color: '#fbbf24', label: 'UNKNOWN' },
  'not-registered': { color: '#fbbf24', label: 'NOT REGISTERED' },
};

export default function Listings() {
  return (
    <div className="min-h-screen pt-20 pb-20 px-4 md:px-8">
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00F299]/10 border border-[#00F299]/20 mb-4">
            <span className="text-[#00F299] text-[10px] font-mono tracking-wider">EXTERNAL LISTING CONSISTENCY</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">External Directory Listings</h1>
          <p className="text-zinc-400 text-lg max-w-2xl">
            Claude flagged that our mcp.so listing contradicts our actual site — wrong skill count, wrong payment chains, "no manual approval" messaging. This page tracks the consistency of every external directory that lists MarketNow, so agents and humans can verify which sources are current.
          </p>
        </motion.div>

        {/* The problem */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="premium-card p-6 mb-8 border-l-4 border-red-500/50">
          <h2 className="text-white text-sm font-mono tracking-wider mb-3 uppercase">The problem Claude found</h2>
          <p className="text-zinc-400 text-sm leading-relaxed mb-3">
            An agent that discovers MarketNow via mcp.so (more likely than via our own domain) sees a stale, less honest version:
          </p>
          <ul className="space-y-2 text-sm">
            <li className="flex gap-2 text-red-300">
              <span>✗</span>
              <span><strong>mcp.so says:</strong> "13,859 verified MCP-compatible skills" — <strong>reality:</strong> 8,560</span>
            </li>
            <li className="flex gap-2 text-red-300">
              <span>✗</span>
              <span><strong>mcp.so says:</strong> "agent-to-agent crypto payments (ETH/BSC/SOL/BTC)" — <strong>reality:</strong> USDC on Base only</span>
            </li>
            <li className="flex gap-2 text-red-300">
              <span>✗</span>
              <span><strong>mcp.so says:</strong> "open registry with no manual approval needed" — <strong>reality:</strong> human-in-loop is the default; "no humans needed" was removed from our site</span>
            </li>
            <li className="flex gap-2 text-red-300">
              <span>✗</span>
              <span><strong>mcp.so says:</strong> "largest open MCP skill marketplace" — <strong>reality:</strong> we no longer claim to be the largest; we position as the trust layer</span>
            </li>
          </ul>
          <p className="text-zinc-500 text-xs mt-4">
            Consistency between surfaces matters as much as the content of our own site. A honest marketnow.site is worthless if the directory listing that agents actually use to discover us is dishonest.
          </p>
        </motion.div>

        {/* Listings table */}
        <div className="space-y-4">
          {LISTINGS.map((l, i) => {
            const meta = STATUS_META[l.status];
            return (
              <motion.div
                key={l.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="premium-card p-6"
              >
                <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
                  <div>
                    <h2 className="text-white text-lg font-bold">
                      <a href={l.url} target="_blank" rel="noopener" className="hover:text-[#00F299]">
                        {l.name} →
                      </a>
                    </h2>
                    <div className="text-zinc-500 text-xs mt-1">Last checked: {l.lastChecked}</div>
                  </div>
                  <span
                    className="px-3 py-1 rounded-full text-[10px] font-mono font-bold"
                    style={{ background: `${meta.color}15`, color: meta.color, border: `1px solid ${meta.color}30` }}
                  >
                    {meta.label}
                  </span>
                </div>

                {l.whatWeFixed && (
                  <div className="mb-3">
                    <div className="text-[#00F299] text-[10px] mb-1 font-mono">WHAT WE DID</div>
                    <ul className="space-y-1">
                      {l.whatWeFixed.map((w, j) => (
                        <li key={j} className="text-zinc-300 text-xs flex gap-2">
                          <span className="text-[#00F299]">✓</span>
                          <span>{w}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {l.knownDiscrepancies && (
                  <div className="mb-3">
                    <div className="text-red-400 text-[10px] mb-1 font-mono">KNOWN DISCREPANCIES</div>
                    <ul className="space-y-1">
                      {l.knownDiscrepancies.map((w, j) => (
                        <li key={j} className="text-red-300 text-xs flex gap-2">
                          <span className="text-red-400">✗</span>
                          <span>{w}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {l.notes && (
                  <div className="text-zinc-500 text-xs leading-relaxed mt-2 pt-2 border-t border-white/5">
                    {l.notes}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Commitment */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-8 premium-card p-6">
          <h3 className="text-white text-sm font-mono tracking-wider mb-3 uppercase">Our commitment</h3>
          <ul className="space-y-2 text-sm text-zinc-400">
            <li className="flex gap-2">
              <span className="text-[#00F299]">✓</span>
              <span>We will maintain this page as the canonical source of truth for which external listings are current vs stale.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#00F299]">✓</span>
              <span>When we cannot update an external listing directly, we will disclose the discrepancy here rather than pretend it does not exist.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#00F299]">✓</span>
              <span>If you find a listing that contradicts our actual capabilities, email info@alicelabs.site and we will investigate and document it here.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#00F299]">✓</span>
              <span>The official MCP registry (registry.modelcontextprotocol.io) will be our canonical listing once we complete namespace verification.</span>
            </li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-3 text-xs">
            <Link to="/standards" className="text-[#00F299] hover:underline">→ Standards we're adopting</Link>
            <Link to="/trust" className="text-zinc-400 hover:underline">→ Trust roadmap</Link>
            <Link to="/about" className="text-zinc-400 hover:underline">→ About us</Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
