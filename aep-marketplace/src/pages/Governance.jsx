import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { fetchProposals, castVote, isAuthenticated } from '../api/client';

export default function Governance() {
  const [proposals, setProposals] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [voting, setVoting] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadProposals();
  }, []);

  const loadProposals = async () => {
    try {
      setLoading(true);
      const data = await fetchProposals();
      setProposals(data.proposals);
      setStats(data.stats);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (proposalId) => {
    if (!isAuthenticated()) {
      setMessage('Sign in to vote');
      return;
    }
    setVoting(proposalId);
    try {
      const result = await castVote(proposalId);
      setMessage(result.message);
      loadProposals(); // Refresh
    } catch (err) {
      setError(err.message);
    } finally {
      setVoting(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return 'text-[#00F299] border-[#00F299]/30 bg-[#00F299]/5';
      case 'Passed': return 'text-green-400 border-green-400/30 bg-green-400/5';
      case 'Rejected': return 'text-red-400 border-red-400/30 bg-red-400/5';
      default: return 'text-zinc-400 border-zinc-400/30 bg-zinc-400/5';
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
            AEP <span className="text-[#00F299]">GOVERNANCE</span>
          </h1>
          <p className="text-zinc-400 max-w-2xl mx-auto">
            Decentralized governance for the Agent Exchange Protocol. Stake AEP tokens to vote on proposals and shape the future of the network.
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-4 mb-10"
        >
          <div className="premium-card p-5 text-center">
            <div className="text-2xl font-bold text-white font-mono">{stats.totalStaked}</div>
            <div className="text-[10px] text-zinc-500 font-mono mt-1">TOTAL STAKED</div>
          </div>
          <div className="premium-card p-5 text-center">
            <div className="text-2xl font-bold text-white font-mono">{stats.totalDelegators?.toLocaleString()}</div>
            <div className="text-[10px] text-zinc-500 font-mono mt-1">DELEGATORS</div>
          </div>
          <div className="premium-card p-5 text-center">
            <div className="text-2xl font-bold text-[#00F299] font-mono">{stats.inflation}</div>
            <div className="text-[10px] text-zinc-500 font-mono mt-1">INFLATION</div>
          </div>
        </motion.div>

        {message && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-[#00F299]/10 border border-[#00F299]/20 text-[#00F299] text-sm text-center">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block w-8 h-8 border-2 border-[#00F299] border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-zinc-500 font-mono text-sm">Loading proposals...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {proposals.map((proposal, i) => (
              <motion.div
                key={proposal.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="premium-card p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-[#00F299] font-mono text-xs font-bold">{proposal.id}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono border ${getStatusColor(proposal.status)}`}>
                        {proposal.status}
                      </span>
                    </div>
                    <h3 className="text-white font-semibold mb-2">{proposal.title}</h3>
                    <div className="flex items-center gap-4 text-xs text-zinc-500 font-mono">
                      <span>{proposal.votes.toLocaleString()} votes</span>
                      {proposal.deadline !== 'Completed' && (
                        <span>{proposal.deadline} remaining</span>
                      )}
                    </div>
                  </div>

                  {proposal.status === 'Active' && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleVote(proposal.id)}
                      disabled={voting === proposal.id}
                      className="px-6 py-2.5 bg-[#00F299] text-[11px] text-black font-bold tracking-wider rounded-xl hover:bg-[#00F299]/90 transition-all disabled:opacity-50"
                    >
                      {voting === proposal.id ? '...' : 'VOTE'}
                    </motion.button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
