import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function Registry() {
  const [skills, setSkills] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState(['All']);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('name');
  const [order, setOrder] = useState('asc');

  useEffect(() => {
    loadSkills();
  }, [page, activeCategory, sort, order]);

  const loadSkills = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', '' + page);
      params.set('limit', '20');
      params.set('sort', sort);
      params.set('order', order);
      if (activeCategory !== 'All') params.set('cat', activeCategory);
      if (search) params.set('q', search);
      const res = await fetch('/api/skills?' + params.toString());
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      setSkills(data.skills || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
      if (data.categories && categories.length <= 1) {
        setCategories(['All', ...data.categories]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCategory = (cat) => {
    setActiveCategory(cat);
    setPage(1);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    loadSkills();
  };

  const handleSort = (e) => {
    const v = e.target.value;
    if (v === 'name-asc') { setSort('name'); setOrder('asc'); }
    else if (v === 'name-desc') { setSort('name'); setOrder('desc'); }
    else if (v === 'price-asc') { setSort('price'); setOrder('asc'); }
    else if (v === 'price-desc') { setSort('price'); setOrder('desc'); }
    else if (v === 'score-asc') { setSort('score'); setOrder('asc'); }
    else if (v === 'score-desc') { setSort('score'); setOrder('desc'); }
    setPage(1);
  };

  const pageNumbers = [];
  const maxVisible = 7;
  let startP = Math.max(1, page - Math.floor(maxVisible / 2));
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

        {/* Network Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10"
        >
          {[
            { label: 'Global Volume', value: '$173.3M' },
            { label: 'Mesh Capacity', value: '0.00 GB' },
            { label: 'Global Registry', value: total.toLocaleString() },
            { label: 'Network Status', value: '● AEP_STABLE_0x44FA', green: true },
          ].map((stat) => (
            <div key={stat.label} className="premium-card py-4 px-5">
              <div className="text-[10px] text-zinc-500 font-mono tracking-wider mb-1 uppercase">
                {stat.label}
              </div>
              <div className={`text-lg font-mono font-semibold ${stat.green ? 'text-[#00F299]' : 'text-white'}`}>
                {stat.value}
              </div>
            </div>
          ))}
        </motion.div>

        {/* Error state */}
        {error && (
          <div className="mb-8 px-6 py-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-center">
            {error}
            <button onClick={loadSkills} className="ml-4 underline hover:text-red-300">Retry</button>
          </div>
        )}

        {/* Search + Sort + Category controls */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <form onSubmit={handleSearch} className="flex-1 min-w-[200px]">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
            Page {page}/{totalPages}
          </span>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          {categories.slice(0, 16).map((cat) => (
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
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-zinc-300 hover:text-white hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              ← Prev
            </button>
            {startP > 1 && (
              <span className="text-zinc-600 text-xs px-1">...</span>
            )}
            {pageNumbers.map(n => (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                  n === page
                    ? 'bg-[#00F299]/20 text-[#00F299] border border-[#00F299]/40'
                    : 'bg-white/5 text-zinc-400 border border-white/5 hover:bg-white/10 hover:text-white'
                }`}
              >
                {n}
              </button>
            ))}
            {endP < totalPages && (
              <span className="text-zinc-600 text-xs px-1">...</span>
            )}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
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
              Showing {skills.length} of {total.toLocaleString()} skills
            </div>
            <motion.div
              layout
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              {skills.map((skill, index) => (
                <motion.div
                  key={skill.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  layout
                >
                  <Link to={`/skill/${skill.id}`}>
                    <div className="premium-card p-5 h-full flex flex-col group cursor-pointer hover:border-[#00F299]/30 transition-all duration-500">
                      {/* Icon */}
                      <div className="text-4xl mb-4">{skill.icon || '🧩'}</div>

                      {/* Category Badge */}
                      <div className="mb-3">
                        <span className="px-2.5 py-1 rounded-md bg-white/5 text-[10px] font-mono text-zinc-500 tracking-wider border border-white/5">
                          {(skill.category || 'General').toUpperCase()}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="text-white font-semibold text-base mb-2 group-hover:text-[#00F299] transition-colors">
                        {skill.name}
                      </h3>

                      {/* Description */}
                      <p className="text-zinc-400 text-xs leading-relaxed mb-4 flex-1">
                        {skill.description}
                      </p>

                      {/* Meta */}
                      <div className="flex items-center justify-between pt-4 border-t border-white/5">
                        <div className="flex items-center gap-2">
                          <span className="text-[#00F299] font-mono text-sm font-bold">
                            ${(skill.price || skill.price === 0 ? skill.price : 0).toFixed(2)}
                          </span>
                          <span className="text-zinc-600 text-xs">
                            / {skill.credits || 0}cr
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-zinc-500 text-xs">
                          <span>★ {skill.rating || '0.0'}</span>
                          <span className="text-zinc-700">|</span>
                          <span>{(skill.users || 0).toLocaleString()}u</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>

            {/* Empty state */}
            {skills.length === 0 && (
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
                  disabled={page <= 1}
                  className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-zinc-300 hover:text-white hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  ← Prev
                </button>
                {startP > 1 && (
                  <span className="text-zinc-600 text-xs px-1">...</span>
                )}
                {pageNumbers.map(n => (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                      n === page
                        ? 'bg-[#00F299]/20 text-[#00F299] border border-[#00F299]/40'
                        : 'bg-white/5 text-zinc-400 border border-white/5 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {n}
                  </button>
                ))}
                {endP < totalPages && (
                  <span className="text-zinc-600 text-xs px-1">...</span>
                )}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
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
