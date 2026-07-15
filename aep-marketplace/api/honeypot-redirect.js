/**
 * MarketNow — Honeypot Redirect Handler
 * ======================================
 *
 * Catches requests to fake vulnerable paths (rewritten here from vercel.json)
 * and serves believable fake responses while logging + auto-banning the IP.
 *
 * This is the "trap" — when an attacker scans /admin, /.env, /.git/config,
 * /wp-admin, etc., they hit this handler instead of the SPA fallback.
 */

import { setCorsHeaders } from '../lib/cors.mjs';
import { applySecurityHeaders, getClientIP, banIP, _bannedIPs } from '../lib/waf.mjs';
import { getHoneypotLog } from '../lib/honeypot.mjs';

const FAKE_RESPONSES = {
  '.env': `# MarketNow Environment Configuration
DATABASE_URL=postgresql://honeypot:honeypot@localhost:5432/honeypot
STRIPE_SECRET_KEY=sk_live_FAKE_HONEYPOT_KEY_do_not_use_canary
MANDATES_GITHUB_TOKEN=ghp_FAKEHONEYPOTCANARYTOKEN2026XXXXXXXXXX
AWS_ACCESS_KEY_ID=AKIAFAKEHONEYPOT2026
AWS_SECRET_ACCESS_KEY=FAKEHONEYPOTsecretkeycanary2026XXXXXXXXXXXX
SLACK_TOKEN=xoxb-fake-honeypot-canary-2026-do-not-use
MANDATES_INTERNAL_SECRET=honeypot-fake-canary-do-not-use
SENTINEL_CERT_SECRET=honeypot-fake-canary-do-not-use
`,
  '.git/config': `[core]
	repositoryformatversion = 0
	filemode = true
	bare = false
[remote "origin"]
	url = https://github.com/edgarfloresguerra2011-a11y/marketnow.git
[branch "master"]
	remote = origin
	merge = refs/heads/master
`,
  '.aws/credentials': `[default]
aws_access_key_id = AKIAFAKEHONEYPOT2026
aws_secret_access_key = FAKEHONEYPOTcanary2026XXXXXXXXXXXXXXXXXXXX
`,
  'admin': `<!DOCTYPE html><html><head><title>Admin Panel</title></head>
<body style="font-family:sans-serif;padding:40px">
<h1>🔒 MarketNow Admin</h1>
<p>Access restricted. Authorized personnel only.</p>
<form method="post" action="/admin/login">
<input name="username" placeholder="Username" style="display:block;margin:10px 0;padding:8px">
<input name="password" type="password" placeholder="Password" style="display:block;margin:10px 0;padding:8px">
<button style="padding:8px 16px">Login</button>
</form>
</body></html>`,
  'wp-admin': `<!DOCTYPE html><html><head><title>WordPress ‹ Log In</title></head>
<body style="font-family:sans-serif;padding:40px">
<h1>WordPress Login</h1>
<form method="post" action="/wp-login.php">
<input name="log" placeholder="Username" style="display:block;margin:10px 0;padding:8px">
<input name="pwd" type="password" placeholder="Password" style="display:block;margin:10px 0;padding:8px">
<button>Log In</button>
</form>
</body></html>`,
  'phpmyadmin': `<!DOCTYPE html><html><head><title>phpMyAdmin</title></head>
<body style="font-family:sans-serif;padding:40px">
<h1>phpMyAdmin</h1>
<form method="post">
<input name="pma_username" placeholder="Username" style="display:block;margin:10px 0;padding:8px">
<input name="pma_password" type="password" placeholder="Password" style="display:block;margin:10px 0;padding:8px">
<button>Go</button>
</form>
</body></html>`,
  'default': `404 Not Found`,
};

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  applySecurityHeaders(res);
  res.setHeader('X-Honeypot', 'true');

  const ip = getClientIP(req);
  const path = req.url?.split('?')[0] || '';
  const userAgent = req.headers['user-agent'] || '';
  const now = new Date().toISOString();

  // Log the hit (push to honeypot log)
  try {
    const { _honeypotLog, HONEYPOT_LOG_MAX } = await import('../lib/honeypot.mjs');
    _honeypotLog.push({
      timestamp: now,
      path,
      ip,
      user_agent: userAgent.slice(0, 200),
      method: req.method,
      query: req.url?.split('?')[1]?.slice(0, 200) || null,
      banned: true,
    });
    if (_honeypotLog.length > HONEYPOT_LOG_MAX) _honeypotLog.shift();
  } catch {}

  // Ban the IP for 24 hours
  banIP(ip, `Honeypot hit: ${path}`);
  const ban = _bannedIPs.get(ip);
  if (ban) ban.expiresAt = Date.now() + 24 * 3600 * 1000;

  console.warn(`[HONEYPOT] HIT path=${path} ip=${ip} ua="${userAgent.slice(0, 60)}" → BANNED 24h`);

  // Determine which fake response to serve
  const pathLower = path.toLowerCase();
  let key = 'default';
  if (pathLower.includes('.env')) key = '.env';
  else if (pathLower.includes('.git')) key = '.git/config';
  else if (pathLower.includes('.aws')) key = '.aws/credentials';
  else if (pathLower.includes('wp-admin') || pathLower.includes('wp-login')) key = 'wp-admin';
  else if (pathLower.includes('phpmyadmin') || pathLower.includes('pma')) key = 'phpmyadmin';
  else if (pathLower.includes('admin')) key = 'admin';

  const body = FAKE_RESPONSES[key] || FAKE_RESPONSES.default;

  // Set content type based on response
  if (body.startsWith('<!DOCTYPE') || body.startsWith('<html')) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
  } else {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  }

  return res.status(200).send(body);
}
