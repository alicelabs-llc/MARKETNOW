#!/usr/bin/env node
/**
 * MarketNow MCP Server
 * ====================
 *
 * El propio MarketNow como un MCP server. Permite a cualquier agente
 * compatible con MCP (Claude, Cursor, etc.) buscar y descubrir skills
 * del marketplace directamente desde su runtime.
 *
 * Herramientas expuestas:
 *  - search_skills(query, category?, max_price?) → lista de skills matching
 *  - get_skill(skill_id) → detalle de una skill específica
 *  - list_categories() → todas las categorías con count
 *  - get_manifest() → metadata del marketplace (totals, pricing, etc.)
 *  - get_install_command(skill_id) → comando npx para instalar la skill
 *
 * Uso:
 *   npx @marketnow/mcp-server
 *
 * O añadir a tu agente (ej. Claude Desktop):
 *   {
 *     "mcpServers": {
 *       "marketnow": {
 *         "command": "npx",
 *         "args": ["-y", "@marketnow/mcp-server"]
 *       }
 *     }
 *   }
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
    note: `Buy this skill at https://marketnow.site/skill/${skill.id} to get a license key, then run the install command.`,
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
      description: 'Get the install command for a skill (to run after purchasing).',
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
