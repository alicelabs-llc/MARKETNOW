/**
 * MarketNow — Agent Programmatic Purchase (USDC on Base)
 * ========================================================
 * 
 * Endpoint: POST /api/agent-purchase
 * Body: {
 *   "skillId": "mn-gen-00015",
 *   "walletAddress": "0x...",
 *   "txHash": "0x...",        // tx hash of USDC payment
 *   "agentId": "agent_xxx"    // optional, for tracking
 * }
 * 
 * Flow for autonomous agents:
 * 1. Agent searches skills: GET /api/search?q=scrape
 * 2. Agent selects a skill and reads its price
 * 3. Agent sends USDC payment to MarketNow's wallet ON-CHAIN
 * 4. Agent calls this endpoint with the txHash
 * 5. This endpoint verifies the payment on Base blockchain
 * 6. Returns license key + system prompt + install command
 * 
 * NO HUMAN INTERVENTION REQUIRED.
 * 
 * Payment wallet: 0x39Dddf5aEdb58A559CF195fB8bdF23F0604Bf5Ee
 * Network: Base (Layer 2)
 * Token: USDC (0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913)
 */

const BASE_RPC = 'https://mainnet.base.org';
const USDC_CONTRACT = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const PAYMENT_WALLET = '0x39Dddf5aEdb58A559CF195fB8bdF23F0604Bf5Ee';
const USDC_DECIMALS = 6;
const COMMISSION_RATE = 0.20;

// Simple ERC20 Transfer event signature
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS' || req.method === 'HEAD') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const { skillId, walletAddress, txHash, agentId } = req.body || {};

    if (!skillId || !walletAddress || !txHash) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['skillId', 'walletAddress', 'txHash'],
        flow: {
          step1: 'GET /api/search?q=your_query',
          step2: 'Select a skill and note its price',
          step3: `Send USDC to ${PAYMENT_WALLET} on Base network`,
          step4: 'POST /api/agent-purchase with {skillId, walletAddress, txHash}',
          step5: 'Receive license key + system prompt + install command',
        },
      });
    }

    // Fetch skill
    const baseUrl = `https://${req.headers.host}`;
    const skillsRes = await fetch(`${baseUrl}/api/skills.json`);
    if (!skillsRes.ok) throw new Error('Failed to fetch skills');
    const skills = await skillsRes.json();
    const skill = skills.find(s => s.id === skillId || s.slug === skillId);

    if (!skill) {
      return res.status(404).json({ error: 'Skill not found', skillId });
    }

    // Skip payment verification for free skills
    if (skill.price === 0 || skill.free) {
      const licenseKey = `MN-FREE-${skill.id.slice(-8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
      return res.status(200).json({
        success: true,
        skill: {
          id: skill.id,
          name: skill.name,
          slug: skill.slug,
          price: 0,
        },
        license: {
          key: licenseKey,
          type: 'free',
          expires: null,
        },
        system_prompt: skill.doc?.system_prompt || '',
        install: skill.install || `npx -y @marketnow/install ${skill.slug}`,
        capabilities: skill.capabilities || {},
        setup: skill.doc?.setup || {},
        message: 'Free skill — no payment required. License key generated.',
      });
    }

    // Verify transaction on Base blockchain
    const expectedAmount = Math.round(skill.price * 10 ** USDC_DECIMALS);

    // Fetch transaction receipt
    const txRes = await fetch(BASE_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getTransactionReceipt',
        params: [txHash],
      }),
    });

    const txData = await txRes.json();
    const receipt = txData.result;

    if (!receipt) {
      return res.status(400).json({
        error: 'Transaction not found',
        detail: 'TX hash not found on Base network. Ensure you sent the tx on Base (chainId 8453).',
        txHash,
        network: 'Base',
        expectedAmount: `${skill.price} USDC (${expectedAmount} smallest units)`,
        paymentAddress: PAYMENT_WALLET,
      });
    }

    // Check tx status (1 = success)
    if (receipt.status !== '0x1') {
      return res.status(400).json({
        error: 'Transaction failed on-chain',
        txHash,
        status: receipt.status,
      });
    }

    // Verify it's a USDC transfer to our wallet
    let validPayment = false;
    let actualAmount = 0;
    let actualFrom = '';

    // Check logs for Transfer event
    if (receipt.logs && Array.isArray(receipt.logs)) {
      for (const log of receipt.logs) {
        // Check if it's a USDC transfer
        if (log.address?.toLowerCase() === USDC_CONTRACT.toLowerCase()) {
          // Parse Transfer event: from, to, value
          if (log.topics && log.topics[0] === TRANSFER_TOPIC) {
            const from = '0x' + log.topics[1].slice(26); // last 40 chars
            const to = '0x' + log.topics[2].slice(26);
            const value = BigInt(log.data);

            // Check if payment was sent TO our wallet
            if (to.toLowerCase() === PAYMENT_WALLET.toLowerCase()) {
              validPayment = true;
              actualAmount = Number(value);
              actualFrom = from;

              // Verify amount
              if (actualAmount < expectedAmount) {
                return res.status(400).json({
                  error: 'Insufficient payment',
                  expected: expectedAmount,
                  received: actualAmount,
                  expectedUSD: skill.price,
                  receivedUSD: actualAmount / 10 ** USDC_DECIMALS,
                  txHash,
                });
              }

              // Verify sender (optional — can be different wallet)
              if (walletAddress && from.toLowerCase() !== walletAddress.toLowerCase()) {
                // Allow third-party payments (affiliates, etc.)
                // Just log it
              }

              break;
            }
          }
        }
      }
    }

    if (!validPayment) {
      return res.status(400).json({
        error: 'No valid USDC transfer found in transaction',
        detail: `Transaction ${txHash} does not contain a USDC transfer to ${PAYMENT_WALLET}`,
        expectedToken: 'USDC',
        expectedContract: USDC_CONTRACT,
        expectedAmount: `${skill.price} USDC`,
        paymentAddress: PAYMENT_WALLET,
        network: 'Base (chainId 8453)',
      });
    }

    // Payment verified! Generate license and return skill data
    const licenseKey = `MN-${skill.id.slice(-8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

    // Calculate commission split
    const sellerEarnings = skill.price * (1 - COMMISSION_RATE);
    const marketnowRevenue = skill.price * COMMISSION_RATE;

    return res.status(200).json({
      success: true,
      verified: true,
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
        amountRaw: actualAmount,
        from: actualFrom,
        to: PAYMENT_WALLET,
        verifiedAt: new Date().toISOString(),
      },
      license: {
        key: licenseKey,
        type: 'perpetual',
        expires: null,
        sellerEarnings: sellerEarnings,
        marketnowCommission: marketnowRevenue,
      },
      system_prompt: skill.doc?.system_prompt || '',
      sentinel: skill.sentinel || {},
      capabilities: skill.capabilities || {},
      setup: skill.doc?.setup || {},
      install: skill.install || `npx -y @marketnow/install ${skill.slug}`,
      agentId: agentId || null,
      message: 'Payment verified on Base blockchain. License key generated. Install the skill using the install command.',
    });
  } catch (err) {
    console.error('Agent purchase error:', err);
    return res.status(500).json({
      error: 'Purchase verification failed',
      message: err.message,
    });
  }
}
