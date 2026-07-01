/**
 * MarketNow — Agent Wallet Info
 * GET /api/agent-wallet
 * 
 * Returns payment instructions for autonomous agents.
 * Agents read this to know WHERE to send USDC and HOW MUCH.
 */

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'OPTIONS' || req.method === 'HEAD') return res.status(200).end();

  res.status(200).json({
    payment_method: 'USDC',
    network: 'Base',
    chainId: 8453,
    rpc: 'https://mainnet.base.org',
    usdc_contract: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    usdc_decimals: 6,
    payment_wallet: '0x39Dddf5aEdb58A559CF195fB8bdF23F0604Bf5Ee',
    commission_rate: 0.20,
    
    purchase_flow: {
      step1_discover: 'GET /api/search?q=your_query',
      step2_select: 'Choose a skill from results',
      step3_pay: {
        action: 'Send USDC to payment_wallet on Base network',
        amount: 'skill.price USDC (e.g., 1.99 USDC for a $1.99 skill)',
        contract: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        to: '0x39Dddf5aEdb58A559CF195fB8bdF23F0604Bf5Ee',
        note: '1 USDC = 1 USD. Send exact amount or more.',
      },
      step4_verify: {
        action: 'POST /api/agent-purchase',
        body: {
          skillId: 'mn-gen-00015',
          walletAddress: '0xYOUR_WALLET',
          txHash: '0xTX_HASH',
          agentId: 'optional-agent-id',
        },
      },
      step5_receive: {
        license_key: 'MN-XXXXXXXX-XXXXX',
        system_prompt: 'Full system prompt for the skill',
        install: 'npx -y @marketnow/install <slug>',
        capabilities: 'Full capability object',
        setup: 'Required env vars and API keys',
      },
      step6_install: 'Run the install command',
      step7_use: 'agent.call(slug, { ... })',
    },

    free_skills: {
      endpoint: '/api/free-skills.json',
      count: 43,
      note: 'Free skills do not require payment. Use agent-purchase with any txHash and it will return the skill for free.',
    },

    code_example: {
      python: `import requests
from web3 import Web3

# 1. Search for a skill
r = requests.get('https://marketnow.site/api/search?q=scraper&max_price=3')
skills = r.json()['results']
skill = skills[0]
print(f"Found: {skill['name']} - ${skill['price']}")

# 2. Pay with USDC on Base
w3 = Web3(Web3.HTTPProvider('https://mainnet.base.org'))
USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
PAYMENT_WALLET = '0x39Dddf5aEdb58A559CF195fB8bdF23F0604Bf5Ee'

# Build USDC transfer (ERC20)
amount = int(skill['price'] * 10**6)  # USDC has 6 decimals
data = '0xa9059cbb' + PAYMENT_WALLET[2:].lower().zfill(64) + hex(amount)[2:].zfill(64)

tx = {
    'to': Web3.to_checksum_address(USDC),
    'data': data,
    'gas': 100000,
    'gasPrice': w3.eth.gas_price,
    'nonce': w3.eth.get_transaction_count(YOUR_WALLET),
    'chainId': 8453,
}

# Sign and send
signed = w3.eth.account.sign_transaction(tx, YOUR_PRIVATE_KEY)
tx_hash = w3.eth.send_raw_transaction(signed.rawTransaction)
print(f"Payment TX: {tx_hash.hex()}")

# 3. Verify purchase and get skill
r = requests.post('https://marketnow.site/api/agent-purchase', json={
    'skillId': skill['id'],
    'walletAddress': YOUR_WALLET,
    'txHash': tx_hash.hex(),
})
result = r.json()
print(f"License: {result['license']['key']}")
print(f"System prompt: {result['system_prompt'][:100]}...")
print(f"Install: {result['install']}")
`,
      javascript: `// 1. Search for a skill
const res = await fetch('https://marketnow.site/api/search?q=scraper&max_price=3');
const { results } = await res.json();
const skill = results[0];
console.log('Found:', skill.name, '$' + skill.price);

// 2. Pay with USDC on Base (using ethers.js)
const { ethers } = require('ethers');
const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
const wallet = new ethers.Wallet(YOUR_PRIVATE_KEY, provider);

const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const PAYMENT_WALLET = '0x39Dddf5aEdb58A559CF195fB8bdF23F0604Bf5Ee';
const erc20 = new ethers.Contract(USDC, ['function transfer(address,uint256) returns (bool)'], wallet);

const amount = ethers.parseUnits(skill.price.toString(), 6);
const tx = await erc20.transfer(PAYMENT_WALLET, amount);
await tx.wait();
console.log('Payment TX:', tx.hash);

// 3. Verify purchase and get skill
const purchaseRes = await fetch('https://marketnow.site/api/agent-purchase', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    skillId: skill.id,
    walletAddress: wallet.address,
    txHash: tx.hash,
  }),
});
const result = await purchaseRes.json();
console.log('License:', result.license.key);
console.log('System prompt:', result.system_prompt.slice(0, 100));
console.log('Install:', result.install);
`,
    },
  });
}
