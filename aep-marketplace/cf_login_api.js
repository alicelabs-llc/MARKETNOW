const email = 'edgar.flores.guerra.2011@gmail.com';
const pass = '***REDACTED-N8N-PASSWORD-ROTATED***';

async function login() {
  try {
    const res2 = await fetch('https://dash.cloudflare.com/api/v4/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: JSON.stringify({ email, password: pass })
    });
    const data = await res2.json();
    console.log('Status:', res2.status);
    console.log('Response:', JSON.stringify(data).slice(0, 1000));
  } catch(e) {
    console.log('Error:', e.message);
  }
}
login();
