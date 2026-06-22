import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE } from '../api/client';

// ─── Constants ────────────────────────────────────────────────
const SESSION_KEY = 'mn_adm_tk';
const CLICK_TARGET = 7;
const CLICK_WINDOW_MS = 4000;

// ─── Bar Chart ────────────────────────────────────────────────
function BarChart({ data }) {
  if (!data || data.length === 0) return null;
  const maxVal = Math.max(...data.map(d => d.hits), 1);
  return (
    <div className="flex items-end gap-1 h-20 w-full">
      {data.map((d, i) => {
        const pct = Math.max((d.hits / maxVal) * 100, d.hits > 0 ? 6 : 2);
        const isToday = i === data.length - 1;
        return (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
            <div className="text-[8px] font-mono text-[#00F299]" style={{ opacity: d.hits > 0 ? 1 : 0 }}>
              {d.hits > 0 ? d.hits : ''}
            </div>
            <div
              className={`w-full rounded-t transition-all duration-500 ${isToday ? 'bg-[#00F299]' : 'bg-zinc-700'}`}
              style={{ height: `${pct}%` }}
              title={`${d.date}: ${d.hits}`}
            />
            <div className={`text-[8px] font-mono ${isToday ? 'text-[#00F299]' : 'text-zinc-600'}`}>{d.date.slice(5)}</div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Login Panel ──────────────────────────────────────────────
function LoginPanel({ onSuccess }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (attempts >= 5) { setError('Sesión bloqueada. Cierra y vuelve a intentar.'); return; }
    setLoading(true); setError('');
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
        setError(`Acceso denegado (${attempts + 1}/5)`);
        setPassword('');
        inputRef.current?.focus();
      }
    } catch {
      setError('Error de red.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xs"
      >
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 text-2xl"
            style={{ background: 'linear-gradient(135deg, #00F299, #00d1ff)' }}
          >🛡️</div>
          <h2 className="text-xl font-bold text-white mb-1">Admin Access</h2>
          <p className="text-zinc-500 text-xs font-mono">MarketNow · Área restringida</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">
              Contraseña secreta
            </label>
            <input
              ref={inputRef}
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••••••"
              disabled={loading || attempts >= 5}
              className="w-full px-4 py-3 rounded-xl bg-black/50 border border-zinc-700 text-white font-mono text-sm placeholder-zinc-700 focus:outline-none focus:border-[#00F299] transition-colors"
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
                ⚠ {error}
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={loading || !password || attempts >= 5}
            className="w-full py-3 rounded-xl font-bold text-sm text-black transition-all disabled:opacity-30"
            style={{ background: 'linear-gradient(135deg, #00F299, #00d1ff)' }}
          >
            {loading
              ? <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  Verificando...
                </span>
              : 'Acceder'}
          </button>
        </form>

        <p className="text-center text-[10px] font-mono text-zinc-700 mt-6">
          🔒 Sesión termina al cerrar el navegador
        </p>
      </motion.div>
    </div>
  );
}

// ─── Dashboard Panel ──────────────────────────────────────────
function DashboardPanel({ token, onLogout }) {
  const [data, setData] = useState(null);
  const [extra, setExtra] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState(null);
  const [countdown, setCountdown] = useState(30);

  const load = useCallback(async () => {
    try {
      const [ar, sr, or] = await Promise.all([
        fetch(`${API_BASE}/api/analytics`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/skills?limit=1`),
        fetch(`${API_BASE}/api/orders`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (ar.status === 401) { onLogout(); return; }
      if (!ar.ok) throw new Error('Error al cargar métricas');
      const json = await ar.json();
      setData(json);
      setError('');
      let skillCount = 0;
      if (sr.ok) {
        const sj = await sr.json().catch(() => null);
        skillCount = sj?.total || sj?.count || 0;
      }
      let orders = [];
      if (or.ok) {
        const oj = await or.json().catch(() => null);
        orders = oj?.orders || [];
      }
      setExtra({ skillCount, orders });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setLastRefresh(new Date());
      setCountdown(30);
    }
  }, [token, onLogout]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const iv = setInterval(load, 30000);
    return () => clearInterval(iv);
  }, [load]);
  useEffect(() => {
    const tick = setInterval(() => setCountdown(c => c > 0 ? c - 1 : 30), 1000);
    return () => clearInterval(tick);
  }, [lastRefresh]);

  const pathEntries = data?.pathBreakdown
    ? Object.entries(data.pathBreakdown).sort((a, b) => b[1] - a[1])
    : [];
  const totalPaths = pathEntries.reduce((s, [, v]) => s + v, 0) || 1;

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-[#00F299] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-zinc-500 font-mono text-xs">Cargando métricas...</p>
      </div>
    </div>
  );

  return (
    <div className="h-full overflow-y-auto px-6 py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">
            MARKETNOW <span style={{ color: '#00F299' }}>METRICS</span>
          </h2>
          <p className="text-zinc-500 text-xs font-mono mt-0.5">
            Panel privado · Refresh en <span className="text-[#00F299]">{countdown}s</span>
            {lastRefresh && <span className="text-zinc-700 ml-2">· {lastRefresh.toLocaleTimeString()}</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="px-3 py-1.5 rounded-lg text-xs font-mono border border-zinc-700 text-zinc-400 hover:border-[#00F299] hover:text-[#00F299] transition-all"
          >↻</button>
          <button
            onClick={onLogout}
            className="px-3 py-1.5 rounded-lg text-xs font-mono border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all"
          >Salir</button>
        </div>
      </div>

      {error && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total Hits', value: data?.totalHits?.toLocaleString() || '0', color: '#00F299', pulse: true },
          { label: 'Hits Hoy', value: data?.dailyHits?.toLocaleString() || '0', color: '#00d1ff' },
          { label: 'Skills', value: extra?.skillCount ?? '—', color: '#a78bfa' },
          {
            label: 'KV Store',
            value: data?.kvWriteTest?.kvWorks ? 'Online' : 'Error',
            color: data?.kvWriteTest?.kvWorks ? '#00F299' : '#f87171',
            pulse: data?.kvWriteTest?.kvWorks,
          },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl p-4"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mb-1">{s.label}</div>
            <div className="font-bold text-2xl font-mono" style={{ color: s.color }}>{s.value}</div>
            {s.pulse && <div className="flex items-center gap-1 mt-1"><span className="w-1.5 h-1.5 rounded-full bg-[#00F299] animate-pulse" /><span className="text-[10px] text-zinc-600 font-mono">Live</span></div>}
          </motion.div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        {/* Trend */}
        <div className="lg:col-span-2 rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mb-4">Tendencia 7 Días</div>
          {data?.weeklyTrend?.length > 0
            ? <BarChart data={data.weeklyTrend} />
            : <div className="h-20 flex items-center justify-center text-zinc-700 font-mono text-xs">Sin datos aún</div>
          }
          <div className="flex gap-4 mt-3 text-[10px] font-mono text-zinc-600">
            <span><span className="inline-block w-2 h-2 rounded-sm bg-[#00F299] mr-1 align-middle" />Hoy</span>
            <span><span className="inline-block w-2 h-2 rounded-sm bg-zinc-700 mr-1 align-middle" />Anteriores</span>
          </div>
        </div>

        {/* Health */}
        <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mb-4">Edge Health</div>
          <div className="space-y-3">
            {[
              { label: 'KV Write', value: data?.kvWriteTest?.kvWorks ? '✓ Pass' : '✗ Fail', ok: data?.kvWriteTest?.kvWorks },
              { label: 'Última Req.', value: data?.lastRequest ? new Date(data.lastRequest).toLocaleTimeString() : 'N/A' },
              { label: 'Worker', value: 'marketnow.site', ok: true },
              { label: 'Frontend', value: 'Pages CDN', ok: true },
            ].map(r => (
              <div key={r.label} className="flex justify-between items-center">
                <span className="text-zinc-500 text-xs font-mono">{r.label}</span>
                <span className={`text-xs font-mono ${r.ok === true ? 'text-[#00F299]' : r.ok === false ? 'text-red-400' : 'text-zinc-300'}`}>{r.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Path breakdown & Orders row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        {/* Path Breakdown */}
        <div className="lg:col-span-1 rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mb-4">Desglose de Rutas</div>
          {pathEntries.length > 0 ? (
            <div className="space-y-3">
              {pathEntries.map(([p, count]) => {
                const pct = Math.round((count / totalPaths) * 100);
                return (
                  <div key={p}>
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span className="text-zinc-400">{p}</span>
                      <span style={{ color: '#00F299' }}>{count.toLocaleString()} <span className="text-zinc-600">({pct}%)</span></span>
                    </div>
                    <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.7 }}
                        className="h-full rounded-full"
                        style={{ background: 'linear-gradient(90deg, #00F299, #00d1ff)' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-4 text-center text-zinc-700 font-mono text-xs">
              Sin datos de rutas aún.
            </div>
          )}
        </div>

        {/* Real Orders Table */}
        <div className="lg:col-span-2 rounded-xl p-4 overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex justify-between items-center mb-4">
            <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Órdenes / Compras Recientes ({extra?.orders?.length || 0})</div>
            {extra?.orders?.length > 0 && (
              <span className="text-[10px] font-mono text-[#00F299]">Total: ${extra.orders.reduce((sum, o) => sum + (parseFloat(o.amount) || 0), 0).toFixed(2)} USD</span>
            )}
          </div>
          <div className="overflow-x-auto max-h-60 overflow-y-auto">
            {extra?.orders && extra.orders.length > 0 ? (
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="text-zinc-500 border-b border-zinc-800">
                    <th className="pb-2 font-medium">ID / Fecha</th>
                    <th className="pb-2 font-medium">Skill</th>
                    <th className="pb-2 font-medium">Método</th>
                    <th className="pb-2 font-medium text-right">Monto</th>
                    <th className="pb-2 font-medium text-right">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {extra.orders.map(o => (
                    <tr key={o.orderId} className="hover:bg-white/5 transition-colors">
                      <td className="py-2.5">
                        <div className="text-zinc-300 font-bold">{o.orderId}</div>
                        <div className="text-[9px] text-zinc-600">{new Date(o.timestamp || Date.now()).toLocaleDateString()}</div>
                      </td>
                      <td className="py-2.5">
                        <div className="text-zinc-200 truncate max-w-[150px]" title={o.skillName}>{o.skillName || o.skillSlug}</div>
                        <div className="text-[9px] text-zinc-600 truncate max-w-[150px]" title={o.walletAddress}>{o.walletAddress || 'Platform checkout'}</div>
                      </td>
                      <td className="py-2.5 text-zinc-400">{o.paymentMethod || 'platform'}</td>
                      <td className="py-2.5 text-right text-white font-bold">${(parseFloat(o.amount) || 0).toFixed(2)}</td>
                      <td className="py-2.5 text-right">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${o.status === 'completed' ? 'bg-[#00F299]/10 text-[#00F299]' : 'bg-amber-500/10 text-amber-400'}`}>
                          {o.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-8 text-center text-zinc-700 font-mono text-xs">
                No se han registrado compras aún.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 text-center text-zinc-800 font-mono text-[10px]">
        🔒 Panel privado · Cloudflare KV Edge · Auto-refresh 30s
      </div>
    </div>
  );
}

// ─── Main AdminModal ──────────────────────────────────────────
export default function AdminModal({ isOpen, onClose }) {
  const [token, setToken] = useState(() => sessionStorage.getItem(SESSION_KEY) || '');

  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setToken('');
    onClose();
  };

  const handleLoginSuccess = (tok) => {
    setToken(tok);
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ backdropFilter: 'blur(20px)', background: 'rgba(0,0,0,0.92)' }}
        >
          {/* Subtle background pattern */}
          <div
            className="absolute inset-0 pointer-events-none opacity-5"
            style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #00F299 1px, transparent 0)', backgroundSize: '40px 40px' }}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-4xl mx-4 rounded-2xl overflow-hidden shadow-2xl"
            style={{
              background: 'linear-gradient(135deg, #0a0f0a 0%, #0d1117 100%)',
              border: '1px solid rgba(0, 242, 153, 0.15)',
              maxHeight: '90vh',
              height: '90vh',
            }}
          >
            {/* Top bar */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-zinc-800/60">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#00F299] animate-pulse" />
                <span className="text-xs font-mono text-zinc-500 tracking-widest">ADMIN · RESTRICTED</span>
              </div>
              <button
                onClick={onClose}
                className="text-zinc-600 hover:text-zinc-300 transition-colors text-lg leading-none"
                title="Cerrar (Esc)"
              >×</button>
            </div>

            {/* Content */}
            <div style={{ height: 'calc(100% - 45px)' }}>
              {token
                ? <DashboardPanel token={token} onLogout={handleLogout} />
                : <LoginPanel onSuccess={handleLoginSuccess} />
              }
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
