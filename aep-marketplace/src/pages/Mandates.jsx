import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useLang } from '../context/LanguageContext.jsx';

const CATEGORIES = [
  'ai', 'automation', 'data', 'devtools', 'scraping', 'search',
  'browser', 'database', 'cloud', 'productivity', 'analytics',
  'security', 'marketing', 'ecommerce', 'finance', 'media',
];

export default function Mandates() {
  const { t } = useLang();
  const [wallet, setWallet] = useState('');
  const [mandates, setMandates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // New mandate form
  const [form, setForm] = useState({
    owner: '',
    agentId: '',
    agentName: 'Claude',
    spendingLimitUsd: 25,
    perPurchaseCapUsd: 5,
    categories: ['*'],
    expiresAt: '',
  });
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(null);

  async function loadMandates(w) {
    if (!w) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/mandates?owner=${encodeURIComponent(w.toLowerCase())}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'load failed');
      setMandates(j.mandates || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const saved = localStorage.getItem('mn_wallet');
    if (saved) {
      setWallet(saved);
      loadMandates(saved);
    }
  }, []);

  function saveWallet(w) {
    setWallet(w);
    localStorage.setItem('mn_wallet', w);
    loadMandates(w);
  }

  async function createMandate(e) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    setCreated(null);
    try {
      const payload = {
        ...form,
        owner: form.owner.toLowerCase(),
        spendingLimitUsd: Number(form.spendingLimitUsd),
        perPurchaseCapUsd: Number(form.perPurchaseCapUsd),
      };
      if (!payload.expiresAt) delete payload.expiresAt;
      const r = await fetch('/api/mandates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'create failed');
      setCreated(j.mandate);
      if (wallet) loadMandates(wallet);
    } catch (e) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  }

  async function revoke(id) {
    if (!confirm('Revoke this mandate? The agent will lose autonomous purchase ability immediately.')) return;
    const r = await fetch('/api/mandates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'revoke', id }),
    });
    if (r.ok && wallet) loadMandates(wallet);
  }

  function toggleCat(c) {
    setForm(f => {
      let cats = f.categories.includes('*') ? [] : [...f.categories];
      if (cats.includes(c)) cats = cats.filter(x => x !== c);
      else cats.push(c);
      if (cats.length === 0) cats = ['*'];
      return { ...f, categories: cats };
    });
  }

  return (
    <div className="min-h-screen pt-20 pb-20 px-4 md:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00F299]/10 border border-[#00F299]/20 mb-4">
            <span className="text-[#00F299] text-[10px] font-mono tracking-wider">ACP / AP2 · DELEGATED MANDATES</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">{t('mandates.title')}</h1>
          <p className="text-zinc-400 text-lg max-w-2xl">
            {t('mandates.subtitle')}
          </p>
        </motion.div>

        {/* Wallet input */}
        <div className="premium-card p-5 mb-8">
          <label className="text-zinc-400 text-xs font-mono mb-2 block">YOUR WALLET (PRINCIPAL)</label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="0x... (your MetaMask / wallet address)"
              value={wallet}
              onChange={e => setWallet(e.target.value)}
              className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm font-mono focus:border-[#00F299] outline-none"
            />
            <button
              onClick={() => saveWallet(wallet)}
              className="px-4 py-2 bg-[#00F299] text-black font-bold rounded-lg hover:bg-[#00F299]/90 transition-all text-sm"
            >
              LOAD MANDATES
            </button>
          </div>
          <p className="text-zinc-600 text-[10px] mt-2">
            We use your wallet address to filter mandates you own. No signature required to view.
            Signing (EIP-191) is recommended when creating mandates to bind the agent's identity.
          </p>
        </div>

        {/* Existing mandates */}
        {loading && <div className="text-zinc-500 text-sm mb-8">Loading mandates…</div>}
        {error && <div className="text-red-400 text-sm mb-8 font-mono">{error}</div>}
        {mandates.length > 0 && (
          <div className="mb-12">
            <h2 className="text-white text-sm font-mono tracking-wider mb-4">
              ACTIVE MANDATES ({mandates.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mandates.map(m => {
                const remaining = m.spendingLimitUsd - m.spentUsd;
                const pct = Math.min(100, Math.max(0, (m.spentUsd / m.spendingLimitUsd) * 100));
                return (
                  <div key={m.id} className="premium-card p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="text-white font-mono text-sm">{m.id}</div>
                        <div className="text-zinc-500 text-[10px]">Agent: {m.agentName} · {m.agentId}</div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                        m.status === 'active' ? 'bg-[#00F299]/10 text-[#00F299]'
                        : m.status === 'revoked' ? 'bg-red-500/10 text-red-400' : m.status === 'requires_reapproval' ? 'bg-yellow-500/10 text-yellow-400'
                        : 'bg-yellow-500/10 text-yellow-400'
                      }`}>{m.status.toUpperCase()}</span>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-500">Limit</span>
                        <span className="text-white font-mono">${m.spendingLimitUsd.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-500">Spent</span>
                        <span className="text-white font-mono">${m.spentUsd.toFixed(2)} ({m.txCount || 0} txs)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-500">Autonomous remaining</span>
                        <span className={`font-mono ${Math.max(0, 3 - (m.txCount || 0)) > 0 ? 'text-[#00F299]' : 'text-yellow-400'}`}>
                          {Math.max(0, 3 - (m.txCount || 0))}/3 {m.status === 'requires_reapproval' ? '🔒 RE-APPROVE NEEDED' : ''}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-500">Remaining</span>
                        <span className="text-[#00F299] font-mono">${remaining.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-500">Per-purchase cap</span>
                        <span className="text-white font-mono">${m.perPurchaseCapUsd.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-500">Categories</span>
                        <span className="text-white font-mono">{(m.categories || ['*']).join(', ')}</span>
                      </div>
                      {m.expiresAt && (
                        <div className="flex justify-between text-xs">
                          <span className="text-zinc-500">Expires</span>
                          <span className="text-white font-mono">{new Date(m.expiresAt).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>

                    <div className="h-1.5 bg-black/40 rounded-full overflow-hidden mb-4">
                      <div
                        className="h-full bg-gradient-to-r from-[#00F299] to-[#00d1ff]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => navigator.clipboard.writeText(m.id)}
                        className="flex-1 px-3 py-2 bg-black/40 border border-white/10 rounded text-white text-xs hover:bg-black/60 font-mono"
                      >
                        COPY ID
                      </button>
                      {m.status === 'active' && (
                        <button
                          onClick={() => revoke(m.id)}
                          className="px-3 py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded text-xs hover:bg-red-500/20 font-mono"
                        >
                          REVOKE
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Create form */}
        <motion.form
          onSubmit={createMandate}
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="premium-card p-6"
        >
          <h2 className="text-white text-sm font-mono tracking-wider mb-4">CREATE NEW MANDATE</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-zinc-400 text-xs mb-1 block">Principal wallet *</label>
              <input
                required
                type="text"
                placeholder="0x..."
                value={form.owner}
                onChange={e => setForm({ ...form, owner: e.target.value })}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm font-mono focus:border-[#00F299] outline-none"
              />
            </div>
            <div>
              <label className="text-zinc-400 text-xs mb-1 block">Agent ID *</label>
              <input
                required
                type="text"
                placeholder="agent_claude_001"
                value={form.agentId}
                onChange={e => setForm({ ...form, agentId: e.target.value })}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm font-mono focus:border-[#00F299] outline-none"
              />
            </div>
            <div>
              <label className="text-zinc-400 text-xs mb-1 block">Agent name</label>
              <select
                value={form.agentName}
                onChange={e => setForm({ ...form, agentName: e.target.value })}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-[#00F299] outline-none"
              >
                <option>Claude</option>
                <option>Cursor</option>
                <option>Cline</option>
                <option>ChatGPT</option>
                <option>Gemini</option>
                <option>Custom</option>
              </select>
            </div>
            <div>
              <label className="text-zinc-400 text-xs mb-1 block">Expires (optional)</label>
              <input
                type="date"
                value={form.expiresAt}
                onChange={e => setForm({ ...form, expiresAt: e.target.value })}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-[#00F299] outline-none"
              />
            </div>
            <div>
              <label className="text-zinc-400 text-xs mb-1 block">Total spending limit (USD) *</label>
              <input
                required
                type="number"
                min="0.01"
                max="500"
                step="0.01"
                value={form.spendingLimitUsd}
                onChange={e => setForm({ ...form, spendingLimitUsd: e.target.value })}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm font-mono focus:border-[#00F299] outline-none"
              />
              <p className="text-zinc-600 text-[10px] mt-1">Max $500.00</p>
            </div>
            <div>
              <label className="text-zinc-400 text-xs mb-1 block">Per-purchase cap (USD)</label>
              <input
                type="number"
                min="0.01"
                max="50"
                step="0.01"
                value={form.perPurchaseCapUsd}
                onChange={e => setForm({ ...form, perPurchaseCapUsd: e.target.value })}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm font-mono focus:border-[#00F299] outline-none"
              />
              <p className="text-zinc-600 text-[10px] mt-1">Max $50.00 per single purchase</p>
            </div>
          </div>

          <div className="mb-4">
            <label className="text-zinc-400 text-xs mb-2 block">ALLOWED CATEGORIES</label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, categories: ['*'] })}
                className={`px-3 py-1 rounded-full text-xs font-mono ${
                  form.categories.includes('*')
                    ? 'bg-[#00F299] text-black'
                    : 'bg-black/40 border border-white/10 text-zinc-400'
                }`}
              >
                ALL (*)
              </button>
              {CATEGORIES.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleCat(c)}
                  className={`px-3 py-1 rounded-full text-xs font-mono ${
                    form.categories.includes(c) && !form.categories.includes('*')
                      ? 'bg-[#00d1ff]/20 text-[#00d1ff] border border-[#00d1ff]/30'
                      : 'bg-black/40 border border-white/10 text-zinc-500'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={creating}
            className="w-full px-6 py-3 bg-[#00F299] text-black font-bold rounded-lg hover:bg-[#00F299]/90 disabled:opacity-50 transition-all"
          >
            {creating ? 'CREATING…' : 'CREATE MANDATE →'}
          </button>

          {created && (
            <div className="mt-4 p-4 rounded-lg bg-[#00F299]/5 border border-[#00F299]/20">
              <div className="text-[#00F299] text-xs font-mono mb-2">✓ MANDATE CREATED</div>
              <div className="text-white text-xs font-mono break-all mb-2">ID: {created.id}</div>
              <p className="text-zinc-400 text-xs">
                Share this ID with your agent. The agent should include it as <code className="text-[#00F299]">mandateId</code> in
                POST <code className="text-[#00F299]">/api/agent-purchase</code> requests.
              </p>
            </div>
          )}
        </motion.form>

        {/* How it works */}
        <div className="mt-12 premium-card p-6">
          <h3 className="text-[#00F299] text-xs font-mono tracking-wider mb-4 uppercase">HOW IT WORKS</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { n: '01', t: 'You create a mandate', d: 'Set total limit, per-purchase cap, allowed categories, expiry. Sign with your wallet (recommended).' },
              { n: '02', t: 'Agent buys autonomously', d: 'Agent calls /api/agent-purchase with mandateId + USDC txHash. We verify on Base, deduct from mandate, return license.' },
              { n: '03', t: 'Beyond limit, you approve', d: 'When mandate is exhausted or expired, agent gets mode=requires_human_approval. You approve via Stripe, or renew the mandate.' },
            ].map(s => (
              <div key={s.n} className="p-4 rounded-lg bg-black/40">
                <div className="text-[#00F299] text-xs font-mono mb-2">{s.n}</div>
                <div className="text-white text-sm font-bold mb-1">{s.t}</div>
                <div className="text-zinc-500 text-xs leading-relaxed">{s.d}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link to="/" className="text-[#00F299] text-sm hover:underline">← Back to marketplace</Link>
        </div>
      </div>
    </div>
  );
}
