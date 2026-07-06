#!/usr/bin/env node
/**
 * ⚠️ SENTINEL PROPRIETARY — Copyright (c) 2026 AliceLabs LLC. All Rights Reserved.
 *
 * This file is part of the Sentinel Security Audit Engine.
 * DO NOT COPY, REDISTRIBUTE, OR BUILD COMPETING PRODUCTS.
 * See SENTINEL-LICENSE for full terms.
 *
 * "Sentinel" is a trademark of AliceLabs LLC.
 * Patent pending on the 3-layer audit pipeline (L1.5 → L1.6 → L2).
 *
 * For licensing: legal@marketnow.site
 * For verification: https://marketnow.site/verify
 */

/**
 * MarketNow — Batch Audit All Skills + Generate Sentinel Certificates
 * ====================================================================
 *
 * Iterates every skill in the catalog (8582+), runs the full L1.5 + L1.6
 * audit, fetches L2 results if available, and generates a signed Sentinel
 * certificate per skill.
 *
 * Certificates are written to _data/sentinel_certificates/{skillId}.json
 * and committed to the repo. The /api/audit-skill endpoint serves them
 * via ?certificate=1&skillId=X.
 *
 * This script is designed to run in GitHub Actions (weekly cron) but can
 * also be run locally for testing.
 *
 * Usage:
 *   node scripts/audit-all-skills.mjs                    # audit all
 *   node scripts/audit-all-skills.mjs --max 100          # audit first 100
 *   node scripts/audit-all-skills.mjs --skill mn-mcp-X   # audit one skill
 *   node scripts/audit-all-skills.mjs --dry-run          # don't write files
 *
 * Env:
 *   SENTINEL_CERT_SECRET — signing secret for certificates (required)
 *   MANDATES_GITHUB_TOKEN — for fetching L2 results (optional, falls back to no L2)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { auditSkill, generateCertificate } from '../aep-marketplace/lib/sentinel-audit.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPO_ROOT = path.join(__dirname, '..');
const SKILLS_PATH = path.join(REPO_ROOT, 'aep-marketplace', 'public', 'api', 'skills_index.json');
const CERTS_DIR = path.join(REPO_ROOT, '_data', 'sentinel_certificates');

// SECURITY: NO fallback secret. The old default 'marketnow-sentinel-default-secret-2026'
// is now public in git history and must never be used. If SENTINEL_CERT_SECRET
// is not set, we fail LOUD — no certificates are generated.
const CERT_SECRET = process.env.SENTINEL_CERT_SECRET;
if (!CERT_SECRET) {
  console.error('✗ CRITICAL: SENTINEL_CERT_SECRET env var is not set.');
  console.error('  Without this secret, certificates cannot be signed and verified.');
  console.error('  Set it in GitHub Actions secrets and Vercel env vars.');
  console.error('  The old default secret (marketnow-sentinel-default-secret-2026) is');
  console.error('  PUBLIC in git history and must NEVER be used again.');
  process.exit(1);
}

// CLI args
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const MAX_ARG = args.indexOf('--max');
const MAX_SKILLS = MAX_ARG > -1 ? parseInt(args[MAX_ARG + 1], 10) : 0;
const SKILL_ARG = args.indexOf('--skill');
const ONLY_SKILL = SKILL_ARG > -1 ? args[SKILL_ARG + 1] : null;

console.log(`\nMarketNow — Batch Audit All Skills`);
console.log(`====================================`);
console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'WRITE'}`);
console.log(`Max skills: ${MAX_SKILLS || 'ALL'}`);
console.log(`Only skill: ${ONLY_SKILL || 'none'}`);
console.log(``);

// Load catalog
const skills = JSON.parse(fs.readFileSync(SKILLS_PATH, 'utf8'));
console.log(`Loaded ${skills.length} skills from catalog.`);

// Filter
let targets = skills;
if (ONLY_SKILL) {
  targets = skills.filter(s => s.id === ONLY_SKILL || s.slug === ONLY_SKILL);
  if (targets.length === 0) {
    console.error(`✗ Skill not found: ${ONLY_SKILL}`);
    process.exit(1);
  }
}
if (MAX_SKILLS > 0 && targets.length > MAX_SKILLS) {
  targets = targets.slice(0, MAX_SKILLS);
  console.log(`Limited to first ${MAX_SKILLS} skills.`);
}

// Ensure certs directory exists
if (!DRY_RUN) {
  fs.mkdirSync(CERTS_DIR, { recursive: true });
}

// ─── Run audits ───────────────────────────────────────────────────────────
const startTime = Date.now();
const stats = {
  total: targets.length,
  audited: 0,
  certified: 0,
  failed: 0,
  by_risk: { low: 0, medium: 0, high: 0, critical: 0, unknown: 0 },
  by_score: {},
  with_l2: 0,
};

// Process in batches of 5 to avoid overwhelming the OSV API
const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 200; // delay between batches

async function processBatch(batch, batchNum) {
  const promises = batch.map(async (skill) => {
    try {
      // Run the full audit (L1.5 + L1.6, skip L2 fetch for speed —
      // L2 results are fetched from _data/l2_results/ which we already have)
      const report = await auditSkill(skill, { skipL2: false });

      // Generate certificate
      const cert = await generateCertificate(report, CERT_SECRET);

      // Update stats
      stats.audited++;
      stats.by_risk[cert.risk_level] = (stats.by_risk[cert.risk_level] || 0) + 1;
      stats.by_score[cert.overall_score] = (stats.by_score[cert.overall_score] || 0) + 1;
      if (cert.layers_run.l2) stats.with_l2++;

      // Write certificate
      if (!DRY_RUN) {
        const certPath = path.join(CERTS_DIR, `${skill.id}.json`);
        fs.writeFileSync(certPath, JSON.stringify(cert, null, 2));
      }

      return { skill_id: skill.id, score: cert.overall_score, risk: cert.risk_level, ok: true };
    } catch (e) {
      stats.failed++;
      return { skill_id: skill.id, error: e.message, ok: false };
    }
  });

  const results = await Promise.all(promises);

  // Progress log
  const ok = results.filter(r => r.ok).length;
  const fail = results.filter(r => !r.ok).length;
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const pct = ((stats.audited + stats.failed) / stats.total * 100).toFixed(1);
  console.log(`  Batch ${batchNum}: ${ok} ok, ${fail} fail | Total: ${stats.audited + stats.failed}/${stats.total} (${pct}%) | ${elapsed}s elapsed`);

  return results;
}

(async () => {
  console.log(`\nAuditing ${targets.length} skills in batches of ${BATCH_SIZE}...\n`);

  for (let i = 0; i < targets.length; i += BATCH_SIZE) {
    const batch = targets.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    await processBatch(batch, batchNum);
    // Small delay between batches to respect OSV API rate limits
    if (i + BATCH_SIZE < targets.length) {
      await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
    }
  }

  // ─── Summary ────────────────────────────────────────────────────────────
  const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n${'='.repeat(60)}`);
  console.log(`BATCH AUDIT COMPLETE`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Total skills:   ${stats.total}`);
  console.log(`Audited:        ${stats.audited}`);
  console.log(`Failed:         ${stats.failed}`);
  console.log(`With L2:        ${stats.with_l2}`);
  console.log(`Elapsed:        ${totalElapsed}s`);
  console.log(`\nBy risk level:`);
  for (const [r, c] of Object.entries(stats.by_risk)) {
    console.log(`  ${r.padEnd(10)} ${c}`);
  }
  console.log(`\nBy score:`);
  for (const s of [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0]) {
    if (stats.by_score[s]) {
      console.log(`  ${s}/10  ${stats.by_score[s]}`);
    }
  }

  if (DRY_RUN) {
    console.log(`\n[DRY RUN] No certificates written. Re-run without --dry-run to commit.`);
  } else {
    // ─── Regenerate _summary.json by scanning ALL certificate files ──────
    // Bug fix: previously the summary only counted stats from THIS run,
    // which meant certificates from previous runs (especially those with
    // L2 results) were not included. Now we scan the entire directory
    // to get accurate totals.
    console.log(`\nRegenerating _summary.json by scanning all certificate files...`);
    const allFiles = fs.readdirSync(CERTS_DIR).filter(f => f.endsWith('.json') && f !== '_summary.json');
    const summaryByRisk = { low: 0, medium: 0, high: 0, critical: 0, unknown: 0 };
    const summaryByScore = {};
    let summaryWithL2 = 0;

    for (const f of allFiles) {
      try {
        const cert = JSON.parse(fs.readFileSync(path.join(CERTS_DIR, f), 'utf8'));
        if (cert.risk_level) summaryByRisk[cert.risk_level] = (summaryByRisk[cert.risk_level] || 0) + 1;
        if (cert.overall_score !== undefined) summaryByScore[cert.overall_score] = (summaryByScore[cert.overall_score] || 0) + 1;
        if (cert.layers_run?.l2 === true) summaryWithL2++;
      } catch (e) {}
    }

    const summary = {
      generated_at: new Date().toISOString(),
      total_certified: allFiles.length,
      total_failed: stats.failed,
      by_risk: summaryByRisk,
      by_score: summaryByScore,
      with_l2: summaryWithL2,
      l2_coverage_pct: allFiles.length > 0 ? (summaryWithL2 / allFiles.length * 100).toFixed(2) + '%' : '0%',
    };
    fs.writeFileSync(
      path.join(CERTS_DIR, '_summary.json'),
      JSON.stringify(summary, null, 2)
    );
    console.log(`✅ Summary regenerated: ${allFiles.length} certified, ${summaryWithL2} with L2 (${summary.l2_coverage_pct})`);

    console.log(`\n✅ ${stats.audited} certificates written to _data/sentinel_certificates/`);
    console.log(`   Summary: _data/sentinel_certificates/_summary.json`);
    console.log(`\nNext steps:`);
    console.log(`  1. git add _data/sentinel_certificates/`);
    console.log(`  2. git commit -m "sentinel: batch audit ${stats.audited} skills — ${summaryByRisk.low} low, ${summaryByRisk.medium} medium, ${summaryByRisk.high} high, ${summaryByRisk.critical} critical"`);
    console.log(`  3. git push`);
  }
})();
