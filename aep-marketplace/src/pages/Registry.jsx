import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { matchSkills, generateRecommendation } from '../utils/skillMatcher';

const PAGE_SIZE = 24;

export default function Registry() {
  const [allSkills, setAllSkills] = useState([]);
  const [allCategories, setAllCategories] = useState(['All']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [sort, setSort] = useState('name');
  const [order, setOrder] = useState('asc');
  const [aiQuery, setAiQuery] = useState('');
  const [aiMatches, setAiMatches] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  // ─── Load all skills + categories once (from static JSON) ───────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [skillsRes, catsRes] = await Promise.all([
          fetch('/api/skills.json'),
          fetch('/api/categories.json'),
        ]);
        if (!skillsRes.ok) throw new Error('HTTP ' + skillsRes.status);
        const skills = await skillsRes.json();
        if (cancelled) return;
        setAllSkills(Array.isArray(skills) ? skills : []);

        if (catsRes.ok) {
          const cats = await catsRes.json();
          if (cancelled) return;
          setAllCategories(['All', ...cats.map(c => c.name)]);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ─── Filter + sort + paginate on the client ─────────────────────────────
  const filteredSkills = useMemo(() => {
    let list = allSkills;

    // Category filter
    if (activeCategory !== 'All') {
      list = list.filter(s => s.category === activeCategory);
    }

    // Search filter
    if (search) {
      const q = search.toLowerCase().trim();
      list = list.filter(s =>
        (s.name || '').toLowerCase().includes(q) ||
        (s.description || '').toLowerCase().includes(q) ||
        (Array.isArray(s.tags) ? s.tags.some(t => String(t).toLowerCase().includes(q)) : false)
      );
    }

    // Sort
    const sorted = [...list].sort((a, b) => {
      let cmp = 0;
      if (sort === 'name')  cmp = String(a.name || '').localeCompare(String(b.name || ''));
      if (sort === 'price') cmp = (a.price || 0) - (b.price || 0);
      if (sort === 'score') cmp = (a.sentinel_score || 0) - (b.sentinel_score || 0);
      return order === 'asc' ? cmp : -cmp;
    });

    return sorted;
  }, [allSkills, activeCategory, search, sort, order]);

  const total = filteredSkills.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * PAGE_SIZE;
  const pageSkills = filteredSkills.slice(startIdx, startIdx + PAGE_SIZE);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [activeCategory, search, sort, order]);

  const handleCategory = (cat) => setActiveCategory(cat);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  const handleSort = (e) => {
    const v = e.target.value;
    if (v === 'name-asc')       { setSort('name');  setOrder('asc'); }
    else if (v === 'name-desc')  { setSort('name');  setOrder('desc'); }
    else if (v === 'price-asc')  { setSort('price'); setOrder('asc'); }
    else if (v === 'price-desc') { setSort('price'); setOrder('desc'); }
    else if (v === 'score-asc')  { setSort('score'); setOrder('asc'); }
    else if (v === 'score-desc') { setSort('score'); setOrder('desc'); }
  };

  const handleAiSearch = (e) => {
    e.preventDefault();
    if (!aiQuery.trim() || allSkills.length === 0) return;
    setAiLoading(true);
    // Simulate small delay for UX
    setTimeout(() => {
      const matches = matchSkills(allSkills, aiQuery, 5);
      setAiMatches(matches);
      setAiLoading(false);
    }, 300);
  };

  // Page numbers (windowed)
  const pageNumbers = [];
  const maxVisible = 7;
  let startP = Math.max(1, safePage - Math.floor(maxVisible / 2));
  let endP = Math.min(totalPages, startP + maxVisible - 1);
  if (endP - startP < maxVisible - 1) startP = Math.max(1, endP - maxVisible + 1);
  for (let i = startP; i <= endP; i++) pageNumbers.push(i);

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-[1440px] mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            AGENT <span className="text-[#00F299]">SKILL</span> REGISTRY
          </h1>
          <p className="text-zinc-400 max-w-2xl mx-auto">
            Browse, install, and deploy autonomous agent skills from the global MCP registry.
            Each skill is verified, versioned, and ready for production.
          </p>
        </motion.div>

        {/* AI Skill Matcher */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="premium-card p-6 mb-10"
        >
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">🤖</span>
            <div>
              <h2 className="text-white font-semibold text-sm">AI SKILL MATCHER</h2>
              <p className="text-zinc-500 text-xs">Describe what you need in natural language — we'll find the best skills.</p>
            </div>
          </div>
          <form onSubmit={handleAiSearch} className="flex gap-2">
            <input
              type="text"
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              placeholder="e.g. 'I need to scrape a website and extract product prices'"
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:border-[#00F299]/50 focus:outline-none text-sm"
            />
            <button
              type="submit"
              disabled={aiLoading || !aiQuery.trim()}
              className="px-6 py-3 bg-[#00F299] text-black font-bold text-sm rounded-xl hover:bg-[#00F299]/90 transition-all disabled:opacity-50"
            >
              {aiLoading ? 'MATCHING...' : 'FIND SKILLS'}
            </button>
          </form>

          {aiMatches && (
            <div className="mt-6 space-y-3">
              {aiMatches.length === 0 ? (
                <div className="text-center py-6 text-zinc-500 text-sm">
                  No matches found. Try different keywords.
                </div>
              ) : (
                aiMatches.map((m, i) => (
                  <Link
                    key={m.skill.id}
                    to={`/skill/${m.skill.id}`}
                    className="block p-4 rounded-xl bg-white/5 border border-white/5 hover:border-[#00F299]/30 hover:bg-[#00F299]/5 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] text-zinc-500 font-mono">#{i + 1}</span>
                          <span className="text-white font-semibold text-sm group-hover:text-[#00F299] transition-colors">
                            {m.skill.name}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-white/5 text-[10px] text-zinc-500 font-mono">
                            {m.skill.category}
                          </span>
                        </div>
                        <p className="text-zinc-400 text-xs line-clamp-2">{m.skill.description}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[#00F299] font-mono font-bold text-sm">
                          ${m.skill.price.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-zinc-500 font-mono">
                          match: {(m.score).toFixed(1)}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          )}
        </motion.div>

        {/* Network Stats — solo datos reales */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10"
        >
          {[
            { label: 'Total Skills', value: allSkills.length.toLocaleString() },
            { label: 'Avg Price', value: '$' + (allSkills.length > 0 ? (allSkills.reduce((a,s) => a + (s.price||0), 0) / allSkills.length).toFixed(2) : '0.00') },
            { label: 'From', value: '$0.99' },
            { label: 'Protocol', value: 'MCP v1.0' },
          ].map((stat) => (
            <div key={stat.label} className="premium-card py-4 px-5">
              <div className="text-[10px] text-zinc-500 font-mono tracking-wider mb-1 uppercase">
                {stat.label}
              </div>
              <div className="text-lg font-mono font-semibold text-white">
                {stat.value}
              </div>
            </div>
          ))}
        </motion.div>

        {/* Error state */}
        {error && (
          <div className="mb-8 px-6 py-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-center">
            {error}
            <button onClick={() => window.location.reload()} className="ml-4 underline hover:text-red-300">Retry</button>
          </div>
        )}

        {/* Search + Sort */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <form onSubmit={handleSearch} className="flex-1 min-w-[200px]">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search skills..."
              className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-[#00F299]/50"
            />
          </form>
          <select
            value={sort + '-' + order}
            onChange={handleSort}
            className="px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#00F299]/50 cursor-pointer"
          >
            <option value="name-asc">Name ↑</option>
            <option value="name-desc">Name ↓</option>
            <option value="price-asc">Price ↑</option>
            <option value="price-desc">Price ↓</option>
            <option value="score-asc">Score ↑</option>
            <option value="score-desc">Score ↓</option>
          </select>
          <span className="text-xs text-zinc-500 font-mono whitespace-nowrap">
            Page {safePage}/{totalPages}
          </span>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          {allCategories.slice(0, 16).map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategory(cat)}
              className={`px-4 py-2 rounded-lg text-xs font-mono tracking-wider transition-all duration-300 ${
                activeCategory === cat
                  ? 'bg-[#00F299]/20 text-[#00F299] border border-[#00F299]/40'
                  : 'bg-white/5 text-zinc-400 border border-white/5 hover:bg-white/10 hover:text-white'
              }`}
            >
              {cat.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Pagination top */}
        {totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-zinc-300 hover:text-white hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              ← Prev
            </button>
            {startP > 1 && <span className="text-zinc-600 text-xs px-1">...</span>}
            {pageNumbers.map(n => (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                  n === safePage
                    ? 'bg-[#00F299]/20 text-[#00F299] border border-[#00F299]/40'
                    : 'bg-white/5 text-zinc-400 border border-white/5 hover:bg-white/10 hover:text-white'
                }`}
              >
                {n}
              </button>
            ))}
            {endP < totalPages && <span className="text-zinc-600 text-xs px-1">...</span>}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-zinc-300 hover:text-white hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Next →
            </button>
          </div>
        )}

        {/* Skill Grid */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block w-8 h-8 border-2 border-[#00F299] border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-zinc-500 font-mono text-sm">Loading registry...</p>
          </div>
        ) : (
          <>
            <div className="text-xs text-zinc-600 font-mono mb-4">
              Showing {pageSkills.length} of {total.toLocaleString()} skills
            </div>
            <motion.div
              layout
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              {pageSkills.map((skill, index) => (
                <motion.div
                  key={skill.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.03, 0.3) }}
                  layout
                >
                  <Link to={`/skill/${skill.id}`}>
                    <div className="premium-card p-5 h-full flex flex-col group cursor-pointer hover:border-[#00F299]/30 transition-all duration-500">
                      <div className="text-4xl mb-4">{skill.icon || '🧩'}</div>

                      <div className="mb-3">
                        <span className="px-2.5 py-1 rounded-md bg-white/5 text-[10px] font-mono text-zinc-500 tracking-wider border border-white/5">
                          {(skill.category || 'General').toUpperCase()}
                        </span>
                      </div>

                      <h3 className="text-white font-semibold text-base mb-2 group-hover:text-[#00F299] transition-colors">
                        {skill.name}
                      </h3>

                      <p className="text-zinc-400 text-xs leading-relaxed mb-4 flex-1 line-clamp-3">
                        {skill.description}
                      </p>

                      {/* Meta */}
                      <div className="flex items-center justify-between pt-4 border-t border-white/5">
                        <span className="text-[#00F299] font-mono text-sm font-bold">
                          ${skill.price.toFixed(2)}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-[#00F299]/10 text-[#00F299] text-[10px] font-mono border border-[#00F299]/20">
                          ✓ VERIFIED
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>

            {/* Empty state */}
            {pageSkills.length === 0 && !loading && (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">🔍</div>
                <p className="text-zinc-500 font-mono text-sm">No skills found</p>
              </div>
            )}

            {/* Pagination bottom */}
            {totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-center gap-2 mt-10">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-zinc-300 hover:text-white hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  ← Prev
                </button>
                {startP > 1 && <span className="text-zinc-600 text-xs px-1">...</span>}
                {pageNumbers.map(n => (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                      n === safePage
                        ? 'bg-[#00F299]/20 text-[#00F299] border border-[#00F299]/40'
                        : 'bg-white/5 text-zinc-400 border border-white/5 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {n}
                  </button>
                ))}
                {endP < totalPages && <span className="text-zinc-600 text-xs px-1">...</span>}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-zinc-300 hover:text-white hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
