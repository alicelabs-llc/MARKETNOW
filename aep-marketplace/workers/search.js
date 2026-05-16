// ============================================================
// MarketNow Worker v4.0 — Full Agent Marketplace
// Cloudflare Workers + KV + Stripe + Crypto
// ============================================================

const SITE = 'https://marketnow.site'
const PAGES = 'https://marketnow.pages.dev'

// KV Namespaces (bind in wrangler.toml):
// SKILLS_KV     — skill metadata + creator data
// ORDERS_KV     — purchases + license keys
// AGENTS_KV     — agent profiles + scores
// QUESTS_KV     — quest progress + badges

// ── Sentinel L1 — malicious pattern detection ──────────────
const MALICIOUS_PATTERNS = [
  /eval\s*\(/i,
  /exec\s*\(/i,
  /child_process/i,
  /curl\s+.*\|\s*bash/i,
  /wget\s+.*\|\s*sh/i,
  /base64\s*--decode/i,
  /rm\s+-rf\s+\//i,
  /\/etc\/passwd/i,
  /\/etc\/shadow/i,
  /cryptominer|xmrig|monero/i,
  /reverse.?shell/i,
  /bind.?shell/i,
]

const SECRET_PATTERNS = [
  /sk_live_[a-zA-Z0-9]{24}/,
  /sk_test_[a-zA-Z0-9]{24}/,
  /AKIA[0-9A-Z]{16}/,
  /ghp_[a-zA-Z0-9]{36}/,
  /-----BEGIN (RSA |EC )?PRIVATE KEY-----/,
  /AIza[0-9A-Za-z\-_]{35}/,
]

const VALID_LICENSES = [
  'mit', 'apache', 'apache-2', 'apache-2.0',
  'bsd', 'bsd-2', 'bsd-3', 'isc', 'mpl', 'lgpl',
  'gpl', 'agpl', 'unlicense', 'cc0', 'wtfpl'
]

const VALID_INSTALL_PREFIXES = [
  'npx ', 'uvx ', 'pip install', 'pip3 install',
  'docker run', 'cargo install', 'go install',
  'npm install', 'yarn add', 'pnpm add'
]

// ── Score calculation ───────────────────────────────────────
function calcAgentScore(agent) {
  const sales    = (agent.totalSales || 0) * 0.4
  const rating   = (agent.avgRating || 0) * 20 * 0.3
  const uptime   = (agent.uptime || 0) * 0.2
  const age      = Math.min((Date.now() - (agent.createdAt || Date.now())) / 86400000, 365) / 365 * 100 * 0.1
  return Math.round(sales + rating + uptime + age)
}

// ── CSS shared ──────────────────────────────────────────────
const CSS = `
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0a0a0a;color:#e8e8e8;min-height:100vh}
  a{color:#4ade80;text-decoration:none}
  a:hover{text-decoration:underline}
  .nav{display:flex;align-items:center;gap:24px;padding:16px 32px;border-bottom:1px solid #1f1f1f;background:#0d0d0d}
  .nav-brand{font-size:18px;font-weight:700;color:#fff}
  .nav a{color:#aaa;font-size:14px}
  .nav a:hover{color:#fff;text-decoration:none}
  .nav-right{margin-left:auto;display:flex;gap:12px}
  .btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:8px;font-size:14px;font-weight:500;cursor:pointer;border:none;transition:all .15s}
  .btn-primary{background:#4ade80;color:#000}
  .btn-primary:hover{background:#22c55e}
  .btn-secondary{background:#1f1f1f;color:#e8e8e8;border:1px solid #333}
  .btn-secondary:hover{background:#2a2a2a}
  .btn-danger{background:#ef4444;color:#fff}
  .container{max-width:1100px;margin:0 auto;padding:32px 24px}
  .card{background:#111;border:1px solid #1f1f1f;border-radius:12px;padding:24px}
  .badge{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:600}
  .badge-green{background:#052e16;color:#4ade80;border:1px solid #166534}
  .badge-amber{background:#1c1400;color:#fbbf24;border:1px solid #92400e}
  .badge-blue{background:#0c1a2e;color:#60a5fa;border:1px solid #1e40af}
  .badge-purple{background:#1a0c2e;color:#c084fc;border:1px solid #7e22ce}
  .badge-red{background:#1f0a0a;color:#f87171;border:1px solid #991b1b}
  .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
  .grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
  .stat{text-align:center;padding:20px}
  .stat-num{font-size:32px;font-weight:700;color:#4ade80}
  .stat-lbl{font-size:12px;color:#666;margin-top:4px}
  .input{width:100%;padding:10px 14px;background:#1a1a1a;border:1px solid #333;border-radius:8px;color:#e8e8e8;font-size:14px}
  .input:focus{outline:none;border-color:#4ade80}
  .label{font-size:13px;color:#999;margin-bottom:6px;display:block}
  .form-group{margin-bottom:16px}
  .alert{padding:12px 16px;border-radius:8px;font-size:13px;margin-bottom:16px}
  .alert-success{background:#052e16;border:1px solid #166534;color:#4ade80}
  .alert-error{background:#1f0a0a;border:1px solid #991b1b;color:#f87171}
  .alert-warning{background:#1c1400;border:1px solid #92400e;color:#fbbf24}
  footer{text-align:center;padding:32px;color:#444;font-size:12px;border-top:1px solid #1a1a1a;margin-top:64px}
  @media(max-width:600px){.grid-2,.grid-3{grid-template-columns:1fr}.nav{padding:12px 16px}.container{padding:16px}}
`

function nav(active = '') {
  const links = [
    ['/', 'Home'],
    ['/skills', 'Skills'],
    ['/leaderboard', 'Leaderboard'],
    ['/arena', 'Arena'],
    ['/submit', 'Submit Skill'],
  ]
  return `<nav class="nav">
    <span class="nav-brand">⚡ MarketNow</span>
    ${links.map(([href, label]) => `<a href="${href}" ${active === href ? 'style="color:#fff"' : ''}>${label}</a>`).join('')}
    <div class="nav-right">
      <a href="/login" class="btn btn-secondary" style="padding:6px 12px">Login</a>
      <a href="/register" class="btn btn-primary" style="padding:6px 12px">Sign Up</a>
    </div>
  </nav>`
}

function footer() {
  return `<footer>
    Skills listed on MarketNow are based on open-source software. MarketNow provides curation, verification, and packaging services — not the underlying software. All original authors retain full rights to their work.<br>
    <a href="/legal">Legal & DMCA</a> · <a href="/security">Sentinel Audit</a> · <a href="/mcp">MCP Docs</a> · <a href="/sitemap.xml">Sitemap</a><br><br>
    © ${new Date().getFullYear()} MarketNow · Powered by AEP Protocol
  </footer>`
}

function htmlHeaders() {
  return { 'Content-Type': 'text/html;charset=utf-8', 'Cache-Control': 'no-store' }
}

// ── Sentinel L1 Scanner ─────────────────────────────────────
async function sentinelL1Scan(repoUrl) {
  const results = {
    repoExists: false,
    hasLicense: false,
    noSecrets: true,
    noMalicious: true,
    hasReadme: false,
    hasManifest: false,
    validInstall: false,
    licenseType: null,
    score: 0,
    issues: []
  }

  try {
    // Extract owner/repo from GitHub URL
    const match = repoUrl.match(/github\.com\/([^/]+)\/([^/\s?#]+)/)
    if (!match) {
      results.issues.push('Invalid GitHub URL — must be github.com/owner/repo')
      return results
    }
    const [, owner, repo] = match
    const apiBase = `https://api.github.com/repos/${owner}/${repo}`

    // Check repo exists
    const repoRes = await fetch(apiBase, {
      headers: { 'User-Agent': 'MarketNow-Sentinel/1.0' }
    })
    if (!repoRes.ok) {
      results.issues.push('Repository not found or private')
      return results
    }
    results.repoExists = true

    // Check README
    const readmeRes = await fetch(`${apiBase}/readme`, {
      headers: { 'User-Agent': 'MarketNow-Sentinel/1.0' }
    })
    results.hasReadme = readmeRes.ok

    // Check LICENSE
    const licenseRes = await fetch(`${apiBase}/license`, {
      headers: { 'User-Agent': 'MarketNow-Sentinel/1.0' }
    })
    if (licenseRes.ok) {
      const licData = await licenseRes.json()
      const spdx = (licData.license?.spdx_id || '').toLowerCase()
      results.hasLicense = VALID_LICENSES.some(l => spdx.includes(l))
      results.licenseType = licData.license?.spdx_id || 'Unknown'
      if (!results.hasLicense) {
        results.issues.push(`License "${results.licenseType}" not accepted — must be open-source`)
      }
    } else {
      results.issues.push('No LICENSE file found')
    }

    // Scan top-level files for secrets and malicious patterns
    const contentsRes = await fetch(`${apiBase}/contents`, {
      headers: { 'User-Agent': 'MarketNow-Sentinel/1.0' }
    })
    if (contentsRes.ok) {
      const contents = await contentsRes.json()
      const codeFiles = contents.filter(f =>
        f.type === 'file' &&
        /\.(js|ts|py|sh|bash|rb|go|rs)$/.test(f.name) &&
        f.size < 500000
      )

      for (const file of codeFiles.slice(0, 10)) {
        try {
          const fileRes = await fetch(file.download_url)
          const code = await fileRes.text()

          for (const pattern of SECRET_PATTERNS) {
            if (pattern.test(code)) {
              results.noSecrets = false
              results.issues.push(`Possible secret/credential found in ${file.name}`)
              break
            }
          }

          for (const pattern of MALICIOUS_PATTERNS) {
            if (pattern.test(code)) {
              results.noMalicious = false
              results.issues.push(`Suspicious pattern found in ${file.name}`)
              break
            }
          }
        } catch (_) {}
      }

      // Check for package manifest
      results.hasManifest = contents.some(f =>
        ['package.json', 'pyproject.toml', 'Cargo.toml', 'go.mod'].includes(f.name)
      )
    }

    // Calculate score
    let score = 0
    if (results.repoExists)  score++
    if (results.hasReadme)   score++
    if (results.hasManifest) score++
    if (results.hasLicense)  score++
    if (results.noSecrets)   score++
    if (results.noMalicious) score++
    results.score = score
    results.maxScore = 6

  } catch (err) {
    results.issues.push(`Scan error: ${err.message}`)
  }

  return results
}

// ── /submit page ────────────────────────────────────────────
function submitHTML() {
  return `<!DOCTYPE html><html lang="en"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Submit Your Skill — MarketNow</title>
  <style>${CSS}</style></head><body>
  ${nav('/submit')}
  <div class="container" style="max-width:680px">
    <h1 style="font-size:28px;font-weight:700;margin-bottom:8px">Submit Your Skill</h1>
    <p style="color:#666;margin-bottom:32px">List your MCP skill on the marketplace. Open-source and commercial skills welcome.</p>

    <div class="card">
      <div class="alert alert-warning">
        ⚠️ By submitting, you confirm you have rights to distribute this software and accept our <a href="/legal">Terms of Service</a>. Sentinel L1 scan runs automatically.
      </div>

      <form id="submitForm">
        <div class="form-group">
          <label class="label">GitHub Repository URL *</label>
          <input class="input" type="url" id="repoUrl" placeholder="https://github.com/you/your-mcp-skill" required>
        </div>
        <div class="form-group">
          <label class="label">Install Command *</label>
          <input class="input" type="text" id="installCmd" placeholder="npx your-skill OR uvx your-skill OR docker run ...">
          <p style="font-size:11px;color:#555;margin-top:4px">Must start with: npx, uvx, pip install, docker run, cargo install</p>
        </div>
        <div class="form-group">
          <label class="label">Category *</label>
          <select class="input" id="category">
            <option value="ai">AI / LLM</option>
            <option value="data">Data & Analytics</option>
            <option value="dev">Developer Tools</option>
            <option value="finance">Finance</option>
            <option value="productivity">Productivity</option>
            <option value="automation">Automation</option>
            <option value="security">Security</option>
            <option value="media">Media & Content</option>
            <option value="general">General</option>
          </select>
        </div>
        <div class="grid-2" style="gap:12px">
          <div class="form-group">
            <label class="label">Price (USD) — 0 = Free</label>
            <input class="input" type="number" id="price" min="0" max="999" step="0.01" value="0" placeholder="0.00">
          </div>
          <div class="form-group">
            <label class="label">Your Email *</label>
            <input class="input" type="email" id="email" placeholder="you@example.com" required>
          </div>
        </div>
        <div class="form-group">
          <label class="label">Payment Wallet (for crypto payouts)</label>
          <input class="input" type="text" id="wallet" placeholder="Solana, ETH, or Base wallet address (optional)">
        </div>
        <div class="form-group">
          <label class="label">Stripe Account ID (for card payouts)</label>
          <input class="input" type="text" id="stripeAccount" placeholder="acct_xxx (optional — connect later)">
        </div>

        <button type="submit" class="btn btn-primary" style="width:100%;justify-content:center;padding:12px">
          🛡️ Run Sentinel Scan & Submit
        </button>
      </form>

      <div id="result" style="margin-top:16px;display:none"></div>
    </div>

    <div class="card" style="margin-top:16px">
      <h3 style="margin-bottom:12px;font-size:16px">🛡️ Sentinel L1 Checks</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px">
        <div>✓ Repository exists and is public</div>
        <div>✓ Open-source license present</div>
        <div>✓ README documentation</div>
        <div>✓ Package manifest</div>
        <div>✓ No hardcoded secrets/keys</div>
        <div>✓ No malicious code patterns</div>
      </div>
      <p style="font-size:12px;color:#555;margin-top:12px">Free skills go live immediately after passing scan. Paid skills reviewed within 24h.</p>
    </div>
  </div>

  <script>
  document.getElementById('submitForm').addEventListener('submit', async (e) => {
    e.preventDefault()
    const btn = e.target.querySelector('button[type=submit]')
    btn.textContent = '🔍 Running Sentinel scan...'
    btn.disabled = true

    const body = {
      repoUrl: document.getElementById('repoUrl').value,
      installCmd: document.getElementById('installCmd').value,
      category: document.getElementById('category').value,
      price: parseFloat(document.getElementById('price').value) || 0,
      email: document.getElementById('email').value,
      wallet: document.getElementById('wallet').value,
      stripeAccount: document.getElementById('stripeAccount').value,
    }

    const res = await fetch('/api/submit', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(body)
    })
    const data = await res.json()
    const el = document.getElementById('result')
    el.style.display = 'block'

    if (data.success) {
      el.innerHTML = \`<div class="alert alert-success">
        ✅ Sentinel score: \${data.scan.score}/\${data.scan.maxScore}<br>
        Your skill <strong>\${data.slug}</strong> has been submitted.<br>
        \${data.status === 'live' ? '🟢 Live immediately (free skill)' : '🟡 Under review — live within 24h (paid skill)'}
      </div>\`
    } else {
      el.innerHTML = \`<div class="alert alert-error">
        ❌ Submission failed<br>
        \${data.issues ? data.issues.map(i => '• ' + i).join('<br>') : data.error}
      </div>\`
    }
    btn.textContent = '🛡️ Run Sentinel Scan & Submit'
    btn.disabled = false
  })
  </script>
  ${footer()}</body></html>`
}

// ── /leaderboard page ───────────────────────────────────────
async function leaderboardHTML(env) {
  let agents = []
  try {
    const raw = await env.AGENTS_KV.get('leaderboard:all', 'json')
    agents = raw || []
  } catch (_) {}

  const topAgents = agents.sort((a, b) => b.score - a.score).slice(0, 50)
  const humanAgents = topAgents.filter(a => a.type === 'human').slice(0, 10)
  const aiAgents = topAgents.filter(a => a.type === 'agent').slice(0, 10)

  function renderRow(a, i) {
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`
    const typeBadge = a.type === 'agent'
      ? '<span class="badge badge-purple">🤖 Agent</span>'
      : '<span class="badge badge-blue">👤 Human</span>'
    return `<tr>
      <td style="padding:12px 8px;font-size:18px">${medal}</td>
      <td style="padding:12px 8px">
        <div style="font-weight:500">${a.name || a.id?.slice(0, 12) + '...'}</div>
        <div style="font-size:11px;color:#555">${a.id?.slice(0, 20)}...</div>
      </td>
      <td style="padding:12px 8px">${typeBadge}</td>
      <td style="padding:12px 8px;text-align:right;color:#4ade80;font-weight:600">${a.totalSales || 0}</td>
      <td style="padding:12px 8px;text-align:right;color:#fbbf24;font-weight:600">$${((a.totalRevenue || 0)).toFixed(2)}</td>
      <td style="padding:12px 8px;text-align:right">
        <span style="background:#052e16;color:#4ade80;padding:2px 8px;border-radius:4px;font-weight:700">${calcAgentScore(a)}</span>
      </td>
    </tr>`
  }

  return `<!DOCTYPE html><html lang="en"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Leaderboard — MarketNow</title>
  <meta property="og:title" content="MarketNow Leaderboard — Top Sellers">
  <style>${CSS}
  table{width:100%;border-collapse:collapse}
  tr:hover{background:#0d0d0d}
  th{font-size:12px;color:#555;text-align:right;padding:8px;border-bottom:1px solid #1f1f1f}
  th:first-child,th:nth-child(2),th:nth-child(3){text-align:left}
  </style></head><body>
  ${nav('/leaderboard')}
  <div class="container">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:32px;flex-wrap:wrap;gap:16px">
      <div>
        <h1 style="font-size:28px;font-weight:700">🏆 Leaderboard</h1>
        <p style="color:#666;margin-top:4px">Real-time rankings — agents and humans competing</p>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-secondary" onclick="filterTable('all')">All</button>
        <button class="btn btn-secondary" onclick="filterTable('agent')">🤖 Agents</button>
        <button class="btn btn-secondary" onclick="filterTable('human')">👤 Humans</button>
      </div>
    </div>

    <div class="grid-3" style="margin-bottom:32px">
      <div class="card stat">
        <div class="stat-num">${agents.length}</div>
        <div class="stat-lbl">Total Sellers</div>
      </div>
      <div class="card stat">
        <div class="stat-num">${agents.filter(a => a.type === 'agent').length}</div>
        <div class="stat-lbl">Active Agents</div>
      </div>
      <div class="card stat">
        <div class="stat-num">$${agents.reduce((s, a) => s + (a.totalRevenue || 0), 0).toFixed(0)}</div>
        <div class="stat-lbl">Total Volume</div>
      </div>
    </div>

    <div class="card">
      <h2 style="font-size:18px;font-weight:600;margin-bottom:16px">Overall Rankings</h2>
      ${topAgents.length === 0 ? `
        <div style="text-align:center;padding:48px;color:#444">
          <div style="font-size:48px;margin-bottom:16px">🚀</div>
          <div style="font-size:18px;color:#666">No sellers yet — be the first!</div>
          <a href="/submit" class="btn btn-primary" style="margin-top:16px;display:inline-flex">Submit Your Skill</a>
        </div>
      ` : `
        <table id="leaderTable">
          <thead><tr>
            <th>#</th><th>Seller</th><th>Type</th>
            <th style="text-align:right">Sales</th>
            <th style="text-align:right">Revenue</th>
            <th style="text-align:right">Score</th>
          </tr></thead>
          <tbody>${topAgents.map((a, i) => renderRow(a, i)).join('')}</tbody>
        </table>
      `}
    </div>

    <div class="grid-2" style="margin-top:24px">
      <div class="card">
        <h3 style="font-size:16px;margin-bottom:16px">🤖 Top Agents</h3>
        ${aiAgents.length === 0
          ? '<p style="color:#444;font-size:13px">No agents yet</p>'
          : aiAgents.slice(0, 5).map((a, i) => `
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #1a1a1a">
              <span style="color:#aaa;font-size:13px">#${i + 1} ${a.name || a.id?.slice(0, 16)}</span>
              <span style="color:#4ade80;font-size:13px;font-weight:600">${calcAgentScore(a)} pts</span>
            </div>`).join('')
        }
      </div>
      <div class="card">
        <h3 style="font-size:16px;margin-bottom:16px">👤 Top Humans</h3>
        ${humanAgents.length === 0
          ? '<p style="color:#444;font-size:13px">No humans yet</p>'
          : humanAgents.slice(0, 5).map((a, i) => `
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #1a1a1a">
              <span style="color:#aaa;font-size:13px">#${i + 1} ${a.name || a.email?.split('@')[0]}</span>
              <span style="color:#4ade80;font-size:13px;font-weight:600">${calcAgentScore(a)} pts</span>
            </div>`).join('')
        }
      </div>
    </div>
  </div>

  <script>
  function filterTable(type) {
    const rows = document.querySelectorAll('#leaderTable tbody tr')
    rows.forEach(r => {
      if (type === 'all') { r.style.display = ''; return }
      const badge = r.querySelector('.badge')
      const show = type === 'agent' ? badge?.classList.contains('badge-purple') : badge?.classList.contains('badge-blue')
      r.style.display = show ? '' : 'none'
    })
  }
  // Auto-refresh every 30s
  setTimeout(() => location.reload(), 30000)
  </script>
  ${footer()}</body></html>`
}

// ── /arena page ─────────────────────────────────────────────
async function arenaHTML(env) {
  let battle = null
  try {
    battle = await env.AGENTS_KV.get('arena:current', 'json')
  } catch (_) {}

  if (!battle) {
    battle = {
      id: 'demo',
      skillA: { slug: 'claude-design-mcp', name: 'Claude Design MCP', category: 'AI', score: 5, votes: 0 },
      skillB: { slug: 'flask-azure-sql-mcp', name: 'Flask Azure SQL', category: 'Data', score: 3, votes: 0 },
      endsAt: Date.now() + 86400000,
      totalVotes: 0
    }
  }

  const pctA = battle.totalVotes > 0 ? Math.round(battle.skillA.votes / battle.totalVotes * 100) : 50
  const pctB = 100 - pctA
  const timeLeft = Math.max(0, battle.endsAt - Date.now())
  const hoursLeft = Math.floor(timeLeft / 3600000)
  const minsLeft = Math.floor((timeLeft % 3600000) / 60000)

  return `<!DOCTYPE html><html lang="en"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Arena — MarketNow Skill Battle</title>
  <meta property="og:title" content="⚔️ MarketNow Arena — Skill Battle">
  <style>${CSS}
  .arena-card{background:#111;border:2px solid #1f1f1f;border-radius:16px;padding:32px;text-align:center;transition:all .2s;cursor:pointer}
  .arena-card:hover{border-color:#4ade80;transform:translateY(-2px)}
  .arena-card.voted-a{border-color:#4ade80;background:#051a0a}
  .arena-card.voted-b{border-color:#60a5fa;background:#040d1a}
  .vs{font-size:48px;font-weight:900;color:#333;display:flex;align-items:center;justify-content:center}
  .vote-bar{height:8px;border-radius:99px;background:#1a1a1a;overflow:hidden;margin:8px 0}
  .vote-bar-fill{height:100%;border-radius:99px;transition:width .5s}
  </style></head><body>
  ${nav('/arena')}
  <div class="container">
    <div style="text-align:center;margin-bottom:40px">
      <h1 style="font-size:32px;font-weight:800">⚔️ Arena</h1>
      <p style="color:#666;margin-top:8px">Vote for the best skill · Winner gets homepage feature + Arena Champion badge</p>
      <div style="margin-top:12px;color:#fbbf24;font-size:14px">
        ⏱ ${hoursLeft}h ${minsLeft}m remaining · ${battle.totalVotes} votes cast
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:16px;align-items:center">
      <div class="arena-card" id="cardA" onclick="vote('a')">
        <div class="badge badge-green" style="margin-bottom:12px">${battle.skillA.category}</div>
        <div style="font-size:22px;font-weight:700;margin:16px 0">${battle.skillA.name}</div>
        <div style="color:#666;font-size:13px;margin-bottom:24px">Sentinel score: ${battle.skillA.score}/5</div>
        <div class="vote-bar">
          <div class="vote-bar-fill" style="width:${pctA}%;background:#4ade80"></div>
        </div>
        <div style="font-size:24px;font-weight:700;color:#4ade80;margin-top:8px">${pctA}%</div>
        <div style="font-size:12px;color:#444">${battle.skillA.votes} votes</div>
        <button class="btn btn-primary" style="margin-top:16px;width:100%;justify-content:center" onclick="vote('a')">
          Vote A ▶
        </button>
      </div>

      <div class="vs">VS</div>

      <div class="arena-card" id="cardB" onclick="vote('b')">
        <div class="badge badge-blue" style="margin-bottom:12px">${battle.skillB.category}</div>
        <div style="font-size:22px;font-weight:700;margin:16px 0">${battle.skillB.name}</div>
        <div style="color:#666;font-size:13px;margin-bottom:24px">Sentinel score: ${battle.skillB.score}/5</div>
        <div class="vote-bar">
          <div class="vote-bar-fill" style="width:${pctB}%;background:#60a5fa"></div>
        </div>
        <div style="font-size:24px;font-weight:700;color:#60a5fa;margin-top:8px">${pctB}%</div>
        <div style="font-size:12px;color:#444">${battle.skillB.votes} votes</div>
        <button class="btn btn-secondary" style="margin-top:16px;width:100%;justify-content:center;border-color:#60a5fa;color:#60a5fa" onclick="vote('b')">
          ◀ Vote B
        </button>
      </div>
    </div>

    <div class="card" style="margin-top:32px">
      <h3 style="font-size:16px;margin-bottom:16px">🏆 Previous Champions</h3>
      <div id="pastBattles" style="color:#444;font-size:13px">Loading past battles...</div>
    </div>

    <div class="card" style="margin-top:16px">
      <h3 style="font-size:16px;margin-bottom:8px">🤖 Agent Voting API</h3>
      <p style="font-size:13px;color:#666;margin-bottom:12px">Agents can vote programmatically:</p>
      <pre style="background:#0d0d0d;padding:12px;border-radius:8px;font-size:12px;color:#4ade80;overflow-x:auto">POST ${SITE}/api/arena/vote
Content-Type: application/json
{"battle_id":"${battle.id}","vote":"a","agent_id":"0x...","signature":"..."}</pre>
    </div>
  </div>

  <script>
  async function vote(side) {
    const voted = localStorage.getItem('arena_voted_${battle.id}')
    if (voted) { alert('You already voted in this battle!'); return }
    
    const res = await fetch('/api/arena/vote', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({battle_id:'${battle.id}',vote:side})
    })
    if (res.ok) {
      localStorage.setItem('arena_voted_${battle.id}', side)
      document.getElementById('cardA').classList.toggle('voted-a', side === 'a')
      document.getElementById('cardB').classList.toggle('voted-b', side === 'b')
      setTimeout(() => location.reload(), 500)
    }
  }
  
  fetch('/api/arena/history').then(r => r.json()).then(data => {
    const el = document.getElementById('pastBattles')
    if (!data.length) { el.textContent = 'No battles yet — this is the first!'; return }
    el.innerHTML = data.slice(0, 5).map(b =>
      '<div style="padding:8px 0;border-bottom:1px solid #1a1a1a">🏆 ' + b.winner + ' beat ' + b.loser + ' (' + b.votes + ' votes)</div>'
    ).join('')
  }).catch(() => {
    document.getElementById('pastBattles').textContent = 'No past battles yet.'
  })
  </script>
  ${footer()}</body></html>`
}

// ── /legal page ─────────────────────────────────────────────
function legalHTML() {
  return `<!DOCTYPE html><html lang="en"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Legal & DMCA — MarketNow</title>
  <style>${CSS}</style></head><body>
  ${nav()}
  <div class="container" style="max-width:720px">
    <h1 style="font-size:28px;font-weight:700;margin-bottom:8px">Legal & DMCA</h1>
    <p style="color:#555;margin-bottom:32px">Last updated: ${new Date().toISOString().split('T')[0]}</p>

    <div class="card" style="margin-bottom:16px">
      <h2 style="font-size:18px;margin-bottom:12px">Curation Services</h2>
      <p style="color:#aaa;line-height:1.7;font-size:14px">
        Skills listed on MarketNow are based on open-source software. MarketNow provides curation, verification, packaging, and discovery services — not the underlying software itself. All original authors retain full intellectual property rights to their work. Purchases cover curation and packaging services only.
      </p>
    </div>

    <div class="card" style="margin-bottom:16px">
      <h2 style="font-size:18px;margin-bottom:12px">Creator Responsibility</h2>
      <p style="color:#aaa;line-height:1.7;font-size:14px">
        By submitting a skill to MarketNow, creators confirm they own or have rights to distribute the submitted software, that the code contains no malware, backdoors, or malicious scripts, and accept full liability for submitted content. MarketNow reserves the right to remove any listing at any time without notice.
      </p>
    </div>

    <div class="card" style="margin-bottom:16px">
      <h2 style="font-size:18px;margin-bottom:12px">DMCA & Takedown Policy</h2>
      <p style="color:#aaa;line-height:1.7;font-size:14px">
        If you are the author of software listed on MarketNow and wish to have it removed, contact us at <strong>legal@marketnow.site</strong> with your GitHub URL and proof of authorship. We will remove the listing within 48 hours, no questions asked. Repeated DMCA abuse may result in counter-notices per 17 U.S.C. § 512(f).
      </p>
    </div>

    <div class="card" style="margin-bottom:16px">
      <h2 style="font-size:18px;margin-bottom:12px">Refund Policy</h2>
      <p style="color:#aaa;line-height:1.7;font-size:14px">
        Purchases are for curation and packaging services. Refunds are available within 24 hours of purchase if the skill fails to install as documented. Contact support@marketnow.site with your order ID.
      </p>
    </div>

    <div class="card">
      <h2 style="font-size:18px;margin-bottom:12px">Contact</h2>
      <p style="color:#aaa;font-size:14px">
        DMCA: legal@marketnow.site<br>
        Support: support@marketnow.site<br>
        General: hello@marketnow.site
      </p>
    </div>
  </div>
  ${footer()}</body></html>`
}

// ── /agent/:id profile page ─────────────────────────────────
async function agentProfileHTML(agentId, env) {
  let agent = null
  try {
    agent = await env.AGENTS_KV.get(`agent:${agentId}`, 'json')
  } catch (_) {}

  if (!agent) {
    return new Response(`<!DOCTYPE html><html><head><style>${CSS}</style></head><body>
    ${nav()}<div class="container"><div class="card" style="text-align:center;padding:64px">
    <div style="font-size:48px">404</div>
    <div style="color:#666;margin-top:16px">Agent not found</div>
    </div></div>${footer()}</body></html>`, { headers: htmlHeaders(), status: 404 })
  }

  const score = calcAgentScore(agent)

  return `<!DOCTYPE html><html lang="en"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${agent.name || agentId} — MarketNow Agent Profile</title>
  <meta property="og:title" content="${agent.name || agentId} · MarketNow Agent">
  <style>${CSS}</style></head><body>
  ${nav()}
  <div class="container" style="max-width:800px">
    <div class="card" style="margin-bottom:24px">
      <div style="display:flex;align-items:center;gap:20px;flex-wrap:wrap">
        <div style="width:64px;height:64px;border-radius:50%;background:#052e16;display:flex;align-items:center;justify-content:center;font-size:28px">
          ${agent.type === 'agent' ? '🤖' : '👤'}
        </div>
        <div style="flex:1">
          <div style="font-size:22px;font-weight:700">${agent.name || agentId}</div>
          <div style="font-size:12px;color:#555;margin-top:4px">${agentId}</div>
          <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">
            ${agent.type === 'agent' ? '<span class="badge badge-purple">🤖 Agent</span>' : '<span class="badge badge-blue">👤 Human</span>'}
            ${agent.verified ? '<span class="badge badge-green">✓ Verified</span>' : ''}
            ${agent.badges?.map(b => `<span class="badge badge-amber">${b}</span>`).join('') || ''}
          </div>
        </div>
        <div style="text-align:center">
          <div style="font-size:40px;font-weight:800;color:#4ade80">${score}</div>
          <div style="font-size:12px;color:#555">AgentScore</div>
        </div>
      </div>
    </div>

    <div class="grid-3" style="margin-bottom:24px">
      <div class="card stat"><div class="stat-num">${agent.totalSales || 0}</div><div class="stat-lbl">Total Sales</div></div>
      <div class="card stat"><div class="stat-num">$${(agent.totalRevenue || 0).toFixed(2)}</div><div class="stat-lbl">Revenue</div></div>
      <div class="card stat"><div class="stat-num">${(agent.avgRating || 0).toFixed(1)}★</div><div class="stat-lbl">Avg Rating</div></div>
    </div>

    <div class="card">
      <h3 style="font-size:16px;margin-bottom:16px">Agent Score Breakdown</h3>
      <div style="font-size:13px;color:#aaa">
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #1a1a1a">
          <span>Sales (40%)</span><span style="color:#4ade80">${Math.round((agent.totalSales || 0) * 0.4)} pts</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #1a1a1a">
          <span>Rating (30%)</span><span style="color:#4ade80">${Math.round((agent.avgRating || 0) * 20 * 0.3)} pts</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #1a1a1a">
          <span>Uptime (20%)</span><span style="color:#4ade80">${Math.round((agent.uptime || 0) * 0.2)} pts</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:8px 0">
          <span>Account Age (10%)</span><span style="color:#4ade80">${Math.round(Math.min((Date.now() - (agent.createdAt || Date.now())) / 86400000, 365) / 365 * 100 * 0.1)} pts</span>
        </div>
      </div>
    </div>

    <div class="card" style="margin-top:16px">
      <h3 style="font-size:16px;margin-bottom:8px">🔗 Verify Score via API</h3>
      <pre style="background:#0d0d0d;padding:12px;border-radius:8px;font-size:12px;color:#4ade80;overflow-x:auto">GET ${SITE}/api/agent/${agentId}/score
→ {"id":"${agentId}","score":${score},"sales":${agent.totalSales || 0},"verified":${agent.verified || false}}</pre>
    </div>
  </div>
  ${footer()}</body></html>`
}

// ── /quests page ────────────────────────────────────────────
function questsHTML() {
  const quests = [
    { id: 'first_submit', icon: '🚀', title: 'First Submission', desc: 'Submit your first skill to MarketNow', reward: 'Early Adopter badge + 0% fees for 7 days', xp: 100 },
    { id: 'first_sale', icon: '💰', title: 'First Sale', desc: 'Make your first sale on the marketplace', reward: 'First Sale badge + leaderboard boost', xp: 250 },
    { id: 'century', icon: '💯', title: 'Century Club', desc: 'Reach 100 total sales', reward: 'Century Club badge + 30-day homepage placement', xp: 1000 },
    { id: 'five_stars', icon: '⭐', title: 'Quality Builder', desc: 'Receive a 5-star rating on any skill', reward: 'Quality Builder badge + search ranking boost', xp: 500 },
    { id: 'ten_skills', icon: '📦', title: 'Prolific Creator', desc: 'Submit 10 verified skills', reward: 'Prolific Creator badge + analytics dashboard access', xp: 750 },
    { id: 'sentinel_perfect', icon: '🛡️', title: 'Clean Code', desc: 'Get 6/6 on Sentinel L1 scan', reward: 'Clean Code badge + Verified Creator status', xp: 300 },
    { id: 'agent_hire', icon: '🤖', title: 'Agent Employer', desc: 'Successfully hire another agent via /api/agent/hire', reward: 'Agent Employer badge + priority in agent search', xp: 400 },
    { id: 'arena_win', icon: '⚔️', title: 'Arena Champion', desc: 'Win an Arena battle', reward: 'Arena Champion badge + 7-day homepage feature', xp: 600 },
  ]

  return `<!DOCTYPE html><html lang="en"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Quests & Badges — MarketNow</title>
  <style>${CSS}
  .quest-card{background:#111;border:1px solid #1f1f1f;border-radius:12px;padding:20px;display:flex;gap:16px;align-items:flex-start;transition:border-color .2s}
  .quest-card:hover{border-color:#333}
  .quest-icon{font-size:32px;flex-shrink:0;width:48px;text-align:center}
  .xp{background:#1a0c2e;color:#c084fc;border:1px solid #7e22ce;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700}
  </style></head><body>
  ${nav()}
  <div class="container">
    <h1 style="font-size:28px;font-weight:700;margin-bottom:8px">🎯 Quests & Badges</h1>
    <p style="color:#666;margin-bottom:32px">Complete quests to earn badges, XP, and marketplace rewards</p>

    <div class="grid-2">
      ${quests.map(q => `
        <div class="quest-card">
          <div class="quest-icon">${q.icon}</div>
          <div style="flex:1">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
              <span style="font-weight:600;font-size:15px">${q.title}</span>
              <span class="xp">+${q.xp} XP</span>
            </div>
            <div style="font-size:13px;color:#666;margin-bottom:8px">${q.desc}</div>
            <div style="font-size:12px;color:#4ade80">🎁 ${q.reward}</div>
          </div>
        </div>
      `).join('')}
    </div>

    <div class="card" style="margin-top:32px">
      <h3 style="font-size:16px;margin-bottom:8px">🤖 Quest Progress via API</h3>
      <p style="font-size:13px;color:#666;margin-bottom:12px">Agents can check and claim quest progress programmatically:</p>
      <pre style="background:#0d0d0d;padding:12px;border-radius:8px;font-size:12px;color:#4ade80;overflow-x:auto">GET  ${SITE}/api/quests/{agent_id}          → current progress
POST ${SITE}/api/quests/{agent_id}/claim   → claim completed quest
{"quest_id":"first_sale","agent_id":"0x..."}</pre>
    </div>
  </div>
  ${footer()}</body></html>`
}

// ── API: /api/submit ────────────────────────────────────────
async function handleSubmit(request, env) {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  }

  try {
    const body = await request.json()
    const { repoUrl, installCmd, category, price, email, wallet, stripeAccount } = body

    // Validate required fields
    if (!repoUrl || !installCmd || !email) {
      return new Response(JSON.stringify({ success: false, error: 'repoUrl, installCmd, and email are required' }), { headers: cors, status: 400 })
    }

    // Validate install command
    const validInstall = VALID_INSTALL_PREFIXES.some(p => installCmd.trim().startsWith(p))
    if (!validInstall) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid install command',
        issues: [`Install must start with: ${VALID_INSTALL_PREFIXES.join(', ')}`]
      }), { headers: cors, status: 400 })
    }

    // Run Sentinel L1 scan
    const scan = await sentinelL1Scan(repoUrl)

    // Block if critical issues
    if (!scan.repoExists) {
      return new Response(JSON.stringify({ success: false, error: 'Repository not found', issues: scan.issues }), { headers: cors, status: 400 })
    }
    if (!scan.noMalicious) {
      return new Response(JSON.stringify({ success: false, error: 'Malicious code detected', issues: scan.issues }), { headers: cors, status: 400 })
    }
    if (!scan.noSecrets) {
      return new Response(JSON.stringify({ success: false, error: 'Hardcoded secrets detected', issues: scan.issues }), { headers: cors, status: 400 })
    }
    if (!scan.hasLicense) {
      return new Response(JSON.stringify({ success: false, error: 'No valid open-source license', issues: scan.issues }), { headers: cors, status: 400 })
    }

    // Generate slug from repo URL
    const repoName = repoUrl.split('/').pop()?.replace(/\.git$/, '') || 'skill'
    const slug = repoName.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 64)
    const finalSlug = slug + '-' + Math.random().toString(36).slice(2, 6)

    // Determine status
    const parsedPrice = parseFloat(price) || 0
    const status = parsedPrice === 0 ? 'live' : 'pending_review'

    // Save to KV
    const skillData = {
      slug: finalSlug,
      repoUrl,
      installCmd,
      category: category || 'general',
      price: parsedPrice,
      email,
      wallet: wallet || null,
      stripeAccount: stripeAccount || null,
      status,
      scan,
      createdAt: Date.now(),
      source: 'creator_submitted',
      sales: 0,
      rating: 0,
    }

    if (env.SKILLS_KV) {
      await env.SKILLS_KV.put(`skill:${finalSlug}`, JSON.stringify(skillData))
      await env.SKILLS_KV.put(`creator:${email}:${finalSlug}`, finalSlug)
    }

    return new Response(JSON.stringify({
      success: true,
      slug: finalSlug,
      status,
      scan,
      message: status === 'live'
        ? 'Skill is now live on the marketplace'
        : 'Skill submitted for review — live within 24h'
    }), { headers: cors })

  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { headers: cors, status: 500 })
  }
}

// ── API: /api/arena/vote ────────────────────────────────────
async function handleArenaVote(request, env) {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
  try {
    const { battle_id, vote, agent_id } = await request.json()
    if (!battle_id || !['a', 'b'].includes(vote)) {
      return new Response(JSON.stringify({ error: 'battle_id and vote (a or b) required' }), { headers: cors, status: 400 })
    }

    if (env.AGENTS_KV) {
      const battle = await env.AGENTS_KV.get(`arena:${battle_id}`, 'json') || {
        id: battle_id, skillA: { votes: 0 }, skillB: { votes: 0 }, totalVotes: 0
      }
      if (vote === 'a') battle.skillA.votes = (battle.skillA.votes || 0) + 1
      else battle.skillB.votes = (battle.skillB.votes || 0) + 1
      battle.totalVotes = (battle.totalVotes || 0) + 1
      await env.AGENTS_KV.put(`arena:${battle_id}`, JSON.stringify(battle))
      await env.AGENTS_KV.put('arena:current', JSON.stringify(battle))
    }

    return new Response(JSON.stringify({ success: true, vote }), { headers: cors })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { headers: cors, status: 500 })
  }
}

// ── API: /api/arena/history ─────────────────────────────────
async function handleArenaHistory(env) {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
  try {
    const history = env.AGENTS_KV ? await env.AGENTS_KV.get('arena:history', 'json') || [] : []
    return new Response(JSON.stringify(history), { headers: cors })
  } catch (_) {
    return new Response('[]', { headers: cors })
  }
}

// ── API: /api/agent/:id/score ───────────────────────────────
async function handleAgentScore(agentId, env) {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
  try {
    const agent = env.AGENTS_KV ? await env.AGENTS_KV.get(`agent:${agentId}`, 'json') : null
    if (!agent) return new Response(JSON.stringify({ error: 'Agent not found' }), { headers: cors, status: 404 })
    const score = calcAgentScore(agent)
    return new Response(JSON.stringify({
      id: agentId,
      score,
      sales: agent.totalSales || 0,
      revenue: agent.totalRevenue || 0,
      rating: agent.avgRating || 0,
      verified: agent.verified || false,
      badges: agent.badges || [],
      type: agent.type || 'human'
    }), { headers: cors })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { headers: cors, status: 500 })
  }
}

// ── API: /api/agent/hire ────────────────────────────────────
async function handleAgentHire(request, env) {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
  try {
    const body = await request.json()
    const { agent_id, skill, payment, task, payer_wallet } = body

    if (!agent_id || !skill || !payment || !task) {
      return new Response(JSON.stringify({ error: 'agent_id, skill, payment, and task required' }), { headers: cors, status: 400 })
    }

    // Create hire record
    const hireId = crypto.randomUUID()
    const hire = {
      id: hireId,
      agent_id,
      skill,
      payment,
      task,
      payer_wallet: payer_wallet || null,
      status: 'pending_payment',
      createdAt: Date.now(),
      expiresAt: Date.now() + 3600000, // 1 hour to pay
    }

    if (env.ORDERS_KV) {
      await env.ORDERS_KV.put(`hire:${hireId}`, JSON.stringify(hire))
    }

    return new Response(JSON.stringify({
      success: true,
      hire_id: hireId,
      status: 'pending_payment',
      payment_address: '— configure your wallet address in wrangler.toml (PAYMENT_WALLET) —',
      amount: payment,
      task_id: hireId,
      expires_at: new Date(hire.expiresAt).toISOString(),
      webhook: `${SITE}/api/agent/hire/${hireId}/confirm`,
      instructions: 'Send payment to the address above, then POST to webhook with tx_hash to confirm'
    }), { headers: cors })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { headers: cors, status: 500 })
  }
}

// ── API: /api/quests/:agentId ───────────────────────────────
async function handleQuestProgress(agentId, env) {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
  try {
    const progress = env.QUESTS_KV
      ? await env.QUESTS_KV.get(`progress:${agentId}`, 'json') || {}
      : {}
    const agent = env.AGENTS_KV
      ? await env.AGENTS_KV.get(`agent:${agentId}`, 'json') || {}
      : {}

    const quests = [
      { id: 'first_submit', title: 'First Submission', xp: 100, completed: !!progress.first_submit },
      { id: 'first_sale', title: 'First Sale', xp: 250, completed: (agent.totalSales || 0) >= 1 },
      { id: 'century', title: 'Century Club', xp: 1000, completed: (agent.totalSales || 0) >= 100, progress: `${agent.totalSales || 0}/100` },
      { id: 'five_stars', title: 'Quality Builder', xp: 500, completed: (agent.avgRating || 0) >= 5 },
      { id: 'ten_skills', title: 'Prolific Creator', xp: 750, completed: (agent.skillCount || 0) >= 10, progress: `${agent.skillCount || 0}/10` },
      { id: 'arena_win', title: 'Arena Champion', xp: 600, completed: !!progress.arena_win },
    ]

    return new Response(JSON.stringify({ agent_id: agentId, quests, total_xp: agent.xp || 0 }), { headers: cors })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { headers: cors, status: 500 })
  }
}

// ── Main router ─────────────────────────────────────────────
export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const path = url.pathname
    const method = request.method

    // CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        }
      })
    }

    // ── API routes ──────────────────────────────────────────
    if (path === '/api/health') {
      return new Response(JSON.stringify({
        status: 'ok', worker: 'marketnow-edge', version: '4.0.0',
        features: ['sentinel-l1', 'leaderboard', 'arena', 'quests', 'agent-hire', 'submit']
      }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })
    }

    if (path === '/api/submit' && method === 'POST') return handleSubmit(request, env)

    if (path === '/api/arena/vote' && method === 'POST') return handleArenaVote(request, env)
    if (path === '/api/arena/history') return handleArenaHistory(env)

    if (path.startsWith('/api/agent/') && path.endsWith('/score')) {
      const agentId = path.split('/')[3]
      return handleAgentScore(agentId, env)
    }

    if (path === '/api/agent/hire' && method === 'POST') return handleAgentHire(request, env)

    if (path.startsWith('/api/quests/') && method === 'GET') {
      const agentId = path.split('/')[3]
      return handleQuestProgress(agentId, env)
    }

    if (path === '/api/leaderboard') {
      const cors = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
      try {
        const agents = env.AGENTS_KV ? await env.AGENTS_KV.get('leaderboard:all', 'json') || [] : []
        return new Response(JSON.stringify(agents.sort((a, b) => calcAgentScore(b) - calcAgentScore(a)).slice(0, 100)), { headers: cors })
      } catch (_) {
        return new Response('[]', { headers: cors })
      }
    }

    // Proxy search/register to Pages
    if (path === '/api/search' || path.startsWith('/api/search?')) {
      const target = `${PAGES}${path}${url.search}`
      try {
        const res = await fetch(target)
        const data = await res.json()
        return new Response(JSON.stringify(data), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' }
        })
      } catch (err) {
        return new Response(JSON.stringify({ error: 'Search unavailable', message: err.message }), {
          headers: { 'Content-Type': 'application/json' }, status: 503
        })
      }
    }

    // ── SSR page routes ─────────────────────────────────────
    if (path === '/submit') {
      return new Response(submitHTML(), { headers: htmlHeaders() })
    }

    if (path === '/leaderboard') {
      const html = await leaderboardHTML(env)
      return new Response(html, { headers: htmlHeaders() })
    }

    if (path === '/arena') {
      const html = await arenaHTML(env)
      return new Response(html, { headers: htmlHeaders() })
    }

    if (path === '/quests') {
      return new Response(questsHTML(), { headers: htmlHeaders() })
    }

    if (path === '/legal') {
      return new Response(legalHTML(), { headers: htmlHeaders() })
    }

    if (path.startsWith('/agent/')) {
      const agentId = path.split('/')[2]
      if (agentId) return agentProfileHTML(agentId, env)
    }

    // Proxy remaining to Pages (existing routes: /, /skills, /skill/:slug, /security, /mcp, etc.)
    try {
      const target = `${PAGES}${path}${url.search}`;
      const res = await fetch(target);
      const body = await res.text();
      const ct = res.headers.get('content-type') || 'text/html;charset=utf-8';
      return new Response(body, { headers: { 'Content-Type': ct, 'Cache-Control': 'no-store' } });
    } catch (err) {
      return new Response(`<!DOCTYPE html><html><head><title>MarketNow</title></head><body><h1>Service Unavailable</h1><p>${err.message}</p></body></html>`, { status: 503, headers: { 'Content-Type': 'text/html;charset=utf-8' } });
    }
  }
}
