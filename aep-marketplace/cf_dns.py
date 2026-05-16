import urllib.request, json
token = 'eL5o1mB9FxB0wR-j0BGtlPc6KEwDOxZkdeMPPP4rhFc.B_vXEpeNTIc4RJXUaIgxLcaO_aJpuQn8Nmp8iEYlPZc'
req = urllib.request.Request(
    'https://api.cloudflare.com/client/v4/zones/fd6fc5c67b87098bca9ede98b8b4f6b4/dns_records',
    headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
)
try:
    res = urllib.request.urlopen(req)
    data = json.loads(res.read())
    print('Success:', data.get('success'))
    if data.get('success'):
        for r in data['result']:
            print(f"  {r['type']:5} {r['name']:30} -> {r['content']:40} proxied={r['proxied']}")
    else:
        print('Errors:', data.get('errors'))
except Exception as e:
    print('Error:', e)
