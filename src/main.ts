/**
 * Ember — Main Application Entry Point
 * Bootstraps the app, initializes services, sets up routing
 */

import './styles/global.css';
import { Route } from './types/index.js';

// Service classes (used for AppState type + static initializers)
import type { StorageEngine } from './services/storageEngine.js';
import type { ThemeEngine } from './services/themeEngine.js';
import type { CacheEngine } from './services/cacheEngine.js';
import type { WebLLMEngine } from './services/webllmEngine.js';
import { MemoryEngine } from './services/memoryEngine.js';
import { ImportEngine } from './services/importEngine.js';
import type { ModelRegistry } from './models/modelRegistry.js';

// Module singletons — the same instances pages import and use
import { storageEngine } from './services/storageEngine.js';
import { themeEngine } from './services/themeEngine.js';
import { cacheEngine } from './services/cacheEngine.js';
import { webllmEngine } from './services/webllmEngine.js';
import { memoryEngine } from './services/memoryEngine.js';
import { importEngine } from './services/importEngine.js';
import { modelRegistry } from './models/modelRegistry.js';

// Page imports (will be created in Phase 3)
import { LandingPage } from './pages/LandingPage.js';
import { ChatPage } from './pages/ChatPage.js';
import { ModelLibraryPage } from './pages/ModelLibraryPage.js';
import { ImportExportPage } from './pages/ImportExportPage.js';
import { MemoryPage } from './pages/MemoryPage.js';
import { SettingsPage } from './pages/SettingsPage.js';

/** Application state */
interface AppState {
  currentRoute: Route;
  currentChatId: string | null;
  services: {
    storage: StorageEngine;
    theme: ThemeEngine;
    cache: CacheEngine;
    webllm: WebLLMEngine;
    memory: MemoryEngine;
    import: ImportEngine;
    models: ModelRegistry;
  };
  pages: {
    home: LandingPage;
    chat: ChatPage;
    models: ModelLibraryPage;
    import: ImportExportPage;
    memory: MemoryPage;
    settings: SettingsPage;
  };
}

/** Global app instance */
let app: AppState;

/** DOM elements — queried after createAppShell() inserts the HTML */
let routeOutlet: HTMLElement;
let sidebar: HTMLElement;
let sidebarToggle: HTMLButtonElement;
let navLinks: NodeListOf<HTMLAnchorElement>;

function cacheDOMElements(): void {
  routeOutlet = document.getElementById('route-outlet') as HTMLElement;
  sidebar = document.querySelector('.sidebar') as HTMLElement;
  sidebarToggle = document.getElementById('sidebar-toggle') as HTMLButtonElement;
  navLinks = document.querySelectorAll('[data-route]') as NodeListOf<HTMLAnchorElement>;
}

/**
 * Initialize all services
 *
 * IMPORTANT: Pages import module-level singletons (storageEngine, webllmEngine,
 * etc.) directly. We must initialize THOSE singletons — not create separate
 * instances. This ensures pages and main.ts share the same state.
 */
async function initializeServices(): Promise<AppState['services']> {
  // Storage — singleton auto-inits via ensureDB(), but call init eagerly
  await storageEngine.init();

  // Theme — applies data-theme to <html>, loads from localStorage
  themeEngine.init();
  // Insert the theme toggle into the header container
  const themeContainer = document.getElementById('theme-toggle-container');
  if (themeContainer) {
    themeContainer.appendChild(themeEngine.createToggleButton());
  }

  // Service Worker / model caching
  await cacheEngine.register();

  // WebLLM — checks for WebGPU (warns, doesn't throw if unavailable)
  await webllmEngine.init();

  // Wire memory and import engines to the real services
  MemoryEngine.initialize(webllmEngine, storageEngine);
  ImportEngine.initialize(webllmEngine, storageEngine);

  return {
    storage: storageEngine,
    theme: themeEngine,
    cache: cacheEngine,
    webllm: webllmEngine,
    memory: memoryEngine,
    import: importEngine,
    models: modelRegistry,
  };
}

/**
 * Initialize all pages
 */
function initializePages(): AppState['pages'] {
  return {
    home: new LandingPage(),
    chat: new ChatPage(),
    models: new ModelLibraryPage(),
    import: new ImportExportPage(),
    memory: new MemoryPage(),
    settings: new SettingsPage(),
  };
}

/**
 * Render a page into the route outlet
 */
async function renderPage(page: keyof AppState['pages'], params?: Record<string, string>): Promise<void> {
  const pageInstance = app.pages[page];
  if (!pageInstance) {
    console.warn(`[Ember] Unknown page "${page}", redirecting to chat`);
    return navigate('chat');
  }
  routeOutlet.innerHTML = '';
  const el = pageInstance.getElement();
  routeOutlet.appendChild(el);

  // Pages use `.page { display:none }` / `.page.active { display:flex }`.
  // Landing page uses its own `.landing` class, but still needs to be visible.
  el.classList.add('active');

  // Call page's onShow if it exists
  if (typeof pageInstance.onShow === 'function') {
    await pageInstance.onShow(params);
  }
}

/** Build the hash string for a route + params */
function buildHash(route: Route, params?: Record<string, string>): string {
  return params
    ? `#${route}/${Object.entries(params).map(([k, v]) => `${k}=${v}`).join('&')}`
    : `#${route}`;
}

/**
 * Handle route change. Setting `window.location.hash` fires `hashchange`,
 * which is where the page is actually rendered (see setupEventListeners). We
 * must NOT also render here, or every navigation renders the page twice —
 * previously each nav ran onShow 2–3× (double IndexedDB reads, double DOM
 * rebuild). Only render directly when the hash is already the target (so a
 * back/forward or a re-click on the current route still works).
 */
async function navigate(route: Route, params?: Record<string, string>): Promise<void> {
  const hash = buildHash(route, params);
  if (window.location.hash !== hash) {
    window.location.hash = hash;
    return; // hashchange will render
  }
  await renderRoute(route, params);
}

/** Render the target route into the outlet (single source of truth) */
async function renderRoute(route: Route, params?: Record<string, string>): Promise<void> {
  // Update active nav link
  navLinks.forEach(link => {
    const linkRoute = link.dataset.route as Route;
    if (linkRoute === route) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    } else {
      link.classList.remove('active');
      link.removeAttribute('aria-current');
    }
  });

  // Close mobile sidebar
  sidebar.classList.remove('open');

  // Update page title
  const titles: Record<Route, string> = {
    home: 'Home',
    chat: 'Chat',
    models: 'Models',
    import: 'Import/Export',
    memory: 'Memory',
    settings: 'Settings',
  };
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = titles[route] || 'Ember';

  // Gate the app-shell chrome (header, sidebar, mobile tabs) so pages that own
  // their full viewport — like the landing page — render clean, edge to edge.
  const appEl = document.getElementById('app');
  if (appEl) appEl.classList.toggle('route-home', route === 'home');

  // The landing page uses min-height:100vh, which requires the outlet to
  // allow scroll/overflow. Other pages manage their own scrolling.
  if (routeOutlet) {
    routeOutlet.style.overflow = route === 'home' ? 'visible' : 'hidden';
  }

  // Render the page
  app.currentRoute = route;
  await renderPage(route, params);
}

/**
 * Parse hash into route + params
 */
function parseHash(): { route: Route; params: Record<string, string> } {
  // Strip leading slash (/#/chat → /chat → chat) and default to 'home'
  const hash = window.location.hash.slice(1).replace(/^\/+/, '') || 'home';
  const [routePart, ...paramParts] = hash.split('/');
  const route = (routePart || 'home') as Route;

  const params: Record<string, string> = {};
  if (paramParts.length > 0) {
    paramParts.join('/').split('&').forEach(pair => {
      const [key, value] = pair.split('=');
      if (key && value) params[key] = decodeURIComponent(value);
    });
  }

  return { route, params };
}

/**
 * Set up event listeners
 */
function setupEventListeners(): void {
  // Hash change navigation — the single render point. (navigate() only sets
  // the hash; never call navigate() here or a single nav would render twice.)
  window.addEventListener('hashchange', () => {
    const { route, params } = parseHash();
    renderRoute(route, params);
  });

  // Sidebar toggle (desktop)
  sidebarToggle?.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    document.querySelector('.main-content')?.classList.toggle('sidebar-collapsed');
  });

  // Nav link clicks (sidebar links + mobile bottom tabs)
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const route = link.dataset.route as Route;
      navigate(route);
    });
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + K: Open the model picker + focus search. Focusing the hidden
    // search input directly does nothing (it's inside the closed dropdown), so
    // trigger the selector button, whose open() both reveals and focuses it.
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      const btn = document.querySelector('.model-selector-btn') as HTMLButtonElement;
      btn?.click();
    }
    // Escape: Close modals, dropdowns, mobile sidebar
    if (e.key === 'Escape') {
      sidebar.classList.remove('open');
      document.querySelectorAll('.dropdown-menu, .modal-overlay').forEach(el => el.remove());
    }
  });
}

/**
 * Create the app shell HTML
 */
function createAppShell(): void {
  const appShell = `
    <aside class="sidebar" id="sidebar" role="navigation" aria-label="Main navigation">
      <div class="sidebar-header">
        <div class="sidebar-logo">
          <div class="sidebar-logo-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2c1 3 2.5 3.5 3.5 4.5A5 5 0 0 1 17 10a5 5 0 1 1-10 0c0-1 .5-2.5 1.5-3.5C9.5 5.5 11 5 12 2z"></path>
            </svg>
          </div>
          <div class="sidebar-logo-text">
            <h1>Ember</h1>
            <p>Private AI</p>
          </div>
        </div>
        <button id="sidebar-toggle" class="btn btn-ghost btn-icon" aria-label="Toggle sidebar" aria-expanded="false">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
      </div>

      <nav class="flex-1 overflow-y-auto" style="padding: var(--spacing-3);">
        <ul class="flex flex-col gap-1" role="list">
          <li>
            <a href="#chat" data-route="chat" class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-secondary hover:text-primary hover:bg-hover transition-colors" aria-label="Chat">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              <span class="sidebar-label">Chat</span>
            </a>
          </li>
          <li>
            <a href="#models" data-route="models" class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-secondary hover:text-primary hover:bg-hover transition-colors" aria-label="Model Library">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                <path d="M8 21h8"></path>
                <path d="M12 17v4"></path>
              </svg>
              <span class="sidebar-label">Models</span>
            </a>
          </li>
          <li>
            <a href="#import" data-route="import" class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-secondary hover:text-primary hover:bg-hover transition-colors" aria-label="Import/Export">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              <span class="sidebar-label">Import/Export</span>
            </a>
          </li>
          <li>
            <a href="#memory" data-route="memory" class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-secondary hover:text-primary hover:bg-hover transition-colors" aria-label="Memory">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                <line x1="15" y1="2" x2="15" y2="22"></line>
                <line x1="8" y1="2" x2="8" y2="22"></line>
              </svg>
              <span class="sidebar-label">Memory</span>
            </a>
          </li>
          <li>
            <a href="#settings" data-route="settings" class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-secondary hover:text-primary hover:bg-hover transition-colors" aria-label="Settings">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
              <span class="sidebar-label">Settings</span>
            </a>
          </li>
        </ul>
      </nav>

      <div class="sidebar-footer" style="padding: var(--spacing-4); border-top: 1px solid var(--border-color);">
        <div class="flex items-center gap-3">
          <div class="avatar avatar-sm avatar-brand" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <path d="M12 2c1 3 2.5 3.5 3.5 4.5A5 5 0 0 1 17 10a5 5 0 1 1-10 0c0-1 .5-2.5 1.5-3.5C9.5 5.5 11 5 12 2z"></path>
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-xs text-muted truncate">Runs 100% locally</p>
          </div>
        </div>
      </div>
    </aside>

    <nav class="mobile-tabbar" id="mobile-tabbar" aria-label="Primary navigation">
      <a href="#chat" data-route="chat" class="mobile-tab" aria-label="Chat">
        <span class="mobile-tab-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg></span>
        <span class="mobile-tab-label">Chat</span>
      </a>
      <a href="#models" data-route="models" class="mobile-tab" aria-label="Models">
        <span class="mobile-tab-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="8" rx="2"></rect><rect x="2" y="14" width="20" height="8" rx="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg></span>
        <span class="mobile-tab-label">Models</span>
      </a>
      <a href="#memory" data-route="memory" class="mobile-tab" aria-label="Memory">
        <span class="mobile-tab-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2a7 7 0 0 0-7 7c0 3 2 5.5 4 7.5L12 20l3-3.5c2-2 4-4.5 4-7.5a7 7 0 0 0-7-7z"></path><circle cx="12" cy="9" r="2"></circle></svg></span>
        <span class="mobile-tab-label">Memory</span>
      </a>
      <a href="#import" data-route="import" class="mobile-tab" aria-label="Import/Export">
        <span class="mobile-tab-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg></span>
        <span class="mobile-tab-label">Import</span>
      </a>
      <a href="#settings" data-route="settings" class="mobile-tab" aria-label="Settings">
        <span class="mobile-tab-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg></span>
        <span class="mobile-tab-label">Settings</span>
      </a>
    </nav>

    <main class="main-content" role="main">
      <header class="header">
        <div class="flex items-center justify-between h-full" style="padding: 0 var(--spacing-5);">
          <div class="flex items-center gap-3">
            <h2 id="page-title" class="font-semibold text-primary" style="font-size: var(--font-size-base);">Chat</h2>
          </div>
          <div class="flex items-center gap-2">
            <div id="theme-toggle-container"></div>
            <div id="header-model-selector"></div>
          </div>
        </div>
      </header>

      <div id="route-outlet" class="flex-1 overflow-hidden" role="region" aria-label="Page content"></div>
    </main>

    <div class="toast-container" id="toast-container" aria-live="polite" aria-atomic="true"></div>
  `;

  document.getElementById('app')!.innerHTML = appShell;
}

/**
 * Show toast notification
 */
export function showToast(toast: { type: 'success' | 'error' | 'warning' | 'info'; title: string; message?: string; duration?: number }): void {
  const container = document.getElementById('toast-container')!;
  const id = `toast-${Date.now()}`;

  const icons: Record<string, string> = {
    success: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
    error: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
    warning: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
    info: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>',
  };

  const toastEl = document.createElement('div');
  toastEl.className = `toast toast-${toast.type}`;
  toastEl.id = id;
  toastEl.innerHTML = `
    <div class="toast-icon" aria-hidden="true">${icons[toast.type]}</div>
    <div class="toast-content">
      <div class="toast-title">${toast.title}</div>
      ${toast.message ? `<div class="toast-message">${toast.message}</div>` : ''}
    </div>
    <button class="toast-close" aria-label="Dismiss">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
    </button>
  `;

  toastEl.querySelector('.toast-close')!.addEventListener('click', () => {
    toastEl.remove();
  });

  container.appendChild(toastEl);

  // Auto-dismiss
  const duration = toast.duration ?? 5000;
  setTimeout(() => {
    toastEl.style.animation = 'slideUp var(--transition-base) ease-in reverse';
    setTimeout(() => toastEl.remove(), 250);
  }, duration);
}

/**
 * Main bootstrap function
 */
async function bootstrap(): Promise<void> {
  try {
    // Create app shell
    createAppShell();

    // Cache DOM elements after shell is in the DOM
    cacheDOMElements();

    // Initialize services
    const services = await initializeServices();

    // Initialize pages
    const pages = initializePages();

    // Set up global app state
    app = {
      currentRoute: 'chat',
      currentChatId: null,
      services,
      pages,
    };

    // Make app globally accessible for debugging
    (window as any).__APP__ = app;

    // Set up event listeners
    setupEventListeners();

    // Initial route
    const { route, params } = parseHash();
    await navigate(route, params);

    // Show ready toast
    showToast({ type: 'success', title: 'Ember ready', message: 'All systems initialized', duration: 3000 });

    console.log('[Ember] Application initialized successfully');
  } catch (error) {
    console.error('[Ember] Failed to initialize:', error);
    showToast({
      type: 'error',
      title: 'Initialization failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      duration: 10000
    });
  }
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}

// Export for testing
export { app, navigate, parseHash, showToast as showToastExport };