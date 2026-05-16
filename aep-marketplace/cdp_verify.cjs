const { WebSocket } = require('ws');
const http = require('http');

async function cdpEval(wsUrl, code) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let msgId = 1;
    ws.on('open', () => {
      ws.send(JSON.stringify({id: msgId, method: 'Runtime.evaluate', params: {expression: code, returnByValue: true}}));
    });
    ws.on('message', (data) => {
      const resp = JSON.parse(data.toString());
      if (resp.id === msgId) {
        ws.close();
        resolve(resp.result && resp.result.result ? resp.result.result.value : null);
      }
    });
    ws.on('error', reject);
    setTimeout(() => reject(new Error('timeout')), 8000);
  });
}

async function check(url, label) {
  try {
    // Create tab
    const tabs = await new Promise((resolve, reject) => {
      http.get('http://127.0.0.1:18800/json/new?' + encodeURIComponent(url), (res) => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(d);
            resolve(Array.isArray(parsed) ? parsed[0] : parsed);
          } catch(e) { reject(e); }
        });
      }).on('error', reject);
    });
    
    if (!tabs || !tabs.webSocketDebuggerUrl) {
      console.log('  SKIP ' + url + ': no WS URL');
      return;
    }
    
    // Wait for page to render
    await new Promise(r => setTimeout(r, 2000));
    
    const title = await cdpEval(tabs.webSocketDebuggerUrl, 'document.title') || '';
    const rootChildren = await cdpEval(tabs.webSocketDebuggerUrl, 'document.getElementById("root") ? document.getElementById("root").children.length : -1') ?? -1;
    const h1Text = await cdpEval(tabs.webSocketDebuggerUrl, 'document.querySelector("h1") ? document.querySelector("h1").innerText.substring(0,60) : "none"') || 'none';
    const bodyLen = await cdpEval(tabs.webSocketDebuggerUrl, 'document.body ? document.body.innerText.length : 0') || 0;
    
    let hasNav = await cdpEval(tabs.webSocketDebuggerUrl, '!!document.querySelector("nav")') || false;
    
    const ok = rootChildren > 0;
    console.log(`${ok ? 'OK' : 'WARN'} ${(label || url).padEnd(28)} root=${rootChildren} h1="${h1Text.substring(0,40)}" nav=${hasNav} body=${bodyLen}b`);
    
    // Close tab
    http.get('http://127.0.0.1:18800/json/close/' + tabs.id, () => {}).on('error', () => {});
  } catch(e) {
    console.log('  FAIL ' + (label || url) + ': ' + e.message);
  }
}

async function main() {
  // First close any browser_ui tabs
  try {
    const list = await new Promise((resolve, reject) => {
      http.get('http://127.0.0.1:18800/json', (res) => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => resolve(JSON.parse(d)));
      }).on('error', reject);
    });
    for (const t of list) {
      if (t.type === 'browser_ui' || t.url.startsWith('chrome://')) {
        http.get('http://127.0.0.1:18800/json/close/' + t.id, () => {}).on('error', () => {});
      }
    }
    await new Promise(r => setTimeout(r, 500));
  } catch(e) {
    console.log('List error (non-fatal):', e.message);
  }
  
  const urls = [
    ['https://marketnow.site/', 'Home (SPA)'],
    ['https://marketnow.site/skills', 'Skills Registry (SPA)'],
    ['https://marketnow.site/security', 'Security (SSR)'],
    ['https://marketnow.site/leaderboard', 'Leaderboard (SSR)'],
    ['https://marketnow.site/arena', 'Arena (SSR)'],
    ['https://marketnow.site/vault', 'Vault (SPA)'],
    ['https://marketnow.site/governance', 'Governance (SPA)'],
    ['https://marketnow.site/mcp', 'MCP Docs (SPA)'],
    ['https://marketnow.site/login', 'Login (SPA)'],
    ['https://marketnow.site/submit', 'Submit (SSR)'],
    ['https://marketnow.site/quests', 'Quests (SSR)'],
    ['https://marketnow.site/legal', 'Legal (SSR)'],
  ];
  
  console.log('=== CDP Browser Verification ===\n');
  
  for (const [url, label] of urls) {
    await check(url, label);
    await new Promise(r => setTimeout(r, 800));
  }
  
  console.log('\n=== Done ===');
}

main().catch(console.error);
