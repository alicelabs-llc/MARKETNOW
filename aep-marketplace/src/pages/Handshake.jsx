import { useState } from 'react';
import { motion } from 'framer-motion';
import { connectToMesh } from '../api/client';

export default function Handshake() {
  const [apiKey, setApiKey] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-[1440px] mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-white mb-4">
            AEP <span className="text-[#00F299]">HANDSHAKE</span>
          </h1>
          <p className="text-zinc-400 max-w-2xl mx-auto">
            Connect your agent to the AEP mesh network. Establish a secure handshake and register your node on the distributed marketplace.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Handshake Form */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="premium-card p-8">
              <h2 className="text-xl font-bold text-white mb-6">INITIATE HANDSHAKE</h2>

              <form onSubmit={handleConnect} className="space-y-4">
                <div>
                  <label className="text-zinc-400 text-sm block mb-1.5">API Key (optional)</label>
                  <input
                    type="text"
                    placeholder="Enter your AEP API key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:border-[#00F299]/50 focus:outline-none transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-[#00F299] text-black font-bold tracking-wider rounded-xl hover:bg-[#00F299]/90 hover:scale-[1.01] active:scale-[0.98] transition-all duration-300 disabled:opacity-50"
                >
                  {loading ? 'ESTABLISHING HANDSHAKE...' : 'CONNECT TO MESH'}
                </button>
              </form>

              {error && (
                <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}
            </div>
          </motion.div>

          {/* Connection Info */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="premium-card p-8">
              <h2 className="text-xl font-bold text-white mb-6">ACTIVE CONNECTIONS</h2>

              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-white/5">
                  <div className="text-[10px] text-zinc-500 font-mono mb-1">MCP v1.0</div>
                  <div className="text-white text-sm font-mono">wss://mesh.aep.network/v1</div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                    <span className="text-green-400 text-xs">Connected</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white/5">
                  <div className="text-[10px] text-zinc-500 font-mono mb-1">AEP Protocol v10.2</div>
                  <div className="text-white text-sm font-mono">wss://mesh.aep.network/v1/handshake</div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                    <span className="text-yellow-400 text-xs">Pending</span>
                  </div>
                </div>
              </div>

              {/* Result Panel */}
              {result && (
                <div className="mt-6 p-4 rounded-xl bg-[#00F299]/5 border border-[#00F299]/20">
                  <div className="text-[#00F299] text-xs font-semibold mb-3">✓ HANDSHAKE ESTABLISHED</div>
                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Session</span>
                      <span className="text-white">{result.sessionId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Endpoint</span>
                      <span className="text-[#00F299]">{result.endpoint}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Protocols</span>
                      <span className="text-zinc-300">{result.protocols?.length} supported</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Protocol Spec */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="max-w-4xl mx-auto mt-8"
        >
          <div className="premium-card p-6">
            <h3 className="text-white font-semibold mb-4">HANDSHAKE PROTOCOL SPEC</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-zinc-500 text-xs font-mono mb-1">STEP 1</div>
                <div className="text-white">Authentication</div>
                <div className="text-zinc-400 text-xs">Verify node identity via API key or certificate</div>
              </div>
              <div>
                <div className="text-zinc-500 text-xs font-mono mb-1">STEP 2</div>
                <div className="text-white">Session Negotiation</div>
                <div className="text-zinc-400 text-xs">Establish MCP protocol version and capabilities</div>
              </div>
              <div>
                <div className="text-zinc-500 text-xs font-mono mb-1">STEP 3</div>
                <div className="text-white">Mesh Registration</div>
                <div className="text-zinc-400 text-xs">Register node on the distributed mesh network</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
