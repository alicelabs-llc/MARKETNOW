/**
 * MarketNow — Agent Programmatic Purchase (USDC on Base) + Mandate-aware
 * =====================================================================
 *
 * Dual-mode commerce (ACP / AP2 delegated mandates):
 *   1. FREE skill                 -> mode: instant_download (no payment)
 *   2. PAID skill + valid mandate -> mode: instant_purchase  (agent autonomous)
 *   3. PAID skill + no mandate    -> mode: requires_human_approval
 *
 * Endpoint: POST /api/agent-purchase
 * Body:
 *   {
 *     "skillId": "mn-gen-00015",
 *     "walletAddress": "0x...",        // agent's wallet
 *     "txHash": "0x...",               // optional: USDC payment hash (Base)
 *     "agentId": "agent_xxx",          // optional
 *     "mandateId": "mand_xxx"          // optional: pre-approved mandate
 *   }
 *
 * Flow:
 *   - If skill.price == 0 -> return license + prompt (instant_download)
 *   - If mandateId provided:
 *       GET /api/mandates?id=mandateId
 *       if active && !expired && spent + price <= limit && price <= perPurchaseCap
 *         if txHash provided -> verify USDC tx on Base, then mark spend
 *         else -> return mode: requires_payment (agent must send USDC then retry with txHash)
 *       else -> return mode: requires_human_approval (mandate exhausted/expired/cap exceeded)
 *   - If no mandateId but txHash provided -> verify USDC tx, treat as direct pay
 *   - Else -> return mode: requires_human_approval with Stripe URL
 *
 * NO HUMAN INTERVENTION REQUIRED for free skills or paid skills within mandate.
 * Humans are only involved when a paid purchase exceeds an active mandate.
 *
 * Payment wallet: 0x39Dddf5aEdb58A559CF195fB8bdF23F0604Bf5Ee
 * Network: Base (Layer 2, chainId 8453)
 * Token:  USDC (0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913)
 */

const BASE_RPC = 'https://mainnet.base.org';
const USDC_CONTRACT = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const PAYMENT_WALLET = '0x39Dddf5aEdb58A559CF195fB8bdF23F0604Bf5Ee';
const USDC_DECIMALS = 6;
const COMMISSION_RATE = 0.20;
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

function jsonHeaders(res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS, HEAD');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Vary', '*');
}

function licenseKey(skillId, prefix = 'MN') {
  return `${prefix}-${skillId.slice(-8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
}

async function fetchSkill(req, skillId) {
  const baseUrl = `https://${req.headers.host}`;
  const skillsRes = await fetch(`${baseUrl}/api/skills.json`);
  if (!skillsRes.ok) throw new Error('Failed to fetch skills catalog');
  const skills = await skillsRes.json();
  return skills.find(s => s.id === skillId || s.slug === skillId);
}

async function getMandate(req, mandateId) {
  const baseUrl = `https://${req.headers.host}`;
  try {
    const r = await fetch(`${baseUrl}/api/mandates?id=${encodeURIComponent(mandateId)}`);
    if (!r.ok) return null;
    const j = await r.json();
    return j.mandate || null;
  } catch {
    return null;
  }
}

async function recordMandateSpend(req, mandateId, amount, txHash) {
  const baseUrl = `https://${req.headers.host}`;
  try {
    await fetch(`${baseUrl}/api/mandates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'spend', id: mandateId, amount, txHash }),
    });
  } catch (e) {
    console.error('mandate spend recording failed (non-fatal):', e);
  }
}

async function verifyUsdcTx(txHash, expectedAmountRaw) {
  const txRes = await fetch(BASE_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', id: 1,
      method: 'eth_getTransactionReceipt',
      params: [txHash],
    }),
  });
  const txData = await txRes.json();
  const receipt = txData.result;
  if (!receipt) {
    return { ok: false, code: 'tx_not_found', receipt: null };
  }
  if (receipt.status !== '0x1') {
    return { ok: false, code: 'tx_failed', receipt };
  }
  if (!receipt.logs || !Array.isArray(receipt.logs)) {
    return { ok: false, code: 'no_logs', receipt };
  }
  for (const log of receipt.logs) {
    if (log.address?.toLowerCase() !== USDC_CONTRACT.toLowerCase()) continue;
    if (!log.topics || log.topics[0] !== TRANSFER_TOPIC) continue;
    const from = '0x' + log.topics[1].slice(26);
    const to = '0x' + log.topics[2].slice(26);
    const value = BigInt(log.data);
    if (to.toLowerCase() === PAYMENT_WALLET.toLowerCase()) {
      if (Number(value) < expectedAmountRaw) {
        return {
          ok: false, code: 'insufficient_amount', receipt,
          expected: expectedAmountRaw, received: Number(value),
        };
      }
      return { ok: true, from, to, amount: Number(value), receipt };
    }
  }
  return { ok: false, code: 'no_transfer_to_marketnow', receipt };
}

export default async function handler(req, res) {
  jsonHeaders(res);
  if (req.method === 'OPTIONS' || req.method === 'HEAD') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

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

    const skill = await fetchSkill(req, skillId);
    if (!skill) {
      return res.status(404).json({ error: 'Skill not found', skillId });
    }

    // ============================================================
    // MODE 1: FREE SKILL — instant download, no payment
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
      // Category check
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
      // Per-purchase cap
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
      // Total limit
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

      // Mandate is valid and within all caps. Now require USDC payment.
      if (!txHash) {
        return res.status(200).json({
          success: false,
          mode: 'requires_payment',
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
            code_samples: {
              python: `from web3 import Web3\nw3 = Web3(Web3.HTTPProvider('https://mainnet.base.org'))\nusdc = w3.eth.contract(address='${USDC_CONTRACT}', abi=[{"inputs":[{"name":"to","type":"address"},{"name":"amount","type":"uint256"}],"name":"transfer","outputs":[{"name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"}])\ntx = usdc.functions.transfer('${PAYMENT_WALLET}', ${skill.price * 10 ** USDC_DECIMALS}).build_transaction({...})\n# sign & send, then POST /api/agent-purchase with the txHash`,
              javascript: `const { ethers } = require('ethers');\nconst p = new ethers.JsonRpcProvider('https://mainnet.base.org');\nconst usdc = new ethers.Contract('${USDC_CONTRACT}', ['function transfer(address,uint256) returns (bool)'], signer);\nconst tx = await usdc.transfer('${PAYMENT_WALLET}', ethers.parseUnits('${skill.price}', 6));\nawait tx.wait();\n// then POST /api/agent-purchase with txHash: tx.hash`,
            },
          },
          message: 'Send the USDC payment on Base, then retry this endpoint with the txHash.',
        });
      }

      // Verify USDC payment on-chain
      const expectedAmountRaw = Math.round(skill.price * 10 ** USDC_DECIMALS);
      const v = await verifyUsdcTx(txHash, expectedAmountRaw);
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
            : `Payment verification failed: ${v.code}`,
        });
      }

      // Payment verified — record spend against the mandate
      await recordMandateSpend(req, mandateId, skill.price, txHash);

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
          id: skill.id,
          name: skill.name,
          slug: skill.slug,
          category: skill.category,
          price: skill.price,
        },
        payment: {
          txHash,
          network: 'Base',
          token: 'USDC',
          amount: skill.price,
          amountRaw: v.amount,
          from: v.from,
          to: PAYMENT_WALLET,
          verifiedAt: new Date().toISOString(),
        },
        license: {
          key: licenseKey(skill.id),
          type: 'perpetual',
          expires: null,
          sellerEarnings,
          marketnowCommission: marketnowRevenue,
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
    // MODE 3: PAID SKILL, NO MANDATE — direct USDC if txHash, else require human approval
    // ============================================================
    if (txHash && walletAddress) {
      const expectedAmountRaw = Math.round(skill.price * 10 ** USDC_DECIMALS);
      const v = await verifyUsdcTx(txHash, expectedAmountRaw);
      if (!v.ok) {
        return res.status(400).json({
          success: false,
          mode: 'requires_payment',
          reason: v.code,
          txHash,
          expected_amount_raw: expectedAmountRaw,
          payment_wallet: PAYMENT_WALLET,
          network: 'Base',
        });
      }

      const sellerEarnings = skill.price * (1 - COMMISSION_RATE);
      const marketnowRevenue = skill.price * COMMISSION_RATE;
      return res.status(200).json({
        success: true,
        mode: 'direct_purchase',
        verified: true,
        skill: {
          id: skill.id, name: skill.name, slug: skill.slug, category: skill.category, price: skill.price,
        },
        payment: {
          txHash, network: 'Base', token: 'USDC', amount: skill.price, amountRaw: v.amount,
          from: v.from, to: PAYMENT_WALLET, verifiedAt: new Date().toISOString(),
        },
        license: {
          key: licenseKey(skill.id),
          type: 'perpetual',
          expires: null,
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

    // No mandate, no txHash -> human approval required
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
