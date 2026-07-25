#!/usr/bin/env node
/**
 * MarketNow MCP Server v1.7.0
 * ============================
 *
 * The MarketNow marketplace as an MCP server. Lets any MCP-compatible
 * agent (Claude, Cursor, Cline, etc.) search, discover, verify, install,
 * submit, and earn from skills in the marketplace.
 *
 * Tools exposed (11):
 *  - search_skills(query, category?) → matching skills with Sentinel scores
 *  - get_skill(skill_id) → full skill detail
 *  - list_categories() → all categories
 *  - get_manifest() → marketplace metadata
 *  - get_install_command(skill_id) → npx install command
 *  - verify_trust(card_id) → verify an Agent Trust Card (ATC) — identity, validity, review evidence
 *  - verify_receipt(receipt_id) → verify a signed delivery proof (action-receipt)
 *  - submit_skill(repo_url, ...) → REAL submission — calls /api/submit-skill (L1.5+L1.7 sync, L2 queued)
 *  - mint_referral(agent_id) → mint a unique ref_code (5% commission on referred purchases)
 *  - lookup_referral(ref_code) → check referral stats (clicks, installs, purchases, total earned)
 *  - recommend_skills(task) → get AI-powered skill recommendations for a task
 *
 * v1.7.0 (July 2026):
 *  - submit_skill now does a REAL submission (was just returning a URL)
 *    Calls /api/submit-skill which runs L1.5 + L1.7 checks synchronously,
 *    persists to _data/pending_submissions/ on GitHub, queues L2 audit
 *  - New tool: mint_referral — agents can mint unique ref codes
 *  - New tool: lookup_referral — agents can check their referral stats
 *  - /api/agent-purchase now credits referrer 5% commission when ref_code is present
 *  - Closes the "agent magnet" gap — viral loop is now technically real
 *
 * v1.6.0 (July 2026):
 *  - Added verify_receipt tool for action-receipt verification
 *  - Receipts are signed delivery proofs emitted on every paid purchase
 *  - Closes the gap identified with @doteyeso-ops (Vibe) on Pipedream #94
 *  - ATC schema is now v1.1.0 (sentinel_review_score + decision_authority)
 *
 * VIRAL MECHANISM (now real, was theoretical before v1.7.0):
 *  1. Agent A calls mint_referral → gets ref_xxxxxxxx
 *  2. Agent A shares ref_xxxxxxxx with Agent B
 *  3. Agent B calls agent-purchase with ref_code=ref_xxxxxxxx
 *  4. /api/agent-purchase credits Agent A 5% commission
 *  5. Agent A checks stats with lookup_referral
 *  Network effect: more agents → more ref codes → more purchases → more agents
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const API_BASE = 'https://marketnow.site/api';

// ─── Fetch helpers ──────────────────────────────────────────────────────────
let skillsCache = null;
let cacheTime = 0;
const CACHE_TTL = 3600_000; // 1 hour

async function fetchSkills() {
  if (skillsCache && Date.now() - cacheTime < CACHE_TTL) {
    return skillsCache;
  }
  const res = await fetch(`${API_BASE}/skills.json`);
  if (!res.ok) throw new Error(`Failed to fetch skills: ${res.status}`);
  skillsCache = await res.json();
  cacheTime = Date.now();
  return skillsCache;
}

async function fetchManifest() {
  const res = await fetch(`${API_BASE}/manifest.json`);
  if (!res.ok) throw new Error(`Failed to fetch manifest: ${res.status}`);
  return res.json();
}

async function fetchCategories() {
  const res = await fetch(`${API_BASE}/categories.json`);
  if (!res.ok) throw new Error(`Failed to fetch categories: ${res.status}`);
  return res.json();
}

// ─── Tool implementations ───────────────────────────────────────────────────
async function searchSkills(args) {
  const { query = '', category, max_price, limit = 10 } = args;
  const skills = await fetchSkills();

  let results = skills;

  if (category) {
    results = results.filter(s => s.category?.toLowerCase() === category.toLowerCase());
  }

  if (max_price !== undefined) {
    results = results.filter(s => s.price <= max_price);
  }

  if (query) {
    const q = query.toLowerCase();
    results = results
      .map(s => {
        const nameMatch = (s.name || '').toLowerCase().includes(q) ? 10 : 0;
        const descMatch = (s.description || '').toLowerCase().includes(q) ? 5 : 0;
        const tagMatch = (s.tags || []).some(t => String(t).toLowerCase().includes(q)) ? 8 : 0;
        const score = nameMatch + descMatch + tagMatch;
        return { skill: s, score };
      })
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(x => x.skill);
  } else {
    results = results.slice(0, limit);
  }

  return {
    count: results.length,
    skills: results.map(s => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      description: s.description?.slice(0, 200),
      category: s.category,
      price: s.price,
      currency: s.currency || 'USD',
      install: s.install,
      sentinel_score: s.sentinel_score,
      url: `https://marketnow.site/skill/${s.id}`,
    })),
  };
}

async function getSkill(args) {
  const { skill_id } = args;
  if (!skill_id) throw new Error('skill_id is required');
  const skills = await fetchSkills();
  const skill = skills.find(s => s.id === skill_id || s.slug === skill_id);
  if (!skill) throw new Error(`Skill not found: ${skill_id}`);
  return {
    ...skill,
    url: `https://marketnow.site/skill/${skill.id}`,
    buy_url: `https://marketnow.site/skill/${skill.id}`,
  };
}

async function listCategories() {
  return await fetchCategories();
}

async function getInstallCommand(args) {
  const { skill_id } = args;
  if (!skill_id) throw new Error('skill_id is required');
  const skills = await fetchSkills();
  const skill = skills.find(s => s.id === skill_id || s.slug === skill_id);
  if (!skill) throw new Error(`Skill not found: ${skill_id}`);
  return {
    skill_id: skill.id,
    name: skill.name,
    install_command: skill.install || `npx -y @marketnow/install ${skill.slug}`,
    price: skill.price,
    currency: skill.currency || 'USD',
    note: `This skill is FREE. Install directly: ${skill.install || `npx -y @marketnow/install ${skill.slug}`}`,
    referral: `Found via MarketNow MCP (ref=mcpsrv). Share: https://marketnow.site/skill/${skill.id}`,
  };
}

// ─── NEW: Verify Agent Trust Card ───────────────────────────────────────────
async function verifyTrust(args) {
  const { card_id } = args;
  if (!card_id) throw new Error('card_id is required');
  const res = await fetch(`${API_BASE}/atc?action=verify&card_id=${encodeURIComponent(card_id)}`);
  if (!res.ok) throw new Error(`Verify failed: ${res.status}`);
  return await res.json();
}

// ─── NEW (v1.6.0): Verify Action Receipt ────────────────────────────────────
// Receipts are signed delivery proofs emitted on every paid purchase.
// Use this to verify that a purchase actually completed and what was delivered.
// Interop with Vibe (doteyeso-ops): receipt_id ↔ vibe_action_receipt,
// mandate_id ↔ vibe_decision_ref, settle_txhash ↔ vibe_settle_coordinate.
async function verifyReceipt(args) {
  const { receipt_id } = args;
  if (!receipt_id) throw new Error('receipt_id is required');
  if (!receipt_id.startsWith('rcpt_')) {
    throw new Error('receipt_id must start with "rcpt_" (e.g. rcpt_c8b9dc67f88e4da5bd3a)');
  }
  const res = await fetch(`${API_BASE}/atc?action=verify-receipt&receipt_id=${encodeURIComponent(receipt_id)}`);
  if (!res.ok) {
    if (res.status === 404) {
      return {
        valid: false,
        receipt_id,
        reason: 'not_found',
        message: `No receipt with id ${receipt_id} exists in the public ledger.`,
      };
    }
    throw new Error(`Verify receipt failed: ${res.status}`);
  }
  return await res.json();
}

// ─── NEW: Submit a skill to the marketplace (REAL — calls /api/submit-skill) ──
async function submitSkill(args) {
  const { repo_url, name, description, submitter_agent_id, submitter_email, ref_code } = args;
  if (!repo_url) throw new Error('repo_url is required');

  // Call the real /api/submit-skill endpoint which:
  //   1. Fetches repo metadata from GitHub
  //   2. Runs L1.5 metadata + L1.7 malware checks synchronously
  //   3. Persists submission to _data/pending_submissions/ on GitHub
  //   4. Queues L2 sandbox audit
  const res = await fetch(`${API_BASE}/submit-skill`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      repo_url,
      name,
      description,
      submitter_agent_id,
      submitter_email,
      ref_code,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    let parsed;
    try { parsed = JSON.parse(errBody); } catch { parsed = { raw: errBody }; }
    return {
      status: 'rejected',
      http_status: res.status,
      error: parsed.error || 'unknown',
      message: parsed.message || `Submit failed: ${res.status}`,
      repo_url,
      ...(parsed.findings ? { findings: parsed.findings } : {}),
    };
  }

  const result = await res.json();
  return {
    status: 'submitted',
    submission_id: result.submission_id,
    skill_id: result.skill_id,
    repo: result.repo,
    audit: result.audit,
    ledger_url: result.ledger_url,
    next_steps: result.next_steps,
    check_status_url: result.check_status_url,
    note: 'L1.5 + L1.7 checks passed. L2 sandbox audit queued (~1h). You will be discoverable via search_skills once L2 passes.',
  };
}

// ─── NEW (v1.7.0): Mint a referral code ─────────────────────────────────────
async function mintReferral(args) {
  const { agent_id } = args;
  if (!agent_id) throw new Error('agent_id is required');
  const res = await fetch(`${API_BASE}/referrals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'mint', agent_id }),
  });
  if (!res.ok) throw new Error(`Mint referral failed: ${res.status}`);
  return await res.json();
}

// ─── NEW (v1.7.0): Look up referral stats ───────────────────────────────────
async function lookupReferral(args) {
  const { ref_code } = args;
  if (!ref_code) throw new Error('ref_code is required');
  if (!ref_code.startsWith('ref_')) {
    throw new Error('ref_code must start with "ref_" (e.g. ref_a1b2c3d4)');
  }
  const res = await fetch(`${API_BASE}/referrals?action=lookup&ref_code=${encodeURIComponent(ref_code)}`);
  if (!res.ok) {
    if (res.status === 404) {
      return {
        status: 'not_found',
        ref_code,
        message: `No referral with code ${ref_code} exists. Mint one with mint_referral.`,
      };
    }
    throw new Error(`Lookup referral failed: ${res.status}`);
  }
  return await res.json();
}

// ─── NEW: Recommend skills for a task ───────────────────────────────────────
async function recommendSkills(args) {
  const { task, limit = 5 } = args;
  if (!task) throw new Error('task is required (e.g. "scrape a website", "send an email", "query a database")');
  
  const skills = await fetchSkills();
  const taskLower = task.toLowerCase();
  
  // Simple keyword matching against task description
  const scored = skills
    .map(s => {
      let score = 0;
      const name = (s.name || '').toLowerCase();
      const desc = (s.description || '').toLowerCase();
      const tags = (s.tags || []).join(' ').toLowerCase();
      
      // Match task keywords against name, description, tags
      for (const word of taskLower.split(/\s+/)) {
        if (word.length < 3) continue;
        if (name.includes(word)) score += 10;
        if (desc.includes(word)) score += 5;
        if (tags.includes(word)) score += 8;
      }
      
      // Boost high Sentinel scores
      score += (s.sentinel_score || 0) * 0.5;
      
      return { skill: s, score };
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  
  return {
    task,
    recommendations: scored.map(x => ({
      id: x.skill.id,
      name: x.skill.name,
      description: (x.skill.description || '').slice(0, 150),
      sentinel_score: x.skill.sentinel_score,
      install: x.skill.install,
      url: `https://marketnow.site/skill/${x.skill.id}`,
      match_score: Math.round(x.score),
    })),
    tip: `Found ${scored.length} skills for "${task}". Install any with: npx -y @marketnow/install <slug>`,
    referral: `Powered by MarketNow — https://marketnow.site`,
  };
}

// ─── MCP Server setup ───────────────────────────────────────────────────────
const server = new Server(
  {
    name: 'marketnow',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'search_skills',
      description: 'Search the MarketNow marketplace for MCP-compatible skills. Returns matching skills with price, category, and install command. Use this when an agent or user needs to find a tool for a specific task.',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Natural language or keyword search (e.g. "scrape website", "discord bot", "database query")',
          },
          category: {
            type: 'string',
            description: 'Filter by category (optional). One of: AI/ML, Data, Web/API, Security, DevOps, Communication, etc.',
          },
          max_price: {
            type: 'number',
            description: 'Maximum price in USD (optional, e.g. 2.99)',
          },
          limit: {
            type: 'number',
            description: 'Max results to return (default 10, max 50)',
            default: 10,
          },
        },
      },
    },
    {
      name: 'get_skill',
      description: 'Get full details of a specific skill by ID or slug.',
      inputSchema: {
        type: 'object',
        properties: {
          skill_id: {
            type: 'string',
            description: 'Skill ID (e.g. mn-ai-00001) or slug',
          },
        },
        required: ['skill_id'],
      },
    },
    {
      name: 'list_categories',
      description: 'List all skill categories with counts.',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'get_manifest',
      description: 'Get marketplace metadata: total skills, pricing tiers, API endpoints.',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'get_install_command',
      description: 'Get the install command for a skill. All skills are FREE — no purchase needed.',
      inputSchema: {
        type: 'object',
        properties: {
          skill_id: {
            type: 'string',
            description: 'Skill ID or slug',
          },
        },
        required: ['skill_id'],
      },
    },
    {
      name: 'verify_trust',
      description: 'Verify an Agent Trust Card (ATC). Checks signature, expiry, and revocation status. Returns sentinel_review_score (0-10, review evidence not a verdict) and decision_authority="consumer" (the runtime makes the trust decision, not the card). Use this before interacting with untrusted agents.',
      inputSchema: {
        type: 'object',
        properties: {
          card_id: {
            type: 'string',
            description: 'ATC card ID (e.g. ATC-2026-7777670)',
          },
        },
        required: ['card_id'],
      },
    },
    {
      name: 'verify_receipt',
      description: 'Verify a signed delivery proof (action-receipt) for a completed purchase. Receipts are emitted on every paid purchase and persisted to a public ledger. Returns what was delivered (skill_id, license_key, amount), the settle txhash, and interop fields for the Vibe action-ref system. Use this to confirm a purchase actually completed.',
      inputSchema: {
        type: 'object',
        properties: {
          receipt_id: {
            type: 'string',
            description: 'Receipt ID (starts with "rcpt_", e.g. rcpt_c8b9dc67f88e4da5bd3a)',
          },
        },
        required: ['receipt_id'],
      },
    },
    {
      name: 'submit_skill',
      description: 'Submit a GitHub repo to the MarketNow marketplace. Runs L1.5 metadata + L1.7 malware checks synchronously, queues L2 sandbox audit (~1h). If the repo passes, it becomes discoverable via search_skills and gets an ATC. FREE. Any GitHub repo with an MCP server can be submitted.',
      inputSchema: {
        type: 'object',
        properties: {
          repo_url: {
            type: 'string',
            description: 'GitHub repo URL (e.g. https://github.com/user/my-mcp-server)',
          },
          name: {
            type: 'string',
            description: 'Display name (optional, auto-detected from repo)',
          },
          description: {
            type: 'string',
            description: 'Short description (optional, auto-detected from README)',
          },
          submitter_agent_id: {
            type: 'string',
            description: 'Your agent ID (optional, for attribution + ATC pre-allocation)',
          },
          submitter_email: {
            type: 'string',
            description: 'Email for review notification (optional)',
          },
          ref_code: {
            type: 'string',
            description: 'Referral code if you were referred by another agent (optional, starts with ref_)',
          },
        },
        required: ['repo_url'],
      },
    },
    {
      name: 'mint_referral',
      description: 'Mint a unique referral code (ref_xxxxxxxx) that you can share with other agents. When they use it for purchases, you earn 5% commission. Check your stats with lookup_referral. Closes the viral loop — agents helping agents discover the marketplace.',
      inputSchema: {
        type: 'object',
        properties: {
          agent_id: {
            type: 'string',
            description: 'Your agent ID (e.g. agent_claude_001)',
          },
        },
        required: ['agent_id'],
      },
    },
    {
      name: 'lookup_referral',
      description: 'Look up referral stats: clicks, installs, purchases, total commission earned. Use this to track your viral loop performance.',
      inputSchema: {
        type: 'object',
        properties: {
          ref_code: {
            type: 'string',
            description: 'Referral code (starts with ref_, e.g. ref_a1b2c3d4)',
          },
        },
        required: ['ref_code'],
      },
    },
    {
      name: 'recommend_skills',
      description: 'Get AI-powered skill recommendations for a specific task. Describe what you want to do and get the best matching MCP servers with Sentinel security scores.',
      inputSchema: {
        type: 'object',
        properties: {
          task: {
            type: 'string',
            description: 'What you want to do (e.g. "scrape a website", "query PostgreSQL", "send a Discord message")',
          },
          limit: {
            type: 'number',
            description: 'Max results (default 5)',
            default: 5,
          },
        },
        required: ['task'],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result;
    switch (name) {
      case 'search_skills':
        result = await searchSkills(args || {});
        break;
      case 'get_skill':
        result = await getSkill(args || {});
        break;
      case 'list_categories':
        result = await listCategories();
        break;
      case 'get_manifest':
        result = await getManifest();
        break;
      case 'get_install_command':
        result = await getInstallCommand(args || {});
        break;
      case 'verify_trust':
        result = await verifyTrust(args || {});
        break;
      case 'verify_receipt':
        result = await verifyReceipt(args || {});
        break;
      case 'submit_skill':
        result = await submitSkill(args || {});
        break;
      case 'mint_referral':
        result = await mintReferral(args || {});
        break;
      case 'lookup_referral':
        result = await lookupReferral(args || {});
        break;
      case 'recommend_skills':
        result = await recommendSkills(args || {});
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (err) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${err.message}`,
        },
      ],
      isError: true,
    };
  }
});

// ─── Start server ───────────────────────────────────────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);
console.error('MarketNow MCP Server running on stdio');
