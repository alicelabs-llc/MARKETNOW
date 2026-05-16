import sqlite3, os

cookie_db = r'C:\Users\Usuario\.openclaw\browser\openclaw\user-data\Default\Network\Cookies'
try:
    conn = sqlite3.connect(cookie_db)
    c = conn.cursor()
    c.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = c.fetchall()
    print('Tables:', tables)
    
    # Search for cloudflare
    try:
        c.execute("SELECT host_key, name, value FROM cookies WHERE host_key LIKE '%cloudflare%'")
        rows = c.fetchall()
        for r in rows:
            print(f'{r[0]} | {r[1]} | {str(r[2])[:80]}')
        print(f'Cloudflare cookies: {len(rows)}')
    except Exception as e:
        print(f'Query error: {e}')
        c.execute("SELECT name FROM sqlite_master WHERE type='table'")
        print(c.fetchall())
except Exception as e:
    print(f'Error: {e}')
finally:
    try: conn.close()
    except: pass
