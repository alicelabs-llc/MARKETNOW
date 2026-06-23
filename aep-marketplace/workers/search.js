/**
 * MarketNow — Search Worker
 * =========================
 * Cloudflare Worker que expone búsqueda server-side en KV.
 *
 * Endpoint: GET /api/search?q=keyword&cat=Finance&lang=python&limit=20&offset=0
 *
 * Binding KV: SKILLS_KV
 * Comando deploy: wrangler deploy workers/search.js --name marketnow-search
 */

// TTL para caché de KV en memoria del Worker (por request)
const INDEX_KEY = 'skills_index_v2';

export default {
  async fetch(request, env) {
    const url    = new URL(request.url);
    const path   = url.pathname;

    // CORS para cualquier origen (agentes externos)
    const cors = {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type':                 'application/json; charset=utf-8',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    // ── GET /api/search ────────────────────────────────────────────────────
    if (path === '/api/search' && request.method === 'GET') {
      return handleSearch(url, env, cors);
    }

    // ── POST /api/register ─────────────────────────────────────────────────
    if (path === '/api/register' && request.method === 'POST') {
      return handleRegister(request, env, cors);
    }

    // ── POST /api/m2m-checkout ─────────────────────────────────────────────
    if (path === '/api/m2m-checkout' && request.method === 'POST') {
      return handleCheckout(request, env, cors);
    }

    // ── GET /api/health ────────────────────────────────────────────────────
    if (path === '/api/health') {
      return new Response(JSON.stringify({
        status:    'ok',
        worker:    'marketnow-search',
        version:   '2.0.0',
        timestamp: new Date().toISOString(),
      }), { headers: cors });
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404, headers: cors,
    });
  },
};

// ─── Búsqueda ─────────────────────────────────────────────────────────────────
async function handleSearch(url, env, cors) {
  const q      = (url.searchParams.get('q')      || '').toLowerCase().trim();
  const cat    = (url.searchParams.get('cat')    || '').trim();
  const lang   = (url.searchParams.get('lang')   || '').toLowerCase().trim();
  const verified = url.searchParams.get('verified') === 'true';
  const limit  = Math.min(parseInt(url.searchParams.get('limit')  || '20'), 100);
  const offset = Math.max(parseInt(url.searchParams.get('offset') || '0'),  0);

  // Cargar índice desde KV (cacheado por el runtime de CF, ~60s)
  let index = [];
  try {
    const raw = await env.SKILLS_KV.get(INDEX_KEY, 'text');
    if (raw) index = JSON.parse(raw);
  } catch {
    // Si KV falla, devuelve error útil
    return new Response(JSON.stringify({
      error: 'KV index unavailable. Run: wrangler kv:key put skills_index_v2 --binding SKILLS_KV --path public/api/skills_index.json'
    }), { status: 503, headers: cors });
  }

  // Filtrar
  let results = index;

  if (q) {
    results = results.filter(s =>
      s.name.toLowerCase().includes(q)      ||
      s.shortDesc.toLowerCase().includes(q) ||
      s.tags.some(t => t.includes(q))       ||
      s.slug.includes(q)
    );
  }
  if (cat)      results = results.filter(s => s.category.toLowerCase() === cat.toLowerCase());
  if (lang)     results = results.filter(s => s.lang === lang);
  if (verified) results = results.filter(s => s.verified);

  const total   = results.length;
  const page    = results.slice(offset, offset + limit);

  return new Response(JSON.stringify({
    total,
    limit,
    offset,
    count:   page.length,
    results: page,
    _links: {
      next: total > offset + limit
        ? `?q=${q}&cat=${cat}&lang=${lang}&limit=${limit}&offset=${offset + limit}`
        : null,
      prev: offset > 0
        ? `?q=${q}&cat=${cat}&lang=${lang}&limit=${limit}&offset=${Math.max(0, offset - limit)}`
        : null,
    }
  }), { headers: cors });
}

// ─── Registro de proveedores ──────────────────────────────────────────────────
async function handleRegister(request, env, cors) {
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400, headers: cors,
    });
  }

  // Campos requeridos
  const required = ['name', 'description', 'repoUrl', 'email'];
  const missing  = required.filter(f => !body[f]);
  if (missing.length) {
    return new Response(JSON.stringify({
      error: `Missing required fields: ${missing.join(', ')}`,
    }), { status: 400, headers: cors });
  }

  // Validar URL
  try { new URL(body.repoUrl); } catch {
    return new Response(JSON.stringify({ error: 'Invalid repoUrl' }), {
      status: 400, headers: cors,
    });
  }

  // Guardar en KV como pending
  const id  = `pending_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const entry = {
    id,
    status:      'pending',
    submittedAt: new Date().toISOString(),
    name:        body.name.slice(0, 100),
    description: body.description.slice(0, 500),
    repoUrl:     body.repoUrl,
    email:       body.email,
    category:    body.category   || 'General',
    lang:        body.lang       || 'unknown',
    tags:        Array.isArray(body.tags) ? body.tags.slice(0, 10) : [],
    install:     body.install    || '',
    price:       typeof body.price === 'number' ? body.price : 0,
  };

  await env.SKILLS_KV.put(`submission:${id}`, JSON.stringify(entry), {
    expirationTtl: 60 * 60 * 24 * 90,  // 90 días
  });

  // También guardar en lista de pendientes (para revisión)
  const pendingListRaw = await env.SKILLS_KV.get('pending_list', 'text') || '[]';
  const pendingList    = JSON.parse(pendingListRaw);
  pendingList.push({ id, name: entry.name, submittedAt: entry.submittedAt });
  await env.SKILLS_KV.put('pending_list', JSON.stringify(pendingList));

  return new Response(JSON.stringify({
    success:   true,
    id,
    message:   'Skill submitted for review. You will receive an email within 48h.',
    status:    'pending',
  }), { status: 201, headers: cors });
}

// ─── Checkout M2M ─────────────────────────────────────────────────────────────
async function handleCheckout(request, env, cors) {
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: cors });
  }

  const { skill_id, wallet_address, payment_network, tx_hash, amount } = body;

  if (!skill_id || !wallet_address || !tx_hash || !amount) {
    return new Response(JSON.stringify({ error: 'Missing payment details' }), { status: 400, headers: cors });
  }

  const order_id = `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const access_token = `mn-lic-${Math.random().toString(36).slice(2, 10)}${Date.now()}`;

  const sale = {
    order_id,
    skill_id,
    wallet_address,
    payment_network,
    tx_hash,
    amount,
    timestamp: new Date().toISOString()
  };

  try {
    const salesRaw = await env.SKILLS_KV.get('sales_list', 'text') || '[]';
    const salesList = JSON.parse(salesRaw);
    salesList.push(sale);
    await env.SKILLS_KV.put('sales_list', JSON.stringify(salesList));
  } catch (e) {
    // Ignore KV write errors to not block the sale
  }

  return new Response(JSON.stringify({
    success: true,
    order_id,
    access_token,
    message: 'Payment verified and license generated'
  }), { status: 200, headers: cors });
}
