const { chromium } = require('playwright');
const fs = require('fs');

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log('Connecting to browser...');
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const contexts = browser.contexts();
  let page = await contexts[0].newPage();
  
  console.log('Navigating to Workers & Pages list...');
  await page.goto('https://dash.cloudflare.com/faf93cd2a0d373573de0859b1cc95328/workers-and-pages', { waitUntil: 'domcontentloaded' });
  await sleep(10000);
  
  console.log('Clicking on aep-marketplace...');
  await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a'));
    const pLink = links.find(l => l.href.includes('aep-marketplace') && !l.href.includes('settings'));
    if (pLink) pLink.click();
  });
  await sleep(8000);
  
  console.log('Clicking Custom Domains tab...');
  await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a'));
    const dLink = links.find(l => l.textContent.toLowerCase().includes('custom domain') || l.href.includes('custom-domain') || l.href.includes('domain'));
    if (dLink) dLink.click();
  });
  await sleep(8000);

  console.log('Clicking Set up a custom domain...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, a'));
    const setupBtn = btns.find(b => b.textContent.includes('Set up a custom domain') || b.textContent.includes('Add custom domain'));
    if (setupBtn) setupBtn.click();
  });
  await sleep(5000);

  console.log('Typing www.marketnow.site...');
  await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input'));
    const dInput = inputs.find(i => i.placeholder?.includes('example.com') || i.name === 'domain' || i.className.includes('Input'));
    if (dInput) {
      dInput.value = 'www.marketnow.site';
      dInput.dispatchEvent(new Event('input', { bubbles: true }));
      dInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  await sleep(3000);

  console.log('Clicking Continue...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const continueBtn = btns.find(b => b.textContent.includes('Continue'));
    if (continueBtn) continueBtn.click();
  });
  await sleep(8000);

  console.log('Clicking Activate domain...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const activateBtn = btns.find(b => b.textContent.includes('Activate domain'));
    if (activateBtn) activateBtn.click();
  });
  await sleep(8000);

  console.log('Taking screenshot...');
  await page.screenshot({ path: 'add_www_domain.png', fullPage: true });
  console.log('Done');
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
