const { chromium } = require('playwright');

async function main() {
  console.log('Connecting to browser...');
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const contexts = browser.contexts();
  let page = await contexts[0].newPage();
  
  console.log('Navigating to Custom Domains...');
  await page.goto('https://dash.cloudflare.com/faf93cd2a0d373573de0859b1cc95328/pages/view/aep-marketplace/custom-domains', { waitUntil: 'domcontentloaded' });
  
  // Wait for 10 seconds for the React app to fully load
  await new Promise(r => setTimeout(r, 10000));
  
  console.log('Taking screenshot...');
  await page.screenshot({ path: 'custom_domains.png', fullPage: true });
  
  console.log('Done');
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
