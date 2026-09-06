/**
 * ModelSelector - Dropdown with search/filter for model selection
 * Supports categories, RAM filtering, uncensored toggle, search
 */

import { createElement, formatBytes } from '../utils/helpers.js';
import { ModelRegistry, type ModelInfo } from '../models/modelRegistry.js';

export interface ModelSelectorOptions {
  selectedModelId?: string;
  onSelect?: (model: ModelInfo) => void;
  onDownload?: (model: ModelInfo) => void;
  onDelete?: (model: ModelInfo) => void;
  showDownload?: boolean;
  showDelete?: boolean;
  filterRAM?: number; // GB
  filterCategory?: string;
  showUncensoredOnly?: boolean;
  placeholder?: string;
}

export class ModelSelector {
  private element: HTMLElement;
  private button: HTMLButtonElement;
  private dropdown: HTMLElement;
  private searchInput: HTMLInputElement;
  private listContainer: HTMLElement;
  private options: ModelSelectorOptions;
  private allModels: ModelInfo[] = [];
  private filteredModels: ModelInfo[] = [];
  private isOpen = false;
  private debouncedFilter: () => void;

  constructor(options: ModelSelectorOptions = {}) {
    this.options = {
      placeholder: 'Select a model...',
      showDownload: true,
      showDelete: false,
      ...options,
    };

    this.debouncedFilter = debounce(() => this.filterModels(), 150);
    this.allModels = ModelRegistry.getAllModels();
    this.filteredModels = [...this.allModels];
    this.element = this.createElement();
    this.bindEvents();
    this.applyFilters();
  }

  getElement(): HTMLElement {
    return this.element;
  }

  /** Update selected model */
  setSelectedModel(modelId: string): void {
    this.options.selectedModelId = modelId;
    this.updateButtonText();
    this.updateListSelection();
  }

  /** Get selected model */
  getSelectedModel(): ModelInfo | undefined {
    return this.allModels.find(m => m.id === this.options.selectedModelId);
  }

  /** Set filter options */
  setFilters(filters: Partial<ModelSelectorOptions>): void {
    this.options = { ...this.options, ...filters };
    this.applyFilters();
  }

  /** Refresh model list (e.g., after download) */
  refresh(): void {
    this.allModels = ModelRegistry.getAllModels();
    this.applyFilters();
  }

  /** Open dropdown */
  open(): void {
    if (this.isOpen) return;
    this.isOpen = true;
    this.dropdown.classList.add('open');
    this.button.setAttribute('aria-expanded', 'true');
    this.searchInput.focus();
    document.addEventListener('click', this.handleOutsideClick);
  }

  /** Close dropdown */
  close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.dropdown.classList.remove('open');
    this.button.setAttribute('aria-expanded', 'false');
    this.searchInput.value = '';
    this.filterModels();
    document.removeEventListener('click', this.handleOutsideClick);
  }

  /** Toggle dropdown */
  toggle(): void {
    if (this.isOpen) this.close(); else this.open();
  }

  private createElement(): HTMLElement {
    const wrapper = createElement('div', { class: 'model-selector' });

    // Trigger button
    this.button = createElement('button', {
      class: 'model-selector-btn',
      type: 'button',
      'aria-haspopup': 'listbox',
      'aria-expanded': 'false',
      'aria-label': 'Select model',
      children: [
        createElement('span', { class: 'model-selector-label', children: [this.options.placeholder!] }),
        createElement('span', { class: 'model-selector-arrow', children: ['▼'] }),
      ],
      onClick: () => this.toggle(),
    });

    // Dropdown
    this.dropdown = createElement('div', { class: 'model-selector-dropdown', role: 'listbox' });

    // Search input
    const searchWrapper = createElement('div', { class: 'model-selector-search' });
    this.searchInput = createElement('input', {
      type: 'search',
      class: 'model-search-input',
      placeholder: 'Search models...',
      'aria-label': 'Search models',
      onInput: () => this.debouncedFilter(),
    });
    searchWrapper.appendChild(this.searchInput);

    // Filter chips
    const filtersWrapper = createElement('div', { class: 'model-selector-filters' });
    this.createFilterChips(filtersWrapper);

    // List container
    this.listContainer = createElement('div', { class: 'model-selector-list', role: 'presentation' });
    this.renderList();

    this.dropdown.append(searchWrapper, filtersWrapper, this.listContainer);
    wrapper.append(this.button, this.dropdown);

    return wrapper;
  }

  private createFilterChips(container: HTMLElement): void {
    // RAM filter
    const ramOptions = [0, 4, 8, 16, 32];
    const ramGroup = createElement('div', { class: 'filter-group' });
    ramGroup.appendChild(createElement('span', { class: 'filter-label', children: ['RAM ≤'] }));
    const ramSelect = createElement('select', {
      class: 'filter-select',
      value: String(this.options.filterRAM || 0),
      onChange: (e) => {
        this.options.filterRAM = parseInt((e.target as HTMLSelectElement).value) || undefined;
        this.applyFilters();
      },
    });
    for (const gb of ramOptions) {
      const opt = createElement('option', { value: String(gb), children: [gb === 0 ? 'Any' : `${gb}GB`] });
      ramSelect.appendChild(opt);
    }
    ramGroup.appendChild(ramSelect);

    // Category filter
    const categories = ['all', 'chat', 'code', 'reasoning', 'multilingual', 'uncensored'];
    const catGroup = createElement('div', { class: 'filter-group' });
    catGroup.appendChild(createElement('span', { class: 'filter-label', children: ['Category'] }));
    const catSelect = createElement('select', {
      class: 'filter-select',
      value: this.options.filterCategory || 'all',
      onChange: (e) => {
        this.options.filterCategory = (e.target as HTMLSelectElement).value === 'all' ? undefined : (e.target as HTMLSelectElement).value;
        this.applyFilters();
      },
    });
    for (const cat of categories) {
      const opt = createElement('option', { value: cat, children: [cat.charAt(0).toUpperCase() + cat.slice(1)] });
      catSelect.appendChild(opt);
    }
    catGroup.appendChild(catSelect);

    // Uncensored toggle
    const uncensoredGroup = createElement('div', { class: 'filter-group' });
    const uncensoredCheck = createElement('input', {
      type: 'checkbox',
      class: 'filter-checkbox',
      id: 'filter-uncensored',
      checked: !!this.options.showUncensoredOnly,
      onChange: (e) => {
        this.options.showUncensoredOnly = (e.target as HTMLInputElement).checked;
        this.applyFilters();
      },
    });
    const uncensoredLabel = createElement('label', {
      for: 'filter-uncensored',
      class: 'filter-checkbox-label',
      children: ['Uncensored only'],
    });
    uncensoredGroup.append(uncensoredCheck, uncensoredLabel);

    container.append(ramGroup, catGroup, uncensoredGroup);
  }

  private bindEvents(): void {
    // Keyboard navigation
    this.button.addEventListener('keydown', (e) => this.handleKeydown(e));
    this.searchInput.addEventListener('keydown', (e) => this.handleKeydown(e));
    this.listContainer.addEventListener('keydown', (e) => this.handleKeydown(e));

    // Prevent dropdown close on internal clicks
    this.dropdown.addEventListener('click', (e) => e.stopPropagation());
  }

  private handleKeydown(e: KeyboardEvent): void {
    switch (e.key) {
      case 'Escape':
        this.close();
        this.button.focus();
        break;
      case 'ArrowDown':
        e.preventDefault();
        this.focusNextItem();
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.focusPrevItem();
        break;
      case 'Enter':
      case ' ':
        if (e.target === this.button || e.target === this.searchInput) {
          e.preventDefault();
          this.toggle();
        } else if (e.target instanceof HTMLElement && e.target.closest('.model-item')) {
          e.preventDefault();
          this.selectFocusedItem();
        }
        break;
      case 'Tab':
        if (!this.isOpen) return;
        if (e.shiftKey) {
          // Shift+Tab - handle focus leaving
        } else {
          // Tab - move to first item
          e.preventDefault();
          this.focusFirstItem();
        }
        break;
    }
  }

  private applyFilters(): void {
    let models = [...this.allModels];

    // RAM filter
    if (this.options.filterRAM) {
      models = models.filter(m => m.vramGB <= this.options.filterRAM!);
    }

    // Category filter
    if (this.options.filterCategory) {
      models = models.filter(m => m.category === this.options.filterCategory);
    }

    // Uncensored filter
    if (this.options.showUncensoredOnly) {
      models = models.filter(m => m.uncensored === true);
    }

    // Search filter
    const query = this.searchInput?.value.toLowerCase().trim() || '';
    if (query) {
      models = models.filter(m =>
        m.id.toLowerCase().includes(query) ||
        m.name.toLowerCase().includes(query) ||
        m.description?.toLowerCase().includes(query)
      );
    }

    this.filteredModels = models;
    this.renderList();
  }

  private filterModels(): void {
    this.applyFilters();
  }

  private renderList(): void {
    this.listContainer.innerHTML = '';

    if (this.filteredModels.length === 0) {
      const empty = createElement('div', {
        class: 'model-selector-empty',
        children: ['No models match your filters'],
      });
      this.listContainer.appendChild(empty);
      return;
    }

    for (const model of this.filteredModels) {
      const item = this.createModelItem(model);
      this.listContainer.appendChild(item);
    }
  }

  private createModelItem(model: ModelInfo): HTMLElement {
    const isSelected = model.id === this.options.selectedModelId;
    const isDownloaded = model.downloaded;

    const item = createElement('div', {
      class: `model-item ${isSelected ? 'selected' : ''} ${isDownloaded ? 'downloaded' : ''}`,
      role: 'option',
      'aria-selected': isSelected,
      'data-model-id': model.id,
      onClick: () => this.selectModel(model),
    });

    // Model info
    const info = createElement('div', { class: 'model-item-info' });

    // Name + badges
    const nameRow = createElement('div', { class: 'model-item-name-row' });
    const name = createElement('span', { class: 'model-item-name', children: [model.name] });
    nameRow.appendChild(name);

    // Badges
    if (model.uncensored) {
      nameRow.appendChild(createElement('span', { class: 'badge badge-uncensored', children: ['Uncensored'] }));
    }
    if (model.category) {
      nameRow.appendChild(createElement('span', { class: `badge badge-category badge-${model.category}`, children: [model.category] }));
    }
    info.appendChild(nameRow);

    // Details
    const details = createElement('div', { class: 'model-item-details' });
    const size = createElement('span', { class: 'model-item-size', children: [formatBytes(model.downloadSizeMB * 1024 * 1024)] });
    const vram = createElement('span', { class: 'model-item-vram', children: [`VRAM: ${model.vramGB}GB`] });
    const ctx = createElement('span', { class: 'model-item-ctx', children: [`Ctx: ${formatNumber(model.contextWindow)}`] });
    details.append(size, vram, ctx);
    info.appendChild(details);

    // Description
    if (model.description) {
      const desc = createElement('div', { class: 'model-item-desc', children: [model.description] });
      info.appendChild(desc);
    }

    // Actions
    const actions = createElement('div', { class: 'model-item-actions' });

    if (!isDownloaded && this.options.showDownload) {
      const downloadBtn = createElement('button', {
        class: 'model-action-btn download-btn',
        title: 'Download model',
        'aria-label': `Download ${model.name}`,
        children: ['⬇️'],
        onClick: (e) => {
          e.stopPropagation();
          if (this.options.onDownload) this.options.onDownload(model);
        },
      });
      actions.appendChild(downloadBtn);
    }

    if (isDownloaded && this.options.showDelete) {
      const deleteBtn = createElement('button', {
        class: 'model-action-btn delete-btn',
        title: 'Delete cached model',
        'aria-label': `Delete ${model.name}`,
        children: ['🗑️'],
        onClick: (e) => {
          e.stopPropagation();
          if (this.options.onDelete) this.options.onDelete(model);
        },
      });
      actions.appendChild(deleteBtn);
    }

    if (isSelected) {
      const check = createElement('span', { class: 'model-item-check', children: ['✓'] });
      actions.appendChild(check);
    }

    item.append(info, actions);
    return item;
  }

  private updateListSelection(): void {
    const items = this.listContainer.querySelectorAll('.model-item');
    for (const item of items) {
      const modelId = item.getAttribute('data-model-id');
      const isSelected = modelId === this.options.selectedModelId;
      item.classList.toggle('selected', isSelected);
      item.setAttribute('aria-selected', String(isSelected));

      // Update check mark
      const check = item.querySelector('.model-item-check');
      if (check) check.remove();
      if (isSelected) {
        const actions = item.querySelector('.model-item-actions');
        if (actions) {
          const checkEl = createElement('span', { class: 'model-item-check', children: ['✓'] });
          actions.appendChild(checkEl);
        }
      }
    }
  }

  private updateButtonText(): void {
    const label = this.button.querySelector('.model-selector-label');
    if (!label) return;

    const model = this.getSelectedModel();
    if (model) {
      label.textContent = model.name;
      this.button.classList.add('has-selection');
    } else {
      label.textContent = this.options.placeholder!;
      this.button.classList.remove('has-selection');
    }
  }

  private selectModel(model: ModelInfo): void {
    this.options.selectedModelId = model.id;
    this.updateButtonText();
    this.updateListSelection();
    this.close();

    if (this.options.onSelect) {
      this.options.onSelect(model);
    }
  }

  private focusFirstItem(): void {
    const first = this.listContainer.querySelector('.model-item') as HTMLElement;
    first?.focus();
  }

  private focusNextItem(): void {
    const items = Array.from(this.listContainer.querySelectorAll('.model-item')) as HTMLElement[];
    const currentIndex = items.findIndex(el => el === document.activeElement);
    const next = items[currentIndex + 1] || items[0];
    next?.focus();
  }

  private focusPrevItem(): void {
    const items = Array.from(this.listContainer.querySelectorAll('.model-item')) as HTMLElement[];
    const currentIndex = items.findIndex(el => el === document.activeElement);
    const prev = items[currentIndex - 1] || items[items.length - 1];
    prev?.focus();
  }

  private selectFocusedItem(): void {
    const focused = document.activeElement;
    if (focused?.classList.contains('model-item')) {
      const modelId = focused.getAttribute('data-model-id');
      const model = this.filteredModels.find(m => m.id === modelId);
      if (model) this.selectModel(model);
    }
  }

  private handleOutsideClick = (e: MouseEvent): void => {
    if (!this.element.contains(e.target as Node)) {
      this.close();
    }
  };
}

/** Debounce utility (local copy to avoid circular deps) */
function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/** Format number with commas (local copy) */
function formatNumber(num: number): string {
  return num.toLocaleString();
}

/** Create a compact model selector for chat header */
export function createCompactModelSelector(
  selectedModelId: string,
  onSelect: (model: ModelInfo) => void
): ModelSelector {
  return new ModelSelector({
    selectedModelId,
    onSelect,
    showDownload: false,
    showDelete: false,
    placeholder: 'Model',
  });
}