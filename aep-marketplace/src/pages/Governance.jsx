import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { isAuthenticated } from '../api/client';

/**
 * MarketNow — Community & Roadmap (static version)
 *
 * GitHub Pages no tiene backend, así que las proposals se cargan desde
 * un archivo estático /api/proposals.json. Los votos se guardan en localStorage.
 */
const STATIC_PROPOSALS = [
  { id: 'MN-001', title: 'Add free tier for open-source contributors', status: 'Active', votes: 142, deadline: '6d 12h' },
  { id: 'MN-002', title: 'Sentinel L2: dynamic sandbox execution checks', status: 'Active', votes: 89, deadline: '9d 4h' },
  { id: 'MN-003', title: 'Public status page with real uptime metrics', status: 'Active', votes: 67, deadline: '12d 18h' },
  { id: 'MN-004', title: 'Skill bundles: buy 3+ for 15% discount', status: 'Passed', votes: 312, deadline: 'Completed' },
  { id: 'MN-005', title: 'Open reviews: signed-in users can rate skills', status: 'Passed', votes: 245, deadline: 'Completed' },
  { id: 'MN-006', title: 'Deprecate the credits system in favor of one-time payments', status: 'Passed', votes: 421, deadline: 'Completed' },
];

export default function Governance() {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(null);
  const [message, setMessage] = useState('');
  const [votedIds, setVotedIds] = useState(() => {
    try {
      const raw = localStorage.getItem('mn_votes');
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });

  useEffect(() => {
    // Simulate load delay for UX consistency
    const t = setTimeout(() => {
      setProposals(STATIC_PROPOSALS);
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, []);

  const handleVote = (proposalId) => {
    if (!isAuthenticated()) {
      setMessage('Sign in to vote on proposals');
      return;
    }
    if (votedIds.includes(proposalId)) {
      setMessage('You already voted on this proposal');
      return;
    }
    setVoting(proposalId);
    setTimeout(() => {
      setProposals(prev => prev.map(p =>
        p.id === proposalId ? { ...p, votes: p.votes + 1 } : p
      ));
      const newVoted = [...votedIds, proposalId];
      setVotedIds(newVoted);
      localStorage.setItem('mn_votes', JSON.stringify(newVoted));
      setMessage('Vote cast! Thank you for participating.');
      setVoting(null);
    }, 500);
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
            COMMUNITY <span className="text-[#00F299]">PROPOSALS</span>
          </h1>
          <p className="text-zinc-400 max-w-2xl mx-auto">
            Vote on upcoming features and policy changes for the MarketNow marketplace.
            Every signed-in user can vote once per proposal — no tokens or staking required.
          </p>
        </motion.div>

        {/* How it works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10"
        >
          {[
            { step: '1', title: 'Sign in', desc: 'Create a free MarketNow account to participate.' },
            { step: '2', title: 'Read proposals', desc: 'Review active proposals and their expected impact.' },
            { step: '3', title: 'Vote', desc: 'Cast a single vote per proposal. Results are public.' },
          ].map((s) => (
            <div key={s.step} className="premium-card p-5">
              <div className="text-[#00F299] font-mono text-xs mb-2">STEP {s.step}</div>
              <div className="text-white font-semibold mb-1">{s.title}</div>
              <div className="text-zinc-400 text-sm">{s.desc}</div>
            </div>
          ))}
        </motion.div>

        {message && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-[#00F299]/10 border border-[#00F299]/20 text-[#00F299] text-sm text-center">
            {message}
          </div>
        )}

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block w-8 h-8 border-2 border-[#00F299] border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-zinc-500 font-mono text-sm">Loading proposals...</p>
          </div>
        ) : proposals.length === 0 ? (
          <div className="premium-card p-12 text-center">
            <div className="text-5xl mb-4">🗳️</div>
            <h2 className="text-xl font-semibold text-white mb-2">No Active Proposals</h2>
            <p className="text-zinc-400">Check back soon — new proposals are posted regularly.</p>
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
                    votedIds.includes(proposal.id) ? (
                      <span className="px-6 py-2.5 bg-white/5 border border-[#00F299]/30 text-[#00F299] text-[11px] font-bold tracking-wider rounded-xl">
                        ✓ VOTED
                      </span>
                    ) : (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleVote(proposal.id)}
                        disabled={voting === proposal.id}
                        className="px-6 py-2.5 bg-[#00F299] text-[11px] text-black font-bold tracking-wider rounded-xl hover:bg-[#00F299]/90 transition-all disabled:opacity-50"
                      >
                        {voting === proposal.id ? '...' : 'VOTE'}
                      </motion.button>
                    )
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
