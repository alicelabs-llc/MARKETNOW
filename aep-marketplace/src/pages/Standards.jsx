import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useLang } from '../context/LanguageContext.jsx';

const STANDARDS = [
  {
    id: 'x402',
    name: 'x402 — HTTP 402 Payment Required',
    status: 'implementing',
    gov: 'Linux Foundation (Coinbase, Cloudflare, Stripe, Google, Visa)',
    what: 'Revives HTTP status code 402 for native HTTP-level payments. Instead of custom USDC verification flows, the server returns 402 with payment instructions; the client (agent) pays and retries with the payment proof. Built on USDC on Base.',
    why: 'Removes us from "looks like home-rolled crypto" territory. x402 is a recognized standard with major backers. Any agent that speaks x402 can pay us without custom integration.',
    our_plan: [
      'DONE: USDC on Base with on-chain verification (our current flow)',
      'IN PROGRESS: Wrap the flow in x402 semantics — return HTTP 402 with payment challenge, accept retry with x402 Payment header',
      'ROADMAP: Full x402 protocol compliance, including the facilitates protocol for intermediaries',
    ],
    link: 'https://x402.org',
  },
  {
    id: 'ap2',
    name: 'AP2 — Agent Payments Protocol',
    status: 'implementing',
    gov: 'Google (+ Visa, Mastercard, PayPal, Coinbase, 60+ partners)',
    what: 'Signed declarations that define what an agent can do: spend limits, scope, expiry. Portable across platforms, cryptographically verifiable, instantly revocable. Our "mandates" are conceptually identical to AP2 mandates — we are migrating to be wire-compatible.',
    why: 'AP2 has 60+ partners including the major payment networks. An agent with an AP2 mandate from another platform should be able to spend on MarketNow without re-authorization. Custom mandate JSON locks us into our own ecosystem.',
    our_plan: [
      'DONE: Mandate concept (limit, per-purchase cap, categories, expiry, revocation)',
      'DONE: Human-in-loop by default (notify mode); silent requires explicit opt-in',
      'IN PROGRESS: Make mandates AP2-wire-compatible — signed declarations, portable format',
      'ROADMAP: Cross-platform mandate verification (accept AP2 mandates issued elsewhere)',
    ],
    link: 'https://github.com/google/agent-payments-protocol',
  },
  {
    id: 'server-cards',
    name: 'MCP Server Cards',
    status: 'monitoring',
    gov: 'MCP / Linux Foundation (roadmap 2026)',
    what: 'Standardized metadata exposed via .well-known URLs so any crawler or registry can discover MCP server capabilities without connecting. Similar to our agent.json, but as a shared standard rather than proprietary.',
    why: 'Server Cards will let registries (registry.modelcontextprotocol.io, Smithery, Glama, PulseMCP) pull consistent metadata from any MCP server. Our agent.json is a superset today, but we should align to the standard when it stabilizes.',
    our_plan: [
      'DONE: agent.json with capabilities, schema, trust model, all API endpoints',
      'DONE: .well-known/mcp/server-card.json for Smithery compatibility',
      'MONITORING: Track MCP working group for Server Cards spec finalization',
      'ROADMAP: Migrate agent.json to be a strict superset of Server Cards once spec stabilizes',
    ],
    link: 'https://modelcontextprotocol.io',
  },
  {
    id: 'namespace',
    name: 'Official Registry Namespace Verification',
    status: 'planning',
    gov: 'Linux Foundation / MCP Registry',
    what: 'The official MCP registry (registry.modelcontextprotocol.io) verifies namespaces via GitHub OAuth or DNS. This gives real identity to skill publishers — not just "Open Source Community" as author.',
    why: 'Today any skill can claim any author. With namespace verification, a skill claiming to be from "anthropics/mcp-server-foo" must actually come from the anthropics GitHub org. This is the foundation of real trust.',
    our_plan: [
      'PLANNING: Integrate registry API to verify publisher identity at submission time',
      'ROADMAP: Display verified publisher badge on skill detail pages',
      'ROADMAP: Require namespace verification for "maintainer-verified" review_status',
    ],
    link: 'https://registry.modelcontextprotocol.io',
  },
  {
    id: 'task-scoped',
    name: 'Task-Scoped Mandates',
    status: 'roadmap',
    gov: 'Industry direction (ACP, AP2, MPP all converging)',
    what: 'Today mandates are scoped by $ limit and time. The industry direction is task-scoped: "this mandate is only valid for completing task X" — the agent cannot use it for anything else, and the human must re-approve for each new task. More restrictive than $500/90 days.',
    why: 'Claude flagged this as where the industry is moving. Being more restrictive than big players on autonomy is a feature, not a bug — it earns trust.',
    our_plan: [
      'ROADMAP: Add task_description field to mandates (free text, agent-declared)',
      'ROADMAP: Add task_hash field (deterministic hash of task description + agent ID)',
      'ROADMAP: Surface task scope in notifications so principal knows what the spend was FOR, not just how much',
    ],
    link: 'https://agentcommunicationprotocol.org',
  },
];

const STATUS_META = {
  implementing: { color: '#00F299', label: 'IMPLEMENTING', desc: 'Active engineering work in progress' },
  monitoring: { color: '#00d1ff', label: 'MONITORING', desc: 'Tracking spec, will adopt when stable' },
  planning: { color: '#fbbf24', label: 'PLANNING', desc: 'Design phase, not yet started' },
  roadmap: { color: '#a78bfa', label: 'ROADMAP', desc: 'Future, after implementing items land' },
};

export default function Standards() {
  const { t } = useLang();
  return (
    <div className="min-h-screen pt-20 pb-20 px-4 md:px-8">
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00F299]/10 border border-[#00F299]/20 mb-4">
            <span className="text-[#00F299] text-[10px] font-mono tracking-wider">STANDARDS COMMITMENT</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">{t('standards.title')}</h1>
          <p className="text-zinc-400 text-lg max-w-2xl">
            {t('standards.subtitle')}
          </p>
        </motion.div>

        {/* Strategic positioning */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="premium-card p-6 mb-8">
          <h2 className="text-white text-sm font-mono tracking-wider mb-3 uppercase">Why this matters</h2>
          <p className="text-zinc-400 text-sm leading-relaxed mb-3">
            In December 2025, Anthropic donated MCP to the Linux Foundation. The official registry
            (<a href="https://registry.modelcontextprotocol.io" target="_blank" rel="noopener" className="text-[#00F299] hover:underline">registry.modelcontextprotocol.io</a>)
            now solves <strong className="text-white">discovery</strong> — anyone can find MCP servers there.
            Smithery, Glama, PulseMCP compete on curation and search.
          </p>
          <p className="text-zinc-400 text-sm leading-relaxed">
            What is <em>not</em> solved is <strong className="text-white">trust</strong>: an independent analysis found
            ~64.7 million server entries from just 1,691 unique packages — massive duplication, zero signal,
            active supply-chain attacks (npm packages stealing wallets, PyPI packages exfiltrating agent
            conversations, hundreds of malicious PRs per day). <strong className="text-white">That is our wedge.</strong>
            We are not the biggest catalog. We are the trust layer.
          </p>
        </motion.div>

        {/* Standards list */}
        <div className="space-y-6">
          {STANDARDS.map((s, i) => {
            const meta = STATUS_META[s.status];
            return (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="premium-card p-6"
              >
                <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
                  <div>
                    <h2 className="text-white text-lg font-bold">{s.name}</h2>
                    <div className="text-zinc-500 text-xs mt-1">Governance: {s.gov}</div>
                  </div>
                  <span
                    className="px-3 py-1 rounded-full text-[10px] font-mono font-bold"
                    style={{ background: `${meta.color}15`, color: meta.color, border: `1px solid ${meta.color}30` }}
                  >
                    {meta.label}
                  </span>
                </div>

                <div className="mb-4">
                  <div className="text-zinc-500 text-[10px] mb-1 font-mono">WHAT IT IS</div>
                  <p className="text-zinc-300 text-sm leading-relaxed">{s.what}</p>
                </div>

                <div className="mb-4">
                  <div className="text-zinc-500 text-[10px] mb-1 font-mono">WHY WE'RE ADOPTING</div>
                  <p className="text-zinc-300 text-sm leading-relaxed">{s.why}</p>
                </div>

                <div className="mb-4">
                  <div className="text-zinc-500 text-[10px] mb-2 font-mono">OUR PLAN</div>
                  <ul className="space-y-1">
                    {s.our_plan.map((p, j) => {
                      const isDone = p.startsWith('DONE');
                      const isInProgress = p.startsWith('IN PROGRESS');
                      const isMonitoring = p.startsWith('MONITORING');
                      const isPlanning = p.startsWith('PLANNING');
                      const isRoadmap = p.startsWith('ROADMAP');
                      const prefix = isDone ? '✓' : isInProgress ? '⟳' : isMonitoring ? '👁' : isPlanning ? '✎' : isRoadmap ? '○' : '·';
                      const color = isDone ? '#00F299' : isInProgress ? '#00d1ff' : isMonitoring ? '#00d1ff' : isPlanning ? '#fbbf24' : isRoadmap ? '#a78bfa' : '#666';
                      return (
                        <li key={j} className="text-zinc-400 text-xs flex gap-2">
                          <span style={{ color }} className="flex-shrink-0">{prefix}</span>
                          <span>{p.replace(/^(DONE|IN PROGRESS|MONITORING|PLANNING|ROADMAP):\s*/, '')}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <a
                  href={s.link}
                  target="_blank"
                  rel="noopener"
                  className="text-[#00F299] text-xs hover:underline"
                >
                  → Learn more about {s.name.split('—')[0].trim()}
                </a>
              </motion.div>
            );
          })}
        </div>

        {/* Calibration note */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-8 premium-card p-6">
          <h3 className="text-white text-sm font-mono tracking-wider mb-3 uppercase">Calibration note</h3>
          <p className="text-zinc-400 text-sm leading-relaxed mb-3">
            ACP, AP2, x402, and MPP all compete and combine simultaneously. No one would bet today on a single winner.
            Our strategy is <strong className="text-white">design for interoperability</strong>, not "pick one and hope."
            The real risk in 2026 is being left out of whatever standard wins — not picking the wrong product detail.
          </p>
          <p className="text-zinc-500 text-xs leading-relaxed">
            We will support multiple payment rails (x402 today, AP2 mandates, MPP when it stabilizes) and
            multiple discovery formats (our agent.json superset, MCP Server Cards when standard, Smithery format).
            Compliance over purity.
          </p>
        </motion.div>

        {/* Honest disclosure */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-8 premium-card p-6">
          <h3 className="text-white text-sm font-mono tracking-wider mb-3 uppercase">Honest disclosure</h3>
          <ul className="space-y-2 text-sm text-zinc-400">
            <li className="flex gap-2">
              <span className="text-[#00F299]">✓</span>
              <span>We have not yet completed full x402 or AP2 compliance. We are <em>implementing</em>, not <em>done</em>.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#00F299]">✓</span>
              <span>Our current mandate JSON is conceptually identical to AP2 but not wire-compatible yet. Migration in progress.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#00F299]">✓</span>
              <span>Our current USDC flow is functionally similar to x402 (server returns payment challenge, client pays, server verifies) but does not use the HTTP 402 status code yet. Wrapping in progress.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#00F299]">✓</span>
              <span>Every status on this page is a git commit. When something moves from "implementing" to "done," you will see it here first.</span>
            </li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-3 text-xs">
            <Link to="/trust" className="text-[#00F299] hover:underline">→ Trust roadmap (Claude's 7 points)</Link>
            <Link to="/about" className="text-zinc-400 hover:underline">→ About us</Link>
            <Link to="/catalog" className="text-zinc-400 hover:underline">→ Catalog transparency</Link>
            <Link to="/mandates" className="text-zinc-400 hover:underline">→ Manage mandates</Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
