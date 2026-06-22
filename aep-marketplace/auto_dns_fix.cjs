const { chromium } = require('playwright');
const fs = require('fs');

const ACCOUNT_ID = 'faf93cd2a0d373573de0859b1cc95328';
const USER_DATA_DIR = 'C:\\Users\\Usuario\\.openclaw\\browser\\openclaw\\user-data';

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log('Lanzando navegador...');
  
  const browser = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false, // Must be false to use persistent context if it's already open, or we might need to connect via CDP
    args: ['--no-sandbox'],
    viewport: { width: 1400, height: 900 }
  });

  const pages = browser.pages();
  const page = pages.length > 0 ? pages[0] : await browser.newPage();
  
  console.log('Navegando a DNS...');
  await page.goto(`https://dash.cloudflare.com/${ACCOUNT_ID}/marketnow.site/dns/records`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });
  
  await sleep(5000); // wait for React to load the table
  
  console.log('Buscando registro www...');
  // Click edit on the row containing "www"
  await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('tr, .dns-row, [data-testid="dns-table-row"]'));
    for (const row of rows) {
      if (row.textContent.includes('www') && row.textContent.includes('CNAME')) {
        const editBtn = row.querySelector('button:contains("Edit"), [data-testid*="edit"]');
        if (editBtn) editBtn.click();
      }
    }
  });

  await sleep(2000);
  
  console.log('Cambiando target...');
  await page.evaluate(() => {
    // Find input for Target/Content
    const inputs = Array.from(document.querySelectorAll('input'));
    for (const input of inputs) {
      if (input.name === 'content' || input.placeholder?.includes('Target') || input.getAttribute('aria-label')?.includes('Target')) {
        input.value = 'marketnow.site';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
    
    // Find save button
    const saveBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Save'));
    if (saveBtn) saveBtn.click();
  });
  
  await sleep(3000);
  console.log('✅ Listo. Registro actualizado.');
  await browser.close();
}

main().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
