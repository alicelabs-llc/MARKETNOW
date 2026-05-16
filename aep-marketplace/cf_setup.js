// Use the wrangler OAuth token to interact with Cloudflare API
// The OAuth token has zone:read, pages:write scopes

const token = 'c3FvYjhtzNg4zniKPlERJ13xrxoKb_7863kFtrBY2lk.UYCPM7mXK7dpLNgXGY-nGw3WfklWisJK_SOQ-bCZRII';
const zoneId = 'fd6fc5c67b87098bca9ede98b8b4f6b4';
const accountId = 'faf93cd2a0d373573de0859b1cc95328';

const headers = { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' };
const api = 'https://api.cloudflare.com/client/v4';

async function cf(path, options = {}) {
  const res = await fetch(api + path, { headers: { ...headers, ...options.headers }, ...options });
  return res.json();
}

async function main() {
  // 1. List DNS records
  console.log('=== DNS Records ===');
  const dns = await cf('/zones/' + zoneId + '/dns_records');
  if (!dns.success) {
    console.log('DNS API Error:', JSON.stringify(dns.errors));
    // Try user endpoint to check token
    const me = await cf('/user');
    console.log('User API:', JSON.stringify(me).slice(0, 300));
    console.log('User scope:', me.result?.scope ? JSON.stringify(me.result.scope) : 'no scope');
    return;
  }
  
  console.log('Current DNS records:');
  dns.result.forEach(r => console.log('  ' + r.type + ' ' + r.name + ' -> ' + r.content + ' (proxied:' + r.proxied + ')'));

  // 2. Find or create www CNAME
  const wwwRecord = dns.result.find(r => r.name === 'www.marketnow.site');
  if (wwwRecord) {
    console.log('\nwww record exists:', wwwRecord.id, wwwRecord.content);
    // Update it
    console.log('\nUpdating www CNAME to aep-marketplace.pages.dev...');
    const upd = await cf('/zones/' + zoneId + '/dns_records/' + wwwRecord.id, {
      method: 'PUT',
      body: JSON.stringify({
        type: 'CNAME',
        name: 'www',
        content: 'aep-marketplace.pages.dev',
        ttl: 1,
        proxied: true
      })
    });
    console.log('Update result:', upd.success ? 'OK' : 'FAIL', JSON.stringify(upd.errors || upd));
  } else {
    console.log('\nCreating www CNAME to aep-marketplace.pages.dev...');
    const create = await cf('/zones/' + zoneId + '/dns_records', {
      method: 'POST',
      body: JSON.stringify({
        type: 'CNAME',
        name: 'www',
        content: 'aep-marketplace.pages.dev',
        ttl: 1,
        proxied: true
      })
    });
    console.log('Create result:', create.success ? 'OK' : 'FAIL', JSON.stringify(create.errors || create).slice(0, 500));
  }

  // 3. Add custom domain to Pages project
  console.log('\n=== Adding custom domain to Pages ===');
  const domain = await cf('/accounts/' + accountId + '/pages/projects/aep-marketplace/domains', {
    method: 'POST',
    body: JSON.stringify({ name: 'marketnow.site' })
  });
  console.log('Add domain result:', domain.success ? 'OK' : 'FAIL', JSON.stringify(domain.errors || domain).slice(0, 500));
  
  // 4. Also add www
  const domainWww = await cf('/accounts/' + accountId + '/pages/projects/aep-marketplace/domains', {
    method: 'POST',
    body: JSON.stringify({ name: 'www.marketnow.site' })
  });
  console.log('Add www domain result:', domainWww.success ? 'OK' : 'FAIL', JSON.stringify(domainWww.errors || domainWww).slice(0, 500));
}

main().catch(e => console.log('Error:', e.message));
