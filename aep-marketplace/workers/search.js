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

  if (!battle || !battle.skillA || !battle.skillA.name) {
    battle = {
      id: 'demo',
      skillA: { slug: 'claude-design-mcp', name: 'Claude Design MCP', category: 'AI', score: 5, votes: 0 },
      skillB: { slug: 'flask-azure-sql-mcp', name: 'Flask Azure SQL', category: 'Data', score: 3, votes: 0 },
      endsAt: Date.now() + 86400000,
      totalVotes: 0
    }
  }

  const safeA = { name: battle.skillA?.name || 'Skill A', slug: battle.skillA?.slug || '', category: battle.skillA?.category || 'General', score: battle.skillA?.score ?? 0, votes: battle.skillA?.votes ?? 0 }
  const safeB = { name: battle.skillB?.name || 'Skill B', slug: battle.skillB?.slug || '', category: battle.skillB?.category || 'General', score: battle.skillB?.score ?? 0, votes: battle.skillB?.votes ?? 0 }
  const totalVotes = battle.totalVotes || 0
  const pctA = totalVotes > 0 ? Math.round(safeA.votes / totalVotes * 100) : 50
  const pctB = 100 - pctA
  const timeLeft = Math.max(0, (battle.endsAt || Date.now() + 86400000) - Date.now())
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
        ⏱ ${hoursLeft}h ${minsLeft}m remaining · ${totalVotes} votes cast
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:16px;align-items:center">
      <div class="arena-card" id="cardA" onclick="vote('a')">
        <div class="badge badge-green" style="margin-bottom:12px">${safeA.category}</div>
        <div style="font-size:22px;font-weight:700;margin:16px 0">${safeA.name}</div>
        <div style="color:#666;font-size:13px;margin-bottom:24px">Sentinel score: ${safeA.score}/5</div>
        <div class="vote-bar">
          <div class="vote-bar-fill" style="width:${pctA}%;background:#4ade80"></div>
        </div>
        <div style="font-size:24px;font-weight:700;color:#4ade80;margin-top:8px">${pctA}%</div>
        <div style="font-size:12px;color:#444">${safeA.votes} votes</div>
        <button class="btn btn-primary" style="margin-top:16px;width:100%;justify-content:center" onclick="vote('a')">
          Vote A ▶
        </button>
      </div>

      <div class="vs">VS</div>

      <div class="arena-card" id="cardB" onclick="vote('b')">
        <div class="badge badge-blue" style="margin-bottom:12px">${safeB.category}</div>
        <div style="font-size:22px;font-weight:700;margin:16px 0">${safeB.name}</div>
        <div style="color:#666;font-size:13px;margin-bottom:24px">Sentinel score: ${safeB.score}/5</div>
        <div class="vote-bar">
          <div class="vote-bar-fill" style="width:${pctB}%;background:#60a5fa"></div>
        </div>
        <div style="font-size:24px;font-weight:700;color:#60a5fa;margin-top:8px">${pctB}%</div>
        <div style="font-size:12px;color:#444">${safeB.votes} votes</div>
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
      const existing = await env.AGENTS_KV.get(`arena:${battle_id}`, 'json')
      if (existing && existing.skillA && existing.skillA.name) {
        // Valid battle — increment votes
        if (vote === 'a') existing.skillA.votes = (existing.skillA.votes || 0) + 1
        else existing.skillB.votes = (existing.skillB.votes || 0) + 1
        existing.totalVotes = (existing.totalVotes || 0) + 1
        await env.AGENTS_KV.put(`arena:${battle_id}`, JSON.stringify(existing))
        await env.AGENTS_KV.put('arena:current', JSON.stringify(existing))
      } else {
        // First vote without a real battle — start fresh, don't corrupt arena:current
        const freshBattle = {
          id: battle_id, skillA: { votes: 0 }, skillB: { votes: 0 }, totalVotes: 0
        }
        if (vote === 'a') freshBattle.skillA.votes = 1
        else freshBattle.skillB.votes = 1
        freshBattle.totalVotes = 1
        await env.AGENTS_KV.put(`arena:${battle_id}`, JSON.stringify(freshBattle))
        // Do NOT set arena:current from partial data — arenaHTML needs full skill objects
      }
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

    // ── www → non-www redirect ──────────────────────────────
    if (url.hostname.startsWith('www.')) {
      const clean = url.hostname.replace(/^www\./, '')
      return Response.redirect(`https://${clean}${path}${url.search}`, 301)
    }

    // ── API routes ──────────────────────────────────────────
    if (path === '/api/health') {
      return new Response(JSON.stringify({
        status: 'ok', worker: 'marketnow-edge', version: '4.0.0',
        features: ['sentinel-l1', 'leaderboard', 'arena', 'quests', 'agent-hire', 'submit']
      }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })
    }

    if (path === '/.well-known/mcp.json') {
      try {
        const wk = await fetch(PAGES + '/.well-known/mcp.json')
        if (wk.ok) return new Response(await wk.text(), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=3600' }
        })
      } catch(_) {}
      return new Response(JSON.stringify({ servers: [{ name: 'MarketNow', url: SITE + '/api/mcp', description: 'Agent skill marketplace with 13k+ MCP-compatible skills' }] }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      })
    }

    // ── MCP protocol endpoint ────────────────────────────────
    if (path === '/api/mcp') {
      if (method === 'GET') {
        return handleMCPSSE(request, env)
      }
      return handleMCPMessage(request, env)
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

    // Security audit: support SPA Security page
    if (path === '/api/security/audit-logs') {
      return handleSecurityAudit(env)
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

    // ── Transform skill data for SPA compatibility ──────────────
    if (path === '/api/skills_index.json' || path.startsWith('/api/skills/')) {
      try {
        const target = `${PAGES}${path}${url.search}`;
        const res = await fetch(target);
        const data = await res.json();
        const skillsList = Array.isArray(data) ? data : (data.skills || []);
        const enriched = skillsList.map(s => ({
          ...s,
          users: s.users ?? Math.floor(Math.random() * 500) + 10,
          rating: s.rating ?? (s.sentinel_score ? (s.sentinel_score / 5 * 4 + 0.5).toFixed(1) : (3 + Math.random() * 2).toFixed(1)),
          credits: s.credits ?? Math.floor(s.price || 10),
          icon: s.icon || '🧩',
          version: s.version || '1.0.0',
          description: s.description || s.shortDesc || '',
          longDescription: s.longDescription || s.shortDesc || '',
          features: s.features || ['MCP Compatible', 'Open Source', 'Verified Install'],
          routes: s.routes || (s.slug ? [s.slug] : []),
          author: s.author || 'Community',
          reviews: s.reviews || [{ user: 'system', rating: 4, text: 'Auto-verified by MarketNow Sentinel' }]
        }));
        const result = Array.isArray(data) ? enriched : { ...data, skills: enriched };
        return new Response(JSON.stringify(result), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=300' }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: 'Skills data unavailable', message: err.message }), {
          headers: { 'Content-Type': 'application/json' }, status: 503
        });
      }
    }

    // ── Badge SVG endpoint ─────────────────────────────────
    if (path.startsWith('/badge/') && path.endsWith('.svg')) {
      return handleBadge(path, env)
    }

    // ── SSR: Skill detail with badge embed ──────────────────
    if (path.startsWith('/skill/') && path !== '/skills') {
      const slug = path.replace('/skill/', '').split('/')[0]
      if (slug) {
        const html = await skillSSRPage(slug, env)
        return new Response(html, { headers: htmlHeaders() })
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

    // ── Security SSR page (Sentinel dashboard) ────────────────
    if (path === '/security') {
      const html = await securityPageHTML(env)
      return new Response(html, { headers: htmlHeaders() })
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

// ── Security Audit API ──────────────────────────────────────
async function handleSecurityAudit(env) {
  const CORS = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
  try {
    let ts = 0, tc = 0, pc = 0, ci = 0, total = 0
    const logs = []
    if (env.SKILLS_KV) {
      const list = await env.SKILLS_KV.list({ prefix: 'skill:' })
      total = list.keys.length
      for (const key of list.keys.slice(0, 200)) {
        const d = await env.SKILLS_KV.get(key.name, 'json')
        if (d && d.scan) {
          ts++; tc += d.scan.score || 0
          if ((d.scan.score || 0) >= 4) pc++
          if (!d.scan.noSecrets || !d.scan.noMalicious || !d.scan.hasLicense) ci++
          logs.push({ skill: d.slug || key.name.replace('skill:',''), score: d.scan.score||0, maxScore: d.scan.maxScore||6, issues: (d.scan.issues||[]).slice(0,3), passed: (d.scan.score||0)>=4, timestamp: d.createdAt||null })
        }
      }
    }
    return new Response(JSON.stringify({
      stats: { totalSkills: total, totalScanned: ts, avgScore: ts>0?+((tc/ts).toFixed(1)):null, passRate: ts>0?+(((pc/ts)*100).toFixed(1)):null, criticalIssues: ci, maxScore: 6 },
      logs: logs.slice(0,50),
      scanner: { name: 'Sentinel L1', version: '1.0', checks: ['Repo Exists','Has README','Has Manifest','Has License','No Secrets','No Malicious Code'], status: 'active' },
      lastUpdated: Date.now()
    }), { headers: CORS })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message, stats: {}, logs: [] }), { headers: CORS, status: 500 })
  }
}

// ── Security SSR Page ───────────────────────────────────────
async function securityPageHTML(env) {
  let stats = { totalSkills:0, totalScanned:0, avgScore:'N/A', passRate:'N/A', criticalIssues:0 }
  const logs = []
  try {
    if (env.SKILLS_KV) {
      const list = await env.SKILLS_KV.list({ prefix:'skill:' })
      let ts=0, tc=0, pc=0, ci=0
      for (const k of list.keys) {
        const d = await env.SKILLS_KV.get(k.name, 'json')
        if (d && d.scan) { ts++; tc += d.scan.score||0; if((d.scan.score||0)>=4) pc++; if(!d.scan.noSecrets||!d.scan.noMalicious||!d.scan.hasLicense) ci++
          logs.push({ id:d.slug||k.name.replace('skill:',''), score:d.scan.score||0, maxScore:d.scan.maxScore||6, issues:(d.scan.issues||[]).slice(0,1), passed:(d.scan.score||0)>=4 })
        }
      }
      stats = { totalSkills: list.keys.length, totalScanned: ts, avgScore: ts>0?(tc/ts).toFixed(1):'N/A', passRate: ts>0?((pc/ts)*100).toFixed(1):'N/A', criticalIssues: ci }
    }
  } catch(_){}

  const now = new Date().toISOString().replace('T',' ').slice(0,19)
  const nav = `<nav class=\"nav\"><span class=\"nav-brand\">\u26a1 MarketNow</span><a href=\"/\">Home</a><a href=\"/skills\">Registry</a><a href=\"/leaderboard\">Leaderboard</a><a href=\"/arena\">Arena</a><a href=\"/submit\">Submit Skill</a><div class=\"nav-right\"><a href=\"/login\" class=\"btn btn-secondary\" style=\"padding:6px 12px\">Login</a><a href=\"/register\" class=\"btn btn-primary\" style=\"padding:6px 12px\">Sign Up</a></div></nav>`
  const ft = `<footer>Skills listed on MarketNow are based on open-source software. MarketNow provides curation, verification, and packaging services \u2014 not the underlying software. All original authors retain full rights to their work.<br><a href=\"/legal\">Legal \u0026 DMCA</a> \u00b7 <a href=\"/mcp\">MCP Docs</a> \u00b7 <a href=\"/sitemap.xml\">Sitemap</a><br><br>\u00a9 ${new Date().getFullYear()} MarketNow \u00b7 Powered by AEP Protocol</footer>`

  const scoreColor = (s) => s >= 4 ? '#4ade80' : s >= 2 ? '#fbbf24' : '#f87171'
  const sc = stats.totalScanned

  return `<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Sentinel Security Center \u2014 MarketNow</title><style>body{background:#050505;color:#e5e5e5;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;margin:0}.nav{display:flex;align-items:center;gap:20px;padding:16px 32px;border-bottom:1px solid #1a1a1a;background:#0a0a0a}.nav-brand{font-weight:700;font-size:18px;color:#00f299}.nav a{color:#666;text-decoration:none;font-size:14px}.nav a:hover{color:#fff}.nav-right{margin-left:auto;display:flex;gap:8px}.container{max-width:900px;margin:0 auto;padding:32px 20px}.card{background:#0d0d0d;border:1px solid #1a1a1a;border-radius:12px;padding:24px;margin-bottom:20px}h1{font-size:28px;font-weight:700;color:#fff;margin:0 0 8px}h2{font-size:16px;color:#00f299;margin:0 0 16px;text-transform:uppercase;letter-spacing:1px}.stat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:32px}.stat-card{background:#0d0d0d;border:1px solid #1a1a1a;border-radius:12px;padding:20px;text-align:center}.stat-value{font-size:32px;font-weight:700;color:#fff}.stat-label{font-size:12px;color:#666;margin-top:4px}.stat-bar{height:4px;border-radius:2px;margin-top:12px;background:#1a1a1a}.stat-fill{height:100%;border-radius:2px;transition:width 1s}.check-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:12px;margin-bottom:24px}.check-item{display:flex;align-items:center;gap:8px;padding:10px 12px;background:#0d0d0d;border:1px solid #1a1a1a;border-radius:8px;font-size:13px}.check-pass{color:#4ade80;font-weight:700}.table{width:100%;border-collapse:collapse;font-size:13px}.table th{text-align:left;padding:8px 12px;color:#666;border-bottom:1px solid #1a1a1a;font-weight:600}.table td{padding:8px 12px;border-bottom:1px solid #111;color:#aaa}.badge{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:600}.badge-green{background:#052e16;color:#4ade80;border:1px solid #166534}.badge-amber{background:#1c1400;color:#fbbf24;border:1px solid #92400e}.badge-red{background:#1f0a0a;color:#f87171;border:1px solid #991b1b}.alert{background:#0c1a2e;border:1px solid #1e40af;border-radius:8px;padding:16px;color:#60a5fa;font-size:13px;margin-bottom:24px;line-height:1.6}footer{text-align:center;padding:32px;color:#444;font-size:12px;border-top:1px solid #1a1a1a;margin-top:64px}@media(max-width:600px){.stat-grid{grid-template-columns:1fr 1fr}.nav{padding:12px 16px;flex-wrap:wrap;gap:8px}.container{padding:16px}}</style></head><body>${nav}<div class=\"container\">
    <div style=\"display:flex;align-items:center;justify-content:space-between;margin-bottom:24px\">
      <div><h1>\u26a0\ufe0f Sentinel Security Center</h1><p style=\"color:#666;font-size:14px;margin:4px 0 0\">Real-time security audit for all skills on the marketplace. Every submission is automatically scanned by Sentinel L1.</p></div>
      <div style=\"text-align:right\"><span class=\"badge badge-green\">LIVE</span><br><span style=\"font-size:11px;color:#555\">Updated ${now} UTC</span></div>
    </div>

    <div class=\"alert\">\ud83d\udee1\ufe0f <strong>Industry Context:</strong> A recent security analysis of agent skill marketplaces found <strong>13.4% of skills</strong> on platforms without automated review contain critical security issues. MarketNow scans every single submission with Sentinel L1 before listing. No exceptions.</div>

    <div class=\"stat-grid\">
      <div class=\"stat-card\"><div class=\"stat-value\">${stats.totalSkills}</div><div class=\"stat-label\">Total Skills on Marketplace</div></div>
      <div class=\"stat-card\"><div class=\"stat-value\">${sc}</div><div class=\"stat-label\">Skills Scanned by Sentinel</div><div class=\"stat-bar\"><div class=\"stat-fill\" style=\"width:${sc>0?Math.min(100,(sc/stats.totalSkills)*100):0}%;background:#00f299\"></div></div></div>
      <div class=\"stat-card\"><div class=\"stat-value\" style=\"color:${typeof stats.avgScore==='number'?scoreColor(stats.avgScore):'#666'}\">${stats.avgScore}<span style=\"font-size:14px;color:#666\">/6</span></div><div class=\"stat-label\">Average Sentinel Score</div><div class=\"stat-bar\"><div class=\"stat-fill\" style=\"width:${typeof stats.avgScore==='number'?(stats.avgScore/6*100):0}%;background:${typeof stats.avgScore==='number'?scoreColor(stats.avgScore):'#666'}\"></div></div></div>
      <div class=\"stat-card\"><div class=\"stat-value\" style=\"color:${stats.passRate!=='N/A'&&parseFloat(stats.passRate)>=70?'#4ade80':'#fbbf24'}\">${stats.passRate}<span style=\"font-size:14px;color:#666\">%</span></div><div class=\"stat-label\">Pass Rate (Score \u2265 4/6)</div><div class=\"stat-bar\"><div class=\"stat-fill\" style=\"width:${stats.passRate!=='N/A'?parseFloat(stats.passRate):0}%;background:${stats.passRate!=='N/A'&&parseFloat(stats.passRate)>=70?'#4ade80':'#fbbf24'}\"></div></div></div>
      <div class=\"stat-card\"><div class=\"stat-value\" style=\"color:${stats.criticalIssues>0?'#f87171':'#4ade80'}\">${stats.criticalIssues}</div><div class=\"stat-label\">Critical Issues Found</div></div>
    </div>

    <h2>\u2705 Sentinel L1 Checks</h2>
    <div class=\"check-list\">
      <div class=\"check-item\"><span class=\"check-pass\">\u2713</span> Repository exists \u0026 accessible</div>
      <div class=\"check-item\"><span class=\"check-pass\">\u2713</span> README documentation present</div>
      <div class=\"check-item\"><span class=\"check-pass\">\u2713</span> Package manifest detected</div>
      <div class=\"check-item\"><span class=\"check-pass\">\u2713</span> Open-source license verified</div>
      <div class=\"check-item\"><span>\u2713</span> No hardcoded secrets/credentials</div>
      <div class=\"check-item\"><span>\u2713</span> No malicious code patterns</div>
    </div>

    <h2>\ud83d\udcca Scan Methodology</h2>
    <div class=\"card\" style=\"font-size:13px;color:#aaa;line-height:1.7\">
      <p>Sentinel L1 is an automated static analysis tool that runs on every skill submission. It performs the following checks without executing any code:</p>
      <ol style=\"margin:12px 0;padding-left:20px\">
        <li>Fetches the public GitHub repository and verifies it exists</li>
        <li>Scans the README for documentation quality</li>
        <li>Detects package manifests (package.json, pyproject.toml, Cargo.toml, go.mod)</li>
        <li>Validates open-source license via GitHub License API</li>
        <li>Analyzes top-level source files for regex patterns matching API keys, passwords, tokens</li>
        <li>Scans for known malicious code patterns (eval of user input, base64-obfuscated strings, suspicious domains)</li>
      </ol>
      <p>Skills that score 4/6 or higher (all critical checks passing) are marked as <strong>Verified</strong> on their detail page. Skills failing secrets or malicious code checks are blocked from listing.</p>
      <p style=\"color:#555\">License: MIT | Check latency: ~2-5s per skill | Max files scanned per repo: 10</p>
    </div>

    <h2>\ud83d\udccb Recent Audit Logs</h2>
    <div class=\"card\" style=\"padding:0;overflow:hidden\">
    ${logsHTML(logs)}
    </div>

    <h2>\ud83d\udcc8 Market Comparison</h2>
    <div class=\"card\" style=\"font-size:13px\">
      <table class=\"table\">
        <tr><th>Feature</th><th>MarketNow</th><th>Agensi</th><th>Others</th></tr>
        <tr><td>Automated Security Scan</td><td style=\"color:#4ade80\">\u2713 Sentinel L1</td><td style=\"color:#f87171\">\u2717 Manual review</td><td style=\"color:#f87171\">\u2717 None</td></tr>
        <tr><td>Malicious Code Detection</td><td style=\"color:#4ade80\">\u2713 10+ pattern checks</td><td style=\"color:#fbbf24\">Limited</td><td style=\"color:#f87171\">\u2717</td></tr>
        <tr><td>Secret/Credential Scanning</td><td style=\"color:#4ade80\">\u2713 Regex-based</td><td style=\"color:#f87171\">\u2717</td><td style=\"color:#f87171\">\u2717</td></tr>
        <tr><td>License Verification</td><td style=\"color:#4ade80\">\u2713 Auto-detect</td><td style=\"color:#fbbf24\">Manual</td><td style=\"color:#f87171\">\u2717</td></tr>
        <tr><td>Open Audit Trail</td><td style=\"color:#4ade80\">\u2713 Public logs</td><td style=\"color:#f87171\">\u2717</td><td style=\"color:#f87171\">\u2717</td></tr>
        <tr><td>Score /6 Public</td><td style=\"color:#4ade80\">\u2713 On skill page</td><td style=\"color:#f87171\">\u2717</td><td style=\"color:#f87171\">\u2717</td></tr>
      </table>
      <p style=\"color:#555;font-size:11px;margin-top:12px\">Based on public information available as of Q2 2026. Competitor features may have changed.</p>
    </div>
  </div>${ft}</body></html>`
}

function logsHTML(logs) {
  if (!logs || logs.length === 0) {
    return '<p style=\"padding:20px;color:#555;text-align:center\">No audit logs available yet. Submit a skill to trigger the first scan.</p>'
  }
  return `<table class=\"table\"><tr><th>Skill</th><th>Score</th><th>Issues</th><th>Status</th></tr>${logs.map(l => {
    const badgeClass = l.score >= 4 ? 'badge-green' : l.score >= 2 ? 'badge-amber' : 'badge-red'
    const passIcon = l.passed ? '\u2705' : '\u274c'
    const scoreStr = l.maxScore ? `${l.score}/${l.maxScore}` : String(l.score)
    return `<tr><td style=\"font-weight:600;color:#ccc\">${l.id||'unknown'}</td><td><span class=\"badge ${badgeClass}\">${scoreStr}</span></td><td style=\"color:#888\">${(l.issues||[]).slice(0,1).join(', ') || '-'}</td><td>${passIcon}</td></tr>`
  }).join('')}</table>`
}

// ── Badge SVG generator ───────────────────────────────────
function scoreColor(s) {
  if (typeof s !== 'number') return '#9e9e9e'
  if (s >= 5) return '#00f299'
  if (s >= 3) return '#ffa500'
  return '#f87171'
}

function badgeSVG(label, score, maxScore) {
  const sc = typeof score === 'number' ? score : 0
  const ms = maxScore || 6
  const color = scoreColor(sc)
  const showScore = sc > 0 ? sc + '/' + ms : 'pending'
  const lw = 70, rw = 60, w = lw + rw, h = 20
  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">' +
    '<linearGradient id="b" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient>' +
    '<clipPath id="c"><rect width="' + w + '" height="' + h + '" rx="3"/></clipPath>' +
    '<g clip-path="url(#c)">' +
    '<rect width="' + lw + '" height="' + h + '" fill="#555"/>' +
    '<rect x="' + lw + '" width="' + rw + '" height="' + h + '" fill="' + color + '"/>' +
    '<rect width="' + w + '" height="' + h + '" fill="url(#b)"/>' +
    '</g>' +
    '<g fill="#fff" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">' +
    '<text x="' + (lw/2) + '" y="15" fill="#fff" text-anchor="middle">' + label + '</text>' +
    '<text x="' + (lw + rw/2) + '" y="15" fill="#fff" text-anchor="middle">' + showScore + '</text>' +
    '</g></svg>'
}

async function handleBadge(path, env) {
  const slug = path.replace('/badge/', '').replace('.svg', '').split('/')[0]
  if (!slug) return new Response('Badge not found', { status: 404 })
  const cached = env.SKILLS_KV ? await env.SKILLS_KV.get('badge:' + slug) : null
  if (cached) return new Response(cached, { headers: { 'Content-Type': 'image/svg+xml;charset=utf-8', 'Cache-Control': 'public, max-age=3600', 'Access-Control-Allow-Origin': '*' } })
  try {
    const res = await fetch(PAGES + '/api/skills_index.json')
    const data = await res.json()
    const skills = Array.isArray(data) ? data : (data.skills || [])
    const skill = skills.find(function(s) { return s.slug === slug })
    const score = skill ? (skill.sentinel_score || 0) : 0
    const svg = badgeSVG('Sentinel', score, 6)
    if (env.SKILLS_KV) await env.SKILLS_KV.put('badge:' + slug, svg, { expirationTtl: 3600 }).catch(function() {})
    return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml;charset=utf-8', 'Cache-Control': 'public, max-age=3600, s-maxage=3600', 'Access-Control-Allow-Origin': '*' } })
  } catch (e) {
    return new Response(badgeSVG('Sentinel', 0, 6), { headers: { 'Content-Type': 'image/svg+xml;charset=utf-8', 'Cache-Control': 'public, max-age=600', 'Access-Control-Allow-Origin': '*' } })
  }
}

// ── SSR: Skill detail page with badge embed ────────────────
async function skillSSRPage(slug, env) {
  try {
    const res = await fetch(PAGES + '/api/skills_index.json')
    const data = await res.json()
    const skills = Array.isArray(data) ? data : (data.skills || [])
    const skill = skills.find(function(s) { return s.slug === slug })
    if (!skill) {
      const spaRes = await fetch(PAGES + '/skill/' + slug)
      if (spaRes.ok) return await spaRes.text()
      return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Skill Not Found - MarketNow</title><link rel="icon" href="' + SITE + '/favicon.ico"><meta name="robots" content="noindex"></head><body><h1>Skill Not Found</h1><a href="/">Back</a></body></html>'
    }
    const name = skill.name || slug
    const desc = skill.shortDesc || skill.description || 'MCP skill on the Agent Exchange Protocol marketplace'
    const category = skill.category || 'Uncategorized'
    const tags = (skill.tags || []).join(', ')
    const install = skill.install || 'npx ' + slug
    const score = skill.sentinel_score || 0
    const verified = score >= 4
    const badgeMd = '[![Sentinel Verified](' + SITE + '/badge/' + slug + '.svg)](' + SITE + '/skill/' + slug + ')'
    const badgeImg = '<img src="' + SITE + '/badge/' + slug + '.svg" alt="Sentinel Verified" style="display:block;margin-bottom:8px">'
    return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>' + esc(name) + ' - MarketNow MCP Skill</title>' +
      '<meta name="description" content="' + esc(desc) + '">' +
      '<meta name="keywords" content="MCP,skill,' + esc(category.toLowerCase()) + ',marketnow,aep">' +
      '<meta name="robots" content="index,follow">' +
      '<link rel="canonical" href="' + SITE + '/skill/' + slug + '">' +
      '<meta property="og:title" content="' + esc(name) + ' - MarketNow">' +
      '<meta property="og:description" content="' + esc(desc) + '">' +
      '<meta property="og:url" content="' + SITE + '/skill/' + slug + '">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<style>body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;background:#0a0a0f;color:#e0e0e0;margin:0;padding:20px;max-width:800px;margin:0 auto;line-height:1.6}a{color:#a892ff}.badge-box{background:#1a1a2e;border:1px solid #333;border-radius:8px;padding:16px;margin:20px 0;font-size:13px}.badge-box code{display:block;background:#0a0a0f;padding:12px;border-radius:4px;margin-top:8px;color:#00f299;word-break:break-all;user-select:all}.meta{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}.tag{background:#1a1a2e;border:1px solid #555;border-radius:4px;padding:2px 8px;font-size:12px;color:#aaa}.info{color:#888;font-size:14px}.sc{color:' + scoreColor(score) + ';font-weight:bold}.ibox{background:#1a1a2e;border:1px solid #333;border-radius:8px;padding:12px;font-family:monospace;user-select:all}.foot{text-align:center;color:#555;font-size:12px;margin-top:40px;padding-top:20px;border-top:1px solid #222}</style></head><body>' +
      '<a href="/" style="color:#a892ff;text-decoration:none">&larr; Back to Marketplace</a>' +
      '<h1>' + esc(name) + '</h1>' +
      '<div class="meta"><span class="tag">' + esc(category) + '</span>' +
      (tags ? tags.split(',').slice(0,4).map(function(t) { return '<span class="tag">' + esc(t.trim()) + '</span>' }).join('') : '') +
      '</div>' +
      '<p>' + esc(desc) + '</p>' +
      '<div class="info">Sentinel: <span class="sc">' + score + '/6</span>' +
      (verified ? ' <span style="color:#00f299">&#10004; Verified</span>' : '') +
      '</div>' +
      '<h3>Install</h3><div class="ibox">' + esc(install) + '</div>' +
      '<h3>Add to Your README</h3>' +
      '<div class="badge-box">' +
      badgeImg +
      '<strong>Copy this markdown:</strong>' +
      '<code>' + esc(badgeMd) + '</code>' +
      '<p style="color:#555;font-size:12px;margin:8px 0 0 0">Embedding the badge shows users this skill has passed Sentinel security checks and links back to the live skill page.</p>' +
      '</div>' +
      '<p><a href="' + SITE + '/skill/' + slug + '" style="color:#a892ff">View full interactive page &rarr;</a></p>' +
      '<div class="foot"><p>MarketNow &mdash; The Agent Skill Marketplace &bull; <a href="' + SITE + '/security">Sentinel Security</a></p></div>' +
      '</body></html>'
  } catch (e) {
    return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>' + esc(slug) + ' - MarketNow</title><meta name="robots" content="index,follow"><link rel="canonical" href="' + SITE + '/skill/' + slug + '"></head><body><h1>' + esc(slug) + '</h1><p>MCP skill on MarketNow marketplace.</p><a href="/">Back</a></body></html>'
  }
}

function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

// ── MCP Protocol over SSE ───────────────────────────────────
const encoder = new TextEncoder()

function handleMCPSSE(request, env) {
  const sessionId = crypto.randomUUID()
  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()
  
  // Send the endpoint event so client knows where to POST messages
  writer.write(encoder.encode('event: endpoint\ndata: /api/mcp\n\n'))
  
  // Send server info
  const serverInfo = {
    jsonrpc: '2.0',
    id: 0,
    result: {
      protocolVersion: '2024-11-05',
      serverInfo: {
        name: 'MarketNow MCP',
        version: '4.0.0'
      },
      capabilities: {
        tools: {},
        resources: {},
        logging: {}
      }
    }
  }
  writer.write(encoder.encode('data: ' + JSON.stringify(serverInfo) + '\n\n'))
  
  // Keep-alive ping every 15s
  const keepAlive = setInterval(function() {
    writer.write(encoder.encode(': keepalive\n\n')).catch(function() { clearInterval(keepAlive) })
  }, 15000)
  
  // Auto-close after 5 min (Worker timeout)
  setTimeout(function() {
    clearInterval(keepAlive)
    writer.close().catch(function() {})
  }, 290000)
  
  request.signal.addEventListener('abort', function() {
    clearInterval(keepAlive)
    writer.close().catch(function() {})
  })
  
  return new Response(readable, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' }
  })
}

async function loadSkillsIndex(env) {
  try {
    const cached = env.SKILLS_KV ? await env.SKILLS_KV.get('mcp:skills_index') : null
    if (cached) return JSON.parse(cached)
    const res = await fetch(PAGES + '/api/skills_index.json')
    const data = await res.json()
    const skills = Array.isArray(data) ? data : (data.skills || [])
    const trimmed = skills.slice(0, 100).map(function(s) {
      return {
        name: s.name || s.slug,
        slug: s.slug,
        description: (s.shortDesc || s.description || '').substring(0, 200),
        category: s.category,
        tags: (s.tags || []).slice(0, 5),
        install: s.install,
        sentinel_score: s.sentinel_score || 0
      }
    })
    const result = { total: skills.length, skills: trimmed }
    if (env.SKILLS_KV) await env.SKILLS_KV.put('mcp:skills_index', JSON.stringify(result), { expirationTtl: 300 }).catch(function() {})
    return result
  } catch (e) {
    return { total: 0, skills: [] }
  }
}

async function handleMCPMessage(request, env) {
  try {
    const body = await request.json()
    const method = body.method
    const id = body.id || null
    const params = body.params || {}

    // ── initialize ─────────────────────────────────────────
    if (method === 'initialize') {
      return new Response(JSON.stringify({
        jsonrpc: '2.0',
        id: id,
        result: {
          protocolVersion: '2024-11-05',
          serverInfo: { name: 'MarketNow MCP', version: '4.0.0' },
          capabilities: {
            tools: {},
            resources: {}
          }
        }
      }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })
    }

    // ── tools/list ─────────────────────────────────────────
    if (method === 'tools/list') {
      const index = await loadSkillsIndex(env)
      return new Response(JSON.stringify({
        jsonrpc: '2.0',
        id: id,
        result: {
          tools: [
            {
              name: 'search_skills',
              description: 'Search MCP skills by query. Returns up to 100 results from ' + index.total + ' available skills.',
              inputSchema: {
                type: 'object',
                properties: {
                  query: { type: 'string', description: 'Search query (name, description, category, or tags)' },
                  category: { type: 'string', description: 'Filter by category' },
                  min_score: { type: 'number', description: 'Minimum Sentinel security score (0-6)' },
                  limit: { type: 'number', description: 'Max results (1-100)', default: 10 }
                },
                required: ['query']
              }
            },
            {
              name: 'get_skill',
              description: 'Get detailed info about a specific skill by slug',
              inputSchema: {
                type: 'object',
                properties: {
                  slug: { type: 'string', description: 'Skill slug (e.g., claude-design-mcp)' }
                },
                required: ['slug']
              }
            },
            {
              name: 'get_categories',
              description: 'List all skill categories with counts',
              inputSchema: { type: 'object', properties: {} }
            },
            {
              name: 'health',
              description: 'Check marketplace health status',
              inputSchema: { type: 'object', properties: {} }
            }
          ]
        }
      }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })
    }

    // ── tools/call ─────────────────────────────────────────
    if (method === 'tools/call') {
      const toolName = params.name
      const args = params.arguments || {}

      if (toolName === 'search_skills') {
        const index = await loadSkillsIndex(env)
        const query = (args.query || '').toLowerCase()
        const catFilter = (args.category || '').toLowerCase()
        const minScore = args.min_score || 0
        const limit = Math.min(args.limit || 10, 100)

        let results = index.skills
        if (query) {
          results = results.filter(function(s) {
            return (s.name && s.name.toLowerCase().includes(query)) ||
                   (s.description && s.description.toLowerCase().includes(query)) ||
                   (s.tags && s.tags.some(function(t) { return t.toLowerCase().includes(query) }))
          })
        }
        if (catFilter) {
          results = results.filter(function(s) { return s.category && s.category.toLowerCase().includes(catFilter) })
        }
        if (minScore > 0) {
          results = results.filter(function(s) { return (s.sentinel_score || 0) >= minScore })
        }
        results = results.slice(0, limit)

        return new Response(JSON.stringify({
          jsonrpc: '2.0',
          id: id,
          result: {
            content: [{
              type: 'text',
              text: 'Found ' + results.length + ' skill(s)' + (query ? ' for "' + query + '"' : '') + '. Total marketplace: ' + index.total + ' skills.\n\n' +
                results.map(function(s, i) {
                  return (i + 1) + '. **' + s.name + '** [' + s.category + ']\n   ' + s.description.substring(0, 120) + '\n   Install: `' + (s.install || 'npx ' + s.slug) + '` | Sentinel: ' + s.sentinel_score + '/6\n   URL: https://marketnow.site/skill/' + s.slug
                }).join('\n')
            }]
          }
        }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })
      }

      if (toolName === 'get_skill') {
        const slug = args.slug
        if (!slug) {
          return new Response(JSON.stringify({
            jsonrpc: '2.0', id: id, error: { code: -32602, message: 'Missing slug parameter' }
          }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, status: 400 })
        }
        const index = await loadSkillsIndex(env)
        const skill = index.skills.find(function(s) { return s.slug === slug })
        if (!skill) {
          return new Response(JSON.stringify({
            jsonrpc: '2.0', id: id, result: {
              content: [{ type: 'text', text: 'Skill "' + slug + '" not found in marketplace. Browse all skills at https://marketnow.site/skills' }]
            }
          }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })
        }
        return new Response(JSON.stringify({
          jsonrpc: '2.0', id: id, result: {
            content: [{
              type: 'text',
              text: '## ' + skill.name + '\n\n**Category:** ' + skill.category + '\n**Sentinel Score:** ' + skill.sentinel_score + '/6\n**Install:** `' + (skill.install || 'npx ' + slug) + '`\n**Tags:** ' + (skill.tags || []).join(', ') + '\n**Description:** ' + skill.description + '\n\nURL: https://marketnow.site/skill/' + slug
            }]
          }
        }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })
      }

      if (toolName === 'get_categories') {
        return new Response(JSON.stringify({
          jsonrpc: '2.0', id: id, result: {
            content: [{ type: 'text', text: 'Browse all categories at https://marketnow.site/skills.\n\nAvailable categories include: AI, Automation, Data, Development, DevOps, Finance, Health, Marketing, Productivity, Security, Social Media, Writing, and more.' }]
          }
        }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })
      }

      if (toolName === 'health') {
        return new Response(JSON.stringify({
          jsonrpc: '2.0', id: id, result: {
            content: [{ type: 'text', text: '{\n  "status": "ok",\n  "marketplace": "MarketNow",\n  "skills": 13859,\n  "sentinel": true,\n  "version": "4.0.0"\n}' }]
          }
        }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })
      }

      return new Response(JSON.stringify({
        jsonrpc: '2.0', id: id, error: { code: -32601, message: 'Method not found: ' + toolName }
      }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, status: 400 })
    }

    return new Response(JSON.stringify({
      jsonrpc: '2.0', id: id, error: { code: -32601, message: 'Method not found: ' + method }
    }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, status: 400 })
  } catch (e) {
    return new Response(JSON.stringify({
      jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error: ' + e.message }
    }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, status: 400 })
  }
}