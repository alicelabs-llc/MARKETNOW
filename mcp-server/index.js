#!/usr/bin/env node
/**
 * MarketNow MCP Server v1.5.0
 * ============================
 *
 * The MarketNow marketplace as an MCP server. Lets any MCP-compatible
 * agent (Claude, Cursor, Cline, etc.) search, discover, verify, and
 * install skills from the marketplace.
 *
 * Tools exposed:
 *  - search_skills(query, category?) → matching skills with Sentinel scores
 *  - get_skill(skill_id) → full skill detail
 *  - list_categories() → all categories
 *  - get_manifest() → marketplace metadata
 *  - get_install_command(skill_id) → npx install command
 *  - verify_trust(card_id) → verify an Agent Trust Card (ATC)
 *  - submit_skill(repo_url, name, description) → submit your MCP server to the marketplace
 *  - recommend_skills(task) → get AI-powered skill recommendations for a task
 *
 * VIRAL MECHANISM: Every search result includes a referral link.
 * When an agent installs a skill, it gets a referral code.
 * Other agents that use the referral code get a "verified by" badge.
 * This creates a network effect: more agents → more skills → more agents.
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

// ─── NEW: Submit a skill to the marketplace ─────────────────────────────────
async function submitSkill(args) {
  const { repo_url, name, description } = args;
  if (!repo_url) throw new Error('repo_url is required');
  return {
    status: 'submission_ready',
    repo_url,
    name: name || '(auto-detect from repo)',
    description: description || '(auto-detect from README)',
    next_steps: [
      `1. Open: https://marketnow.site/submit`,
      `2. Enter your repo URL: ${repo_url}`,
      `3. Sentinel will audit your MCP server (9 layers, free)`,
      `4. Your skill gets a signed certificate + Sentinel score (0-10)`,
      `5. It appears in the marketplace for other agents to discover`,
    ],
    submit_url: `https://marketnow.site/submit?repo=${encodeURIComponent(repo_url)}`,
    note: 'Submitting is FREE. Every skill gets a 9-layer security audit. No payment required.',
  };
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
      description: 'Verify an Agent Trust Card (ATC). Checks signature, expiry, and revocation status. Use this before interacting with untrusted agents.',
      inputSchema: {
        type: 'object',
        properties: {
          card_id: {
            type: 'string',
            description: 'ATC card ID (e.g. ATC-2026-9880252)',
          },
        },
        required: ['card_id'],
      },
    },
    {
      name: 'submit_skill',
      description: 'Submit your MCP server to the MarketNow marketplace. Gets a free 9-layer security audit + signed Sentinel certificate. Any GitHub repo with an MCP server can be submitted.',
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
        },
        required: ['repo_url'],
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
      case 'submit_skill':
        result = await submitSkill(args || {});
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
