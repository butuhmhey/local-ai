/**
 * SettingsPage - App settings: theme, auto-compact, defaults, cache management
 */

import { createElement, formatBytes } from '../utils/helpers.js';
import { themeEngine } from '../services/themeEngine.js';
import { cacheEngine } from '../services/cacheEngine.js';
import { storageEngine } from '../services/storageEngine.js';
import { memoryEngine } from '../services/memoryEngine.js';
import { modelRegistry } from '../models/modelRegistry.js';
import type { AppSettings } from '../types/index.js';

export class SettingsPage {
  private element: HTMLElement;
  private settings: AppSettings;

  constructor() {
    this.settings = this.getDefaultSettings();
    this.element = this.createElement();
    this.bindEvents();
    this.loadSettings();
  }

  getElement(): HTMLElement {
    return this.element;
  }

  /** Called when page is shown */
  async onShow(): Promise<void> {
    await this.updateCacheStats();
  }

  private getDefaultSettings(): AppSettings {
    return {
      theme: 'auto',
      autoCompactThreshold: 75,
      recentMessageCount: 10,
      defaultModelId: modelRegistry.getDefault(8)?.id || '',
      autoDownloadModels: false,
      compactOnModelSwitch: true,
      showTokenCount: true,
      enableStreaming: true,
    };
  }

  private createElement(): HTMLElement {
    const page = createElement('div', { class: 'page settings-page' });

    // Header
    const header = createElement('header', { class: 'page-header' });
    header.append(
      createElement('h1', { children: ['Settings'] }),
      createElement('p', { class: 'page-subtitle', children: ['Configure your local AI chat experience'] })
    );

    const main = createElement('main', { class: 'settings-main' });

    // Theme section
    main.appendChild(this.createThemeSection());

    // Chat section
    main.appendChild(this.createChatSection());

    // Memory section
    main.appendChild(this.createMemorySection());

    // Models section
    main.appendChild(this.createModelsSection());

    // Data section
    main.appendChild(this.createDataSection());

    // About section
    main.appendChild(this.createAboutSection());

    page.append(header, main);
    return page;
  }

  private createThemeSection(): HTMLElement {
    const section = createElement('section', { class: 'settings-section card' });
    section.appendChild(createElement('h2', { children: ['🎨 Appearance'] }));

    // Theme selector
    const themeGroup = createElement('div', { class: 'setting-group' });
    themeGroup.append(
      createElement('label', { for: 'setting-theme', children: ['Theme'] }),
      createElement('select', {
        id: 'setting-theme',
        class: 'form-select',
        value: this.settings.theme,
        onChange: (e: Event) => this.updateSetting('theme', (e.target as HTMLSelectElement).value as 'light' | 'dark' | 'auto'),
        children: [
          createElement('option', { value: 'light', children: ['☀️ Light'] }),
          createElement('option', { value: 'dark', children: ['🌙 Dark'] }),
          createElement('option', { value: 'auto', children: ['🖥️ System (Auto)'] }),
        ],
      })
    );

    section.appendChild(themeGroup);
    return section;
  }

  private createChatSection(): HTMLElement {
    const section = createElement('section', { class: 'settings-section card' });
    section.appendChild(createElement('h2', { children: ['💬 Chat'] }));

    // Default model
    const modelGroup = createElement('div', { class: 'setting-group' });
    const models = modelRegistry.getAllModels();
    modelGroup.append(
      createElement('label', { for: 'setting-default-model', children: ['Default Model'] }),
      createElement('select', {
        id: 'setting-default-model',
        class: 'form-select',
        value: this.settings.defaultModelId,
        onChange: (e: Event) => this.updateSetting('defaultModelId', (e.target as HTMLSelectElement).value),
        children: [
          createElement('option', { value: '', children: ['-- Auto (last used) --'] }),
          ...models.map(m => createElement('option', { value: m.id, children: [m.name] })),
        ],
      })
    );

    // Recent message count
    const recentGroup = createElement('div', { class: 'setting-group' });
    recentGroup.append(
      createElement('label', { for: 'setting-recent-count', children: ['Recent Messages in Context'] }),
      createElement('input', {
        type: 'number',
        id: 'setting-recent-count',
        class: 'form-input',
        min: '5',
        max: '50',
        value: String(this.settings.recentMessageCount),
        onChange: (e: Event) => this.updateSetting('recentMessageCount', parseInt((e.target as HTMLInputElement).value)),
      }),
      createElement('span', { class: 'setting-hint', children: ['Number of recent messages to keep uncompressed'] })
    );

    section.append(modelGroup, recentGroup);
    return section;
  }

  private createMemorySection(): HTMLElement {
    const section = createElement('section', { class: 'settings-section card' });
    section.appendChild(createElement('h2', { children: ['🧠 Memory & Compaction'] }));

    // Auto-compact toggle
    const autoCompactGroup = createElement('div', { class: 'setting-group checkbox-group' });
    const autoCompactLabel = createElement('label', { class: 'checkbox-label' });
    autoCompactLabel.append(
      createElement('input', {
        type: 'checkbox',
        id: 'setting-auto-compact',
        checked: this.settings.autoCompactThreshold > 0,
        onChange: (e: Event) => this.updateSetting('autoCompactThreshold', (e.target as HTMLInputElement).checked ? 75 : 0),
      }),
      createElement('span', { children: ['Enable automatic conversation compaction'] })
    );
    autoCompactGroup.appendChild(autoCompactLabel);

    // Compact threshold
    const thresholdGroup = createElement('div', { class: 'setting-group' });
    thresholdGroup.append(
      createElement('label', { for: 'setting-compact-threshold', children: ['Compaction Trigger Threshold'] }),
      createElement('input', {
        type: 'range',
        id: 'setting-compact-threshold',
        class: 'form-range',
        min: '0.5',
        max: '0.95',
        step: '0.05',
        value: String(this.settings.autoCompactThreshold / 100),
        onInput: (e: Event) => {
          const val = parseFloat((e.target as HTMLInputElement).value);
          this.updateSetting('autoCompactThreshold', Math.round(val * 100));
          (thresholdGroup.querySelector('.range-value') as HTMLElement).textContent = `${Math.round(val * 100)}%`;
        },
      }),
      createElement('span', { class: 'range-value', children: [`${this.settings.autoCompactThreshold}%`] }),
      createElement('span', { class: 'setting-hint', children: ['Compact when context usage reaches this percentage'] })
    );

    // Force compact button
    const forceCompactGroup = createElement('div', { class: 'setting-group' });
    forceCompactGroup.append(
      createElement('button', {
        class: 'btn btn-secondary',
        children: ['🗜️ Compact All Conversations Now'],
        onClick: () => this.forceCompactAll(),
      })
    );

    section.append(autoCompactGroup, thresholdGroup, forceCompactGroup);
    return section;
  }

  private createModelsSection(): HTMLElement {
    const section = createElement('section', { class: 'settings-section card' });
    section.appendChild(createElement('h2', { children: ['🤖 Models'] }));

    // Auto-download
    const autoDownloadGroup = createElement('div', { class: 'setting-group checkbox-group' });
    const autoDownloadLabel = createElement('label', { class: 'checkbox-label' });
    autoDownloadLabel.append(
      createElement('input', {
        type: 'checkbox',
        id: 'setting-auto-download',
        checked: this.settings.autoDownloadModels,
        onChange: (e: Event) => this.updateSetting('autoDownloadModels', (e.target as HTMLInputElement).checked),
      }),
      createElement('span', { children: ['Auto-download models when selected in chat'] })
    );
    autoDownloadGroup.appendChild(autoDownloadLabel);

    // Clear model cache
    const cacheGroup = createElement('div', { class: 'setting-group' });
    cacheGroup.append(
      createElement('button', {
        class: 'btn btn-warning',
        children: ['🗑️ Clear Model Cache'],
        onClick: () => this.clearModelCache(),
      }),
      createElement('span', { class: 'setting-hint', id: 'cache-size', children: ['Cached models: calculating...'] })
    );

    section.append(autoDownloadGroup, cacheGroup);
    return section;
  }

  private createDataSection(): HTMLElement {
    const section = createElement('section', { class: 'settings-section card' });
    section.appendChild(createElement('h2', { children: ['💾 Data Management'] }));

    // Export all data
    const exportGroup = createElement('div', { class: 'setting-group' });
    exportGroup.append(
      createElement('button', {
        class: 'btn btn-secondary',
        children: ['📤 Export All Data (JSON)'],
        onClick: () => this.exportAllData(),
      }),
      createElement('span', { class: 'setting-hint', children: ['Download complete backup of chats, memory, and settings'] })
    );

    // Import data
    const importGroup = createElement('div', { class: 'setting-group' });
    const fileInput = createElement('input', {
      type: 'file',
      id: 'import-data-file',
      class: 'file-input',
      accept: '.json',
      style: 'display: none;',
      onChange: (e: Event) => this.importData(e.target as HTMLInputElement),
    });
    importGroup.append(
      createElement('button', {
        class: 'btn btn-secondary',
        children: ['📥 Import Data (JSON)'],
        onClick: () => fileInput.click(),
      }),
      fileInput,
      createElement('span', { class: 'setting-hint', children: ['Restore from a previous backup'] })
    );

    // Clear all data
    const clearGroup = createElement('div', { class: 'setting-group danger-zone' });
    clearGroup.append(
      createElement('h4', { children: ['Danger Zone'] }),
      createElement('button', {
        class: 'btn btn-danger',
        children: ['🗑️ Clear ALL Data'],
        onClick: () => this.clearAllData(),
      }),
      createElement('span', { class: 'setting-hint', children: ['Permanently delete all chats, memory, and settings'] })
    );

    section.append(exportGroup, importGroup, clearGroup);
    return section;
  }

  private createAboutSection(): HTMLElement {
    const section = createElement('section', { class: 'settings-section card' });
    section.appendChild(createElement('h2', { children: ['ℹ️ About'] }));

    const info = createElement('div', { class: 'about-info' });
    info.append(
      createElement('p', { children: ['Local AI Chat v1.0.0'] }),
      createElement('p', { children: ['100% local, privacy-first LLM chat running in your browser via WebGPU'] }),
      createElement('p', { children: ['Powered by WebLLM (MLC-LLM) • Built with TypeScript + Vite'] }),
      createElement('p', { children: ['Open source • Zero cost • No account required'] })
    );

    const links = createElement('div', { class: 'about-links' });
    links.append(
      createElement('a', { href: 'https://github.com/mlc-ai/web-llm', target: '_blank', rel: 'noopener', children: ['WebLLM'] }),
      createElement('span', { children: ['•'] }),
      createElement('a', { href: 'https://github.com/butuhmhey/local-ai', target: '_blank', rel: 'noopener', children: ['Source Code'] }),
      createElement('span', { children: ['•'] }),
      createElement('a', { href: 'https://github.com/butuhmhey/local-ai/issues', target: '_blank', rel: 'noopener', children: ['Report Issue'] })
    );

    section.append(info, links);
    return section;
  }

  private bindEvents(): void {
    // Theme change listener
    window.addEventListener('theme-changed', (e: any) => {
      this.settings.theme = e.detail.theme;
      this.updateThemeUI();
    });
  }

  private loadSettings(): void {
    // Load from localStorage
    try {
      const stored = localStorage.getItem('app-settings');
      if (stored) {
        this.settings = { ...this.getDefaultSettings(), ...JSON.parse(stored) };
      }
    } catch {}

    // Apply to UI
    this.updateThemeUI();
    this.updateFormValues();
  }

  private updateFormValues(): void {
    (this.element.querySelector('#setting-theme') as HTMLSelectElement).value = this.settings.theme;
    (this.element.querySelector('#setting-default-model') as HTMLSelectElement).value = this.settings.defaultModelId || '';
    (this.element.querySelector('#setting-recent-count') as HTMLInputElement).value = String(this.settings.recentMessageCount);
    (this.element.querySelector('#setting-auto-compact') as HTMLInputElement).checked = this.settings.autoCompactThreshold > 0;
    (this.element.querySelector('#setting-compact-threshold') as HTMLInputElement).value = String(this.settings.autoCompactThreshold / 100);
    (this.element.querySelector('#setting-auto-download') as HTMLInputElement).checked = this.settings.autoDownloadModels;
    (this.element.querySelector('.range-value') as HTMLElement).textContent = `${this.settings.autoCompactThreshold}%`;
  }

  private updateThemeUI(): void {
    const select = this.element.querySelector('#setting-theme') as HTMLSelectElement;
    if (select) select.value = this.settings.theme;
  }

  private updateSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    (this.settings as any)[key] = value;
    this.saveSettings();

    // Apply immediately for certain settings
    if (key === 'theme') {
      themeEngine.setTheme(value as 'light' | 'dark' | 'auto');
    }
    if (key === 'autoCompactThreshold') {
      memoryEngine.setAutoCompactSettings(this.settings.autoCompactThreshold > 0, this.settings.autoCompactThreshold / 100);
    }
  }

  private saveSettings(): void {
    localStorage.setItem('app-settings', JSON.stringify(this.settings));
  }

  private async updateCacheStats(): Promise<void> {
    try {
      const cachedModels = await cacheEngine.getCachedModels();
      const totalSize = cachedModels.reduce((sum, m) => sum + m.size, 0);
      const el = this.element.querySelector('#cache-size');
      if (el) {
        el.textContent = `Cached models: ${cachedModels.length} (${formatBytes(totalSize)})`;
      }
    } catch (error) {
      console.error('[SettingsPage] Failed to get cache stats:', error);
    }
  }

  private async forceCompactAll(): Promise<void> {
    const btn = this.element.querySelector('.settings-section button[onclick*="forceCompactAll"]') as HTMLButtonElement;
    btn.disabled = true;
    btn.textContent = 'Compacting...';

    try {
      const chats = await storageEngine.getAllChats();
      for (const chat of chats) {
        const messages = await storageEngine.getMessages(chat.id);
        await memoryEngine.maybeCompact(messages, chat.id);
      }
      this.showToast('All conversations compacted', 'success');
    } catch (error) {
      console.error('[SettingsPage] Force compact failed:', error);
      this.showToast('Compaction failed', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = '🗜️ Compact All Conversations Now';
    }
  }

  private async clearModelCache(): Promise<void> {
    if (!confirm('Remove all downloaded models from cache? They will need to be re-downloaded.')) return;

    try {
      await cacheEngine.clearAllCaches();
      this.showToast('Model cache cleared', 'success');
      await this.updateCacheStats();
    } catch (error) {
      console.error('[SettingsPage] Clear cache failed:', error);
      this.showToast('Failed to clear cache', 'error');
    }
  }

  private async exportAllData(): Promise<void> {
    try {
      const data = await storageEngine.exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = createElement('a', { href: url, download: `local-ai-backup-${Date.now()}.json` });
      a.click();
      URL.revokeObjectURL(url);
      this.showToast('All data exported', 'success');
    } catch (error) {
      console.error('[SettingsPage] Export failed:', error);
      this.showToast('Export failed', 'error');
    }
  }

  private async importData(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    if (!file) return;

    try {
      const content = await file.text();
      const data = JSON.parse(content);
      await storageEngine.importAllData(data);
      this.showToast('Data imported successfully', 'success');
      window.dispatchEvent(new CustomEvent('chats-updated'));
      window.dispatchEvent(new CustomEvent('settings-updated'));
    } catch (error) {
      console.error('[SettingsPage] Import failed:', error);
      this.showToast('Import failed: invalid file', 'error');
    } finally {
      input.value = '';
    }
  }

  private async clearAllData(): Promise<void> {
    if (!confirm('⚠️ THIS WILL DELETE EVERYTHING: all chats, memory, settings, and cached models. Are you absolutely sure?')) return;
    if (!confirm('Final confirmation: Type "DELETE" in the next prompt to confirm.')) return;

    const input = prompt('Type DELETE to confirm:');
    if (input !== 'DELETE') {
      this.showToast('Cancelled', 'info');
      return;
    }

    try {
      await storageEngine.clearAll();
      await cacheEngine.clearAllCaches();
      localStorage.removeItem('app-settings');
      this.settings = this.getDefaultSettings();
      this.updateFormValues();
      themeEngine.setTheme('auto');
      this.showToast('All data cleared', 'success');
      window.dispatchEvent(new CustomEvent('chats-updated'));
      window.dispatchEvent(new CustomEvent('settings-updated'));
    } catch (error) {
      console.error('[SettingsPage] Clear all failed:', error);
      this.showToast('Failed to clear data', 'error');
    }
  }

  private showToast(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success'): void {
    const toast = createElement('div', {
      class: `toast toast-${type}`,
      children: [message],
    });
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, type === 'error' ? 5000 : 3000);
  }
}