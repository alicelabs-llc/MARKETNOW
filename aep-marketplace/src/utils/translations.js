/**
 * MarketNow — Translation Dictionary (EN / ES)
 * =============================================
 *
 * Centralized translations for UI strings.
 * Deep content pages (Trust, About, Policies, etc.) remain English-only
 * with a notice shown when ES is selected.
 */

export const TRANSLATIONS = {
  en: {
    // Navbar
    'nav.marketplace': 'MARKETPLACE',
    'nav.trust': 'TRUST',
    'nav.resources': 'RESOURCES',
    'nav.account': 'ACCOUNT',
    'nav.browse': 'Browse Skills',
    'nav.publish': 'Publish a Skill',
    'nav.pricing': 'Pricing',
    'nav.trustRoadmap': 'Trust Roadmap',
    'nav.standards': 'Standards (x402, AP2)',
    'nav.sentinel': 'Sentinel Security',
    'nav.compare': 'vs Smithery vs Glama',
    'nav.listings': 'External Listings',
    'nav.blog': 'Blog',
    'nav.buyersGuide': "Buyer's Guide",
    'nav.onboarding': 'Seller Onboarding',
    'nav.catalog': 'Catalog Transparency',
    'nav.badges': 'Badges',
    'nav.apiDocs': 'API Docs',
    'nav.terms': 'Terms & Policies',
    'nav.mandates': 'Mandates',
    'nav.vault': 'My Vault',
    'nav.dashboard': 'Dashboard',
    'nav.about': 'About Us',
    'nav.signIn': 'SIGN IN',
    'nav.signOut': 'SIGN OUT',
    'nav.api': 'API',
    'nav.toggleMenu': 'Toggle menu',
    'nav.goHome': 'MarketNow — Go to home',

    // Homepage hero
    'hero.badge': 'TRUST LAYER FOR AGENT COMMERCE · AP2 · x402 · OPEN SOURCE',
    'hero.title1': 'The trust layer for',
    'hero.title2': 'agent commerce.',
    'hero.body': 'Discovery is solved (MCP registry, Smithery, Glama). Trust is not. MarketNow is the trust layer — every skill Sentinel-scanned, every payment verified on-chain, every mandate human-approved by default.',
    'hero.meta': 'MCP servers · AP2-compatible mandates · x402 payments · Source-available MNNC-1.0 · AliceLabs LLC',
    'hero.searchPlaceholder': 'Search 8,560 skills — try "scrape web", "postgres", "discord"...',
    'hero.ctaBrowse': 'BROWSE SKILLS →',
    'hero.ctaFree': 'FREE SKILLS',
    'hero.ctaPublish': '+ PUBLISH YOUR SKILL',
    'hero.or': 'or',
    'hero.install': 'npx -y @marketnow/install <slug>',

    // Common UI
    'common.loading': 'Loading...',
    'common.error': 'Something went wrong',
    'common.search': 'Search',
    'common.free': 'FREE',
    'common.buy': 'Buy',
    'common.install': 'Install',
    'common.copy': 'Copy',
    'common.copied': 'Copied!',
    'common.close': 'Close',
    'common.back': 'Back',

    // Registry
    'registry.title': 'AGENT SKILL REGISTRY',
    'registry.subtitle': 'Browse, install, and deploy autonomous agent skills from the global MCP registry. Each skill is verified, versioned, and ready for production.',
    'registry.searchPlaceholder': 'Search skills by name, tag, or capability...',
    'registry.filterCategory': 'Category',
    'registry.filterPrice': 'Price',
    'registry.filterLanguage': 'Language',
    'registry.sortRelevance': 'Relevance',
    'registry.sortPrice': 'Price',
    'registry.sortName': 'Name',
    'registry.sortScore': 'Security Score',
    'registry.noResults': 'No skills found. Try a different search.',
    'registry.results': 'skills found',

    // Language notice
    'lang.notice': 'This page is only available in English for now. The navigation and homepage are fully translated.',
    'lang.noticeShort': 'English only',

    // Footer
    'footer.builtBy': 'Built by AliceLabs LLC',
    'footer.wyoming': 'Wyoming, USA · 2025',
    'footer.founder': 'Founder: Edison Flores',
    'footer.license': 'MNNC-1.0 (Source-available, Non-Commercial)',
  },

  es: {
    // Navbar
    'nav.marketplace': 'MARKETPLACE',
    'nav.trust': 'CONFIANZA',
    'nav.resources': 'RECURSOS',
    'nav.account': 'CUENTA',
    'nav.browse': 'Explorar Skills',
    'nav.publish': 'Publicar una Skill',
    'nav.pricing': 'Precios',
    'nav.trustRoadmap': 'Hoja de Confianza',
    'nav.standards': 'Estándares (x402, AP2)',
    'nav.sentinel': 'Seguridad Sentinel',
    'nav.compare': 'vs Smithery vs Glama',
    'nav.listings': 'Listados Externos',
    'nav.blog': 'Blog',
    'nav.buyersGuide': 'Guía del Comprador',
    'nav.onboarding': 'Onboarding Vendedor',
    'nav.catalog': 'Transparencia del Catálogo',
    'nav.badges': 'Insignias',
    'nav.apiDocs': 'Docs API',
    'nav.terms': 'Términos y Políticas',
    'nav.mandates': 'Mandatos',
    'nav.vault': 'Mi Bóveda',
    'nav.dashboard': 'Panel',
    'nav.about': 'Acerca de',
    'nav.signIn': 'INGRESAR',
    'nav.signOut': 'SALIR',
    'nav.api': 'API',
    'nav.toggleMenu': 'Abrir menú',
    'nav.goHome': 'MarketNow — Ir al inicio',

    // Homepage hero
    'hero.badge': 'CAPA DE CONFIANZA PARA COMERCIO DE AGENTES · AP2 · x402 · OPEN SOURCE',
    'hero.title1': 'La capa de confianza para el',
    'hero.title2': 'comercio de agentes.',
    'hero.body': 'El descubrimiento está resuelto (MCP registry, Smithery, Glama). La confianza no. MarketNow es la capa de confianza — cada skill escaneada por Sentinel, cada pago verificado on-chain, cada mandato aprobado por un humano por defecto.',
    'hero.meta': 'servidores MCP · Mandatos compatibles con AP2 · Pagos x402 · Source-available MNNC-1.0 · AliceLabs LLC',
    'hero.searchPlaceholder': 'Buscar 8,560 skills — prueba "scrapear web", "postgres", "discord"...',
    'hero.ctaBrowse': 'EXPLORAR SKILLS →',
    'hero.ctaFree': 'SKILLS GRATIS',
    'hero.ctaPublish': '+ PUBLICA TU SKILL',
    'hero.or': 'o',
    'hero.install': 'npx -y @marketnow/install <slug>',

    // Common UI
    'common.loading': 'Cargando...',
    'common.error': 'Algo salió mal',
    'common.search': 'Buscar',
    'common.free': 'GRATIS',
    'common.buy': 'Comprar',
    'common.install': 'Instalar',
    'common.copy': 'Copiar',
    'common.copied': '¡Copiado!',
    'common.close': 'Cerrar',
    'common.back': 'Volver',

    // Registry
    'registry.title': 'REGISTRO DE SKILLS PARA AGENTES',
    'registry.subtitle': 'Explora, instala y despliega skills para agentes autónomos del registro MCP global. Cada skill está verificada, versionada y lista para producción.',
    'registry.searchPlaceholder': 'Buscar skills por nombre, etiqueta o capacidad...',
    'registry.filterCategory': 'Categoría',
    'registry.filterPrice': 'Precio',
    'registry.filterLanguage': 'Idioma',
    'registry.sortRelevance': 'Relevancia',
    'registry.sortPrice': 'Precio',
    'registry.sortName': 'Nombre',
    'registry.sortScore': 'Puntuación de Seguridad',
    'registry.noResults': 'No se encontraron skills. Prueba con otra búsqueda.',
    'registry.results': 'skills encontradas',

    // Language notice
    'lang.notice': 'Esta página solo está disponible en inglés por ahora. La navegación y el inicio están totalmente traducidos.',
    'lang.noticeShort': 'Solo inglés',

    // Footer
    'footer.builtBy': 'Construido por AliceLabs LLC',
    'footer.wyoming': 'Wyoming, USA · 2025',
    'footer.founder': 'Fundador: Edison Flores',
    'footer.license': 'MNNC-1.0 (Source-available, No-Comercial)',
  },
};

export const LANGUAGES = [
  { code: 'en', label: 'EN', name: 'English', flag: '🇺🇸' },
  { code: 'es', label: 'ES', name: 'Español', flag: '🇪🇸' },
];

export const DEFAULT_LANG = 'en';
