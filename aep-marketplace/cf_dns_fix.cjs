const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ACCOUNT_ID = 'faf93cd2a0d373573de0859b1cc95328';
const USER_DATA_DIR = 'C:\\Users\\Usuario\\.openclaw\\browser\\openclaw\\user-data';

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log('Lanzando navegador con sesión guardada...');
  
  const browser = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
    args: ['--no-sandbox'],
    viewport: { width: 1400, height: 900 }
  });

  const pages = browser.pages();
  const page = pages.length > 0 ? pages[0] : await browser.newPage();
  
  // Ir al dashboard de Cloudflare
  await page.goto(`https://dash.cloudflare.com/${ACCOUNT_ID}`, {
    waitUntil: 'networkidle0',
    timeout: 30000
  });
  
  console.log('URL:', page.url());
  console.log('Title:', await page.title());
  
  // Tomar screenshot
  await page.screenshot({ path: 'D:\\cf-dash.png', fullPage: false });
  console.log('Screenshot en D:\\cf-dash.png');
  
  // Si está en login page, esperar login manual
  const url = page.url();
  if (url.includes('login')) {
    console.log('⚠️  LOGIN REQUERIDO - Por favor inicia sesión en Cloudflare en el navegador.');
    console.log('Esperando hasta 120 segundos...');
    
    try {
      await page.waitForFunction(
        () => !window.location.href.includes('login') && !window.location.href.includes('auth'),
        { timeout: 120000 }
      );
      console.log('✅ Login detectado!');
    } catch (e) {
      console.log('❌ Timeout de login');
      await browser.close();
      return;
    }
  }
  
  // Ya logueado - ir a DNS settings
  console.log('✅ Sesión activa. Navegando a DNS...');
  await page.goto(`https://dash.cloudflare.com/${ACCOUNT_ID}/marketnow.site/dns`, {
    waitUntil: 'networkidle0',
    timeout: 30000
  });
  
  console.log('DNS Page URL:', page.url());
  await sleep(2000);
  await page.screenshot({ path: 'D:\\cf-dns.png', fullPage: false });
  
  // Ver los registros DNS actuales
  const content = await page.content();
  console.log('Page contains marketnow:', content.includes('marketnow'));
  
  // Buscar registro CNAME de www
  const hasCnameWww = content.includes('www') && (content.includes('CNAME') || content.includes('cname'));
  console.log('Has www CNAME:', hasCnameWww);
  
  // Intentar extraer registros DNS
  const dnsRecords = await page.evaluate(() => {
    const records = [];
    // Buscar en tablas de registros DNS
    const rows = document.querySelectorAll('table tr, [data-testid="dns-table-row"], .dns-row');
    rows.forEach(row => {
      const text = row.textContent.trim();
      if (text && text.length > 0 && text.length < 200) {
        records.push(text);
      }
    });
    return records;
  });
  
  console.log('DNS records found:', dnsRecords.length);
  dnsRecords.forEach(r => console.log(' -', r));
  
  // Buscar y eliminar el registro www CNAME problemático
  // y reemplazarlo con un CNAME a cname.vercel-dns.com
  
  console.log('\nBuscar el registro www para modificarlo...');
  
  // Mostrar TODOS los botones disponibles
  const buttons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button, a[role="button"], [data-testid*="add"], [data-testid*="edit"], [data-testid*="delete"]'))
      .map(el => ({ 
        text: el.textContent.trim().substring(0, 60), 
        tag: el.tagName,
        testid: el.getAttribute('data-testid') || '',
        class: el.className.substring(0, 40)
      }));
  });
  console.log('Actions available:', JSON.stringify(buttons.slice(0, 20), null, 2));
  
  console.log('\nNavegador abierto para interacción manual.');
  console.log('✅ Por favor: Encuentra el registro CNAME de "www", edítalo y cambia el target a: cname.vercel-dns.com');
  console.log('Luego cierra el navegador cuando termines.');
  
  // Mantener abierto 5 minutos
  await sleep(300000);
  await browser.close();
}

main().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
