/**
 * Theme Engine - Theme management (light/dark/auto)
 * Applies CSS variables and persists to localStorage
 */

import type { AppSettings } from '../types/index.js';

type ThemeMode = 'light' | 'dark' | 'auto';

/** Theme Engine Class */
export class ThemeEngine {
  private currentTheme: ThemeMode = 'auto';
  private mediaQuery: MediaQueryList | null = null;
  private listeners: Set<(theme: ThemeMode) => void> = new Set();

  /** Initialize theme engine */
  init(): void {
    // Load saved theme
    const saved = localStorage.getItem('theme') as ThemeMode | null;
    if (saved && ['light', 'dark', 'auto'].includes(saved)) {
      this.currentTheme = saved;
    }

    // Set up system preference listener
    this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.mediaQuery.addEventListener('change', this.handleSystemThemeChange.bind(this));

    // Apply initial theme
    this.applyTheme();

    // Listen for storage changes (other tabs)
    window.addEventListener('storage', this.handleStorageChange.bind(this));

    console.log('[ThemeEngine] Initialized with theme:', this.currentTheme);
  }

  /** Handle system theme change */
  private handleSystemThemeChange(): void {
    if (this.currentTheme === 'auto') {
      this.applyTheme();
    }
  }

  /** Handle localStorage change from other tabs */
  private handleStorageChange(e: StorageEvent): void {
    if (e.key === 'theme' && e.newValue) {
      this.currentTheme = e.newValue as ThemeMode;
      this.applyTheme();
      this.notifyListeners();
    }
  }

  /** Get effective theme (resolves 'auto' to actual) */
  getEffectiveTheme(): 'light' | 'dark' {
    if (this.currentTheme === 'auto') {
      return this.mediaQuery?.matches ? 'dark' : 'light';
    }
    return this.currentTheme;
  }

  /** Get current theme mode */
  getTheme(): ThemeMode {
    return this.currentTheme;
  }

  /** Set theme mode */
  setTheme(theme: ThemeMode): void {
    if (!['light', 'dark', 'auto'].includes(theme)) {
      throw new Error(`Invalid theme: ${theme}`);
    }

    this.currentTheme = theme;
    localStorage.setItem('theme', theme);
    this.applyTheme();
    this.notifyListeners();
  }

  /** Toggle between light and dark (skips auto) */
  toggleTheme(): void {
    const effective = this.getEffectiveTheme();
    this.setTheme(effective === 'light' ? 'dark' : 'light');
  }

  /** Apply theme to document */
  private applyTheme(): void {
    const effective = this.getEffectiveTheme();
    document.documentElement.setAttribute('data-theme', effective);

    // Update meta theme-color for PWA
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      const color = effective === 'dark' ? '#1a1a2e' : '#f8f9fa';
      metaThemeColor.setAttribute('content', color);
    }
  }

  /** Subscribe to theme changes */
  subscribe(listener: (theme: ThemeMode) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Notify all listeners */
  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.currentTheme);
      } catch (error) {
        console.warn('[ThemeEngine] Listener error:', error);
      }
    }
  }

  /** Create theme toggle button HTML */
  createToggleButton(): HTMLButtonElement {
    const button = document.createElement('button');
    button.className = 'btn btn-ghost btn-icon';
    button.id = 'theme-toggle';
    button.setAttribute('aria-label', 'Toggle theme');
    button.setAttribute('aria-pressed', 'false');

    const updateIcon = () => {
      const effective = this.getEffectiveTheme();
      const isDark = effective === 'dark';
      button.setAttribute('aria-pressed', isDark.toString());
      button.innerHTML = isDark
        ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`
        : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
    };

    updateIcon();

    button.addEventListener('click', () => {
      this.toggleTheme();
      updateIcon();
    });

    // Update icon when theme changes
    this.subscribe(() => updateIcon());

    return button;
  }

  /** Create theme selector dropdown HTML */
  createThemeSelector(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'dropdown';

    const button = document.createElement('button');
    button.className = 'btn btn-secondary';
    button.innerHTML = `
      <span class="theme-label">Theme</span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    `;

    const menu = document.createElement('div');
    menu.className = 'dropdown-menu';
    menu.innerHTML = `
      <button class="dropdown-item" data-theme="light">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
        Light
      </button>
      <button class="dropdown-item" data-theme="dark">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
        Dark
      </button>
      <button class="dropdown-item" data-theme="auto">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"></rect><path d="M12 8v8"></path><path d="M8 12h8"></path></svg>
        Auto (System)
      </button>
    `;

    container.appendChild(button);
    container.appendChild(menu);

    // Toggle menu
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.classList.toggle('open');
    });

    // Close on outside click
    document.addEventListener('click', () => {
      menu.classList.remove('open');
    });

    // Handle selection
    menu.querySelectorAll('.dropdown-item').forEach(item => {
      item.addEventListener('click', () => {
        const theme = (item as HTMLElement).dataset.theme as ThemeMode;
        this.setTheme(theme);
        menu.classList.remove('open');
      });
    });

    // Update active state
    const updateActive = () => {
      menu.querySelectorAll('.dropdown-item').forEach(item => {
        const el = item as HTMLElement;
        el.classList.toggle('active', el.dataset.theme === this.currentTheme);
      });
    };

    updateActive();
    this.subscribe(updateActive);

    return container;
  }

  /** Cleanup */
  destroy(): void {
    this.mediaQuery?.removeEventListener('change', this.handleSystemThemeChange);
    window.removeEventListener('storage', this.handleStorageChange);
    this.listeners.clear();
  }
}

// Export singleton
export const themeEngine = new ThemeEngine();