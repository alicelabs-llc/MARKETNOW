# MarketNow — Mercado de servidores MCP (seguridad primero)

> MarketNow es un mercado de servidores MCP (Model Context Protocol) con seguridad como prioridad. 9,248 habilidades auditadas, pipeline de 10 capas, tarjetas de confianza firmadas (ATC), y verificación cruzada con Vibe.

## Todo es gratis

| Función | Precio |
|---------|--------|
| Las 9,248 habilidades | $0 |
| Auditoría de 10 capas | $0 |
| Tarjeta de Confianza (ATC) | $0 |
| Recibos firmados | $0 |
| Servidor MCP (11 herramientas) | $0 |
| Subir tu servidor | $0 |
| Auditoría sandbox L2 | $0 |

## Cómo subir tu servidor MCP

```bash
curl -X POST https://marketnow.site/api/submit-skill \
  -H "Content-Type: application/json" \
  -d '{"repo_url": "https://github.com/tu-usuario/tu-servidor-mcp"}'
```

## Auditoría de 10 capas

| Capa | Qué revisa |
|------|-----------|
| L1.5 | Metadatos (README, licencia, no archivado) |
| L1.6 | 36 reglas Semgrep + 18 patrones de secretos + OSV |
| L1.7 | 8 patrones de malware + detección de binarios |
| L1.8 | 28 firmas de familias de malware |
| L1.9 | 32 reglas de defensa contra inyección de prompts |
| L2 | Sandbox Docker (gVisor, sin red, solo lectura) |
| L3 | Monitoreo continuo de runtime (re-auditoría semanal) |
| WAF | 38 firmas de ataque (SQLi, XSS, SSRF) |
| Honeypot | 50+ rutas falsas con auto-ban 24h |
| Threat Intel | feeds de abuse.ch |

## Links

- Web: https://marketnow.site
- Subir: https://marketnow.site/submit
- Spec: https://marketnow.site/api/atc?action=spec
- GitHub: https://github.com/edgarfloresguerra2011-a11y/marketnow
- npm: `npx -y marketnow-mcp@1.7.0`
