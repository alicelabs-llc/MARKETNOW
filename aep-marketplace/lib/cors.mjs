/**
 * MarketNow — CORS Allowlist
 * ===========================
 *
 * H1 FIX: Reemplazar Access-Control-Allow-Origin: * con allowlist explícito.
 *
 * Agentes (no browser) no envían Origin header, así que pueden llamar libremente.
 * Browsers solo pueden leer respuestas si el Origin está en la allowlist.
 */

const ALLOWED_ORIGINS = [
  'https://marketnow.site',
  'https://www.marketnow.site',
  'https://aep-marketplace.vercel.app',
  // Preview deployments
  /^https:\/\/aep-marketplace-.*\.vercel\.app$/,
  // Local dev
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
];

function isAllowedOrigin(origin) {
  if (!origin) return false;
  return ALLOWED_ORIGINS.some(pattern => {
    if (pattern instanceof RegExp) return pattern.test(origin);
    return pattern === origin;
  });
}

function setCorsHeaders(req, res, extraHeaders = []) {
  const origin = req.headers.origin;
  if (isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
    res.setHeader('Access-Control-Allow-Headers', ['Content-Type', ...extraHeaders].join(', '));
    res.setHeader('Access-Control-Max-Age', '86400');
  }
  // Si origin no está allowlisted, NO seteamos ACAO — el browser bloqueará la lectura.
}

export { ALLOWED_ORIGINS, isAllowedOrigin, setCorsHeaders };
