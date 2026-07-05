/**
 * MarketNow — Sentinel Status Endpoint
 * =====================================
 *
 * Returns the latest L1.6 batch audit results + L2 sandbox coverage.
 *
 * Sources:
 *   - _data/sentinel_results.json   (committed by .github/workflows/sentinel-l16-audit.yml)
 *   - _data/l2_results/*.json       (committed by .github/workflows/sentinel-l2-sandbox.yml)
 *
 * Endpoint: GET /api/sentinel-status
 * Cache:    5 min on Vercel edge (results only change weekly + on-demand)
 */

const GITHUB_TOKEN = process.env.MANDATES_GITHUB_TOKEN;
const REPO = process.env.MANDATES_REPO || 'edgarfloresguerra2011-a11y/marketnow';
const BRANCH = 'master';

// 5-minute in-memory cache (per Vercel instance) so we don't hammer
// raw.githubusercontent.com on every request.
const CACHE_TTL_MS = 5 * 60 * 1000;
let _cache = null; // { fetchedAt, data }

async function fetchJsonFromRepo(path) {
  if (!GITHUB_TOKEN) return null;
  const url = `https://raw.githubusercontent.com/${REPO}/${BRANCH}/${path}`;
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        'User-Agent': 'marketnow-sentinel-status',
        Accept: 'application/vnd.github.raw',
      },
    });
    if (res.status === 200) return await res.json();
    return null;
  } catch {
    return null;
  }
}

async function fetchL2ResultsIndex() {
  if (!GITHUB_TOKEN) return { count: 0, skills: [] };
  // Use GitHub Contents API to list _data/l2_results/
  const url = `https://api.github.com/repos/${REPO}/contents/_data/l2_results?ref=${BRANCH}`;
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'marketnow-sentinel-status',
      },
    });
    if (res.status === 200) {
      const listing = await res.json();
      if (!Array.isArray(listing)) return { count: 0, skills: [] };
      const skills = listing
        .filter(f => f.type === 'file' && f.name.endsWith('.json'))
        .map(f => f.name.replace(/\.json$/, ''));
      return { count: skills.length, skills };
    }
    return { count: 0, skills: [] };
  } catch {
    return { count: 0, skills: [] };
  }
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS' || req.method === 'HEAD') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // Serve from cache if fresh
  if (_cache && Date.now() - _cache.fetchedAt < CACHE_TTL_MS) {
    return res.status(200).json(_cache.data);
  }

  try {
    const [batchResults, l2Index] = await Promise.all([
      fetchJsonFromRepo('_data/sentinel_results.json'),
      fetchL2ResultsIndex(),
    ]);

    const data = {
      endpoint: '/api/sentinel-status',
      generated_at: new Date().toISOString(),
      architecture: 'L1.5 (Vercel real-time) → L1.6 (Vercel real-time + weekly batch) → L2 (GitHub Actions Docker sandbox)',
      l16_batch: batchResults
        ? {
            status: 'available',
            audit_type: batchResults.audit_type,
            timestamp: batchResults.timestamp,
            tools: batchResults.tools,
            totals: batchResults.totals,
            finding_counts: {
              semgrep: (batchResults.semgrep_findings || []).length,
              secrets: (batchResults.secret_findings || []).length,
              osv: (batchResults.osv_findings || []).length,
            },
            // Truncate to first 20 findings of each type to keep response size sane.
            // Full results available in the repo at _data/sentinel_results.json
            sample_findings: {
              semgrep: (batchResults.semgrep_findings || []).slice(0, 20),
              secrets: (batchResults.secret_findings || []).slice(0, 20),
              osv: (batchResults.osv_findings || []).slice(0, 20),
            },
            repo_path: `https://github.com/${REPO}/blob/${BRANCH}/_data/sentinel_results.json`,
          }
        : {
            status: 'not_run_yet',
            message: 'No L1.6 batch audit has run yet. The cron is weekly (Sunday midnight UTC). Manual dispatch: Actions tab → Sentinel L1.6 Batch Audit → Run workflow.',
          },
      l2_sandbox: {
        status: l2Index.count > 0 ? 'available' : 'no_results_yet',
        completed_runs: l2Index.count,
        audited_skills: l2Index.skills,
        repo_path: `https://github.com/${REPO}/tree/${BRANCH}/_data/l2_results`,
      },
      l2_dedup: {
        ttl_minutes: 30,
        description: 'Vercel in-memory cache prevents re-dispatching the same skill_id within 30 min of the first trigger. After the first L2 result commits to _data/l2_results/{skillId}.json, getL2Results() short-circuits the trigger path entirely.',
      },
    };

    _cache = { fetchedAt: Date.now(), data };
    return res.status(200).json(data);
  } catch (err) {
    console.error('sentinel-status error:', err);
    return res.status(500).json({ error: 'Failed to fetch sentinel status', message: err.message });
  }
}
