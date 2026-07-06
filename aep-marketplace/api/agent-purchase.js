/**
 * MarketNow — Agent Programmatic Purchase (USDC on Base) + Mandate-aware
 * =====================================================================
 *
 * v2.0 — Concurrency fixes (4 julio 2026)
 *   - Cache de skills en memoria (elimina fetch de 30MB por request)
 *   - Cache de mandates en memoria (reduce llamadas GitHub API)
 *   - Cache de txHash verificados (reduce llamadas Base RPC)
 *   - Pool de RPCs de Base (fallback si uno cae)
 *   - Rate limiting real por IP
 *   - Elimina self-fetch antipattern
 *
 * Endpoint: POST /api/agent-purchase
 * Body:
 *   {
 *     "skillId": "mn-gen-00015",
 *     "walletAddress": "0x...",
 *     "txHash": "0x...",
 *     "agentId": "agent_xxx",
 *     "mandateId": "mand_xxx"
 *   }
 *
 * Payment wallet: 0x39Dddf5aEdb58A559CF195fB8bdF23F0604Bf5Ee
 * Network: Base (Layer 2, chainId 8453)
 * Token:  USDC (0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913)
 */

import crypto from 'crypto';
import { findSkillMerged } from '../lib/skills-cache.mjs';
import { checkRateLimit } from '../lib/rate-limit.mjs';
import { setCorsHeaders } from '../lib/cors.mjs';
import * as mandateCache from '../lib/mandate-cache.mjs';
import * as txCache from '../lib/tx-cache.mjs';
import * as baseRpc from '../lib/base-rpc-pool.mjs';

const USDC_CONTRACT = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const PAYMENT_WALLET = '0x39Dddf5aEdb58A559CF195fB8bdF23F0604Bf5Ee';
const USDC_DECIMALS = 6;
const COMMISSION_RATE = 0.20;
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

function jsonHeaders(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  // H1 FIX: CORS allowlist en vez de *
  setCorsHeaders(req, res);
  res.setHeader('Vary', 'Origin');
}

function licenseKey(skillId, prefix = 'MN') {
  // M1 FIX: usar crypto.randomBytes en vez de Math.random()
  const rand = crypto.randomBytes(8).toString('hex').toUpperCase();
  return `${prefix}-${skillId.slice(-8).toUpperCase()}-${rand}`;
}

async function getMandate(req, mandateId) {
  // 1. Revisar cache
  const cached = mandateCache.get(mandateId);
  if (cached) return cached;

  // 2. Fetch desde /api/mandates
  // H1 FIX: Don't trust req.headers.host (spoofable, enables SSRF + cache poisoning)
  const baseUrl = `https://${process.env.VERCEL_URL || 'marketnow.site'}`;
  try {
    const r = await fetch(`${baseUrl}/api/mandates?id=${encodeURIComponent(mandateId)}`);
    if (!r.ok) return null;
    const j = await r.json();
    const mandate = j.mandate || null;
    if (mandate) {
      mandateCache.set(mandateId, mandate);
    }
    return mandate;
  } catch {
    return null;
  }
}

async function verifyUsdcTx(txHash, expectedAmountRaw, expectedFromWallet) {
  // 1. Revisar cache de txHash (solo para resultados negativos — positivos se re-verifican con dedup)
  const cachedResult = txCache.get(txHash);
  if (cachedResult && !cachedResult.ok) {
    return cachedResult;
  }

  // 2. Verificar via pool de RPCs
  try {
    const { result: receipt } = await baseRpc.call('eth_getTransactionReceipt', [txHash]);

    if (!receipt) {
      const result = { ok: false, code: 'tx_not_found', receipt: null };
      txCache.set(txHash, result);
      return result;
    }
    if (receipt.status !== '0x1') {
      const result = { ok: false, code: 'tx_failed', receipt };
      txCache.set(txHash, result);
      return result;
    }
    if (!receipt.logs || !Array.isArray(receipt.logs)) {
      const result = { ok: false, code: 'no_logs', receipt };
      txCache.set(txHash, result);
      return result;
    }

    for (const log of receipt.logs) {
      if (log.address?.toLowerCase() !== USDC_CONTRACT.toLowerCase()) continue;
      if (!log.topics || log.topics[0] !== TRANSFER_TOPIC) continue;
      const from = '0x' + log.topics[1].slice(26);
      const to = '0x' + log.topics[2].slice(26);
      const value = BigInt(log.data);
      if (to.toLowerCase() === PAYMENT_WALLET.toLowerCase()) {
        // C3 FIX: amount exact match (con tolerancia de 1 wei por redondeo)
        if (value !== BigInt(expectedAmountRaw)) {
          const result = {
            ok: false, code: 'amount_mismatch', receipt,
            expected: expectedAmountRaw, received: Number(value),
          };
          txCache.set(txHash, result);
          return result;
        }
        // C4 FIX: validar from wallet si se proporcionó
        if (expectedFromWallet && from.toLowerCase() !== expectedFromWallet.toLowerCase()) {
          const result = {
            ok: false, code: 'wrong_sender', receipt,
            expected_from: expectedFromWallet, actual_from: from,
          };
          txCache.set(txHash, result);
          return result;
        }
        const result = { ok: true, from, to, amount: Number(value), receipt };
        // NOTA: NO se cachea el resultado positivo aquí — el dedup check abajo
        // determina si este txHash ya fue usado para emitir una licencia.
        return result;
      }
    }
    const result = { ok: false, code: 'no_transfer_to_marketnow', receipt };
    txCache.set(txHash, result);
    return result;
  } catch (e) {
    return { ok: false, code: 'rpc_error', error: e.message };
  }
}

// C2 FIX: Dedup store — persiste txHash usados en GitHub como audit log + replay defense
// Cuando un txHash se usa para emitir una licencia, se marca como used.
// Sí intentan reusarlo, falla cerrado.
const GITHUB_API = 'https://api.github.com';

function usedTxRepoConfig() {
  return {
    token: process.env.MANDATES_GITHUB_TOKEN,
    repo: process.env.MANDATES_REPO || 'edgarfloresguerra2011-a11y/marketnow',
    branch: process.env.MANDATES_BRANCH || 'master',
    path: '_data/used_txs',
  };
}

async function isTxHashUsed(txHash) {
  const cfg = usedTxRepoConfig();
  if (!cfg.token) return { used: false, error: 'no_token' };
  const url = `https://raw.githubusercontent.com/${cfg.repo}/${encodeURIComponent(cfg.branch)}/${encodeURIComponent(cfg.path)}/${txHash.toLowerCase()}.json`;
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'marketnow-agent-purchase' } });
    if (r.status === 200) {
      const data = await r.json();
      return { used: true, data };
    }
    if (r.status === 404) return { used: false };
    return { used: false, error: `http_${r.status}` };
  } catch (e) {
    return { used: false, error: e.message };
  }
}

async function markTxHashUsed(txHash, licenseKey, skillId, amount) {
  const cfg = usedTxRepoConfig();
  if (!cfg.token) return false;
  const fileUrl = `${GITHUB_API}/repos/${cfg.repo}/contents/${encodeURIComponent(cfg.path)}/${txHash.toLowerCase()}.json?ref=${encodeURIComponent(cfg.branch)}`;
  const payload = {
    txHash: txHash.toLowerCase(),
    skillId,
    amount,
    licenseKey,
    usedAt: new Date().toISOString(),
    network: 'base',
    token: 'USDC',
  };
  try {
    const r = await fetch(fileUrl, {
      method: 'PUT',
      headers: {
        'User-Agent': 'marketnow-agent-purchase',
        Authorization: `Bearer ${cfg.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `tx: mark used ${txHash.slice(0, 10)}... (${skillId}, $${amount})`,
        content: Buffer.from(JSON.stringify(payload, null, 2)).toString('base64'),
        branch: cfg.branch,
      }),
    });
    return r.ok;
  } catch (e) {
    console.error('markTxHashUsed failed:', e);
    return false;
  }
}

async function recordMandateSpend(req, mandateId, amount, txHash, skill) {
  const baseUrl = `https://${process.env.VERCEL_URL || 'marketnow.site'}`;
  // C1 FIX: pasar _internal + _secret para que el spend sea aceptado
  // Y lanzar error si falla (fail-closed) — no emitir licencia si el spend falla
  try {
    const r = await fetch(`${baseUrl}/api/mandates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'spend',
        id: mandateId,
        amount,
        txHash,
        skillId: skill?.id,
        skillName: skill?.name,
        _internal: true,
        _secret: process.env.MANDATES_INTERNAL_SECRET,
      }),
    });
    mandateCache.invalidate(mandateId);
    if (!r.ok) {
      const errBody = await r.json().catch(() => ({}));
      throw new Error(`mandate spend rejected: ${errBody.error || r.status}`);
    }
    return true;
  } catch (e) {
    console.error('mandate spend FAILED (fail-closed):', e);
    mandateCache.invalidate(mandateId);
    throw e;  // FAIL CLOSED — caller MUST abort
  }
}

export default async function handler(req, res) {
  jsonHeaders(req, res);
  if (req.method === 'OPTIONS' || req.method === 'HEAD') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  // Rate limiting: 20 purchases/min por IP
  if (checkRateLimit(req, res, 'purchase')) return;

  try {
    const { skillId, walletAddress, txHash, agentId, mandateId } = req.body || {};

    if (!skillId) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['skillId'],
        optional: ['walletAddress', 'txHash', 'agentId', 'mandateId'],
        flow: {
          step1: 'GET /api/search?q=your_query',
          step2: 'Select a skill and note its price',
          step3: 'If free: POST /api/agent-purchase {skillId}',
          step3_alt: 'If paid + mandate: POST /api/agent-purchase {skillId, mandateId, txHash}',
          step3_alt2: 'If paid, no mandate: returns requires_human_approval with Stripe URL',
          step4: 'Receive license key + system prompt + install command',
        },
      });
    }

    // ===== FIX: usar cache en vez de fetch de 30MB =====
    const skill = await findSkillMerged(skillId);
    if (!skill) {
      return res.status(404).json({ error: 'Skill not found', skillId });
    }

    // ============================================================
    // MODE 1: FREE SKILL — instant download
    // ============================================================
    if (skill.price === 0 || skill.free) {
      return res.status(200).json({
        success: true,
        mode: 'instant_download',
        skill: { id: skill.id, name: skill.name, slug: skill.slug, price: 0 },
        license: {
          key: licenseKey(skill.id, 'MN-FREE'),
          type: 'free',
          expires: null,
        },
        system_prompt: skill.doc?.system_prompt || '',
        install: skill.install || `npx -y @marketnow/install ${skill.slug}`,
        capabilities: skill.capabilities || {},
        setup: skill.doc?.setup || {},
        sentinel: skill.sentinel || {},
        message: 'Free skill — instant download. No payment or mandate required.',
      });
    }

    // ============================================================
    // MODE 2: PAID SKILL WITH MANDATE
    // ============================================================
    if (mandateId) {
      const mandate = await getMandate(req, mandateId);
      if (!mandate) {
        return res.status(404).json({
          error: 'mandate_not_found',
          mandateId,
          fallback_mode: 'requires_human_approval',
          message: 'Use Stripe Checkout instead.',
        });
      }
      if (mandate.status !== 'active') {
        return res.status(200).json({
          success: false,
          mode: 'requires_human_approval',
          reason: `mandate_${mandate.status}`,
          mandate,
          skill: { id: skill.id, name: skill.name, price: skill.price },
          message: 'Mandate is no longer active. Ask the human principal to renew or extend it.',
        });
      }
      const expired = mandate.expiresAt && new Date(mandate.expiresAt).getTime() < Date.now();
      if (expired) {
        return res.status(200).json({
          success: false,
          mode: 'requires_human_approval',
          reason: 'mandate_expired',
          mandate,
          skill: { id: skill.id, name: skill.name, price: skill.price },
        });
      }
      if (mandate.categories && !mandate.categories.includes('*')) {
        if (!mandate.categories.includes(skill.category)) {
          return res.status(200).json({
            success: false,
            mode: 'requires_human_approval',
            reason: 'category_not_allowed',
            mandate,
            skill: { id: skill.id, name: skill.name, category: skill.category, price: skill.price },
            allowed_categories: mandate.categories,
          });
        }
      }
      if (skill.price > mandate.perPurchaseCapUsd) {
        return res.status(200).json({
          success: false,
          mode: 'requires_human_approval',
          reason: 'per_purchase_cap_exceeded',
          mandate,
          skill: { id: skill.id, name: skill.name, price: skill.price },
          cap: mandate.perPurchaseCapUsd,
        });
      }
      const remaining = mandate.spendingLimitUsd - mandate.spentUsd;
      if (skill.price > remaining) {
        return res.status(200).json({
          success: false,
          mode: 'requires_human_approval',
          reason: 'mandate_exhausted',
          mandate,
          skill: { id: skill.id, name: skill.name, price: skill.price },
          remaining_usd: remaining,
        });
      }

      if (!txHash) {
        res.setHeader('WWW-Authenticate', `x402 realm="marketnow", chain="base", token="USDC"`);
        res.setHeader('X-Payment-Required', 'true');
        res.setHeader('X-Payment-Amount', String(skill.price * 10 ** USDC_DECIMALS));
        res.setHeader('X-Payment-Token', 'USDC');
        res.setHeader('X-Payment-Chain', 'base');
        res.setHeader('X-Payment-Contract', USDC_CONTRACT);
        res.setHeader('X-Payment-To', PAYMENT_WALLET);
        res.setHeader('X-Payment-Description', `MarketNow skill: ${skill.name} (${skill.id})`);
        return res.status(402).json({
          success: false,
          mode: 'requires_payment',
          x402: {
            status: 402,
            message: 'Payment Required',
            accepts: {
              scheme: 'x402',
              network: 'base',
              asset: 'USDC',
              contract: USDC_CONTRACT,
              amount: skill.price,
              amount_raw: skill.price * 10 ** USDC_DECIMALS,
              to: PAYMENT_WALLET,
              description: `MarketNow skill: ${skill.name} (${skill.id})`,
              max_amount: skill.price,
              asset_type: 'native_token',
            },
            retry_instructions: {
              method: 'POST',
              url: 'https://marketnow.site/api/agent-purchase',
              headers: { 'Content-Type': 'application/json' },
              body: {
                skillId, mandateId, walletAddress,
                txHash: '<USDC Transfer transaction hash on Base>',
              },
              note: 'After sending the USDC payment on Base, retry this endpoint with the txHash in the body.',
            },
          },
          mandate,
          skill: { id: skill.id, name: skill.name, price: skill.price },
          payment: {
            network: 'Base',
            token: 'USDC',
            contract: USDC_CONTRACT,
            amount: skill.price,
            amount_raw: skill.price * 10 ** USDC_DECIMALS,
            to: PAYMENT_WALLET,
            from: walletAddress || mandate.owner,
          },
          message: 'HTTP 402 Payment Required. Send the USDC payment on Base, then retry with txHash.',
        });
      }

      // ===== FIX: verificar USDC tx con cache + pool de RPCs =====
      // C4 FIX: validar from wallet contra mandate.owner o walletAddress
      const expectedFrom = (walletAddress || mandate.owner).toLowerCase();
      const expectedAmountRaw = Math.round(skill.price * 10 ** USDC_DECIMALS);
      const v = await verifyUsdcTx(txHash, expectedAmountRaw, expectedFrom);
      if (!v.ok) {
        return res.status(400).json({
          success: false,
          mode: 'requires_payment',
          reason: v.code,
          txHash,
          expected_amount_raw: expectedAmountRaw,
          received: v.received,
          payment_wallet: PAYMENT_WALLET,
          network: 'Base (chainId 8453)',
          message: v.code === 'tx_not_found'
            ? 'TX not found on Base. Make sure you sent it on chainId 8453.'
            : v.code === 'rpc_error'
              ? 'Base RPC temporarily unavailable. Please retry in a few seconds.'
              : v.code === 'wrong_sender'
                ? 'Payment sender does not match your wallet. The tx must be sent from your wallet.'
                : v.code === 'amount_mismatch'
                  ? 'Payment amount does not match the skill price. Send the exact amount.'
                  : `Payment verification failed: ${v.code}`,
        });
      }

      // C2 FIX: dedup check — fail closed si el txHash ya fue usado
      // TOCTOU FIX: mark txHash as used BEFORE recording mandate spend.
      // Previously: isTxHashUsed() → recordMandateSpend() → markTxHashUsed()
      // Two concurrent requests could both pass isTxHashUsed() before either
      // called markTxHashUsed(), spending the mandate twice for one payment.
      // Now: isTxHashUsed() → markTxHashUsed() (atomic) → recordMandateSpend()
      // If markTxHashUsed fails because another request created the file first
      // (GitHub returns 409), we treat it as already used.
      const txUsed = await isTxHashUsed(txHash);
      if (txUsed.used) {
        return res.status(409).json({
          error: 'tx_already_used',
          txHash,
          original_license: txUsed.data?.licenseKey,
          original_skill: txUsed.data?.skillId,
          used_at: txUsed.data?.usedAt,
          message: 'This txHash has already been used to issue a license. Each USDC payment can only be redeemed once.',
        });
      }

      // TOCTOU FIX: Mark txHash as used IMMEDIATELY (before mandate spend).
      // The markTxHashUsedAtomic function creates the file with a unique
      // commit message. If two concurrent requests try to create the same
      // file, GitHub's API ensures only one succeeds (the other gets 409).
      const lic = licenseKey(skill.id);
      const marked = await markTxHashUsed(txHash, lic, skill.id, skill.price);
      if (!marked) {
        // Another request may have marked it between our check and mark
        const recheck = await isTxHashUsed(txHash);
        if (recheck.used) {
          return res.status(409).json({
            error: 'tx_already_used',
            txHash,
            original_license: recheck.data?.licenseKey,
            original_skill: recheck.data?.skillId,
            used_at: recheck.data?.usedAt,
            message: 'This txHash was claimed by another request. Each USDC payment can only be redeemed once.',
          });
        }
        // If still not used but mark failed, fail-closed (don't issue license)
        return res.status(500).json({
          error: 'tx_hash_lock_failed',
          message: 'Could not lock txHash. License NOT issued. Please retry.',
        });
      }

      // C1 FIX: fail-closed — si el spend falla, NO emitir licencia.
      // txHash is already marked as used (above), so the user can retry
      // with the same txHash and we'll recognize it as already-locked.
      // The mandate spend is idempotent (it checks txHash internally).
      try {
        await recordMandateSpend(req, mandateId, skill.price, txHash, skill);
      } catch (spendErr) {
        return res.status(500).json({
          error: 'mandate_spend_failed',
          message: 'Could not record spend against mandate. License NOT issued. The txHash is locked — please contact support if you were charged.',
          detail: spendErr.message,
        });
      }

      const sellerEarnings = skill.price * (1 - COMMISSION_RATE);
      const marketnowRevenue = skill.price * COMMISSION_RATE;

      return res.status(200).json({
        success: true,
        mode: 'instant_purchase',
        verified: true,
        mandate: {
          id: mandate.id,
          spentUsd: mandate.spentUsd + skill.price,
          remaining: mandate.spendingLimitUsd - (mandate.spentUsd + skill.price),
          limit: mandate.spendingLimitUsd,
        },
        skill: {
          id: skill.id, name: skill.name, slug: skill.slug,
          category: skill.category, price: skill.price,
        },
        payment: {
          txHash, network: 'Base', token: 'USDC', amount: skill.price, amountRaw: v.amount,
          from: v.from, to: PAYMENT_WALLET, verifiedAt: new Date().toISOString(),
        },
        license: {
          key: lic, type: 'perpetual', expires: null,
          sellerEarnings, marketnowCommission: marketnowRevenue,
        },
        system_prompt: skill.doc?.system_prompt || '',
        sentinel: skill.sentinel || {},
        capabilities: skill.capabilities || {},
        setup: skill.doc?.setup || {},
        install: skill.install || `npx -y @marketnow/install ${skill.slug}`,
        agentId: agentId || mandate.agentId || null,
        message: 'Payment verified on Base. Mandate spend recorded. License issued.',
      });
    }

    // ============================================================
    // MODE 3: PAID SKILL, NO MANDATE — direct USDC if txHash
    // ============================================================
    if (txHash && walletAddress) {
      const expectedAmountRaw = Math.round(skill.price * 10 ** USDC_DECIMALS);
      // C4 FIX: validar from wallet
      const v = await verifyUsdcTx(txHash, expectedAmountRaw, walletAddress);
      if (!v.ok) {
        return res.status(400).json({
          success: false,
          mode: 'requires_payment',
          reason: v.code,
          txHash,
          expected_amount_raw: expectedAmountRaw,
          payment_wallet: PAYMENT_WALLET,
          network: 'Base',
          message: v.code === 'rpc_error'
            ? 'Base RPC temporarily unavailable. Please retry in a few seconds.'
            : v.code === 'wrong_sender'
              ? 'Payment sender does not match your wallet. The tx must be sent from your wallet.'
              : v.code === 'amount_mismatch'
                ? 'Payment amount does not match the skill price. Send the exact amount.'
                : `Payment verification failed: ${v.code}`,
        });
      }

      // C2 FIX: dedup check — TOCTOU safe (same pattern as Mode 2 above)
      const txUsed = await isTxHashUsed(txHash);
      if (txUsed.used) {
        return res.status(409).json({
          error: 'tx_already_used',
          txHash,
          original_license: txUsed.data?.licenseKey,
          original_skill: txUsed.data?.skillId,
          used_at: txUsed.data?.usedAt,
          message: 'This txHash has already been used to issue a license. Each USDC payment can only be redeemed once.',
        });
      }

      // TOCTOU FIX: Mark txHash BEFORE issuing license (same as Mode 2)
      const lic = licenseKey(skill.id);
      const marked = await markTxHashUsed(txHash, lic, skill.id, skill.price);
      if (!marked) {
        const recheck = await isTxHashUsed(txHash);
        if (recheck.used) {
          return res.status(409).json({
            error: 'tx_already_used',
            txHash,
            original_license: recheck.data?.licenseKey,
            original_skill: recheck.data?.skillId,
            used_at: recheck.data?.usedAt,
            message: 'This txHash was claimed by another request.',
          });
        }
        return res.status(500).json({
          error: 'tx_hash_lock_failed',
          message: 'Could not lock txHash. License NOT issued. Please retry.',
        });
      }

      const sellerEarnings = skill.price * (1 - COMMISSION_RATE);
      const marketnowRevenue = skill.price * COMMISSION_RATE;
      return res.status(200).json({
        success: true,
        mode: 'direct_purchase',
        verified: true,
        skill: { id: skill.id, name: skill.name, slug: skill.slug, category: skill.category, price: skill.price },
        payment: {
          txHash, network: 'Base', token: 'USDC', amount: skill.price, amountRaw: v.amount,
          from: v.from, to: PAYMENT_WALLET, verifiedAt: new Date().toISOString(),
        },
        license: {
          key: lic, type: 'perpetual', expires: null,
          sellerEarnings, marketnowCommission: marketnowRevenue,
        },
        system_prompt: skill.doc?.system_prompt || '',
        sentinel: skill.sentinel || {},
        capabilities: skill.capabilities || {},
        setup: skill.doc?.setup || {},
        install: skill.install || `npx -y @marketnow/install ${skill.slug}`,
        agentId: agentId || null,
        message: 'Direct USDC payment verified on Base. License issued.',
      });
    }

    // No mandate, no txHash → human approval required
    return res.status(200).json({
      success: false,
      mode: 'requires_human_approval',
      reason: 'no_mandate_no_payment',
      skill: { id: skill.id, name: skill.name, slug: skill.slug, price: skill.price },
      options: {
        option_1_stripe: {
          description: 'Human approves via Stripe Checkout (3-D Secure, card).',
          url: `https://marketnow.site/skill/${skill.slug || skill.id}?checkout=stripe`,
        },
        option_2_create_mandate: {
          description: 'Human creates a mandate at /mandates, then the agent retries with mandateId.',
          url: 'https://marketnow.site/mandates',
          post_body_example: {
            skillId: skill.id,
            mandateId: 'mand_xxx',
            txHash: '0x... (USDC transfer on Base)',
            agentId: agentId || 'agent_xxx',
          },
        },
      },
      message: 'This is a paid skill and no mandate is on file. A human must either approve this single purchase via Stripe, or grant a mandate so future purchases happen autonomously.',
    });
  } catch (err) {
    console.error('Agent purchase error:', err);
    return res.status(500).json({
      error: 'purchase_verification_failed',
      message: err.message,
    });
  }
}
