const { chromium } = require('playwright');

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log('Intentando conectar al navegador existente via CDP (puerto 9222)...');
  let browser;
  try {
    browser = await chromium.connectOverCDP('http://localhost:9222');
    console.log('✅ Conectado al navegador activo!');
  } catch (e) {
    console.log('❌ Falló la conexión CDP:', e.message);
    process.exit(1);
  }

  const contexts = browser.contexts();
  let page;
  
  // Buscar página de Cloudflare activa
  for (const ctx of contexts) {
    for (const p of ctx.pages()) {
      const url = p.url();
      if (url.includes('cloudflare.com')) {
        page = p;
        console.log('✅ Encontrada pestaña de Cloudflare activa:', url);
        break;
      }
    }
  }

  if (!page) {
    console.log('No se encontró pestaña de Cloudflare. Abriendo una nueva en el contexto actual...');
    page = await contexts[0].newPage();
  }
  
  console.log('Navegando a DNS...');
  await page.goto(`https://dash.cloudflare.com/faf93cd2a0d373573de0859b1cc95328/marketnow.site/dns/records`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });
  
  await sleep(6000); // Wait for React/Cloudflare to render
  
  console.log('Buscando registro www...');
  await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('tr, .dns-row, [data-testid="dns-table-row"]'));
    for (const row of rows) {
      if (row.textContent.includes('www') && row.textContent.includes('CNAME')) {
        const editBtn = row.querySelector('button, [data-testid*="edit"]');
        if (editBtn && editBtn.textContent.includes('Edit')) editBtn.click();
      }
    }
  });

  await sleep(3000);
  
  console.log('Actualizando campo Target...');
  await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input, textarea'));
    for (const input of inputs) {
      if (input.name === 'content' || input.placeholder?.includes('Target') || input.getAttribute('aria-label')?.includes('Target')) {
        input.value = 'marketnow.site';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
    
    const buttons = Array.from(document.querySelectorAll('button'));
    const saveBtn = buttons.find(b => b.textContent.includes('Save') && !b.disabled);
    if (saveBtn) saveBtn.click();
  });
  
  await sleep(4000);
  console.log('✅ Listo. Acción de guardar completada.');
  process.exit(0);
}

main().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
