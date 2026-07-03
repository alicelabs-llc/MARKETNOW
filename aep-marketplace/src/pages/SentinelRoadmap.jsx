import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const LEVELS = [
  {
    level: 'L1.5',
    name: 'Static Analysis (SAST) — CURRENT',
    status: 'live',
    color: '#00F299',
    checks: ['AUTH', 'Tool description injection (8 patterns)', 'Input validation', 'CORS', 'OAuth scopes', 'Rate limiting error leakage'],
    limitation: 'Static analysis can be evaded via code obfuscation, dynamic module loading, or malicious third-party dependencies.',
  },
  {
    level: 'L2',
    name: 'Dynamic Analysis in Sandbox (DAST)',
    status: 'design_phase',
    color: '#00d1ff',
    problem: 'Static analysis can be evaded via code obfuscation, dynamic module loading, or malicious third-party dependencies.',
    solution: 'Execute each MCP server in an ephemeral sandbox (gVisor, Firecracker, or WebAssembly). Monitor syscalls to detect suspicious behavior.',
    technologies: ['gVisor', 'Firecracker', 'WebAssembly', 'eBPF'],
    timeline: 'Q4 2026 - Q1 2027',
  },
  {
    level: 'L2.5',
    name: 'Continuous Supply Chain Audit',
    status: 'planning',
    color: '#fbbf24',
    problem: 'A server secure today can become vulnerable tomorrow if a dependency suffers a supply chain attack.',
    solution: 'Automated periodic re-scanning of dependency trees against vulnerability databases. Compromised skills auto-quarantine.',
    technologies: ['Snyk API', 'OSV.dev', 'Socket.dev', 'npm audit', 'pip-audit'],
    timeline: 'Q1 2027',
  },
  {
    level: 'L3',
    name: 'Automated Red Teaming vs Prompt Injection',
    status: 'research',
    color: '#a78bfa',
    problem: 'Detecting Tool Description Injection is extremely difficult with static rules.',
    solution: 'Adversarial evaluation sub-module with specialized LLMs that systematically attack tool descriptions using jailbreaking techniques.',
    technologies: ['Open source LLMs', 'Prompt injection benchmarks', 'Adversarial testing frameworks'],
    timeline: 'Q2 2027',
  },
  {
    level: 'L3.5',
    name: 'Cryptographic Code Signing',
    status: 'design_phase',
    color: '#a78bfa',
    problem: 'Source code in external GitHub repos could be modified after Sentinel analysis.',
    solution: 'Sentinel generates a signed hash after analysis. MCP clients verify the signature before execution.',
    technologies: ['ECDSA signatures', 'Sigstore', 'GitHub artifact attestations'],
    timeline: 'Q2 2027',
  },
];

const PLATFORM_FEATURES = [
  {
    name: 'Risk Level Classification (Green/Yellow/Red)',
    status: 'implemented',
    description: 'Skills categorized by system resource access. Allows granular security policies.',
    levels: {
      green: 'Pure prompts, no install, no network',
      yellow: 'Network access, external APIs, env vars — no arbitrary code exec',
      red: 'Subprocess execution (npx/npm/bash/curl runs arbitrary code)',
    },
  },
  {
    name: 'Community Feedback Loop',
    status: 'implemented',
    description: 'Anonymous endpoint for reporting unexpected behavior, failures, or suspected malicious activity.',
    endpoint: 'POST /api/report-skill',
  },
  {
    name: 'Advanced Search Filters',
    status: 'implemented',
    description: 'Filter by license, audit status, risk level, architecture.',
    available_at: '/registry',
  },
  {
    name: 'Maintainer-Verified Program',
    status: 'planning',
    description: 'Simplified verification via PGP commit signatures or verified GitHub accounts + lightweight KYC.',
    timeline: 'Q4 2026',
    apply_at: 'info@alicelabs.site',
  },
];

export default function SentinelRoadmap() {
  return (
    <div className="min-h-screen pt-20 pb-20 px-4 md:px-8">
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00F299]/10 border border-[#00F299]/20 mb-4">
            <span className="text-[#00F299] text-[10px] font-mono tracking-wider">SENTINEL ROADMAP — L1.5 TO NEXT-GEN</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">From L1.5 to Next-Gen Security</h1>
          <p className="text-zinc-400 text-lg">
            The path from static analysis (today) to sandboxed dynamic execution, supply chain auditing, adversarial red teaming, and cryptographic code signing.
          </p>
        </motion.div>

        {/* Sentinel levels */}
        <div className="space-y-6 mb-12">
          {LEVELS.map((level, i) => (
            <motion.div
              key={level.level}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="premium-card p-6"
            >
              <div className="flex items-start gap-4 mb-4">
                <div
                  className="flex-shrink-0 w-16 h-16 rounded-xl flex items-center justify-center font-bold font-mono text-lg"
                  style={{ background: `${level.color}20`, color: level.color, border: `1px solid ${level.color}40` }}
                >
                  {level.level}
                </div>
                <div className="flex-1">
                  <h2 className="text-white text-lg font-bold mb-1">{level.name}</h2>
                  <span
                    className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold"
                    style={{ background: `${level.color}15`, color: level.color }}
                  >
                    {level.status.toUpperCase().replace('_', ' ')}
                  </span>
                </div>
              </div>

              {level.checks && (
                <div className="mb-4">
                  <div className="text-zinc-500 text-[10px] mb-2 font-mono">CHECKS ({level.checks.length}):</div>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-1">
                    {level.checks.map((c, j) => (
                      <li key={j} className="text-zinc-300 text-xs flex gap-2">
                        <span style={{ color: level.color }}>✓</span>
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {level.limitation && (
                <div className="p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/10">
                  <div className="text-yellow-400 text-[10px] mb-1 font-mono">LIMITATION:</div>
                  <p className="text-zinc-400 text-xs">{level.limitation}</p>
                </div>
              )}

              {level.problem && (
                <div className="mb-3 p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                  <div className="text-red-400 text-[10px] mb-1 font-mono">PROBLEM:</div>
                  <p className="text-zinc-400 text-xs">{level.problem}</p>
                </div>
              )}

              {level.solution && (
                <div className="mb-3 p-3 rounded-lg bg-[#00F299]/5 border border-[#00F299]/10">
                  <div className="text-[#00F299] text-[10px] mb-1 font-mono">SOLUTION:</div>
                  <p className="text-zinc-300 text-xs">{level.solution}</p>
                </div>
              )}

              {level.technologies && (
                <div className="mb-3">
                  <div className="text-zinc-500 text-[10px] mb-1 font-mono">TECHNOLOGIES:</div>
                  <div className="flex flex-wrap gap-2">
                    {level.technologies.map(t => (
                      <span key={t} className="px-2 py-1 rounded bg-black/40 text-zinc-400 text-[10px] font-mono">{t}</span>
                    ))}
                  </div>
                </div>
              )}

              {level.timeline && (
                <div className="text-zinc-500 text-xs">
                  <span className="font-mono">Timeline:</span> {level.timeline}
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Platform improvements */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mb-8">
          <h2 className="text-white text-2xl font-bold mb-6">Platform Improvements</h2>
          <div className="space-y-4">
            {PLATFORM_FEATURES.map((f, i) => (
              <div key={i} className="premium-card p-6">
                <div className="flex items-start justify-between mb-2 flex-wrap gap-2">
                  <h3 className="text-white text-sm font-bold">{f.name}</h3>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    f.status === 'implemented' ? 'bg-[#00F299]/10 text-[#00F299]' : 'bg-yellow-500/10 text-yellow-400'
                  }`}>
                    {f.status.toUpperCase()}
                  </span>
                </div>
                <p className="text-zinc-400 text-xs mb-2">{f.description}</p>
                {f.levels && (
                  <div className="space-y-1 mt-2">
                    {Object.entries(f.levels).map(([level, desc]) => (
                      <div key={level} className="flex gap-2 text-xs">
                        <span className={`px-2 py-0.5 rounded font-mono font-bold ${
                          level === 'green' ? 'bg-green-500/10 text-green-400' :
                          level === 'yellow' ? 'bg-yellow-500/10 text-yellow-400' :
                          'bg-red-500/10 text-red-400'
                        }`}>{level.toUpperCase()}</span>
                        <span className="text-zinc-400">{desc}</span>
                      </div>
                    ))}
                  </div>
                )}
                {f.endpoint && (
                  <code className="text-[#00F299] text-xs font-mono block mt-2">{f.endpoint}</code>
                )}
                {f.apply_at && (
                  <p className="text-zinc-500 text-xs mt-2">Apply at: <a href={`mailto:${f.apply_at}`} className="text-[#00F299] hover:underline">{f.apply_at}</a></p>
                )}
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="premium-card p-6">
          <h3 className="text-white text-sm font-mono tracking-wider mb-3 uppercase">Honest disclosure</h3>
          <p className="text-zinc-400 text-sm leading-relaxed mb-3">
            All L2+ features are in design/planning/research phase. None are implemented today. We will not claim they are done until they are.
          </p>
          <p className="text-zinc-500 text-xs">
            Every status change will be a git commit visible in our public repo. See the machine-readable version at <code className="text-[#00F299]">/api/sentinel-roadmap.json</code>.
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-xs">
            <Link to="/trust" className="text-[#00F299] hover:underline">→ Trust roadmap</Link>
            <Link to="/standards" className="text-zinc-400 hover:underline">→ Standards</Link>
            <Link to="/security" className="text-zinc-400 hover:underline">→ Sentinel L1.5</Link>
            <Link to="/buyers-guide" className="text-zinc-400 hover:underline">→ Buyer's guide</Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
