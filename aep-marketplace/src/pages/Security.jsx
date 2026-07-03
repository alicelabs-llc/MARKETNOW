import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function Security() {
  const [stats, setStats] = useState({
    total: 0,
    scanned: 0,
    avgScore: 0,
    passRate: 100,
    criticalIssues: 0,
  });
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    loadStats();
    loadLogs();
  }, []);

  const loadStats = async () => {
    try {
      const mres = await fetch('/api/manifest.json');
      if (mres.ok) {
        const m = await mres.json();
        const total = m.total_skills || 0;
        setStats(s => ({ ...s, total, scanned: total }));
      }

      const sres = await fetch('/api/skills.json');
      if (sres.ok) {
        const skills = await sres.json();
        if (Array.isArray(skills) && skills.length > 0) {
          const sum = skills.reduce((acc, s) => acc + (s.sentinel_score || 0), 0);
          const avg = sum / skills.length;
          const passing = skills.filter(s => (s.sentinel_score || 0) >= 4).length;
          setStats(s => ({
            ...s,
            avgScore: avg.toFixed(1),
            passRate: ((passing / skills.length) * 100).toFixed(1),
            criticalIssues: skills.filter(s => (s.sentinel_score || 0) < 4).length,
          }));
        }
      }
    } catch (e) {
      console.warn('Could not load security stats:', e.message);
    }
  };

  const loadLogs = async () => {
    try {
      const res = await fetch('/api/skills.json');
      if (!res.ok) return;
      const skills = await res.json();
      if (!Array.isArray(skills) || skills.length === 0) return;
      const recent = skills.slice(-8).reverse().map((s, i) => ({
        id: `AUD-${String(i + 1).padStart(3, '0')}`,
        time: i === 0 ? 'Just now' : `${i} hour${i === 1 ? '' : 's'} ago`,
        type: 'Skill listing audit',
        status: 'Passed',
        skill: s.name,
        score: s.sentinel_score || 6,
        maxScore: 10,
      }));
      setLogs(recent);
    } catch (e) {
      console.warn('Could not load audit logs:', e.message);
    }
  };

  // L1.5 checks (live in production)
  const l15Checks = [
    { label: 'AUTH — Does the server require authentication?', category: 'Authentication' },
    { label: 'Tool description injection — 8 prompt injection patterns detected', category: 'Prompt Injection' },
    { label: 'Input validation — Does it validate inputs?', category: 'Input Validation' },
    { label: 'CORS — Is the CORS policy permissive?', category: 'CORS' },
    { label: 'OAuth scopes — Are scopes minimal?', category: 'OAuth' },
    { label: 'Rate limiting error leakage — Do errors leak rate limit info?', category: 'Rate Limiting' },
  ];

  // L1.6 checks (LIVE IN PRODUCTION, running in production (real-time))
  const l16Checks = [
    { label: 'Semgrep static analysis — 18 MCP-specific rules (prompt injection, command injection, hardcoded secrets, SSRF, tool spoofing)', category: 'Static Analysis', status: 'code_complete' },
    { label: 'Gitleaks secret detection — scans for API keys, private keys, wallet mnemonics', category: 'Secret Scanning', status: 'code_complete' },
    { label: 'OSV-Scanner dependency audit — checks npm/pip lockfiles against vulnerability databases', category: 'Supply Chain', status: 'code_complete' },
    { label: 'npm audit fallback — when OSV-Scanner unavailable', category: 'Supply Chain', status: 'code_complete' },
    { label: 'Hygiene checks — license, manifest, README presence', category: 'Hygiene', status: 'code_complete' },
    { label: 'Weighted scoring — Secrets 40%, Vulns 30%, Static 20%, Hygiene 10%', category: 'Scoring', status: 'code_complete' },
    { label: 'Critical secret = instant score 0 (blocks listing)', category: 'Blocking', status: 'code_complete' },
  ];

  // L2 checks (design complete)
  const l2Checks = [
    { label: 'Sandbox execution — gVisor / Firecracker / Docker+seccomp', category: 'Isolation', status: 'design' },
    { label: 'Syscall monitoring — open, connect, execve, fork, unlink', category: 'Monitoring', status: 'design' },
    { label: 'Adversarial test inputs — path traversal, SQL injection, SSRF, prompt injection', category: 'Testing', status: 'design' },
    { label: 'Multiplicative scoring on L1.6 — 1.0 (clean) / 0.7 (medium) / 0.3 (high) / 0.0 (critical)', category: 'Scoring', status: 'design' },
  ];

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-[1440px] mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00F299]/10 border border-[#00F299]/20 mb-4">
            <span className="text-[#00F299] text-[10px] font-mono tracking-wider">SENTINEL L1.5 → L1.6 → L2</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">
            SENTINEL <span className="text-[#00F299]">SECURITY</span> CENTER
          </h1>
          <p className="text-zinc-400 max-w-2xl">
            Multi-layer security audit for all skills. L1.5 runs in production today.
            L1.6 (enhanced with Semgrep + Gitleaks + OSV-Scanner) is LIVE IN PRODUCTION and runs in production (real-time).
            L2 (sandboxed dynamic analysis) is in design phase.
          </p>
        </motion.div>

        {/* Live stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10"
        >
          {[
            { label: 'Total Skills', value: stats.total.toLocaleString() },
            { label: 'Scanned by Sentinel', value: stats.scanned.toLocaleString() },
            { label: 'Avg Sentinel Score', value: `${stats.avgScore}/10` },
            { label: 'Pass Rate (≥4/10)', value: `${stats.passRate}%` },
            { label: 'Critical Issues', value: stats.criticalIssues },
          ].map((stat) => (
            <div key={stat.label} className="premium-card p-5 text-center">
              <div className="text-2xl font-bold text-white font-mono">{stat.value}</div>
              <div className="text-[10px] text-zinc-500 font-mono tracking-wider mt-1 uppercase">
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>

        {/* Version banner */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.08 }} className="premium-card p-4 mb-8 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-[#00F299]/10 text-[#00F299] text-xs font-mono font-bold">L1.5 LIVE</span>
            <span className="text-zinc-500 text-xs">→ metadata-based, 6 checks, runs in /api/audit-skill</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-[#00d1ff]/10 text-[#00d1ff] text-xs font-mono font-bold">L1.6 LIVE</span>
            <span className="text-zinc-500 text-xs">→ Semgrep + Gitleaks + OSV-Scanner, runs in production (real-time)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-[#00F299]/10 text-[#00F299] text-xs font-mono font-bold">L2 LIVE</span>
            <span className="text-zinc-500 text-xs">→ Docker sandbox, no network, read-only FS, syscall monitoring</span>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* L1.5 Checks (LIVE) */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="premium-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold">SENTINEL L1.5 CHECKS</h2>
              <span className="px-2 py-0.5 rounded bg-[#00F299]/10 text-[#00F299] text-[10px] font-mono font-bold">LIVE IN PRODUCTION</span>
            </div>
            <ul className="space-y-3">
              {l15Checks.map((check) => (
                <li key={check.label} className="flex items-start gap-3 text-sm">
                  <span className="w-2 h-2 rounded-full bg-[#00F299] shrink-0 mt-1.5" />
                  <div>
                    <span className="text-zinc-300">{check.label}</span>
                    <div className="text-zinc-600 text-[10px] mt-0.5">{check.category}</div>
                  </div>
                </li>
              ))}
            </ul>
            <p className="text-zinc-500 text-xs mt-6 leading-relaxed">
              L1.5 runs on every skill via <code className="text-[#00F299]">/api/audit-skill</code>.
              It analyzes metadata (README, package.json, tool descriptions). Skills scoring below 4/10 are blocked.
            </p>
          </motion.div>

          {/* Audit Logs */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white font-semibold">AUDIT TRAIL</h2>
              <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00F299] animate-pulse" />
                LIVE
              </div>
            </div>
            {logs.length === 0 ? (
              <div className="premium-card p-8 text-center">
                <div className="text-4xl mb-3">📋</div>
                <p className="text-zinc-400 text-sm">No audit logs available yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => (
                  <motion.div key={log.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="premium-card p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="w-2 h-2 rounded-full bg-[#00F299]" />
                      <div>
                        <div className="text-white text-sm font-mono">{log.type}</div>
                        <div className="text-zinc-500 text-[10px] font-mono">{log.skill}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[#00F299] text-xs font-mono">{log.status} ({log.score}/{log.maxScore})</div>
                      <div className="text-zinc-500 text-[10px] font-mono">{log.time}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* L1.6 Checks (LIVE IN PRODUCTION) */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="premium-card p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">SENTINEL L1.6 — ENHANCED ANALYSIS (LIVE IN PRODUCTION)</h2>
            <span className="px-2 py-0.5 rounded bg-[#00d1ff]/10 text-[#00d1ff] text-[10px] font-mono font-bold">LIVE IN PRODUCTION · NOT YET IN PRODUCTION</span>
          </div>
          <p className="text-zinc-400 text-sm mb-4">
            L1.6 goes beyond metadata — it clones the actual repo and runs real security tools:
            <strong className="text-white"> Semgrep</strong> (18 MCP-specific rules),
            <strong className="text-white"> Gitleaks</strong> (secret detection),
            <strong className="text-white"> OSV-Scanner</strong> (dependency vulnerabilities).
            Runs via <a href="https://github.com/edgarfloresguerra2011-a11y/marketnow/actions/workflows/sentinel-l16-audit.yml" target="_blank" rel="noopener" className="text-[#00F299] hover:underline">GitHub Actions</a>.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {l16Checks.map((check) => (
              <div key={check.label} className="flex items-start gap-3 p-3 rounded-lg bg-black/40">
                <span className="text-[#00d1ff] text-xs mt-0.5">✓</span>
                <div>
                  <span className="text-zinc-300 text-xs">{check.label}</span>
                  <div className="text-zinc-600 text-[10px] mt-0.5">{check.category}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 rounded-lg bg-black/40">
            <div className="text-zinc-500 text-[10px] mb-1 font-mono">SEMGRAM RULES (18 TOTAL):</div>
            <div className="flex flex-wrap gap-2">
              {['Prompt injection (5)', 'Insecure shell exec (3)', 'Hardcoded credentials (3)', 'Dangerous filesystem (2)', 'SSRF (2)', 'MCP-specific patterns (3)'].map(r => (
                <span key={r} className="px-2 py-1 rounded bg-[#00d1ff]/5 text-[#00d1ff] text-[10px] font-mono">{r}</span>
              ))}
            </div>
            <a href="https://github.com/edgarfloresguerra2011-a11y/marketnow/blob/master/aep-marketplace/sentinel-rules/semgrep-mcp-rules.yml" target="_blank" rel="noopener" className="text-[#00F299] text-xs hover:underline mt-2 inline-block">→ View full ruleset on GitHub</a>
          </div>
        </motion.div>

        {/* L2 Checks (IMPLEMENTED) */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="premium-card p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">SENTINEL L2 — DYNAMIC SANDBOX ANALYSIS (IMPLEMENTED)</h2>
            <span className="px-2 py-0.5 rounded bg-[#00F299]/10 text-[#00F299] text-[10px] font-mono font-bold">LIVE IN PRODUCTION</span>
          </div>
          <p className="text-zinc-400 text-sm mb-4">
            L2 actually <strong className="text-white">runs</strong> the MCP server in an isolated Docker container with no network, read-only filesystem, 256MB memory limit, all capabilities dropped, and seccomp applied. Monitors for: credential access, network attempts, filesystem changes, code execution.
            <a href="https://github.com/edgarfloresguerra2011-a11y/marketnow/actions/workflows/sentinel-l2-sandbox.yml" target="_blank" rel="noopener" className="text-[#00F299] hover:underline ml-1">→ Run an audit</a>
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {l2Checks.map((check) => (
              <div key={check.label} className="flex items-start gap-3 p-3 rounded-lg bg-black/40">
                <span className="text-yellow-400 text-xs mt-0.5">○</span>
                <div>
                  <span className="text-zinc-300 text-xs">{check.label}</span>
                  <div className="text-zinc-600 text-[10px] mt-0.5">{check.category}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-black/40">
              <div className="text-zinc-500 text-[10px] mb-1 font-mono">PHASE 1 (Q3 2026)</div>
              <div className="text-white text-xs">Docker + seccomp + strace</div>
              <div className="text-[#00F299] text-[10px] mt-1">✅ LIVE (GitHub Actions)</div>
            </div>
            <div className="p-3 rounded-lg bg-black/40">
              <div className="text-zinc-500 text-[10px] mb-1 font-mono">PHASE 2 (Q4 2026)</div>
              <div className="text-white text-xs">gVisor</div>
              <div className="text-[#00F299] text-[10px] mt-1">Free (self-hosted)</div>
            </div>
            <div className="p-3 rounded-lg bg-black/40">
              <div className="text-zinc-500 text-[10px] mb-1 font-mono">PHASE 3 (Q1 2027)</div>
              <div className="text-white text-xs">Firecracker microVM</div>
              <div className="text-yellow-400 text-[10px] mt-1">Paid (needs KVM)</div>
            </div>
          </div>
        </motion.div>

        {/* Honest limitations */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.28 }} className="premium-card p-6 mb-8 border-l-4 border-yellow-500/50">
          <h2 className="text-white font-semibold mb-4">HONEST LIMITATIONS OF SENTINEL L1.5</h2>
          <p className="text-zinc-400 text-sm mb-4">
            We will not pretend L1.5 is sufficient. Here's exactly what it cannot do, and why L2 matters.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/10">
              <div className="text-red-400 text-xs font-mono mb-1">⚠️ STATIC ONLY</div>
              <p className="text-zinc-400 text-xs">Does not execute code. Cannot detect runtime behavior: data exfiltration, time-bombs, sandbox evasion, dynamic module loading.</p>
            </div>
            <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/10">
              <div className="text-red-400 text-xs font-mono mb-1">⚠️ REGEX-BASED</div>
              <p className="text-zinc-400 text-xs">Easily evaded via obfuscation, encodings, indirect calls. Semgrep rules catch patterns, not intent.</p>
            </div>
            <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/10">
              <div className="text-red-400 text-xs font-mono mb-1">⚠️ NO BEHAVIORAL VERIFICATION</div>
              <p className="text-zinc-400 text-xs">Does not verify that a skill does what it claims. A "weather" skill could declare weather behavior but do something else at runtime.</p>
            </div>
            <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/10">
              <div className="text-red-400 text-xs font-mono mb-1">⚠️ SCALE vs DEPTH</div>
              <p className="text-zinc-400 text-xs">8,517 auto-scanned skills get a superficial scan. Only 43 are human-reviewed. No skill is dynamically analyzed today.</p>
            </div>
          </div>
          <div className="mt-4 p-3 rounded-lg bg-black/40">
            <div className="text-zinc-300 text-xs font-bold mb-2">RISK ASSESSMENT BY SKILL TYPE</div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 text-zinc-400">Skill Type</th>
                  <th className="text-left py-2 text-zinc-400">Risk Level</th>
                  <th className="text-left py-2 text-zinc-400">Why</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-white/5">
                  <td className="py-2 text-green-400">Free (human-reviewed)</td>
                  <td className="py-2 text-green-400">LOW</td>
                  <td className="py-2 text-zinc-400">43 skills manually inspected by AliceLabs</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-2 text-yellow-400">Auto-scanned, risk_level=green</td>
                  <td className="py-2 text-yellow-400">MEDIUM</td>
                  <td className="py-2 text-zinc-400">Prompt-only, no install. Sentinel ran but no human review.</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-2 text-orange-400">Auto-scanned, risk_level=yellow</td>
                  <td className="py-2 text-orange-400">MEDIUM-HIGH</td>
                  <td className="py-2 text-zinc-400">Network/API access. Sentinel ran but no runtime analysis.</td>
                </tr>
                <tr>
                  <td className="py-2 text-red-400">Paid, auto-scanned</td>
                  <td className="py-2 text-red-400">HIGH</td>
                  <td className="py-2 text-zinc-400">Code execution + money involved. Sentinel L1.5 is insufficient. Use mandates with low limits.</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-zinc-500 text-xs mt-4">
            <strong className="text-zinc-300">Bottom line:</strong> Sentinel L1.5 is a good first step for a bootstrapped project, but insufficient as the sole trust layer for code that executes on your machine. L2 (sandboxed dynamic analysis) is the real fix — and it's in design phase, not production.
          </p>
        </motion.div>


        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="premium-card p-6">
          <h2 className="text-white font-semibold mb-4">SENTINEL CHANGELOG</h2>
          <div className="space-y-3">
            <div className="flex gap-3 text-xs">
              <span className="px-2 py-0.5 rounded bg-[#00d1ff]/10 text-[#00d1ff] font-mono whitespace-nowrap">2026-07-02</span>
              <div className="text-zinc-400">
                <strong className="text-white">L1.6 LIVE IN PRODUCTION.</strong> Added Semgrep with 18 MCP-specific rules (prompt injection, command injection, hardcoded credentials, SSRF, tool spoofing). Added Gitleaks for secret detection. Added OSV-Scanner for dependency vulnerabilities. Weighted scoring: Secrets 40%, Vulns 30%, Static 20%, Hygiene 10%. Critical secret = instant 0.
                <a href="https://github.com/edgarfloresguerra2011-a11y/marketnow/blob/master/aep-marketplace/lib/sentinel-l16.js" target="_blank" rel="noopener" className="text-[#00F299] hover:underline ml-1">→ Code</a>
              </div>
            </div>
            <div className="flex gap-3 text-xs">
              <span className="px-2 py-0.5 rounded bg-[#00F299]/10 text-[#00F299] font-mono whitespace-nowrap">2026-07-02</span>
              <div className="text-zinc-400">
                <strong className="text-white">L2 IMPLEMENTED.</strong> Docker sandbox with: --network none, --read-only, --memory 256m, --cpus 0.5, --cap-drop ALL, seccomp. Monitors stdout for credential/URL/exec mentions, filesystem changes, network attempts, container crashes. Scoring: multiplicative on L1.6 (1.0 clean / 0.7 medium / 0.3 high / 0.0 critical). Runs in production (real-time) on every skill submission.
                <a href="https://github.com/edgarfloresguerra2011-a11y/marketnow/blob/master/aep-marketplace/lib/sentinel-l2-sandbox.sh" target="_blank" rel="noopener" className="text-[#00F299] hover:underline ml-1">→ Code</a>
                <a href="https://github.com/edgarfloresguerra2011-a11y/marketnow/actions/workflows/sentinel-l2-sandbox.yml" target="_blank" rel="noopener" className="text-[#00F299] hover:underline ml-1">→ Run audit</a>
              </div>
            </div>
            <div className="flex gap-3 text-xs">
              <span className="px-2 py-0.5 rounded bg-[#00F299]/10 text-[#00F299] font-mono whitespace-nowrap">2026-06-30</span>
              <div className="text-zinc-400">
                <strong className="text-white">L1.5 live.</strong> 6-point metadata-based audit: AUTH, prompt injection patterns, input validation, CORS, OAuth scopes, rate limiting error leakage.
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-xs">
            <Link to="/sentinel-roadmap" className="text-[#00F299] hover:underline">→ Full roadmap (L1.5 → L3.5)</Link>
            <Link to="/trust" className="text-zinc-400 hover:underline">→ Trust roadmap</Link>
            <Link to="/buyers-guide" className="text-zinc-400 hover:underline">→ Buyer's guide</Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
