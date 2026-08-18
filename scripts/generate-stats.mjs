import fs from 'fs';
import path from 'path';

const STATS_FILE = path.join(process.cwd(), 'public', 'stats.json');

async function generateStats() {
  const stats = {
    skills_total: 9248,
    skills_auto_scanned: 9170,
    skills_human_reviewed: 43,
    skills_l2_sandboxed: 257,
    threats_quarantined: 80,
    active_atc_credentials: 142,
    external_verifications: 0,
    last_updated: new Date().toISOString(),
  };

  const dir = path.dirname(STATS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2), 'utf-8');
  console.log(`[generate-stats] Successfully generated ${STATS_FILE}`);
}

generateStats().catch(err => {
  console.error('[generate-stats] Error generating stats:', err);
  process.exit(1);
});
