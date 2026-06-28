import { useState } from 'react';
import { motion } from 'framer-motion';
import { connectToMesh } from '../api/client';
import { isAuthenticated, getUser } from '../api/client';

/**
 * MarketNow — API Access
 *
 * Cambios vs. versión anterior:
 *  - Eliminado el branding "AEP HANDSHAKE" y la red mesh ficticia (wss://mesh.aep.network)
 *  - Re-enfocado como página para obtener un API key y acceder al marketplace vía HTTP
 *  - Muestra endpoints reales (los que existen en /api/*)
 *  - El "handshake" del backend ahora devuelve un session ID sin inventar protocolos
 */
export default function Handshake() {
  const [apiKey, setApiKey] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleConnect = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await connectToMesh(apiKey);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyKey = () => {
    if (result?.sessionId) {
      navigator.clipboard.writeText(result.sessionId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const endpoints = [
    { method: 'GET', path: '/api/skills.json', desc: 'List all skills (full data)' },
    { method: 'GET', path: '/api/categories.json', desc: 'List all categories with counts' },
    { method: 'GET', path: '/api/manifest.json', desc: 'API manifest and metadata' },
    { method: 'GET', path: '/api/skills_index.json', desc: 'Compact skills index' },
    { method: 'GET', path: '/api/health', desc: 'Service health check' },
  ];

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-[1440px] mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-white mb-4">
            API <span className="text-[#00F299]">ACCESS</span>
          </h1>
          <p className="text-zinc-400 max-w-2xl mx-auto">
            Connect your agent or application to the MarketNow marketplace.
            All endpoints are public and JSON-formatted. Use the session ID below
            to identify your requests in audit logs.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Handshake Form */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="premium-card p-8">
              <h2 className="text-xl font-bold text-white mb-6">GENERATE SESSION</h2>

              <form onSubmit={handleConnect} className="space-y-4">
                <div>
                  <label className="text-zinc-400 text-sm block mb-1.5">
                    API Key (optional — leave blank for anonymous)
                  </label>
                  <input
                    type="text"
                    placeholder="mn_live_..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:border-[#00F299]/50 focus:outline-none transition-all font-mono text-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-[#00F299] text-black font-bold tracking-wider rounded-xl hover:bg-[#00F299]/90 hover:scale-[1.01] active:scale-[0.98] transition-all duration-300 disabled:opacity-50"
                >
                  {loading ? 'ESTABLISHING SESSION...' : 'CONNECT'}
                </button>
              </form>

              {error && (
                <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}

              {result && (
                <div className="mt-6 p-4 rounded-xl bg-[#00F299]/5 border border-[#00F299]/20">
                  <div className="text-[#00F299] text-xs font-semibold mb-3">✓ SESSION ESTABLISHED</div>
                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between gap-3">
                      <span className="text-zinc-500">Session ID</span>
                      <button
                        onClick={handleCopyKey}
                        className="text-white hover:text-[#00F299] transition-colors text-right"
                        title="Click to copy"
                      >
                        {result.sessionId} {copied ? '✓' : '📋'}
                      </button>
                    </div>
                    {result.protocols && (
                      <div className="flex justify-between gap-3">
                        <span className="text-zinc-500">Protocols</span>
                        <span className="text-zinc-300">{result.protocols.length} supported</span>
                      </div>
                    )}
                    <div className="flex justify-between gap-3">
                      <span className="text-zinc-500">Status</span>
                      <span className="text-[#00F299]">{result.message || 'Active'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* API Endpoints */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="premium-card p-8">
              <h2 className="text-xl font-bold text-white mb-6">PUBLIC ENDPOINTS</h2>

              <div className="space-y-3">
                {endpoints.map((ep) => (
                  <div key={ep.path} className="p-3 rounded-lg bg-white/5 border border-white/5">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="px-2 py-0.5 rounded bg-[#00F299]/10 text-[#00F299] text-[10px] font-mono font-bold">
                        {ep.method}
                      </span>
                      <code className="text-white text-sm font-mono">{ep.path}</code>
                    </div>
                    <p className="text-zinc-500 text-xs ml-1">{ep.desc}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 rounded-xl bg-black/40 border border-white/5">
                <div className="text-[10px] text-zinc-500 font-mono mb-2">EXAMPLE</div>
                <code className="text-[#00F299] text-xs font-mono break-all">
                  curl https://www.marketnow.site/api/skills.json | jq '.[0:3]'
                </code>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Usage Notes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="max-w-4xl mx-auto mt-8"
        >
          <div className="premium-card p-6">
            <h3 className="text-white font-semibold mb-4">HOW TO USE</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-zinc-500 text-xs font-mono mb-1">STEP 1</div>
                <div className="text-white">Fetch skills</div>
                <div className="text-zinc-400 text-xs">GET /api/skills.json returns the full catalog with prices, descriptions, and install commands.</div>
              </div>
              <div>
                <div className="text-zinc-500 text-xs font-mono mb-1">STEP 2</div>
                <div className="text-white">Filter &amp; search</div>
                <div className="text-zinc-400 text-xs">Filter client-side by category, tags, or name. No server-side query language.</div>
              </div>
              <div>
                <div className="text-zinc-500 text-xs font-mono mb-1">STEP 3</div>
                <div className="text-white">Install &amp; use</div>
                <div className="text-zinc-400 text-xs">Run the install command from each skill's record to add it to your MCP-compatible agent.</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
