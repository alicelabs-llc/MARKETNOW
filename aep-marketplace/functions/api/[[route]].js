// Cloudflare Pages Function — maneja todas las rutas /api/*
// Datos embebidos directamente

const DB = {
  "users": [],
  "purchases": [],
  "auditLogs": [
    {"id":"AUD-2026-05-14-001","time":"2026-05-14 13:22:04 UTC","type":"Node Verification","status":"Passed","node":"0x4F3A...B8C2"},
    {"id":"AUD-2026-05-14-002","time":"2026-05-14 12:45:12 UTC","type":"Skill Integrity Check","status":"Passed","node":"0x7D1E...F93A"},
    {"id":"AUD-2026-05-14-003","time":"2026-05-14 11:30:00 UTC","type":"Handshake Auth","status":"Passed","node":"0xAC42...771D"},
    {"id":"AUD-2026-05-14-004","time":"2026-05-14 10:15:33 UTC","type":"Payment Verification","status":"Passed","node":"0x4F3A...B8C2"},
    {"id":"AUD-2026-05-14-005","time":"2026-05-14 08:00:01 UTC","type":"Network Mesh Sync","status":"Passed","node":"0xE8B1...3C4F"}
  ],
  "governance": {
    "proposals": [
      {"id":"AEP-42","title":"Increase Node Staking Minimum to 10,000 AEP","status":"Active","votes":12840,"deadline":"3d 14h"},
      {"id":"AEP-41","title":"Add Multi-Sig Verification for Enterprise Nodes","status":"Active","votes":9420,"deadline":"5d 8h"},
      {"id":"AEP-40","title":"Reduce Registry Fee from 5% to 3%","status":"Passed","votes":23100,"deadline":"Completed"},
      {"id":"AEP-39","title":"Implement Skill Bundles & Discounts","status":"Passed","votes":18750,"deadline":"Completed"},
      {"id":"AEP-38","title":"Cross-Chain Bridge to Solana","status":"Rejected","votes":6200,"deadline":"Completed"}
    ],
    "totalStaked":"4,892,340 AEP","totalDelegators":12450,"inflation":"3.2%",
    "totalVotes": 1052,
    "participationRate": 78.5,
    "activeProposals": 3
  },
  "totalRevenue": 284500,
  "totalTransactions": 12734,
  "activeNodes": 8432,
  "avgResponseTime": 142,
  "uptime": 99.97,
  "stats": {"globalVol":"$173.3M","meshCapacity":"0.00 GB","globalRegistry":"13,859","networkStatus":"● AEP_STABLE_0x44FA"},
  "categories": ["All","MCP Core","AI/ML","Data","Web/API","DevOps","Integrations","Communication","Storage","Media","Analytics","Crypto/Web3","Productivity","Security","Finance"],
  "skills": [],
};

// JWT helpers
function decodeToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function generateToken(user) {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({
    id: user.id, email: user.email, username: user.username,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400 * 7
  }));
  const signature = btoa('aep_marketplace_secret_2026.' + payload);
  return `${header}.${payload}.${signature}`;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
}

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace('/api', '');
  const method = request.method;

  if (method === 'OPTIONS') return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } });

  try {
    // Health
    if (method === 'GET' && path === '/health') return json({ status: 'ok', timestamp: new Date().toISOString() });

    // Skills list
    if (method === 'GET' && path === '/skills') return json({ count: 13000, message: 'Use /api/skills.json for full catalog (static JSON)', endpoint: '/api/skills.json' });

    // Skill detail
    if (method === 'GET' && path.startsWith('/skills/')) {
      const id = path.replace('/skills/', '');
      const skill = DB.skills.find(s => s.id === id);
      if (!skill) return json({ error: 'Skill not found' }, 404);
      return json({ skill });
    }

    // Register
    if (method === 'POST' && path === '/auth/register') {
      const body = await request.json().catch(() => ({}));
      const { username, email, password } = body;
      if (!username || !email || !password) return json({ error: `All fields required: ${JSON.stringify({username,email,password})}` }, 400);
      if (DB.users.find(u => u.email === email || u.username === username)) return json({ error: 'User already exists' }, 409);
      const newUser = { id: `user_${Date.now()}`, username, email, password: btoa('aep_' + password), credits: 1000, createdAt: new Date().toISOString() };
      DB.users.push(newUser);
      return json({ token: generateToken(newUser), user: { id: newUser.id, username, email, credits: 1000 } }, 201);
    }

    // Login
    if (method === 'POST' && path === '/auth/login') {
      const body = await request.json().catch(() => ({}));
      const { email, password } = body;
      if (!email || !password) return json({ error: 'Email and password required' }, 400);
      const user = DB.users.find(u => u.email === email);
      if (!user || user.password !== btoa('aep_' + password)) return json({ error: 'Invalid credentials' }, 401);
      return json({ token: generateToken(user), user: { id: user.id, username: user.username, email: user.email, credits: user.credits } });
    }

    // Vault
    if (method === 'GET' && path === '/vault') {
      const auth = decodeToken(request.headers.get('Authorization')?.slice(7));
      if (!auth) return json({ error: 'Authentication required' }, 401);
      const purchases = DB.purchases.filter(p => p.userId === auth.id).map(p => ({ ...p, skill: DB.skills.find(s => s.id === p.skillId) || null }));
      return json({ purchases });
    }

    // Checkout
    if (method === 'POST' && path === '/checkout/create-session') {
      const auth = decodeToken(request.headers.get('Authorization')?.slice(7));
      if (!auth) return json({ error: 'Authentication required' }, 401);
      const body = await request.json().catch(() => ({}));
      const { skillId } = body;
      if (!skillId) return json({ error: 'skillId required' }, 400);
      const skill = DB.skills.find(s => s.id === skillId);
      if (!skill) return json({ error: 'Skill not found' }, 404);
      const purchase = { id: `pur_${Date.now()}`, userId: auth.id, skillId: skill.id, skillName: skill.name, price: skill.price, license: `AEP-LIC-${skill.id.slice(0,3).toUpperCase()}-${Math.random().toString(36).slice(2,7).toUpperCase()}`, purchasedAt: new Date().toISOString(), status: 'Active' };
      DB.purchases.push(purchase);
      return json({ success: true, purchase, message: `Successfully purchased ${skill.name}! License: ${purchase.license}` });
    }

    // Governance
    if (method === 'GET' && path === '/governance/proposals') return json({ proposals: DB.governance.proposals, stats: DB.governance });
    if (method === 'POST' && path === '/governance/vote') {
      const auth = decodeToken(request.headers.get('Authorization')?.slice(7));
      if (!auth) return json({ error: 'Authentication required' }, 401);
      const { proposalId } = await request.json().catch(() => ({}));
      const proposal = DB.governance.proposals.find(p => p.id === proposalId);
      if (!proposal) return json({ error: 'Proposal not found' }, 404);
      proposal.votes++;
      return json({ success: true, message: `Vote cast on ${proposalId}`, proposal });
    }

    // Security
    if (method === 'GET' && path === '/security/audit-logs') return json({ auditLogs: DB.auditLogs });

    // Handshake
    if (method === 'POST' && path === '/handshake/connect') {
      const sessionId = 'aep_0x' + Array.from({length:16},()=>Math.floor(Math.random()*16).toString(16)).join('').toUpperCase();
      return json({ success: true, sessionId, endpoint: 'wss://mesh.aep.network/v1/handshake', protocols: ['MCP v1.0', 'MCP v1.1', 'AEP Extension v2.0'], message: 'Handshake established successfully' });
    }

    // Unhandled /api/* routes — 404 (static JSON files excluded via _routes.json,
    // search/register redirects handled by _redirects)
    return json({ error: 'Not found', path, method }, 404);
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
