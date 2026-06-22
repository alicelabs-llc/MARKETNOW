import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { fetchAuditLogs } from '../api/client';

export default function Security() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await fetchAuditLogs();
      setLogs(data.logs || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-[1440px] mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="text-4xl font-bold text-white mb-4">
            AEP <span className="text-[#00F299]">SECURITY</span> CENTER
          </h1>
          <p className="text-zinc-400 max-w-2xl">
            Real-time network audit logs, node verification, and integrity checks. All operations are transparent and verifiable on-chain.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar */}
          <div className="space-y-4">
            <div className="premium-card p-5">
              <div className="text-[10px] text-zinc-500 font-mono tracking-wider mb-2 uppercase">Security Level</div>
              <div className="flex items-center gap-2">
                <span className="text-[#00F299] text-lg font-bold">TIER 1</span>
                <span className="text-zinc-500 text-xs">|</span>
                <span className="text-zinc-400 text-xs">Maximum</span>
              </div>
            </div>
            <div className="premium-card p-5">
              <div className="text-[10px] text-zinc-500 font-mono tracking-wider mb-2 uppercase">Encryption</div>
              <div className="text-white text-sm font-mono">AES-256-GCM</div>
            </div>
            <div className="premium-card p-5">
              <div className="text-[10px] text-zinc-500 font-mono tracking-wider mb-2 uppercase">Active Nodes</div>
              <div className="text-[#00F299] text-2xl font-mono font-bold">13,860</div>
            </div>
          </div>

          {/* Audit Logs */}
          <div className="lg:col-span-2">
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
            ) : (
              <div className="space-y-2">
                {logs.map((log, i) => (
                  <motion.div
                    key={log.skill || i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="premium-card p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <span className={`w-2 h-2 rounded-full ${
                        log.passed ? 'bg-[#00F299]' : 'bg-red-400'
                      }`} />
                      <div>
                        <div className="text-white text-sm font-mono">Sentinel Audit</div>
                        <div className="text-zinc-500 text-[10px] font-mono">{log.skill}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xs font-mono ${
                        log.passed ? 'text-[#00F299]' : 'text-red-400'
                      }`}>
                        {log.passed ? 'Passed' : 'Failed'} ({log.score}/{log.maxScore})
                      </div>
                      <div className="text-zinc-500 text-[10px] font-mono">
                        {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'Just now'}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
