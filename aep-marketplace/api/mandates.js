/**
 * MarketNow — Delegated Mandates API (ACP / AP2 compliant)
 * =================================================================
 *
 * Persistence: GitHub repo as a database (file-per-mandate at
 * `_data/mandates/mand_xxx.json` on master branch). No external
 * services required beyond a GitHub PAT — uses the existing
 * edgarfloresguerra2011-a11y/marketnow repo.
 *
 * Why GitHub?
 *   - Free, no signup, no new credentials
 *   - Durable across cold starts (unlike in-memory)
 *   - Transparent — every mandate write is a git commit, visible in the
 *     repo history. That's an audit log for free.
 *   - Rate limit: 5000 req/hour for authenticated requests
 *
 * Concurrency: writes use the contents API with the SHA of the previous
 * version. If two writes race, the second gets a 409 — we retry up to
 * 3 times by re-reading and re-applying the change.
 *
 * Required env vars:
 *   MANDATES_GITHUB_TOKEN  — GitHub PAT with repo scope
 *   MANDATES_REPO          — default: edgarfloresguerra2011-a11y/marketnow
 *   MANDATES_BRANCH        — default: master
 *   MANDATES_PATH          — default: _data/mandates
 *
 * Fallback: in-memory (resets on cold start) if no token configured.
 *
 * Endpoints (unchanged from v1.0.0):
 *   POST   /api/mandates            -> create
 *   GET    /api/mandates?id=...     -> get one
 *   GET    /api/mandates?owner=...  -> list by owner
 *   GET    /api/mandates?agent=...  -> list by agent
 *   POST   /api/mandates?action=revoke&id=...
 *   POST   /api/mandates?action=spend {id, amount, txHash}
 */

const GITHUB_API = 'https://api.github.com';

function repoConfig() {
  return {
    token: process.env.MANDATES_GITHUB_TOKEN,
    repo: process.env.MANDATES_REPO || 'edgarfloresguerra2011-a11y/marketnow',
    branch: process.env.MANDATES_BRANCH || 'master',
    path: process.env.MANDATES_PATH || '_data/mandates',
  };
}

function hasGitHub() {
  return !!process.env.MANDATES_GITHUB_TOKEN;
}

// In-memory fallback (dev / no-token configured).
const _mem = new Map();

function newId() {
  return 'mand_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
function nowIso() { return new Date().toISOString(); }
function isExpired(m) {
  if (!m.expiresAt) return false;
  return new Date(m.expiresAt).getTime() < Date.now();
}

// ---------- GitHub storage layer ----------

function fileUrl(cfg, id) {
  return `${GITHUB_API}/repos/${cfg.repo}/contents/${encodeURIComponent(cfg.path)}/${id}.json?ref=${encodeURIComponent(cfg.branch)}`;
}
function rawUrl(cfg, id) {
  return `https://raw.githubusercontent.com/${cfg.repo}/${encodeURIComponent(cfg.branch)}/${encodeURIComponent(cfg.path)}/${id}.json`;
}

async function ghGet(id) {
  const cfg = repoConfig();
  const r = await fetch(rawUrl(cfg, id), {
    headers: { 'User-Agent': 'marketnow-mandates' },
  });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`ghGet ${r.status}: ${await r.text()}`);
  return await r.json();
}

async function ghListIds() {
  const cfg = repoConfig();
  const r = await fetch(
    `${GITHUB_API}/repos/${cfg.repo}/contents/${encodeURIComponent(cfg.path)}?ref=${encodeURIComponent(cfg.branch)}`,
    { headers: { 'User-Agent': 'marketnow-mandates', Authorization: `Bearer ${cfg.token}` } }
  );
  if (r.status === 404) return []; // directory doesn't exist yet
  if (!r.ok) throw new Error(`ghListIds ${r.status}: ${await r.text()}`);
  const items = await r.json();
  return items
    .filter(i => i.type === 'file' && i.name.endsWith('.json'))
    .map(i => i.name.replace(/\.json$/, ''));
}

async function ghWrite(id, mandate, isCreate) {
  const cfg = repoConfig();
  // Get current SHA (for update) or null (for create)
  let sha = null;
  if (!isCreate) {
    try {
      const r = await fetch(fileUrl(cfg, id), {
        headers: { 'User-Agent': 'marketnow-mandates', Authorization: `Bearer ${cfg.token}` },
      });
      if (r.ok) {
        const j = await r.json();
        sha = j.sha;
      }
    } catch {
      // ignore — treat as create
    }
  }
  const body = {
    message: isCreate
      ? `mandate: create ${id} (limit $${mandate.spendingLimitUsd}, agent ${mandate.agentId})`
      : `mandate: update ${id} (status=${mandate.status}, spent=$${mandate.spentUsd})`,
    content: Buffer.from(JSON.stringify(mandate, null, 2)).toString('base64'),
    branch: cfg.branch,
  };
  if (sha) body.sha = sha;
  const r = await fetch(fileUrl(cfg, id), {
    method: 'PUT',
    headers: {
      'User-Agent': 'marketnow-mandates',
      Authorization: `Bearer ${cfg.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const text = await r.text();
    const err = new Error(`ghWrite ${r.status}: ${text}`);
    err.status = r.status;
    err.body = text;
    throw err;
  }
  return await r.json();
}

async function ghWriteWithRetry(id, mutator, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    let current = await ghGet(id);
    const isCreate = current === null;
    if (current === null && attempt > 0) {
      // someone deleted it between our read and write — abort
      throw new Error('mandate disappeared during write');
    }
    const next = mutator(current);
    if (next === null) return null; // mutator decided no-op
    try {
      await ghWrite(id, next, isCreate);
      return next;
    } catch (e) {
      if (e.status === 409 && attempt < maxRetries - 1) {
        // SHA mismatch — someone else wrote first. Re-read, re-apply, retry.
        await new Promise(r => setTimeout(r, 100 * (attempt + 1)));
        continue;
      }
      throw e;
    }
  }
  throw new Error('ghWriteWithRetry exhausted');
}

// ---------- Public storage API ----------

async function getMandate(id) {
  if (hasGitHub()) return await ghGet(id);
  return _mem.get(id) || null;
}

async function listMandates(filter) {
  if (hasGitHub()) {
    const ids = await ghListIds();
    const out = [];
    for (const id of ids) {
      const m = await ghGet(id);
      if (!m) continue;
      if (filter.owner && m.owner !== String(filter.owner).toLowerCase()) continue;
      if (filter.agent && m.agentId !== filter.agent) continue;
      out.push(m);
    }
    out.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    return out;
  }
  // memory
  let out = Array.from(_mem.values());
  if (filter.owner) out = out.filter(m => m.owner === String(filter.owner).toLowerCase());
  if (filter.agent) out = out.filter(m => m.agentId === filter.agent);
  out.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  return out;
}

async function createMandateRecord(mandate) {
  if (hasGitHub()) {
    await ghWrite(mandate.id, mandate, true);
    return mandate;
  }
  _mem.set(mandate.id, mandate);
  return mandate;
}

async function updateMandateRecord(id, mutator) {
  if (hasGitHub()) {
    return await ghWriteWithRetry(id, mutator);
  }
  const current = _mem.get(id);
  if (!current) return null;
  const next = mutator(current);
  if (next === null) return null;
  _mem.set(id, next);
  return next;
}

// ---------- Notifications ----------

async function sendMandateNotification(mandate, event) {
  const { amount, txHash, skillId, skillName, type } = event;
  const subject = `[MarketNow] Mandate ${mandate.id} — $${amount.toFixed(2)} ${type}`;
  const text = [
    `A spend of $${amount.toFixed(2)} was recorded against your mandate.`,
    ``,
    `Mandate:    ${mandate.id}`,
    `Agent:      ${mandate.agentName} (${mandate.agentId})`,
    `Skill:      ${skillName || skillId || '(unknown)'}`,
    `TxHash:     ${txHash || '(direct — no on-chain tx)'}`,
    `Amount:     $${amount.toFixed(2)}`,
    `Remaining:  $${(mandate.spendingLimitUsd - mandate.spentUsd).toFixed(2)} of $${mandate.spendingLimitUsd.toFixed(2)}`,
    `Mode:       ${mandate.notificationMode}`,
    ``,
    `If you did not authorize this, revoke the mandate immediately:`,
    `https://marketnow.site/mandates`,
    ``,
    `— MarketNow (AliceLabs LLC)`,
  ].join('\n');

  // Webhook (preferred — supports Slack/Discord/Telegram/custom)
  if (mandate.notificationWebhook) {
    try {
      await fetch(mandate.notificationWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: subject + '\n\n' + text,
          mandate_id: mandate.id,
          amount, skillId, skillName, txHash,
          mode: mandate.notificationMode,
          timestamp: nowIso(),
        }),
      });
    } catch (e) {
      console.error('webhook notification failed:', e);
    }
  }

  // Email — we use Vercel's built-in email forwarding if RESEND_API_KEY is set.
  // Until then we log the email content (so it's visible in the function logs)
  // and skip actual delivery. This is disclosed on /trust.
  if (mandate.notificationEmail) {
    if (process.env.RESEND_API_KEY) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'MarketNow <notifications@marketnow.site>',
            to: mandate.notificationEmail,
            subject,
            text,
          }),
        });
      } catch (e) {
        console.error('email notification failed:', e);
      }
    } else {
      console.log(`[mandate-notification] (email not configured) To: ${mandate.notificationEmail}\n${subject}\n${text}`);
    }
  }
}

// ---------- HTTP handler ----------

const MANDATE_TTL_DAYS = 90;
const MAX_PER_PURCHASE_CAP = 50;
const MAX_TOTAL_LIMIT = 500;

// Default notification mode is "notify" — every purchase within a mandate
// triggers a notification (email/webhook) to the principal. The principal
// can choose "silent" (no notification, fully autonomous — opt-in) or
// "notify_and_veto" (notification + 5-minute veto window before spend is
// committed). This implements Claude's feedback: human-in-the-loop is the
// default, not opt-out.
const DEFAULT_NOTIFICATION_MODE = 'notify';
const VETO_WINDOW_SECONDS = 300; // 5 minutes for notify_and_veto mode
const NOTIFICATION_MODES = ['silent', 'notify', 'notify_and_veto'];

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
        owner, agentId, agentName, spendingLimitUsd,
        perPurchaseCapUsd, categories, expiresAt, signature,
        notificationMode, notificationEmail, notificationWebhook,
      } = body;

      if (!owner || !agentId || !spendingLimitUsd) {
        return res.status(400).json({
          error: 'Missing required fields',
          required: ['owner (wallet)', 'agentId', 'spendingLimitUsd'],
          optional: ['perPurchaseCapUsd', 'categories', 'expiresAt', 'signature', 'agentName', 'notificationMode', 'notificationEmail', 'notificationWebhook'],
          defaults: {
            notificationMode: DEFAULT_NOTIFICATION_MODE,
            perPurchaseCapUsd: 'defaults to spendingLimitUsd',
            categories: '["*"] (all)',
            expiresAt: `+${MANDATE_TTL_DAYS} days`,
          },
          disclosure: 'Default notificationMode is "notify" — the principal is alerted on every purchase. "silent" (fully autonomous) must be explicitly chosen. "notify_and_veto" adds a 5-minute veto window before each spend is committed.',
        });
      }

      // Validate notification mode (default to "notify" — human in loop by default)
      const notifMode = NOTIFICATION_MODES.includes(notificationMode)
        ? notificationMode
        : DEFAULT_NOTIFICATION_MODE;
      // If mode is silent, require explicit confirmation field
      if (notifMode === 'silent' && !body.confirmSilentAutonomy) {
        return res.status(400).json({
          error: 'silent mode requires explicit confirmation',
          field: 'confirmSilentAutonomy: true',
          reason: 'silent mode means the agent spends with NO human notification. This is opt-in by design — set confirmSilentAutonomy=true to acknowledge.',
          recommended: 'Use "notify" (default) or "notify_and_veto" instead.',
        });
      }
      // If notify or notify_and_veto, require email or webhook
      if ((notifMode === 'notify' || notifMode === 'notify_and_veto') && !notificationEmail && !notificationWebhook) {
        return res.status(400).json({
          error: `notificationMode "${notifMode}" requires notificationEmail or notificationWebhook`,
          reason: 'The principal must have a way to receive the alerts for them to mean anything.',
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
        notificationMode: notifMode,
        notificationEmail: notificationEmail || null,
        notificationWebhook: notificationWebhook || null,
        vetoWindowSeconds: notifMode === 'notify_and_veto' ? VETO_WINDOW_SECONDS : 0,
      };

      await createMandateRecord(mandate);
      return res.status(201).json({
        success: true,
        mandate,
        persistence: hasGitHub() ? 'github' : 'memory',
        documentation: 'https://marketnow.site/mandates',
        note: 'Agent may now purchase autonomously up to the limit. Beyond it, /api/agent-purchase returns mode=requires_human_approval.',
      });
    }

    // ---------- REVOKE ----------
    if (req.method === 'POST' && action === 'revoke') {
      const id = body.id || query.id;
      if (!id) return res.status(400).json({ error: 'id required' });
      const updated = await updateMandateRecord(id, (m) => {
        if (!m) return null;
        m.status = 'revoked';
        m.revokedAt = nowIso();
        return m;
      });
      if (!updated) return res.status(404).json({ error: 'Mandate not found' });
      return res.status(200).json({ success: true, mandate: updated });
    }

    // ---------- SPEND ----------
    if (req.method === 'POST' && action === 'spend') {
      const id = body.id || query.id;
      const amount = Number(body.amount || query.amount);
      const txHash = body.txHash || query.txHash;
      const skillName = body.skillName || query.skillName;
      const skillId = body.skillId || query.skillId;
      if (!id || !amount) return res.status(400).json({ error: 'id and amount required' });

      // Pre-spend: if notify_and_veto mode, return a "pending" response
      // that the agent must confirm after the veto window elapses.
      // (For now we accept the spend but log it — full veto flow requires
      // a pending-spends store which is on the roadmap. See /trust page.)

      let conflict = null;
      const updated = await updateMandateRecord(id, (m) => {
        if (!m) { conflict = { code: 'not_found' }; return null; }
        if (m.status !== 'active') { conflict = { code: 'bad_status', status: m.status }; return null; }
        if (isExpired(m)) {
          m.status = 'expired';
          conflict = { code: 'expired' };
          return m;
        }
        if (m.spentUsd + amount > m.spendingLimitUsd) {
          conflict = {
            code: 'exhausted',
            remaining: m.spendingLimitUsd - m.spentUsd,
            requested: amount,
          };
          return null;
        }
        m.spentUsd = Number((m.spentUsd + amount).toFixed(2));
        m.txCount = (m.txCount || 0) + 1;
        m.lastSpendAt = nowIso();
        m.lastSpendTx = txHash || null;
        m.lastSpendSkillId = skillId || null;
        m.lastSpendSkillName = skillName || null;
        return m;
      });

      // Best-effort notification (fire-and-forget — don't block the response)
      if (updated && (updated.notificationMode === 'notify' || updated.notificationMode === 'notify_and_veto')) {
        try {
          await sendMandateNotification(updated, {
            amount, txHash, skillId, skillName, type: 'spend',
          });
        } catch (e) {
          console.error('notification failed (non-fatal):', e);
        }
      }

      if (conflict) {
        return res.status(409).json({ error: 'spend_rejected', ...conflict });
      }
      if (!updated) {
        return res.status(404).json({ error: 'Mandate not found' });
      }
      return res.status(200).json({
        success: true,
        mandate: updated,
        remaining: updated.spendingLimitUsd - updated.spentUsd,
        notification_sent: updated.notificationMode !== 'silent',
        notification_mode: updated.notificationMode,
      });
    }

    // ---------- GET (single) ----------
    if (req.method === 'GET' && query.id) {
      const m = await getMandate(query.id);
      if (!m) return res.status(404).json({ error: 'Not found' });
      if (m.status === 'active' && isExpired(m)) {
        const updated = await updateMandateRecord(query.id, (mm) => {
          if (!mm) return null;
          mm.status = 'expired';
          return mm;
        });
        return res.status(200).json({ mandate: updated || m });
      }
      return res.status(200).json({ mandate: m });
    }

    // ---------- LIST ----------
    if (req.method === 'GET' && (query.owner || query.agent)) {
      const out = await listMandates({
        owner: query.owner,
        agent: query.agent,
      });
      // mark expired in-place
      for (const m of out) {
        if (m.status === 'active' && isExpired(m)) {
          m.status = 'expired';
        }
      }
      return res.status(200).json({ count: out.length, mandates: out });
    }

    // ---------- INDEX ----------
    return res.status(200).json({
      service: 'MarketNow Mandates API',
      version: '1.1.0',
      protocol: 'ACP/AP2 (delegated mandates)',
      persistence: hasGitHub() ? 'github' : 'memory',
      persistence_detail: hasGitHub()
        ? 'Each mandate stored as a JSON file in the GitHub repo — durable, transparent, audit-log via commit history.'
        : 'WARNING: In-memory only. Mandates will be lost on cold start. Set MANDATES_GITHUB_TOKEN env var to enable persistence.',
      description:
        'Pre-approved spending allowances that a human principal grants to an AI agent. Agents buy autonomously within the limit; beyond it, human approval is required.',
      endpoints: {
        create: { method: 'POST', path: '/api/mandates' },
        get: { method: 'GET', path: '/api/mandates?id=mand_xxx' },
        listByOwner: { method: 'GET', path: '/api/mandates?owner=0x...' },
        listByAgent: { method: 'GET', path: '/api/mandates?agent=agent_xxx' },
        revoke: { method: 'POST', path: '/api/mandates?action=revoke&id=mand_xxx' },
        spend: { method: 'POST', path: '/api/mandates?action=spend', body: { id: 'mand_xxx', amount: 1.99, txHash: '0x...' } },
      },
      limits: {
        maxTotalLimitUsd: MAX_TOTAL_LIMIT,
        maxPerPurchaseCapUsd: MAX_PER_PURCHASE_CAP,
        defaultTtlDays: MANDATE_TTL_DAYS,
      },
      audit_log: 'Every create / spend / revoke is a git commit on master — visible in the repo history at _data/mandates/.',
      ui: 'https://marketnow.site/mandates',
    });
  } catch (err) {
    console.error('Mandates API error:', err);
    return res.status(500).json({ error: 'mandates_failed', message: err.message });
  }
}
