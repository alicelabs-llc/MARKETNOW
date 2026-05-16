import requests, json

EMAIL = "eddyflores100@gmail.com"
ACCOUNT_ID = "faf93cd2a0d373573de0859b1cc95328"
DOMAIN = "marketnow.site"
WWW_DOMAIN = "www.marketnow.site"

# 1. Primero intentemos obtener la API Token usando el login
# Cloudflare API Token endpoint: POST /client/v4/api_tokens/verify
# Si no tenemos token, intentamos con Global API Key via email+password

print("Intentando acceso directo vía API REST...")

# Primero intentemos verificar si hay una API key o token 
# Cloudflare permite usar email + Global API Key como auth
PASSWORD = "***REDACTED-N8N-PASSWORD-ROTATED***"  # contraseña de n8n

try:
    # Try login to get API token
    resp = requests.post("https://dash.cloudflare.com/api/v1/login", json={
        "email": EMAIL,
        "password": PASSWORD
    }, timeout=10)
    print(f"Login status: {resp.status_code}")
    if resp.status_code == 200:
        data = resp.json()
        print(f"Login response keys: {list(data.keys())}")
        # Save token
        if 'api_token' in data:
            print(f"API TOKEN: {data['api_token'][:20]}...")
    else:
        print(f"Login failed: {resp.text[:500]}")
except Exception as e:
    print(f"Login error: {e}")

# Try with the newer API
try:
    resp = requests.post("https://api.cloudflare.com/client/v4/accounts", json={
        "email": EMAIL,
        "password": PASSWORD
    }, timeout=10)
    print(f"\nAccounts status: {resp.status_code}")
    print(resp.text[:500])
except Exception as e:
    print(f"Accounts error: {e}")
