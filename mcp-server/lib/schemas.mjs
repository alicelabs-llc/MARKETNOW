import { z } from 'zod';

// ─── DOMAIN SCHEMAS ─────────────────────────────────────────────────────────

export const SentinelInfoSchema = z.object({
  score: z.number().min(0).max(10).default(0),
  trust_level: z.enum(['A', 'B', 'C', 'D', 'F']).optional(),
  risk: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  scanned_at: z.string().optional(),
  checks_passed: z.array(z.string()).optional(),
  l2_observed: z.boolean().optional(),
});

export const CapabilitiesSchema = z.object({
  tools_count: z.number().int().min(0).default(0),
  resources_count: z.number().int().min(0).default(0),
  prompts_count: z.number().int().min(0).default(0),
});

export const PermissionsSchema = z.object({
  filesystem_read: z.boolean().default(false),
  filesystem_write: z.boolean().default(false),
  network_outbound: z.boolean().default(false),
  subprocess_spawn: z.boolean().default(false),
});

export const SourceSchema = z.object({
  provenance_type: z.enum(['github_crawl', 'user_submission', 'bulk_import', 'verified_publisher']).default('github_crawl'),
  repository_url: z.string().url().optional(),
  commit_sha: z.string().optional(),
  artifact_digest: z.string().optional(),
});

export const SkillSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().default(''),
  category: z.string().default('General'),
  price: z.number().min(0).default(0),
  currency: z.string().default('USD'),
  install: z.string().optional(),
  url: z.string().url().optional(),
  sentinel_score: z.number().min(0).max(10).default(0),
  sentinel_details: SentinelInfoSchema.optional(),
  capabilities: CapabilitiesSchema.optional(),
  permissions: PermissionsSchema.optional(),
  source: SourceSchema.optional(),
  tags: z.array(z.string()).default([]),
});

export const SkillsArraySchema = z.array(SkillSchema);

// ─── MCP TOOL INPUT SCHEMAS ──────────────────────────────────────────────────

export const SearchSkillsInputSchema = z.object({
  query: z.string().optional().default(''),
  category: z.string().optional(),
  max_price: z.number().min(0).optional(),
  limit: z.number().int().positive().max(50).default(10),
});

export const GetSkillInputSchema = z.object({
  skill_id: z.string().min(1, 'skill_id is required'),
});

export const GetInstallCommandInputSchema = z.object({
  skill_id: z.string().min(1, 'skill_id is required'),
});

export const VerifyTrustInputSchema = z.object({
  card_id: z.string().optional(),
  atc_credential: z.union([z.record(z.unknown()), z.string()]).optional(),
  nonce: z.string().optional(),
  signature: z.string().optional(),
}).refine(data => data.card_id || data.atc_credential, {
  message: 'Either card_id or atc_credential must be provided',
});

export const VerifyReceiptInputSchema = z.object({
  receipt_id: z.string().startsWith('rcpt_', 'receipt_id must start with "rcpt_"'),
});

export const SubmitSkillInputSchema = z.object({
  repo_url: z.string().url('repo_url must be a valid URL').refine(url => url.includes('github.com'), 'Must be a GitHub repository URL'),
  name: z.string().optional(),
  description: z.string().optional(),
  submitter_agent_id: z.string().optional(),
  submitter_email: z.string().email().optional(),
  ref_code: z.string().optional(),
});

export const MintReferralInputSchema = z.object({
  agent_id: z.string().min(1, 'agent_id is required'),
});

export const LookupReferralInputSchema = z.object({
  ref_code: z.string().startsWith('ref_', 'ref_code must start with "ref_"'),
});

export const RecommendSkillsInputSchema = z.object({
  task: z.string().min(3, 'task must be at least 3 characters long'),
  limit: z.number().int().positive().max(20).default(5),
});

export const TrustDecisionInputSchema = z.object({
  action: z.string().min(1, 'action is required'),
  tool_slug: z.string().min(1, 'tool_slug is required'),
  atc_credential: z.union([z.record(z.unknown()), z.string()]).optional(),
  policy_profile: z.enum(['strict', 'enterprise-default', 'permissive']).default('enterprise-default'),
});

// ─── VALIDATION HELPERS ─────────────────────────────────────────────────────

export function parseOrThrow(schema, data, contextName = 'Input') {
  const result = schema.safeParse(data);
  if (!result.success) {
    const formatted = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    const err = new Error(`[INVALID_ARGUMENT] ${contextName} validation failed: ${formatted}`);
    err.code = 'INVALID_ARGUMENT';
    err.details = result.error.format();
    throw err;
  }
  return result.data;
}

export function partitionSkills(rawSkills) {
  const valid = [];
  const invalid = [];
  if (!Array.isArray(rawSkills)) return { valid, invalid: [rawSkills] };

  for (const item of rawSkills) {
    const parsed = SkillSchema.safeParse(item);
    if (parsed.success) {
      valid.push(parsed.data);
    } else {
      invalid.push({ item, error: parsed.error });
    }
  }
  return { valid, invalid };
}
