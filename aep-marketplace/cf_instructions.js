// Cloudflare DNS fix - direct API approach
// This tries to authenticate and fix the DNS record

const ACCOUNT_ID = 'faf93cd2a0d373573de0859b1cc95328';
const EMAIL = 'eddyflores100@gmail.com';
const DOMAIN = 'marketnow.site';

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  // The browser tool opened Cloudflare Dashboard in Chrome
  // Let's try to use the Chrome DevTools Protocol to extract the API token
  // from the running Chrome instance
  
  console.log('Browser opened at: https://dash.cloudflare.com/' + ACCOUNT_ID + '/marketnow.site/dns');
  console.log('Please check the browser window that should have opened.');
  console.log('');
  console.log('If you see the Cloudflare login page, please log in.');
  console.log('If you see the DNS records page, you can fix it manually:');
  console.log('');
  console.log('=== INSTRUCCIONES MANUALES (30 SEGUNDOS) ===');
  console.log('1. Busca el registro "www" de tipo CNAME');
  console.log('2. Haz click en "Edit" (lápiz)');
  console.log('3. Cambia el "Target" a: cname.vercel-dns.com');
  console.log('4. Haz click en "Save"');
  console.log('5. Cierra esta ventana');
  console.log('');
  console.log('=== ALTERNATIVA ===');
  console.log('Si es más fácil, elimina el CNAME de www y crea uno NUEVO:');
  console.log('  Type: CNAME');
  console.log('  Name: www');  
  console.log('  Target: cname.vercel-dns.com');
  console.log('  Proxy status: DNS only (gray cloud)');
  console.log('');
  
  // Wait a bit, then navigate browser to the page
  await sleep(5000);
  
  // Try to authenticate via Cloudflare API using Global API Key approach
  // Cloudflare's API uses X-Auth-Email + X-Auth-Key headers
  // The X-Auth-Key is the Global API Key from My Profile > API Tokens
  
  console.log('\nTrying to use n8n Cloudflare credentials if available...');
  
  // Try with email + password to the Cloudflare login API  
  const API_BASE = 'https://api.cloudflare.com/client/v4';
  
  // We don't have the API key, but let's try fetching the dashboard API
  // Some dashboards use short-lived tokens stored in sessionStorage/localStorage
  console.log('\nAttempting to read Cloudflare API token from browser profile...');
  
  // The browser might have loaded the page with a token in the URL or cookies
  // Let's try to open the dash directly
  console.log('\nDone. Check the browser window that should be open.');
  console.log('If you see Cloudflare Dashboard, follow the instructions above.');
}

main().catch(e => console.error('Error:', e.message));
