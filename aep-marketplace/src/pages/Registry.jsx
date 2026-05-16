import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getAllSkills, getCategories } from '../data/skills';

export default function Registry() {
  const [skills, setSkills] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSkills();
  }, []);

  const loadSkills = async () => {
    try {
      setLoading(true);
      const data = await getAllSkills();
      setSkills(Array.isArray(data) ? data : data.skills || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const categorySlugs = ['All', ...new Set(skills.map(s => s.category))].slice(0, 16);

  const filtered = activeCategory === 'All' 
    ? skills 
    : skills.filter(s => s.category === activeCategory);

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
            { label: 'Global Registry', value: '13.860' },
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

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          {categorySlugs.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
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

        {/* Skill Grid */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block w-8 h-8 border-2 border-[#00F299] border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-zinc-500 font-mono text-sm">Loading registry...</p>
          </div>
        ) : (
          <motion.div
            layout
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            {filtered.map((skill, index) => (
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
                    <div className="text-4xl mb-4">{skill.icon}</div>

                    {/* Category Badge */}
                    <div className="mb-3">
                      <span className="px-2.5 py-1 rounded-md bg-white/5 text-[10px] font-mono text-zinc-500 tracking-wider border border-white/5">
                        {skill.category.toUpperCase()}
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
                          ${skill.price.toFixed(2)}
                        </span>
                        <span className="text-zinc-600 text-xs">
                          / {skill.credits}cr
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-zinc-500 text-xs">
                        <span>★ {skill.rating}</span>
                        <span className="text-zinc-700">|</span>
                        <span>{skill.users.toLocaleString()}u</span>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
