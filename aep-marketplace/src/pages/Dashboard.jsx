import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE } from '../api/client';

const SESSION_KEY = 'mn_admin_token';
const REFRESH_INTERVAL = 30000;

// ─── Bar Chart ───────────────────────────────────────────────
function BarChart({ data }) {
  if (!data || data.length === 0) return null;
  const maxVal = Math.max(...data.map(d => d.hits), 1);
  return (
    <div className="flex items-end gap-1 h-24 w-full">
      {data.map((d, i) => {
        const pct = Math.max((d.hits / maxVal) * 100, d.hits > 0 ? 6 : 2);
        const label = d.date.slice(5);
        const isToday = i === data.length - 1;
        return (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
            <div className="text-[9px] font-mono text-[#00F299]" style={{ opacity: d.hits > 0 ? 1 : 0 }}>
              {d.hits > 0 ? d.hits : ''}
            </div>
            <div
              className={`w-full rounded-t transition-all duration-500 ${isToday ? 'bg-[#00F299]' : 'bg-zinc-700'}`}
              style={{ height: `${pct}%` }}
              title={`${d.date}: ${d.hits} hits`}
            />
            <div className={`text-[9px] font-mono ${isToday ? 'text-[#00F299]' : 'text-zinc-600'}`}>{label}</div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Stat Card ───────────────────────────────────────────────
function StatCard({ label, value, sub, color = '#00F299', pulse = false, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="premium-card p-5"
    >
      <div className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase mb-2">{label}</div>
      <div className="font-bold font-mono text-3xl" style={{ color }}>{value}</div>
      {sub && <div className="text-zinc-500 text-xs mt-1.5">{sub}</div>}
      {pulse && (
        <div className="flex items-center gap-1.5 mt-2">
          <span className="w-2 h-2 rounded-full bg-[#00F299] animate-pulse" />
          <span className="text-[10px] text-zinc-500 font-mono">Live</span>
        </div>
      )}
    </motion.div>
  );
}

// ─── Login Screen ────────────────────────────────────────────
function LoginScreen({ onSuccess }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (attempts >= 5) {
      setError('Demasiados intentos. Recarga la página.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const json = await res.json();
      if (json.ok) {
        sessionStorage.setItem(SESSION_KEY, json.token);
        onSuccess(json.token);
      } else {
        setAttempts(a => a + 1);
        setError('Contraseña incorrecta. Intento ' + (attempts + 1) + '/5');
        setPassword('');
      }
    } catch {
      setError('Error de conexión. Verifica tu red.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'radial-gradient(ellipse at center, #0a1a0a 0%, #080808 70%)' }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: 'linear-gradient(135deg, #00F299 0%, #00d1ff 100%)' }}>
            <span className="text-2xl">🛡️</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Admin Dashboard</h1>
          <p className="text-zinc-500 text-sm">MarketNow — Acceso restringido</p>
        </div>

        {/* Card */}
        <div className="premium-card p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">
                Contraseña de Administrador
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                autoFocus
                disabled={loading || attempts >= 5}
                className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white font-mono text-sm placeholder-zinc-600 focus:outline-none focus:border-[#00F299] transition-colors"
              />
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading || !password || attempts >= 5}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-40"
              style={{
                background: 'linear-gradient(135deg, #00F299 0%, #00d1ff 100%)',
                color: '#000',
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  Verificando...
                </span>
              ) : 'Acceder al Dashboard'}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-zinc-800 text-center text-[10px] text-zinc-600 font-mono">
            🔒 Área de solo acceso autorizado · MarketNow Admin
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────
export default function Dashboard() {
  const [token, setToken] = useState(() => sessionStorage.getItem(SESSION_KEY) || '');
  const [data, setData] = useState(null);
  const [extra, setExtra] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState(null);
  const [countdown, setCountdown] = useState(30);

  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setToken('');
    setData(null);
  };

  const loadAnalytics = useCallback(async (tok) => {
    const t = tok || token;
    if (!t) return;
    try {
      const [analyticsRes, skillsRes] = await Promise.all([
        fetch(`${API_BASE}/api/analytics`, { headers: { Authorization: `Bearer ${t}` } }),
        fetch(`${API_BASE}/api/skills?limit=1`),
      ]);

      if (analyticsRes.status === 401) {
        // Token expired or invalid
        sessionStorage.removeItem(SESSION_KEY);
        setToken('');
        return;
      }
      if (!analyticsRes.ok) throw new Error('Error al cargar métricas');

      const json = await analyticsRes.json();
      setData(json);
      setError('');

      let skillCount = 0;
      if (skillsRes.ok) {
        const sj = await skillsRes.json().catch(() => null);
        skillCount = sj?.total || sj?.count || (Array.isArray(sj?.skills) ? sj.skills.length : 0);
      }
      setExtra({ skillCount });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setLastRefresh(new Date());
      setCountdown(30);
    }
  }, [token]);

  useEffect(() => {
    if (token) loadAnalytics(token);
    else setLoading(false);
  }, [token, loadAnalytics]);

  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => loadAnalytics(token), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [token, loadAnalytics]);

  useEffect(() => {
    if (!token) return;
    const tick = setInterval(() => setCountdown(c => c > 0 ? c - 1 : 30), 1000);
    return () => clearInterval(tick);
  }, [lastRefresh, token]);

  // Not logged in → show login screen
  if (!token) {
    return <LoginScreen onSuccess={(tok) => { setToken(tok); setLoading(true); }} />;
  }

  const pathEntries = data?.pathBreakdown
    ? Object.entries(data.pathBreakdown).sort((a, b) => b[1] - a[1])
    : [];
  const totalFromPaths = pathEntries.reduce((s, [, v]) => s + v, 0) || 1;

  return (
    <div className="min-h-screen pt-24 pb-16" style={{ background: 'linear-gradient(135deg, #080808 0%, #0d1117 100%)' }}>
      <div className="max-w-[1440px] mx-auto px-6">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#00F299]/10 text-[#00F299] border border-[#00F299]/20">
                🛡️ Admin
              </span>
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">
              MARKETNOW <span style={{ color: '#00F299' }}>METRICS</span>
            </h1>
            <p className="text-zinc-400 text-sm max-w-xl">
              Panel de control privado — Edge traffic, activaciones, estado KV.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-xs font-mono text-zinc-600">
              Refresh en <span className="text-[#00F299]">{countdown}s</span>
            </div>
            <button
              onClick={() => loadAnalytics(token)}
              className="px-4 py-2 rounded-lg text-xs font-mono border border-zinc-700 text-zinc-300 hover:border-[#00F299] hover:text-[#00F299] transition-all"
            >
              ↻ Actualizar
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-lg text-xs font-mono border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all"
            >
              ⏻ Cerrar sesión
            </button>
          </div>
        </motion.div>

        {error && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => loadAnalytics(token)} className="underline text-xs">Reintentar</button>
          </div>
        )}

        {loading && !data ? (
          <div className="text-center py-24">
            <div className="inline-block w-8 h-8 border-2 border-[#00F299] border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-zinc-500 font-mono text-sm">Cargando métricas de plataforma...</p>
          </div>
        ) : (
          <>
            {/* Top Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatCard label="Total Edge Hits" value={data?.totalHits?.toLocaleString() || '0'} sub="Requests totales" color="#00F299" pulse delay={0} />
              <StatCard label="Hits Hoy" value={data?.dailyHits?.toLocaleString() || '0'} sub={data?.dailyDate || ''} color="#00d1ff" delay={0.05} />
              <StatCard label="Skills Activas" value={extra?.skillCount ?? '—'} sub="En el catálogo" color="#a78bfa" delay={0.1} />
              <StatCard
                label="KV Store"
                value={data?.kvWriteTest?.kvWorks ? 'Online' : 'Error'}
                sub={data?.kvWriteTest?.kvWorks ? 'Write/Read OK' : 'Revisar logs'}
                color={data?.kvWriteTest?.kvWorks ? '#00F299' : '#f87171'}
                pulse={data?.kvWriteTest?.kvWorks}
                delay={0.15}
              />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Weekly Trend */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="premium-card p-6 lg:col-span-2">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-white font-semibold font-mono text-sm tracking-widest uppercase">Tendencia 7 Días</h3>
                  {lastRefresh && (
                    <span className="text-zinc-600 text-[10px] font-mono">Actualizado {lastRefresh.toLocaleTimeString()}</span>
                  )}
                </div>
                {data?.weeklyTrend?.length > 0 ? (
                  <BarChart data={data.weeklyTrend} />
                ) : (
                  <div className="h-24 flex items-center justify-center text-zinc-600 font-mono text-xs">
                    Sin datos aún — el tráfico se acumulará con las próximas requests
                  </div>
                )}
                <div className="mt-4 pt-4 border-t border-zinc-800 flex items-center gap-4 text-xs font-mono text-zinc-500">
                  <span><span className="inline-block w-2 h-2 rounded-sm bg-[#00F299] mr-1.5 align-middle" />Hoy</span>
                  <span><span className="inline-block w-2 h-2 rounded-sm bg-zinc-700 mr-1.5 align-middle" />Anteriores</span>
                </div>
              </motion.div>

              {/* Edge Health */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="premium-card p-6">
                <h3 className="text-white font-semibold font-mono text-sm tracking-widest uppercase mb-6">Edge Health</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400 text-xs font-mono">KV Write Test</span>
                    <span className={`text-xs font-mono px-2 py-0.5 rounded ${data?.kvWriteTest?.kvWorks ? 'bg-[#00F299]/10 text-[#00F299]' : 'bg-red-500/10 text-red-400'}`}>
                      {data?.kvWriteTest?.kvWorks ? '✓ Pass' : '✗ Fail'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400 text-xs font-mono">Última Request</span>
                    <span className="text-zinc-300 text-xs font-mono">{data?.lastRequest ? new Date(data.lastRequest).toLocaleTimeString() : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400 text-xs font-mono">Worker</span>
                    <span className="text-[#00F299] text-xs font-mono">marketnow.site</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400 text-xs font-mono">Frontend</span>
                    <span className="text-zinc-300 text-xs font-mono">Pages / CDN</span>
                  </div>
                  <div className="pt-3 border-t border-zinc-800 text-[10px] font-mono text-zinc-600 break-all">
                    Epoch: {data?.kvWriteTest?.written || '—'}
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Path Breakdown */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="premium-card p-6">
              <h3 className="text-white font-semibold font-mono text-sm tracking-widest uppercase mb-6">
                Desglose de Tráfico por Ruta
              </h3>
              {pathEntries.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-x-12 gap-y-4">
                  {pathEntries.map(([p, count]) => {
                    const pct = Math.round((count / totalFromPaths) * 100);
                    return (
                      <div key={p}>
                        <div className="flex justify-between text-xs font-mono mb-1">
                          <span className="text-zinc-400">{p}</span>
                          <span style={{ color: '#00F299' }}>{count.toLocaleString()} <span className="text-zinc-600">({pct}%)</span></span>
                        </div>
                        <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.8, delay: 0.4 }}
                            className="h-full rounded-full"
                            style={{ background: 'linear-gradient(90deg, #00F299, #00d1ff)' }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center text-zinc-600 font-mono text-xs">
                  <div className="text-2xl mb-3">📡</div>
                  Sin datos de rutas aún. Aparecerán aquí cuando lleguen requests.
                </div>
              )}
            </motion.div>

            <div className="mt-6 text-center text-zinc-700 font-mono text-[10px]">
              🔒 Panel privado · Datos desde Cloudflare KV Edge · Auto-refresh cada 30s
            </div>
          </>
        )}
      </div>
    </div>
  );
}
