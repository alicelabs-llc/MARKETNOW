/**
 * MarketNow — Sentinel L2 Trigger
 * =================================
 *
 * Triggers L2 Docker sandbox analysis via GitHub Actions
 * from the Vercel serverless function.
 *
 * Flow:
 * 1. /api/audit-skill runs L1.5 + L1.6 in real-time
 * 2. If the skill has a GitHub repo, triggers L2 via GitHub repository_dispatch
 * 3. GitHub Actions runs Docker sandbox (--network none, --read-only, --cap-drop ALL)
 * 4. Results are committed to the repo and available on next audit
 */

const GITHUB_TOKEN = process.env.MANDATES_GITHUB_TOKEN;
const REPO = process.env.MANDATES_REPO || 'edgarfloresguerra2011-a11y/marketnow';

/**
 * Trigger L2 Docker sandbox analysis via GitHub Actions.
 * @param {string} skillId - The skill ID
 * @param {string} repoUrl - GitHub repo URL of the MCP server
 * @returns {Object} { triggered, workflow_url, message }
 */
export async function triggerL2(skillId, repoUrl) {
  if (!GITHUB_TOKEN) {
    return { triggered: false, message: 'L2 trigger not configured (no GitHub token)' };
  }
  if (!repoUrl || !repoUrl.includes('github.com')) {
    return { triggered: false, message: 'L2 requires a GitHub repo URL' };
  }

  try {
    // Trigger via repository_dispatch event
    const res = await fetch(
      `https://api.github.com/repos/${REPO}/dispatches`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'User-Agent': 'marketnow-sentinel',
        },
        body: JSON.stringify({
          event_type: 'sentinel-l2-audit',
          client_payload: {
            skill_id: skillId,
            repo_url: repoUrl,
            triggered_at: new Date().toISOString(),
          },
        }),
      }
    );

    if (res.status === 204) {
      return {
        triggered: true,
        message: `L2 Docker sandbox triggered for ${skillId}. Results will be available after GitHub Actions completes.`,
        workflow_url: `https://github.com/${REPO}/actions`,
      };
    }
    return { triggered: false, message: `GitHub API returned ${res.status}` };
  } catch (e) {
    return { triggered: false, message: e.message };
  }
}

/**
 * Check if L2 results exist for a skill.
 * @param {string} skillId
 * @returns {Object|null} L2 results or null
 */
export async function getL2Results(skillId) {
  if (!GITHUB_TOKEN) return null;
  const url = `https://raw.githubusercontent.com/${REPO}/master/_data/l2_results/${skillId}.json`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'marketnow-sentinel' },
    });
    if (res.status === 200) {
      return await res.json();
    }
    return null;
  } catch {
    return null;
  }
}
