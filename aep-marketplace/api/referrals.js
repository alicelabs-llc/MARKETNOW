/**
 * MarketNow — Referrals API
 * ==========================
 *
 * The viral loop tracking. Referral codes let agents earn 5% commission on
 * purchases made by other agents they referred.
 *
 * Endpoints:
 *   POST /api/referrals  { action: "mint", agent_id }
 *     → Mints a new ref_code (ref_xxxxxxxx) for an agent. The agent shares
 *       this ref_code when calling get_install_command or agent-purchase.
 *
 *   GET /api/referrals?action=lookup&ref_code=ref_xxxxxxxx
 *     → Get referral stats: clicks, installs, purchases, total_earned_usd.
 *
 *   GET /api/referrals?action=list&agent_id=agent_xxx
 *     → List all referral codes owned by an agent.
 *
 *   POST /api/referrals  { action: "credit", ref_code, skill_id, amount_usd, ... }
 *     → Record a credit. Called internally by /api/agent-purchase when a
 *       purchase includes a ref_code.
 *
 * Storage: _data/referrals/{ref_code}.json (public audit ledger on GitHub).
 * Commission rate: 5% of purchase amount (deducted from MarketNow's share,
 * not the seller's 80%).
 *
 * This closes the "agent magnet" gap: the viral loop was designed but
 * never actually tracked. Now it does.
 */

import {
  mintReferral,
  creditReferral,
  recordReferralClick,
  lookupReferral,
  listReferralsByAgent,
  newRefCode,
} from '../lib/referral-tracker.mjs';
import { setCorsHeaders } from '../lib/cors.mjs';
import { checkRateLimit } from '../lib/rate-limit.mjs';
import { secureLight } from '../lib/secure.mjs';

function jsonHeaders(res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS, HEAD');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Vary', '*');
}

export default async function handler(req, res) {
  jsonHeaders(res);
  setCorsHeaders(req, res);
  secureLight(res);

  if (req.method === 'OPTIONS' || req.method === 'HEAD') return res.status(200).end();

  // Rate limit: 60 req/min per IP (most operations are read)
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || 'unknown';
  const rl = checkRateLimit(`referrals:${ip}`, { windowMs: 60 * 1000, max: 60 });
  if (!rl.ok) {
    return res.status(429).json({
      error: 'rate_limited',
      reset_at: new Date(rl.resetAt).toISOString(),
    });
  }

  const action = req.query.action || (req.body || {}).action;

  try {
    // ─── GET handlers ──────────────────────────────────────────────────

    if (req.method === 'GET') {
      // Help / spec
      if (!action) {
        return res.status(200).json({
          endpoint: '/api/referrals',
          description: 'Referral tracking for the MarketNow viral loop. Agents earn 5% commission on purchases made by other agents they referred.',
          commission_rate: 0.05,
          storage: '_data/referrals/{ref_code}.json (public GitHub audit ledger)',
          endpoints: {
            mint: 'POST /api/referrals { action: "mint", agent_id }',
            lookup: 'GET /api/referrals?action=lookup&ref_code=ref_xxxxxxxx',
            list: 'GET /api/referrals?action=list&agent_id=agent_xxx',
            credit: 'POST /api/referrals { action: "credit", ref_code, skill_id, amount_usd, ... }',
            click: 'POST /api/referrals { action: "click", ref_code }',
          },
          join_key_map: {
            ref_code: 'vibe_decision_ref (alternative citation)',
            agent_id: 'vibe_agent_id',
          },
          rate_limit: '60 requests per minute per IP',
        });
      }

      // Lookup referral by ref_code
      if (action === 'lookup') {
        const { ref_code } = req.query;
        if (!ref_code) {
          return res.status(400).json({ error: 'ref_code required' });
        }
        const referral = await lookupReferral(ref_code);
        if (!referral) {
          return res.status(404).json({
            error: 'referral_not_found',
            ref_code,
            message: `No referral with code ${ref_code} exists. Mint one at POST /api/referrals { action: "mint", agent_id }.`,
          });
        }
        return res.status(200).json(referral);
      }

      // List referrals by agent
      if (action === 'list') {
        const { agent_id } = req.query;
        if (!agent_id) {
          return res.status(400).json({ error: 'agent_id required' });
        }
        const referrals = await listReferralsByAgent(agent_id);
        return res.status(200).json({
          agent_id,
          total_ref_codes: referrals.length,
          referrals,
        });
      }

      return res.status(400).json({
        error: 'unknown_action',
        supported: ['lookup', 'list'],
      });
    }

    // ─── POST handlers ─────────────────────────────────────────────────

    if (req.method === 'POST') {
      const body = req.body || {};

      // Mint a new referral code
      if (action === 'mint') {
        const { agent_id } = body;
        if (!agent_id) {
          return res.status(400).json({
            error: 'agent_id required',
            example: { action: 'mint', agent_id: 'agent_claude_001' },
          });
        }
        const referral = await mintReferral(agent_id);
        return res.status(201).json({
          status: 'minted',
          ...referral,
          share_url: `https://marketnow.site/?ref=${referral.ref_code}`,
          install_command_with_ref: `npx -y marketnow-mcp ${referral.ref_code}`,
          note: 'Share this ref_code. When other agents use it for purchases, you earn 5% commission. Check stats at GET /api/referrals?action=lookup&ref_code=...',
        });
      }

      // Credit a referral (called internally by agent-purchase)
      if (action === 'credit') {
        const { ref_code, skill_id, license_key, amount_usd, tx_hash, receipt_id } = body;
        if (!ref_code || !skill_id || amount_usd == null) {
          return res.status(400).json({
            error: 'ref_code, skill_id, and amount_usd required',
          });
        }
        const updated = await creditReferral(ref_code, {
          skill_id,
          license_key,
          amount_usd: Number(amount_usd),
          tx_hash,
          receipt_id,
        });
        if (!updated) {
          return res.status(200).json({
            status: 'no_credit',
            ref_code,
            message: 'Referral not found or revoked. No credit applied.',
          });
        }
        return res.status(200).json({
          status: 'credited',
          ref_code,
          commission_earned_usd: Number((amount_usd * 0.05).toFixed(2)),
          new_total_earned_usd: updated.total_earned_usd,
          total_purchases: updated.purchases,
        });
      }

      // Record a click (called when an agent calls get_install_command with a ref)
      if (action === 'click') {
        const { ref_code } = body;
        if (!ref_code) {
          return res.status(400).json({ error: 'ref_code required' });
        }
        const updated = await recordReferralClick(ref_code);
        if (!updated) {
          return res.status(200).json({
            status: 'no_click_recorded',
            ref_code,
            message: 'Referral not found or revoked. No click recorded.',
          });
        }
        return res.status(200).json({
          status: 'click_recorded',
          ref_code,
          new_click_count: updated.clicks,
        });
      }

      return res.status(400).json({
        error: 'unknown_action',
        supported: ['mint', 'credit', 'click'],
      });
    }

    return res.status(405).json({ error: 'method_not_allowed' });
  } catch (err) {
    console.error('Referrals API error:', err);
    return res.status(500).json({
      error: 'referrals_failed',
      message: err.message,
    });
  }
}
