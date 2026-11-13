# MarketNow

**Trust infrastructure for AI agents.** MarketNow reúne un servidor MCP, herramientas de verificación de confianza y una integración con un catálogo de skills para que los agentes puedan consultar información y validar evidencias antes de actuar.

- **Marketplace:** https://marketnow.site
- **MCP endpoint:** https://marketnow.site/api/mcp
- **MCP package:** [marketnow-mcp en npm](https://www.npmjs.com/package/marketnow-mcp)
- **Status:** https://status.marketnow.site
- **MCP Registry:** [io.github.alicelabs-llc/marketnow](https://registry.modelcontextprotocol.io/v0.1/servers/io.github.alicelabs-llc%2Fmarketnow/versions/1.16.0)

> Este repositorio contiene el servidor MCP, SDKs, integraciones y material de seguridad. El sitio del marketplace y sus pipelines de catálogo viven en el repositorio separado `eddyflores100-lang/marketnow`.

## Qué contiene este repositorio

| Área | Responsabilidad |
| --- | --- |
| `mcp-server/` | Paquete npm `marketnow-mcp`, herramientas MCP y validación de confianza |
| `atc-sdk/` | SDK relacionado con Agent Trust Cards |
| `atc-python/`, `atc-rust/` | Implementaciones y utilidades por lenguaje |
| `integrations/` | Configuraciones y guías para clientes MCP |
| `docker/` | Artefactos de distribución para Docker MCP |
| `scripts/` | Comprobaciones, generación de índices y tareas de mantenimiento |
| `docs/` | Especificaciones, ejemplos, guías y material de auditoría |

Consulta los README de cada subproyecto antes de asumir que un comando o requisito del servidor también aplica a los SDKs.

## Servidor MCP

El paquete publicable está en `mcp-server/`. Su versión fuente se declara en `mcp-server/package.json` (actualmente **1.16.2**).

El servidor expone 15 herramientas con prefijo `marketnow_*`. Entre sus capacidades se encuentran:

- Buscar skills y consultar sus metadatos.
- Consultar categorías y manifiestos del catálogo.
- Obtener instrucciones de instalación.
- Verificar Agent Trust Cards y recibos firmados.
- Consultar revocación y datos de confianza.
- Revisar controles de seguridad y huellas de herramientas.
- Enviar skills y consultar referencias.

La lista exacta, los esquemas de entrada, los modos de verificación y los ejemplos de configuración se mantienen en **[mcp-server/README.md](mcp-server/README.md)**. Ese documento es la referencia operativa del paquete; evita duplicar aquí una lista que pueda quedar desactualizada.

### Instalar con npx

```bash
npx -y marketnow-mcp
```

### Ejecutar desde el repositorio

```bash
cd mcp-server
npm install
npm start
```

El servidor usa el transporte y la configuración documentados por el paquete. Para clientes como Claude Desktop, Cursor o Cline, sigue las guías específicas en [integrations](integrations/).

### Docker

```bash
docker run -i --rm ghcr.io/alicelabs-llc/marketnow-mcp:1.16.2
```

Comprueba la etiqueta publicada y los requisitos de acceso del paquete antes de desplegar en producción. La integración Docker tiene una prueba de handshake MCP en CI.

## Conectar un cliente MCP por HTTP

Para clientes que admiten MCP mediante Streamable HTTP, la URL publicada es:

```text
https://marketnow.site/api/mcp
```

Ejemplo de configuración (adapta la estructura al cliente):

```json
{
  "mcpServers": {
    "marketnow": {
      "url": "https://marketnow.site/api/mcp"
    }
  }
}
```

La disponibilidad del endpoint alojado es independiente de ejecutar el paquete localmente.

## Arquitectura de repositorios

El ecosistema se divide por responsabilidad para evitar mezclar el producto, el catálogo y el protocolo:

| Repositorio | Propietario funcional |
| --- | --- |
| `alicelabs-llc/MARKETNOW` (este repositorio) | Servidor MCP, SDKs, integraciones y herramientas de confianza |
| `eddyflores100-lang/marketnow` | Sitio del marketplace, datos del catálogo y pipelines de publicación |
| `alicelabs-llc/universal-trust-adapter` | Especificación y adaptadores del protocolo UTA |
| `alicelabs-llc/marketnow-submissions` | Cola de propuestas públicas |
| `alicelabs-llc/status` | Página de estado |

## Desarrollo y validación

El CI de integraciones verifica la construcción de Docker, realiza un handshake MCP por stdio, comprueba la consistencia de versiones y valida la presencia de los artefactos para Cline, Cursor y Docker MCP.

Para el servidor MCP:

```bash
cd mcp-server
npm install
npm test
```

Para las comprobaciones del ecosistema, revisa los workflows de [GitHub Actions](.github/workflows/) y ejecuta cada script desde la raíz según su documentación. No existe un único comando de instalación que prepare automáticamente todos los subproyectos y sus toolchains.

## Seguridad y modelo de confianza

La verificación criptográfica no equivale por sí sola a confiar en un emisor. En particular, una clave incluida dentro de una credencial no debe tratarse automáticamente como una raíz de confianza. El servidor documenta los requisitos de clave de CA confiable, evidencia de revocación y el modo explícito de verificación auto-descrita.

- [Auditoría del servidor MCP](mcp-server/AUDIT.md)
- [Registro de verificación](mcp-server/VERIFICATION-LOG.md)
- [Política de seguridad](SECURITY.md)
- [Guía de contribución](CONTRIBUTING.md)

Usa claves confiables obtenidas por un canal independiente y verifica el estado de revocación cuando el formato lo requiera. No uses un resultado de modo auto-descrito como una decisión de confianza.

## Datos del marketplace

Los recuentos del catálogo, los estados de escaneo y las métricas operativas cambian con los pipelines. Consulta la [API pública de estadísticas](https://www.marketnow.site/api/stats.json) para obtener valores actuales; este README evita fijar cifras que se vuelven obsoletas.

## Licencia

El repositorio principal se distribuye bajo los términos indicados en [LICENSE](LICENSE). El paquete `mcp-server` incluye su propio archivo [LICENSE](mcp-server/LICENSE); revisa ambos documentos antes de reutilizar o redistribuir componentes.
