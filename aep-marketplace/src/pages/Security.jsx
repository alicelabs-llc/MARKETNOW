import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { fetchAuditLogs } from '../api/client';

/**
 * MarketNow — Sentinel Security Center
 *
 * Muestra métricas REALES del catálogo (no sintéticas):
 *  - Total de skills escaneadas (cargadas desde /api/manifest.json)
 *  - % verificadas (todas, porque solo se listan las que pasan Sentinel)
 *  - Score promedio real (calculado desde /api/skills.json)
 *  - Audit logs reales desde el backend
 */
export default function Security() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    scanned: 0,
    avgScore: 0,
    passRate: 100,
    criticalIssues: 0,
  });

  useEffect(() => {
    loadLogs();
    loadStats();
  }, []);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await fetchAuditLogs();
      setLogs(data.logs || data.auditLogs || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // Fetch the manifest to get the real total_skills count
      const mres = await fetch('/api/manifest.json');
      if (mres.ok) {
        const m = await mres.json();
        const total = m.total_skills || 0;
        setStats(s => ({ ...s, total, scanned: total }));
      }

      // Sample skills to compute average sentinel_score (cheap: just first 100)
      const sres = await fetch('/api/skills.json');
      if (sres.ok) {
        const skills = await sres.json();
        if (Array.isArray(skills) && skills.length > 0) {
          // Compute avg sentinel_score across all skills
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
      // Fail silently — keep default stats
      console.warn('Could not load security stats:', e.message);
    }
  };

  const sentinelChecks = [
    { label: 'Repository exists & accessible', passed: true },
    { label: 'README documentation present', passed: true },
    { label: 'Package manifest detected', passed: true },
    { label: 'Open-source license verified', passed: true },
    { label: 'No hardcoded secrets/credentials', passed: true },
    { label: 'No malicious code patterns', passed: true },
  ];

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-[1440px] mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="text-4xl font-bold text-white mb-4">
            SENTINEL <span className="text-[#00F299]">SECURITY</span> CENTER
          </h1>
          <p className="text-zinc-400 max-w-2xl">
            Real-time security audit for all skills on the marketplace. Every submission is
            automatically scanned by Sentinel L1 before being listed — no exceptions.
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Sentinel L1 Checks */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="premium-card p-6"
          >
            <h2 className="text-white font-semibold mb-4">SENTINEL L1 CHECKS</h2>
            <ul className="space-y-3">
              {sentinelChecks.map((check) => (
                <li key={check.label} className="flex items-center gap-3 text-sm">
                  <span className="w-2 h-2 rounded-full bg-[#00F299] shrink-0" />
                  <span className="text-zinc-300">{check.label}</span>
                </li>
              ))}
            </ul>
            <p className="text-zinc-500 text-xs mt-6 leading-relaxed">
              Sentinel L1 is an automated static analysis tool that runs on every skill submission.
              It fetches the public GitHub repository, scans the README for documentation quality,
              detects package manifests (package.json, pyproject.toml, Cargo.toml, go.mod), validates
              the open-source license, and analyzes top-level source files for hardcoded secrets and
              malicious code patterns. Skills scoring below 4/10 are blocked from listing.
            </p>
          </motion.div>

          {/* Audit Logs */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white font-semibold">AUDIT TRAIL</h2>
              <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00F299] animate-pulse" />
                LIVE
              </div>
            </div>

            {error && (
              <div className="mb-6 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
                <button onClick={loadLogs} className="ml-3 underline">Retry</button>
              </div>
            )}

            {loading ? (
              <div className="text-center py-20">
                <div className="inline-block w-8 h-8 border-2 border-[#00F299] border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-zinc-500 font-mono text-sm">Loading audit logs...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="premium-card p-8 text-center">
                <div className="text-4xl mb-3">📋</div>
                <p className="text-zinc-400 text-sm">No audit logs available yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {logs.map((log, i) => (
                  <motion.div
                    key={log.id || log.skill || i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="premium-card p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <span className={`w-2 h-2 rounded-full ${
                        (log.passed || log.status === 'Passed') ? 'bg-[#00F299]' : 'bg-red-400'
                      }`} />
                      <div>
                        <div className="text-white text-sm font-mono">{log.type || 'Sentinel Audit'}</div>
                        <div className="text-zinc-500 text-[10px] font-mono">{log.skill || log.node || '—'}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xs font-mono ${
                        (log.passed || log.status === 'Passed') ? 'text-[#00F299]' : 'text-red-400'
                      }`}>
                        {log.status || (log.passed ? 'Passed' : 'Failed')}
                        {log.score ? ` (${log.score}/${log.maxScore || 10})` : ''}
                      </div>
                      <div className="text-zinc-500 text-[10px] font-mono">
                        {log.time || (log.timestamp ? new Date(log.timestamp).toLocaleString() : 'Just now')}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
