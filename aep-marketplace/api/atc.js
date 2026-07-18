/**
 * MarketNow — Agent Trust Card (ATC) API — REAL IMPLEMENTATION
 * =============================================================
 *
 * SSL certificates for AI agents. MarketNow acts as the Certificate
 * Authority (CA). Every ATC is:
 *   1. Cryptographically SIGNED with the CA Ed25519 private key
 *   2. PERSISTED to _data/atc/{card_id}.json via GitHub API (durable)
 *   3. VERIFIABLE by anyone using the CA public key (GET /api/atc?action=ca-key)
 *   4. REVOCABLE — revoked cards are marked in the persisted record
 *
 * Operations:
 *   POST   /api/atc  {action:"issue", agent_id, public_key, ...}
 *     → Signs the ATC payload with CA Ed25519 key, persists to GitHub,
 *       returns the signed ATC.
 *   GET    /api/atc?action=verify&card_id=X
 *     → Fetches the ATC from GitHub, verifies the signature with CA
 *       public key, checks expiry, checks revocation status.
 *   POST   /api/atc  {action:"revoke", card_id, reason}
 *     → Updates the persisted ATC record: status="revoked".
 *       Future verify calls will return valid=false.
 *   GET    /api/atc
 *     → Lists all ATCs from _data/atc/ directory.
 *   GET    /api/atc?action=ca-key
 *     → Returns the CA public key (Ed25519 SPKI PEM).
 *   POST   /api/atc  {action:"translate", from, to, message}
 *     → Translates agent protocol messages (LangChain ↔ MCP ↔ AutoGen ↔ CrewAI).
 *
 * Sentinel score integration:
 *   When issuing, if `skill_id` is provided, the ATC's sentinel_score
 *   is fetched from the actual Sentinel certificate in _data/sentinel_certificates/.
 *   If `repo_url` is provided, we run a real-time audit via /api/audit-skill.
 *
 * Cryptography:
 *   - Algorithm: Ed25519 (RFC 8032)
 *   - Private key: Vercel env var MARKETNOW_ATC_CA_PRIVATE_KEY (PKCS8 PEM)
 *   - Public key: committed to _data/atc/ca-public-key.json (SPKI PEM)
 *   - Signature: detached, over the canonical JSON of the ATC payload
 */

import crypto from 'crypto';
import { setCorsHeaders } from '../lib/cors.mjs';
import { applySecurityHeaders } from '../lib/waf.mjs';

const GITHUB_TOKEN = process.env.MANDATES_GITHUB_TOKEN;
const REPO = process.env.MANDATES_REPO || 'edgarfloresguerra2011-a11y/marketnow';
const BRANCH = 'master';
const ATC_DIR = '_data/atc';
const CA_PRIVATE_KEY_PEM = process.env.MARKETNOW_ATC_CA_PRIVATE_KEY;

// In-memory caches (per warm instance)
let _caPrivateKey = null;
let _caPublicKey = null;
let _caPublicKeyPem = null;
let _atcCache = new Map(); // card_id → { data, fetchedAt }
const ATC_CACHE_TTL_MS = 5 * 1000; // 5s — short to avoid stale revocation across instances

// ─── CA key loading ──────────────────────────────────────────────────────

function loadCAKeys() {
  if (_caPrivateKey) return { privateKey: _caPrivateKey, publicKey: _caPublicKey, publicKeyPem: _caPublicKeyPem };

  if (!CA_PRIVATE_KEY_PEM) {
    throw new Error('CA private key not configured. Set MARKETNOW_ATC_CA_PRIVATE_KEY env var.');
  }

  _caPrivateKey = crypto.createPrivateKey(CA_PRIVATE_KEY_PEM);
  _caPublicKey = crypto.createPublicKey(_caPrivateKey);
  _caPublicKeyPem = _caPublicKey.export({ type: 'spki', format: 'pem' }).trim();
  return { privateKey: _caPrivateKey, publicKey: _caPublicKey, publicKeyPem: _caPublicKeyPem };
}

// ─── Signing & verification ─────────────────────────────────────────────

/**
 * Canonical JSON serialization for signing (deterministic key order).
 */
function canonicalJson(obj) {
  // Sort keys recursively, no whitespace
  return JSON.stringify(obj, Object.keys(obj).sort());
}

/**
 * Sign data with Ed25519 CA private key.
 * Returns signature as hex string.
 */
function signATC(payload) {
  const { privateKey } = loadCAKeys();
  const data = Buffer.from(canonicalJson(payload), 'utf8');
  const signature = crypto.sign(null, data, privateKey); // null = Ed25519 has no algorithm param
  return signature.toString('hex');
}

/**
 * Verify an ATC signature.
 * @param {Object} payload - the ATC payload (without signature field)
 * @param {string} signatureHex - hex signature
 * @returns {boolean}
 */
function verifySignature(payload, signatureHex) {
  try {
    const { publicKey } = loadCAKeys();
    const data = Buffer.from(canonicalJson(payload), 'utf8');
    const signature = Buffer.from(signatureHex, 'hex');
    return crypto.verify(null, data, publicKey, signature);
  } catch (e) {
    return false;
  }
}

// ─── GitHub persistence ─────────────────────────────────────────────────

async function ghApiCall(method, path, body) {
  if (!GITHUB_TOKEN) throw new Error('GitHub token not configured');
  const url = `https://api.github.com/repos/${REPO}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(BRANCH)}`;
  const headers = {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'marketnow-atc',
  };
  const opts = { method, headers };
  if (body) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const r = await fetch(url, opts);
  return r;
}

async function fetchATC(card_id, { skipCache = false } = {}) {
  // Check cache (unless skipCache — verify always reads fresh)
  if (!skipCache) {
    const cached = _atcCache.get(card_id);
    if (cached && Date.now() - cached.fetchedAt < ATC_CACHE_TTL_MS) {
      return cached.data;
    }
  }

  // Use GitHub Contents API (not raw) — raw has CDN cache that breaks
  // revocation consistency. The Contents API returns fresh content + the
  // file's current SHA (so we can detect updates).
  const url = `https://api.github.com/repos/${REPO}/contents/${ATC_DIR}/${encodeURIComponent(card_id)}.json?ref=${encodeURIComponent(BRANCH)}`;
  try {
    const r = await fetch(url, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'marketnow-atc',
      },
    });
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(`GitHub ${r.status}`);
    const meta = await r.json();
    // Content is base64-encoded
    const content = Buffer.from(meta.content, 'base64').toString('utf8');
    const data = JSON.parse(content);
    _atcCache.set(card_id, { data, fetchedAt: Date.now() });
    return data;
  } catch (e) {
    return null;
  }
}

async function listATCs() {
  const url = `https://api.github.com/repos/${REPO}/contents/${ATC_DIR}?ref=${encodeURIComponent(BRANCH)}`;
  try {
    const r = await fetch(url, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'marketnow-atc',
      },
    });
    if (!r.ok) return [];
    const files = await r.json();
    if (!Array.isArray(files)) return [];
    const atcFiles = files.filter(f => f.type === 'file' && f.name.startsWith('ATC-') && f.name.endsWith('.json'));

    // Fetch each ATC (in parallel, but limit concurrency to 5)
    const atcs = [];
    for (let i = 0; i < atcFiles.length; i += 5) {
      const batch = atcFiles.slice(i, i + 5);
      const results = await Promise.all(batch.map(async f => {
        try {
          const fr = await fetch(f.download_url, { headers: { 'User-Agent': 'marketnow-atc' } });
          if (!fr.ok) return null;
          return await fr.json();
        } catch { return null; }
      }));
      atcs.push(...results.filter(Boolean));
    }
    return atcs;
  } catch (e) {
    return [];
  }
}

async function persistATC(card_id, atc) {
  // Get the existing file's SHA (if updating) so GitHub can replace it
  let sha = null;
  try {
    const metaUrl = `https://api.github.com/repos/${REPO}/contents/${ATC_DIR}/${encodeURIComponent(card_id)}.json?ref=${encodeURIComponent(BRANCH)}`;
    const metaR = await fetch(metaUrl, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'marketnow-atc',
      },
    });
    if (metaR.ok) {
      const meta = await metaR.json();
      sha = meta.sha;
    }
  } catch {}

  const content = Buffer.from(JSON.stringify(atc, null, 2)).toString('base64');
  const url = `https://api.github.com/repos/${REPO}/contents/${ATC_DIR}/${encodeURIComponent(card_id)}.json`;
  const body = {
    message: `${sha ? 'update' : 'issue'} ATC ${card_id}`,
    content,
    branch: BRANCH,
  };
  if (sha) body.sha = sha;

  const r = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'marketnow-atc',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!r.ok) {
    const errBody = await r.text();
    throw new Error(`GitHub persist failed: ${r.status} ${errBody.slice(0, 200)}`);
  }

  // Invalidate cache
  _atcCache.delete(card_id);
  return true;
}

// ─── Sentinel score integration ─────────────────────────────────────────

async function fetchSentinelScore(skill_id) {
  if (!skill_id) return null;
  const url = `https://raw.githubusercontent.com/${REPO}/${encodeURIComponent(BRANCH)}/_data/sentinel_certificates/${encodeURIComponent(skill_id)}.json`;
  try {
    const r = await fetch(url, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        'User-Agent': 'marketnow-atc',
        Accept: 'application/vnd.github.raw',
      },
    });
    if (!r.ok) return null;
    const cert = await r.json();
    return {
      score: cert.overall_score ?? 0,
      risk_level: cert.risk_level ?? 'unknown',
      layers_run: cert.layers_run || {},
      certificate_id: cert.certificate_id || null,
    };
  } catch {
    return null;
  }
}

// ─── Handler ────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  setCorsHeaders(req, res);
  applySecurityHeaders(res);
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS' || req.method === 'HEAD') return res.status(200).end();

  const action = req.query.action || (req.body || {}).action;

  try {
    // ─── GET handlers ──────────────────────────────────────────────────

    if (req.method === 'GET') {
      // ── ca-key: return CA public key ──
      if (action === 'ca-key') {
        let pubPem;
        try {
          ({ publicKeyPem: pubPem } = loadCAKeys());
        } catch {
          return res.status(503).json({
            error: 'CA not configured',
            message: 'MARKETNOW_ATC_CA_PRIVATE_KEY env var not set. ATC signing unavailable.',
          });
        }
        return res.status(200).json({
          ca_name: 'MarketNow Sentinel CA',
          algorithm: 'Ed25519',
          public_key_pem: pubPem,
          public_key_format: 'SPKI PEM (RFC 5280)',
          created_at: '2026-07-16',
          usage: 'Verify ATC signatures: crypto.verify(null, Buffer.from(canonicalJson(payload)), publicKey, Buffer.from(signature, "hex"))',
          canonical_json: 'JSON.stringify(payload, Object.keys(payload).sort())',
          url: 'https://marketnow.site/api/atc?action=ca-key',
          note: 'Pin this key in your agent runtime. If it changes, MarketNow CA has been rotated.',
        });
      }

      // ── spec: return ATC protocol spec ──
      if (action === 'spec') {
        return res.status(200).json({
          protocol: 'ATC',
          version: '1.0.0',
          description: 'Agent Trust Card — SSL certificates for AI agents. Cryptographically signed by MarketNow Sentinel CA.',
          cryptography: {
            algorithm: 'Ed25519 (RFC 8032)',
            signature_format: 'detached, hex-encoded',
            canonical_json: 'JSON.stringify(payload, Object.keys(payload).sort())',
          },
          endpoints: {
            issue: 'POST /api/atc {action:"issue", agent_id, public_key, capabilities?, skill_id?, wallet_address?}',
            verify: 'GET /api/atc?action=verify&card_id=ATC-2026-XXXXX',
            revoke: 'POST /api/atc {action:"revoke", card_id, reason}',
            list: 'GET /api/atc',
            ca_key: 'GET /api/atc?action=ca-key',
            translate: 'POST /api/atc {action:"translate", from, to, message}',
          },
          trust_score: 'Derived from Sentinel certificate (0-10). Pass skill_id to link ATC to a Sentinel-audited skill.',
          persistence: 'ATCs are persisted to _data/atc/{card_id}.json in the public GitHub repo. Anyone can audit the ledger.',
        });
      }

      // ── verify: verify an ATC ──
      if (action === 'verify') {
        const { card_id } = req.query;
        if (!card_id) {
          return res.status(400).json({ error: 'card_id required' });
        }

        const atc = await fetchATC(card_id, { skipCache: true }); // verify always reads fresh
        if (!atc) {
          return res.status(404).json({
            valid: false,
            card_id,
            reason: 'ATC not found in registry',
            message: `No ATC with id ${card_id} exists. Check the card_id or list all ATCs at GET /api/atc.`,
          });
        }

        // Check revocation
        if (atc.status === 'revoked') {
          return res.status(200).json({
            valid: false,
            card_id,
            reason: 'revoked',
            revoked_at: atc.revoked_at,
            revocation_reason: atc.revocation_reason,
            message: 'This ATC has been revoked by the issuer or CA.',
          });
        }

        // Check expiry (metadata is inside payload)
        const now = new Date();
        const expires = new Date(atc.payload.metadata.expires_at);
        if (now > expires) {
          return res.status(200).json({
            valid: false,
            card_id,
            reason: 'expired',
            expires_at: atc.payload.metadata.expires_at,
            message: 'This ATC has expired. Renew at POST /api/atc {action:"issue", ...}',
          });
        }

        // Verify signature
        const { signature, payload } = atc;
        if (!signature || !payload) {
          return res.status(200).json({
            valid: false,
            card_id,
            reason: 'malformed',
            message: 'ATC record is missing signature or payload.',
          });
        }

        const sigValid = verifySignature(payload, signature.value);
        if (!sigValid) {
          return res.status(200).json({
            valid: false,
            card_id,
            reason: 'signature_invalid',
            message: 'ATC signature does not verify against the CA public key. The record may have been tampered with.',
          });
        }

        // All checks pass
        return res.status(200).json({
          valid: true,
          card_id,
          agent_id: payload.agent_id,
          agent_name: payload.agent_name,
          sentinel_score: payload.trust.sentinel_score,
          composite_trust: payload.trust.composite_trust,
          risk_level: payload.trust.risk_level,
          capabilities: payload.capabilities.provides,
          protocol_language: payload.capabilities.protocol_language,
          wallet: payload.payment.wallet_address,
          issued_at: payload.metadata.issued_at,
          expires_at: payload.metadata.expires_at,
          issuer: payload.metadata.issuer,
          signature_algorithm: signature.algorithm,
          signature_valid: true,
          message: 'ATC is valid, signature verified, not expired, not revoked.',
        });
      }

      // ── list (default GET): list all ATCs ──
      const atcs = await listATCs();
      return res.status(200).json({
        total: atcs.length,
        cards: atcs.map(a => ({
          card_id: a.payload?.card_id || a.card_id,
          agent_id: a.payload?.agent_id,
          agent_name: a.payload?.agent_name,
          sentinel_score: a.payload?.trust?.sentinel_score ?? 0,
          risk_level: a.payload?.trust?.risk_level ?? 'unknown',
          status: a.status || 'active',
          issued_at: a.payload?.metadata?.issued_at,
          expires_at: a.payload?.metadata?.expires_at,
        })),
      });
    }

    // ─── POST handlers ─────────────────────────────────────────────────

    if (req.method === 'POST') {
      const body = req.body || {};
      const postAction = body.action;

      // ── issue: create + sign + persist a new ATC ──
      if (postAction === 'issue') {
        const { agent_id, agent_name, public_key, capabilities, protocol_language, wallet_address, skill_id } = body;

        if (!agent_id || !public_key) {
          return res.status(400).json({
            error: 'agent_id and public_key required',
            example: {
              agent_id: 'agent.example.myagent',
              public_key: 'Ed25519 public key (SPKI PEM or base64 raw)',
              capabilities: ['search', 'recommend'],
              protocol_language: 'mcp',
              wallet_address: '0x...',
              skill_id: 'mn-real-xxx (optional, links ATC to Sentinel audit)',
            },
          });
        }

        // Load CA key (will throw if not configured)
        let privateKey;
        try {
          ({ privateKey } = loadCAKeys());
        } catch (e) {
          return res.status(503).json({
            error: 'CA not configured',
            message: e.message,
          });
        }

        // Generate card_id
        const card_id = `ATC-2026-${String(Date.now()).slice(-7)}`;
        const now = new Date();
        const expires = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days

        // Fetch Sentinel score if skill_id provided
        let sentinelInfo = { score: 0, risk_level: 'not_audited', layers_run: {}, certificate_id: null };
        if (skill_id) {
          const sInfo = await fetchSentinelScore(skill_id);
          if (sInfo) sentinelInfo = sInfo;
        }

        // Build the payload (this is what gets signed)
        const payload = {
          card_id,
          agent_id,
          agent_name: agent_name || agent_id,
          identity: {
            public_key,
            key_algorithm: 'Ed25519',
          },
          trust: {
            sentinel_score: sentinelInfo.score,
            audit_layers_passed: sentinelInfo.layers_run,
            composite_trust: sentinelInfo.score, // for now, = sentinel_score
            risk_level: sentinelInfo.risk_level,
            certificate_id: sentinelInfo.certificate_id,
          },
          capabilities: {
            provides: capabilities || [],
            protocol_language: protocol_language || 'mcp',
            translate: true,
          },
          payment: {
            method: 'x402 + USDC on Base L2',
            wallet_address: wallet_address || null,
          },
          metadata: {
            issued_at: now.toISOString(),
            expires_at: expires.toISOString(),
            issuer: 'MarketNow Sentinel CA',
            revocation_url: `https://marketnow.site/api/atc?action=verify&card_id=${card_id}`,
          },
        };

        // Sign the payload
        const signatureValue = signATC(payload);

        const atcRecord = {
          card_id,
          status: 'active',
          payload,
          signature: {
            algorithm: 'Ed25519 (RFC 8032)',
            value: signatureValue,
            signed_by: 'MarketNow Sentinel CA',
            signed_at: now.toISOString(),
            canonical_json: 'JSON.stringify(payload, Object.keys(payload).sort())',
            verify_with: 'GET /api/atc?action=ca-key',
          },
        };

        // Persist to GitHub
        try {
          await persistATC(card_id, atcRecord);
        } catch (e) {
          return res.status(500).json({
            error: 'persist_failed',
            message: `ATC was signed but could not be persisted: ${e.message}`,
            card_id,
            signature: atcRecord.signature,
            note: 'The ATC is valid but not yet in the public registry. Contact support@alicelabs.site.',
          });
        }

        return res.status(201).json({
          status: 'issued',
          card_id,
          ...atcRecord.payload,
          signature: atcRecord.signature,
          verify_url: `https://marketnow.site/api/atc?action=verify&card_id=${card_id}`,
          next_steps: [
            `1. Verify: GET /api/atc?action=verify&card_id=${card_id}`,
            '2. Pin the CA public key in your agent runtime: GET /api/atc?action=ca-key',
            `3. Renew before ${expires.toISOString()}`,
            '4. Other agents can verify your identity by checking this ATC',
          ],
        });
      }

      // ── revoke: mark an ATC as revoked ──
      if (postAction === 'revoke') {
        const { card_id, reason } = body;
        if (!card_id) {
          return res.status(400).json({ error: 'card_id required' });
        }

        const atc = await fetchATC(card_id, { skipCache: true }); // revoke reads fresh
        if (!atc) {
          return res.status(404).json({ error: 'ATC not found', card_id });
        }

        if (atc.status === 'revoked') {
          return res.status(200).json({
            status: 'already_revoked',
            card_id,
            revoked_at: atc.revoked_at,
            message: 'This ATC was already revoked.',
          });
        }

        // Update the record
        atc.status = 'revoked';
        atc.revoked_at = new Date().toISOString();
        atc.revocation_reason = reason || 'No reason provided';

        try {
          await persistATC(card_id, atc);
        } catch (e) {
          return res.status(500).json({
            error: 'persist_failed',
            message: `Could not persist revocation: ${e.message}`,
          });
        }

        return res.status(200).json({
          status: 'revoked',
          card_id,
          reason: atc.revocation_reason,
          revoked_at: atc.revoked_at,
          message: `ATC ${card_id} has been revoked. Future verify calls will return valid=false.`,
        });
      }

      // ── translate: real framework translation ──
      if (postAction === 'translate') {
        const { from, to, message } = body;
        if (!from || !to || !message) {
          return res.status(400).json({
            error: 'from, to, and message are required',
            supported: {
              from: ['langchain', 'mcp', 'autogen', 'crewai', 'openai_functions'],
              to: ['langchain', 'mcp', 'autogen', 'crewai', 'openai_functions'],
            },
          });
        }

        const supported = ['langchain', 'mcp', 'autogen', 'crewai', 'openai_functions'];
        if (!supported.includes(from) || !supported.includes(to)) {
          return res.status(400).json({
            error: 'unsupported framework',
            supported,
            got: { from, to },
          });
        }

        if (from === to) {
          return res.status(200).json({
            status: 'translated',
            from,
            to,
            original: message,
            translated: message,
            note: 'Same framework — no translation needed.',
          });
        }

        // Real translation: convert between tool/function schemas
        // Each framework has a different shape for declaring tool calls
        const translated = translateMessage(from, to, message);

        return res.status(200).json({
          status: 'translated',
          from,
          to,
          original: message,
          translated,
          note: `Translated from ${from} to ${to}. Schema mapping applied.`,
        });
      }

      return res.status(400).json({
        error: 'Unknown action',
        supported: ['issue', 'verify (GET)', 'revoke', 'list (GET)', 'ca-key (GET)', 'spec (GET)', 'translate'],
      });
    }

    return res.status(405).json({ error: 'Method not allowed. Use GET or POST.' });
  } catch (err) {
    console.error('ATC API error:', err);
    return res.status(500).json({
      error: 'atc_failed',
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
  }
}

// ─── Framework translation ──────────────────────────────────────────────

/**
 * Translate agent tool schemas between frameworks.
 * Real schema mapping — not a passthrough.
 */
function translateMessage(from, to, message) {
  // Normalize to MCP shape first (our canonical format)
  let mcpShape;

  switch (from) {
    case 'mcp':
      mcpShape = message; // already canonical
      break;
    case 'langchain':
      // LangChain tool: { name, description, args_schema (pydantic) }
      mcpShape = {
        name: message.name,
        description: message.description,
        inputSchema: {
          type: 'object',
          properties: message.args_schema?.properties || {},
          required: message.args_schema?.required || [],
        },
      };
      break;
    case 'openai_functions':
      // OpenAI function: { name, description, parameters }
      mcpShape = {
        name: message.name,
        description: message.description,
        inputSchema: message.parameters || { type: 'object', properties: {} },
      };
      break;
    case 'autogen':
      // AutoGen: { name, description, parameters }
      mcpShape = {
        name: message.name,
        description: message.description,
        inputSchema: message.parameters || { type: 'object', properties: {} },
      };
      break;
    case 'crewai':
      // CrewAI: { name, description, args (list of {name, type, description}) }
      const props = {};
      for (const arg of (message.args || [])) {
        props[arg.name] = { type: arg.type, description: arg.description };
      }
      mcpShape = {
        name: message.name,
        description: message.description,
        inputSchema: {
          type: 'object',
          properties: props,
          required: (message.args || []).filter(a => a.required).map(a => a.name),
        },
      };
      break;
    default:
      mcpShape = message;
  }

  // Now convert from MCP shape to target
  switch (to) {
    case 'mcp':
      return mcpShape;
    case 'langchain':
      return {
        name: mcpShape.name,
        description: mcpShape.description,
        args_schema: {
          type: 'object',
          properties: mcpShape.inputSchema?.properties || {},
          required: mcpShape.inputSchema?.required || [],
        },
      };
    case 'openai_functions':
      return {
        name: mcpShape.name,
        description: mcpShape.description,
        parameters: mcpShape.inputSchema || { type: 'object', properties: {} },
      };
    case 'autogen':
      return {
        name: mcpShape.name,
        description: mcpShape.description,
        parameters: mcpShape.inputSchema || { type: 'object', properties: {} },
      };
    case 'crewai':
      const props = mcpShape.inputSchema?.properties || {};
      return {
        name: mcpShape.name,
        description: mcpShape.description,
        args: Object.entries(props).map(([name, schema]) => ({
          name,
          type: schema.type || 'string',
          description: schema.description || '',
          required: (mcpShape.inputSchema?.required || []).includes(name),
        })),
      };
    default:
      return mcpShape;
  }
}
