/**
 * ModelLibraryPage - Model picker with search, filter, download with progress
 */

import { createElement, formatBytes, formatNumber } from '../utils/helpers.js';
import { ModelSelector } from '../components/ModelSelector.js';
import { ModelRegistry, type ModelInfo } from '../models/modelRegistry.js';
import { CacheEngine } from '../services/cacheEngine.js';
import { WebLLMEngine } from '../services/webllmEngine.js';
import { StorageEngine } from '../services/storageEngine.js';

export class ModelLibraryPage {
  private element: HTMLElement;
  private modelSelector: ModelSelector;
  private modelCardsContainer: HTMLElement;
  private cacheEngine: CacheEngine;
  private webllmEngine: WebLLMEngine;
  private storageEngine: StorageEngine;
  private allModels: ModelInfo[] = [];
  private filteredModels: ModelInfo[] = [];
  private currentFilters = {
    ram: 0,
    category: '',
    uncensored: false,
    search: '',
  };

  constructor() {
    this.cacheEngine = CacheEngine.getInstance();
    this.webllmEngine = WebLLMEngine.getInstance();
    this.storageEngine = StorageEngine.getInstance();
    this.allModels = ModelRegistry.getAllModels();
    this.filteredModels = [...this.allModels];
    this.element = this.createElement();
    this.bindEvents();
    this.renderModelCards();
  }

  getElement(): HTMLElement {
    return this.element;
  }

  /** Called when page is shown */
  async onShow(): Promise<void> {
    await this.updateDownloadedStatus();
    this.renderModelCards();
  }

  private createElement(): HTMLElement {
    const page = createElement('div', { class: 'page model-library-page' });

    // Header
    const header = createElement('header', { class: 'page-header' });
    header.append(
      createElement('h1', { children: ['Model Library'] }),
      createElement('p', { class: 'page-subtitle', children: ['Browse and download 100+ models for local inference'] })
    );

    // Stats bar
    const statsBar = createElement('div', { class: 'model-stats-bar' });
    const totalModels = createElement('div', { class: 'stat', children: [
      createElement('span', { class: 'stat-value', children: [String(this.allModels.length)] }),
      createElement('span', { class: 'stat-label', children: ['Total Models'] }),
    ]});
    const downloadedModels = createElement('div', { class: 'stat', children: [
      createElement('span', { class: 'stat-value', id: 'downloaded-count', children: ['0'] }),
      createElement('span', { class: 'stat-label', children: ['Downloaded'] }),
    ]});
    const totalSize = createElement('div', { class: 'stat', children: [
      createElement('span', { class: 'stat-value', id: 'total-size', children: ['0 GB'] }),
      createElement('span', { class: 'stat-label', children: ['Cache Size'] }),
    ]});
    statsBar.append(totalModels, downloadedModels, totalSize);

    // Filters + Model Selector
    const filtersSection = createElement('div', { class: 'model-filters-section' });
    this.modelSelector = new ModelSelector({
      showDownload: true,
      showDelete: true,
      onDownload: (model) => this.downloadModel(model),
      onDelete: (model) => this.deleteModel(model),
    });
    filtersSection.appendChild(this.modelSelector.getElement());

    // Model cards grid
    this.modelCardsContainer = createElement('div', { class: 'model-cards-grid', id: 'model-cards' });

    page.append(header, statsBar, filtersSection, this.modelCardsContainer);
    return page;
  }

  private bindEvents(): void {
    // Listen for model selector filter changes
    const originalApplyFilters = this.modelSelector['applyFilters'].bind(this.modelSelector);
    this.modelSelector['applyFilters'] = () => {
      originalApplyFilters();
      this.syncFiltersFromSelector();
      this.renderModelCards();
    };
  }

  private syncFiltersFromSelector(): void {
    this.currentFilters = {
      ram: this.modelSelector['options'].filterRAM || 0,
      category: this.modelSelector['options'].filterCategory || '',
      uncensored: this.modelSelector['options'].showUncensoredOnly || false,
      search: this.modelSelector['searchInput']?.value?.toLowerCase().trim() || '',
    };
  }

  private async updateDownloadedStatus(): Promise<void> {
    // Get downloaded models from cache engine
    const cachedModels = await this.cacheEngine.getCachedModels();
    const cachedIds = new Set(cachedModels.map(m => m.modelId));

    // Update model downloaded status
    for (const model of this.allModels) {
      model.downloaded = cachedIds.has(model.id);
    }

    // Update stats
    const downloadedCount = this.allModels.filter(m => m.downloaded).length;
    const totalSizeBytes = this.allModels
      .filter(m => m.downloaded)
      .reduce((sum, m) => sum + m.downloadSizeMB * 1024 * 1024, 0);

    const downloadedEl = this.element.querySelector('#downloaded-count');
    const sizeEl = this.element.querySelector('#total-size');

    if (downloadedEl) downloadedEl.textContent = String(downloadedCount);
    if (sizeEl) sizeEl.textContent = formatBytes(totalSizeBytes);
  }

  private renderModelCards(): void {
    this.modelCardsContainer.innerHTML = '';

    // Apply filters
    let models = [...this.allModels];

    if (this.currentFilters.ram) {
      models = models.filter(m => m.vramGB <= this.currentFilters.ram);
    }
    if (this.currentFilters.category) {
      models = models.filter(m => m.category === this.currentFilters.category);
    }
    if (this.currentFilters.uncensored) {
      models = models.filter(m => m.uncensored === true);
    }
    if (this.currentFilters.search) {
      const q = this.currentFilters.search;
      models = models.filter(m =>
        m.id.toLowerCase().includes(q) ||
        m.name.toLowerCase().includes(q) ||
        m.description?.toLowerCase().includes(q)
      );
    }

    this.filteredModels = models;

    if (models.length === 0) {
      const empty = createElement('div', { class: 'model-library-empty', children: [
        createElement('div', { class: 'empty-icon', children: ['🔍'] }),
        createElement('h3', { children: ['No models found'] }),
        createElement('p', { children: ['Try adjusting your filters or search term'] }),
      ]});
      this.modelCardsContainer.appendChild(empty);
      return;
    }

    // Sort: downloaded first, then by name
    models.sort((a, b) => {
      if (a.downloaded !== b.downloaded) return b.downloaded ? 1 : -1;
      return a.name.localeCompare(b.name);
    });

    for (const model of models) {
      const card = this.createModelCard(model);
      this.modelCardsContainer.appendChild(card);
    }
  }

  private createModelCard(model: ModelInfo): HTMLElement {
    const card = createElement('div', {
      class: `model-card ${model.downloaded ? 'downloaded' : ''} ${model.uncensored ? 'uncensored' : ''}`,
      'data-model-id': model.id,
    });

    // Header with name and badges
    const header = createElement('div', { class: 'model-card-header' });
    const name = createElement('h3', { class: 'model-card-name', children: [model.name] });
    header.appendChild(name);

    const badges = createElement('div', { class: 'model-card-badges' });
    if (model.uncensored) {
      badges.appendChild(createElement('span', { class: 'badge badge-uncensored', children: ['Uncensored'] }));
    }
    if (model.category) {
      badges.appendChild(createElement('span', { class: `badge badge-category badge-${model.category}`, children: [model.category] }));
    }
    if (model.downloaded) {
      badges.appendChild(createElement('span', { class: 'badge badge-downloaded', children: ['Downloaded'] }));
    }
    header.appendChild(badges);

    // Description
    const desc = createElement('p', { class: 'model-card-desc', children: [model.description || 'No description available'] });

    // Specs
    const specs = createElement('div', { class: 'model-card-specs' });
    const specItems = [
      { label: 'VRAM', value: `${model.vramGB} GB`, icon: '💾' },
      { label: 'Context', value: formatNumber(model.contextWindow), icon: '📏' },
      { label: 'Size', value: formatBytes(model.downloadSizeMB * 1024 * 1024), icon: '📦' },
      { label: 'Architecture', value: model.architecture || 'Transformer', icon: '🏗️' },
    ];
    for (const spec of specItems) {
      const specEl = createElement('div', { class: 'spec-item' });
      specEl.append(
        createElement('span', { class: 'spec-icon', children: [spec.icon] }),
        createElement('span', { class: 'spec-label', children: [spec.label] }),
        createElement('span', { class: 'spec-value', children: [spec.value] })
      );
      specs.appendChild(specEl);
    }

    // Actions
    const actions = createElement('div', { class: 'model-card-actions' });

    if (!model.downloaded) {
      const downloadBtn = createElement('button', {
        class: 'btn btn-primary download-btn',
        type: 'button',
        children: ['⬇️ Download'],
        onClick: () => this.downloadModel(model),
      });
      actions.appendChild(downloadBtn);
    } else {
      const loadBtn = createElement('button', {
        class: 'btn btn-primary load-btn',
        type: 'button',
        children: ['🚀 Load in Chat'],
        onClick: () => this.loadModelInChat(model),
      });
      const deleteBtn = createElement('button', {
        class: 'btn btn-secondary delete-btn',
        type: 'button',
        children: ['🗑️ Remove'],
        onClick: () => this.deleteModel(model),
      });
      actions.append(loadBtn, deleteBtn);
    }

    // Progress bar (hidden initially)
    const progress = createElement('div', { class: 'model-card-progress hidden' });
    progress.appendChild(createElement('div', { class: 'progress-bar', children: [
      createElement('div', { class: 'progress-fill' }),
    ]}));
    progress.appendChild(createElement('span', { class: 'progress-text', children: ['0%'] }));

    card.append(header, desc, specs, actions, progress);
    return card;
  }

  private async downloadModel(model: ModelInfo): Promise<void> {
    const card = this.element.querySelector(`[data-model-id="${model.id}"]`) as HTMLElement;
    if (!card) return;

    const progressEl = card.querySelector('.model-card-progress') as HTMLElement;
    const progressFill = card.querySelector('.progress-fill') as HTMLElement;
    const progressText = card.querySelector('.progress-text') as HTMLElement;
    const downloadBtn = card.querySelector('.download-btn') as HTMLButtonElement;

    // Show progress
    progressEl.classList.remove('hidden');
    if (downloadBtn) downloadBtn.disabled = true;

    try {
      await this.webllmEngine.loadModel(model.id, (progress) => {
        progressFill.style.width = `${progress * 100}%`;
        progressText.textContent = `${Math.round(progress * 100)}%`;
      });

      // Mark as downloaded
      model.downloaded = true;
      await this.cacheEngine.cacheModel(model.id);

      // Update UI
      this.updateDownloadedStatus();
      this.renderModelCards();
      this.modelSelector.refresh();

      this.showToast(`${model.name} downloaded successfully`, 'success');
    } catch (error) {
      console.error('[ModelLibraryPage] Download failed:', error);
      this.showToast(`Failed to download ${model.name}`, 'error');
      progressEl.classList.add('hidden');
      if (downloadBtn) downloadBtn.disabled = false;
    }
  }

  private async deleteModel(model: ModelInfo): Promise<void> {
    if (!confirm(`Remove ${model.name} from local cache?`)) return;

    try {
      await this.cacheEngine.removeModel(model.id);
      model.downloaded = false;

      this.updateDownloadedStatus();
      this.renderModelCards();
      this.modelSelector.refresh();

      this.showToast(`${model.name} removed from cache`, 'success');
    } catch (error) {
      console.error('[ModelLibraryPage] Delete failed:', error);
      this.showToast('Failed to remove model', 'error');
    }
  }

  private loadModelInChat(model: ModelInfo): void {
    // Navigate to chat page with this model selected
    window.location.hash = '#chat';
    // The chat page will pick up the model selection
    // We could also use a custom event
    const event = new CustomEvent('model-selected', { detail: { modelId: model.id } });
    window.dispatchEvent(event);
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