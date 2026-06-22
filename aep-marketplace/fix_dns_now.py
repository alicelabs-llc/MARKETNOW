import urllib.request, json

token = 'eL5o1mB9FxB0wR-j0BGtlPc6KEwDOxZkdeMPPP4rhFc.B_vXEpeNTIc4RJXUaIgxLcaO_aJpuQn8Nmp8iEYlPZc'
zone_id = 'fd6fc5c67b87098bca9ede98b8b4f6b4'
base_url = f'https://api.cloudflare.com/client/v4/zones/{zone_id}/dns_records'

headers = {
    'Authorization': f'Bearer {token}',
    'Content-Type': 'application/json'
}

def get_records():
    req = urllib.request.Request(base_url, headers=headers)
    res = urllib.request.urlopen(req)
    return json.loads(res.read())

def create_record():
    data = {
        "type": "CNAME",
        "name": "www",
        "content": "marketnow.site",
        "proxied": True
    }
    req = urllib.request.Request(base_url, data=json.dumps(data).encode('utf-8'), headers=headers, method='POST')
    res = urllib.request.urlopen(req)
    return json.loads(res.read())

def update_record(record_id):
    data = {
        "type": "CNAME",
        "name": "www",
        "content": "marketnow.site",
        "proxied": True
    }
    req = urllib.request.Request(f"{base_url}/{record_id}", data=json.dumps(data).encode('utf-8'), headers=headers, method='PUT')
    res = urllib.request.urlopen(req)
    return json.loads(res.read())

try:
    print("Obteniendo registros DNS...")
    data = get_records()
    if not data.get('success'):
        print("Error obteniendo registros:", data.get('errors'))
        exit(1)

    www_record = None
    for r in data['result']:
        print(f"Encontrado: {r['name']} ({r['type']}) -> {r['content']}")
        if r['name'] == 'www.marketnow.site' or r['name'] == 'www':
            www_record = r

    if www_record:
        print(f"\nActualizando registro www existente (ID: {www_record['id']})...")
        res = update_record(www_record['id'])
        if res.get('success'):
            print("✅ Registro www actualizado correctamente a marketnow.site")
        else:
            print("❌ Error actualizando:", res.get('errors'))
    else:
        print("\nCreando nuevo registro www CNAME...")
        res = create_record()
        if res.get('success'):
            print("✅ Registro www creado correctamente a marketnow.site")
        else:
            print("❌ Error creando:", res.get('errors'))

except Exception as e:
    print('Error fatal:', e)
    if hasattr(e, 'read'):
        print(e.read().decode('utf-8'))
