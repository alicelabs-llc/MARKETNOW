const token = 'c3FvYjhtzNg4zniKPlERJ13xrxoKb_7863kFtrBY2lk.UCPYPM7mXK7dpLNgXGY-nGw3WfklWisJK_SOQ-bCZRII';
const zoneId = 'fd6fc5c67b87098bca9ede98b8b4f6b4';
const accountId = 'faf93cd2a0d373573de0859b1cc95328';

async function main() {
  // List DNS records
  const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`, {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  const data = await res.json();
  console.log('DNS Records:');
  data.result.forEach(r => console.log(`  ${r.type} ${r.name} -> ${r.content} (proxied: ${r.proxied})`));
  
  // Check for www
  const wwwRecord = data.result.find(r => r.name === 'www.marketnow.site');
  console.log('');
  console.log('www record:', wwwRecord ? JSON.stringify(wwwRecord) : 'NOT FOUND');
}
main().catch(e => console.log('Error:', e.message));
