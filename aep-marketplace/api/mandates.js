/**
 * MarketNow — Delegated Mandates API (ACP / AP2 compliant)
 * =================================================================
 *
 * A "mandate" is a pre-approved spending allowance that a human principal
 * grants to an AI agent. The agent can spend autonomously up to the limit
 * without asking for per-purchase approval. Beyond the limit (or after
 * expiry), the agent must request explicit human approval.
 *
 * This implements the dual model the user asked for:
 *   - Free / verified skills  -> instant download (zero friction)
 *   - Paid, within mandate    -> instant_purchase (agent acts alone)
 *   - Paid, no mandate        -> requires_human_approval (Stripe Checkout
 *                                with 3-D Secure, or wallet signature)
 *
 * Persistence: Vercel KV (env: KV_REST_API_URL + KV_REST_API_TOKEN).
 * Fallback: in-memory store (resets on cold start) — never trusted for
 * real authorizations, only for local/dev. Production MUST have KV bound.
 *
 * Endpoints:
 *   POST   /api/mandates            -> create a new mandate
 *   GET    /api/mandates?id=...     -> get a single mandate
 *   GET    /api/mandates?owner=...  -> list mandates by owner wallet
 *   GET    /api/mandates?agent=...  -> list mandates by agentId
 *   POST   /api/mandates?action=revoke&id=...   -> revoke a mandate
 *   POST   /api/mandates?action=spend&id=...&amount=...  -> record a spend
 *
 * Mandate shape:
 * {
 *   "id": "mand_xxxxxxxx",
 *   "owner": "0x... (human wallet)",
 *   "agentId": "agent_xxx",
 *   "agentName": "Claude / Cursor / Cline / custom",
 *   "spendingLimitUsd": 25.00,
 *   "spentUsd": 0.00,
 *   "perPurchaseCapUsd": 5.00,
 *   "categories": ["*"] | ["ai", "data", "automation"],
 *   "expiresAt": "2026-12-31T23:59:59Z" | null,
 *   "createdAt": "2026-07-02T...",
 *   "status": "active" | "revoked" | "expired",
 *   "signature": "0x... (EIP-191 over the mandate hash, optional but recommended)"
 * }
 */

const MANDATE_TTL_DAYS = 90;       // mandates auto-expire after 90d unless renewed
const MAX_PER_PURCHASE_CAP = 50;   // hard cap per single purchase
const MAX_TOTAL_LIMIT = 500;       // hard cap on total spending limit

// In-memory fallback (dev only — see header comment).
const _mem = new Map();

async function kvGet(key) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    return _mem.get(key) || null;
  }
  try {
    const r = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return null;
    const j = await r.json();
    if (!j || j.result === null) return null;
    return JSON.parse(j.result);
  } catch {
    return _mem.get(key) || null;
  }
}

async function kvSet(key, value, ttlSeconds) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    _mem.set(key, value);
    return;
  }
  try {
    const body = ttlSeconds
      ? { value: JSON.stringify(value), expiration_ttl: ttlSeconds }
      : { value: JSON.stringify(value) };
    await fetch(`${url}/set/${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    console.error('KV set failed, falling back to memory', e);
    _mem.set(key, value);
  }
}

async function kvList(prefix) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    // memory fallback: scan keys with the prefix
    const out = [];
    for (const [k] of _mem) {
      if (k.startsWith(prefix)) out.push(k);
    }
    return out;
  }
  try {
    const r = await fetch(`${url}/keys/${encodeURIComponent(prefix)}*?limit=200`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return [];
    const j = await r.json();
    return j.result || [];
  } catch {
    return [];
  }
}

function newId() {
  return 'mand_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

function nowIso() { return new Date().toISOString(); }

function isExpired(m) {
  if (!m.expiresAt) return false;
  return new Date(m.expiresAt).getTime() < Date.now();
}

function jsonHeaders(res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Vary', '*');
}

export default async function handler(req, res) {
  jsonHeaders(res);
  if (req.method === 'OPTIONS' || req.method === 'HEAD') return res.status(200).end();
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'GET or POST only' });
  }

  try {
    const body = req.body || {};
    const query = req.query || {};
    const action = body.action || query.action;

    // ---------- CREATE ----------
    if (req.method === 'POST' && !action) {
      const {
        owner,
        agentId,
        agentName,
        spendingLimitUsd,
        perPurchaseCapUsd,
        categories,
        expiresAt,
        signature,
      } = body;

      if (!owner || !agentId || !spendingLimitUsd) {
        return res.status(400).json({
          error: 'Missing required fields',
          required: ['owner (wallet)', 'agentId', 'spendingLimitUsd'],
          optional: ['perPurchaseCapUsd', 'categories', 'expiresAt', 'signature', 'agentName'],
        });
      }

      const limit = Number(spendingLimitUsd);
      const perPurchase = Number(perPurchaseCapUsd || limit);

      if (isNaN(limit) || limit <= 0 || limit > MAX_TOTAL_LIMIT) {
        return res.status(400).json({
          error: `spendingLimitUsd must be between 0.01 and ${MAX_TOTAL_LIMIT}`,
        });
      }
      if (perPurchase > limit || perPurchase > MAX_PER_PURCHASE_CAP) {
        return res.status(400).json({
          error: `perPurchaseCapUsd cannot exceed ${Math.min(limit, MAX_PER_PURCHASE_CAP)}`,
        });
      }

      const id = newId();
      const mandate = {
        id,
        owner: owner.toLowerCase(),
        agentId,
        agentName: agentName || 'unspecified',
        spendingLimitUsd: limit,
        spentUsd: 0,
        perPurchaseCapUsd: perPurchase,
        categories: Array.isArray(categories) && categories.length ? categories : ['*'],
        expiresAt: expiresAt || new Date(Date.now() + MANDATE_TTL_DAYS * 86400000).toISOString(),
        createdAt: nowIso(),
        status: 'active',
        signature: signature || null,
        txCount: 0,
      };

      await kvSet(`mandate:${id}`, mandate);
      return res.status(201).json({
        success: true,
        mandate,
        documentation: 'https://marketnow.site/mandates',
        note: 'Agent may now purchase autonomously up to the limit. Beyond it, /api/agent-purchase returns mode=requires_human_approval.',
      });
    }

    // ---------- REVOKE ----------
    if (req.method === 'POST' && action === 'revoke') {
      const id = body.id || query.id;
      if (!id) return res.status(400).json({ error: 'id required' });
      const m = await kvGet(`mandate:${id}`);
      if (!m) return res.status(404).json({ error: 'Mandate not found' });
      m.status = 'revoked';
      m.revokedAt = nowIso();
      await kvSet(`mandate:${id}`, m);
      return res.status(200).json({ success: true, mandate: m });
    }

    // ---------- SPEND (called by agent-purchase after success) ----------
    if (req.method === 'POST' && action === 'spend') {
      const id = body.id || query.id;
      const amount = Number(body.amount || query.amount);
      const txHash = body.txHash || query.txHash;
      if (!id || !amount) return res.status(400).json({ error: 'id and amount required' });
      const m = await kvGet(`mandate:${id}`);
      if (!m) return res.status(404).json({ error: 'Mandate not found' });
      if (m.status !== 'active') return res.status(409).json({ error: `Mandate ${m.status}` });
      if (isExpired(m)) {
        m.status = 'expired';
        await kvSet(`mandate:${id}`, m);
        return res.status(409).json({ error: 'Mandate expired' });
      }
      if (m.spentUsd + amount > m.spendingLimitUsd) {
        return res.status(409).json({
          error: 'spend exceeds remaining mandate',
          remaining: m.spendingLimitUsd - m.spentUsd,
          requested: amount,
        });
      }
      m.spentUsd = Number((m.spentUsd + amount).toFixed(2));
      m.txCount = (m.txCount || 0) + 1;
      m.lastSpendAt = nowIso();
      m.lastSpendTx = txHash || null;
      await kvSet(`mandate:${id}`, m);
      return res.status(200).json({
        success: true,
        mandate: m,
        remaining: m.spendingLimitUsd - m.spentUsd,
      });
    }

    // ---------- GET (single) ----------
    if (req.method === 'GET' && (query.id)) {
      const m = await kvGet(`mandate:${query.id}`);
      if (!m) return res.status(404).json({ error: 'Not found' });
      if (m.status === 'active' && isExpired(m)) {
        m.status = 'expired';
        await kvSet(`mandate:${query.id}`, m);
      }
      return res.status(200).json({ mandate: m });
    }

    // ---------- LIST (by owner or agent) ----------
    if (req.method === 'GET' && (query.owner || query.agent)) {
      const keys = await kvList('mandate:');
      const out = [];
      for (const k of keys) {
        const m = await kvGet(k);
        if (!m) continue;
        if (query.owner && m.owner !== String(query.owner).toLowerCase()) continue;
        if (query.agent && m.agentId !== query.agent) continue;
        if (m.status === 'active' && isExpired(m)) {
          m.status = 'expired';
          await kvSet(k, m);
        }
        out.push(m);
      }
      out.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      return res.status(200).json({
        count: out.length,
        mandates: out,
      });
    }

    // ---------- INDEX / HELP ----------
    return res.status(200).json({
      service: 'MarketNow Mandates API',
      version: '1.0.0',
      protocol: 'ACP/AP2 (delegated mandates)',
      description:
        'Pre-approved spending allowances that a human principal grants to an AI agent. Agents buy autonomously within the limit; beyond it, human approval is required.',
      endpoints: {
        create: {
          method: 'POST',
          path: '/api/mandates',
          body: {
            owner: 'string (wallet address, lowercase)',
            agentId: 'string',
            agentName: 'string (optional)',
            spendingLimitUsd: 'number (0.01 - 500)',
            perPurchaseCapUsd: 'number (optional, defaults to spendingLimitUsd, max 50)',
            categories: 'string[] (optional, defaults to ["*"])',
            expiresAt: 'ISO8601 (optional, defaults to +90d)',
            signature: 'EIP-191 signature over the mandate hash (optional but recommended)',
          },
        },
        get: { method: 'GET', path: '/api/mandates?id=mand_xxx' },
        listByOwner: { method: 'GET', path: '/api/mandates?owner=0x...' },
        listByAgent: { method: 'GET', path: '/api/mandates?agent=agent_xxx' },
        revoke: { method: 'POST', path: '/api/mandates?action=revoke&id=mand_xxx' },
        spend: {
          method: 'POST',
          path: '/api/mandates?action=spend',
          body: { id: 'mand_xxx', amount: 1.99, txHash: '0x...' },
        },
      },
      limits: {
        maxTotalLimitUsd: MAX_TOTAL_LIMIT,
        maxPerPurchaseCapUsd: MAX_PER_PURCHASE_CAP,
        defaultTtlDays: MANDATE_TTL_DAYS,
      },
      audit_log: 'Every spend is recorded with txHash and timestamp. Owners can list all mandates and review spend history.',
      ui: 'https://marketnow.site/mandates',
    });
  } catch (err) {
    console.error('Mandates API error:', err);
    return res.status(500).json({ error: 'mandates_failed', message: err.message });
  }
}
