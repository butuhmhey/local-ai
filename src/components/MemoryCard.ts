/**
 * MemoryCard - Display component for memory layers and facts
 * Shows hierarchical memory: L0 (raw), L1 (summaries), L2 (meta), Facts
 */

import { createElement, formatRelativeTime, formatNumber, escapeHtml, truncate } from '../utils/helpers.js';
import type { MemoryFact, MemorySummary, MemoryLayer } from '../types/index.js';

export interface MemoryCardOptions {
  /** Memory layer type */
  layer: 'level0' | 'level1' | 'level2' | 'facts';
  /** Data to display */
  data: MemorySummary[] | MemoryFact[];
  /** Click handler for items */
  onItemClick?: (item: MemorySummary | MemoryFact) => void;
  /** Edit handler for facts */
  onFactEdit?: (fact: MemoryFact, newContent: Partial<MemoryFact>) => void;
  /** Delete handler */
  onDelete?: (id: string) => void;
  /** Show actions (edit/delete) */
  showActions?: boolean;
  /** Maximum items to show before "show more" */
  maxItems?: number;
  /** Empty state message */
  emptyMessage?: string;
}

export class MemoryCard {
  private element: HTMLElement;
  private options: MemoryCardOptions;
  private visibleCount: number;
  private isExpanded = false;

  constructor(options: MemoryCardOptions) {
    this.options = {
      showActions: true,
      maxItems: 10,
      emptyMessage: 'No data',
      ...options,
    };
    this.visibleCount = this.options.maxItems!;
    this.element = this.createElement();
  }

  getElement(): HTMLElement {
    return this.element;
  }

  /** Update data */
  setData(data: MemorySummary[] | MemoryFact[]): void {
    this.options.data = data;
    this.visibleCount = this.options.maxItems!;
    this.isExpanded = false;
    this.renderContent();
  }

  /** Add new item */
  addItem(item: MemorySummary | MemoryFact): void {
    this.options.data.unshift(item);
    this.renderContent();
  }

  /** Remove item */
  removeItem(id: string): void {
    this.options.data = this.options.data.filter(item => item.id !== id);
    this.renderContent();
  }

  /** Update fact */
  updateFact(fact: MemoryFact): void {
    const index = this.options.data.findIndex((f: any) => f.id === fact.id);
    if (index >= 0) {
      this.options.data[index] = fact;
      this.renderContent();
    }
  }

  /** Expand to show all items */
  expand(): void {
    this.isExpanded = true;
    this.visibleCount = this.options.data.length;
    this.renderContent();
  }

  /** Collapse to max items */
  collapse(): void {
    this.isExpanded = false;
    this.visibleCount = this.options.maxItems!;
    this.renderContent();
  }

  private createElement(): HTMLElement {
    const card = createElement('div', { class: `memory-card memory-card-${this.options.layer}` });

    // Header
    const header = createElement('div', { class: 'memory-card-header' });
    const title = createElement('h3', { class: 'memory-card-title', children: [this.getLayerTitle()] });
    const count = createElement('span', { class: 'memory-card-count', children: [this.getCountText()] });
    header.append(title, count);

    // Expand button (if more items than max)
    if (this.options.data.length > this.options.maxItems!) {
      const expandBtn = createElement('button', {
        class: 'memory-card-expand',
        type: 'button',
        'aria-label': 'Show all',
        children: ['Show more'],
        onClick: () => this.toggleExpand(),
      });
      header.appendChild(expandBtn);
    }

    // Content
    const content = createElement('div', { class: 'memory-card-content' });
    this.renderContent(content);

    card.append(header, content);
    return card;
  }

  private renderContent(container?: HTMLElement): void {
    const target = container || this.element.querySelector('.memory-card-content');
    if (!target) return;

    target.innerHTML = '';

    if (this.options.data.length === 0) {
      const empty = createElement('div', { class: 'memory-card-empty', children: [this.options.emptyMessage] });
      target.appendChild(empty);
      return;
    }

    const itemsToShow = this.options.data.slice(0, this.visibleCount);

    for (const item of itemsToShow) {
      const itemEl = this.createItemElement(item);
      target.appendChild(itemEl);
    }

    // Show more/less button
    if (this.options.data.length > this.visibleCount) {
      const moreBtn = createElement('button', {
        class: 'memory-card-more',
        type: 'button',
        children: [this.isExpanded ? `Show less (${this.options.data.length - this.visibleCount} hidden)` : `Show ${this.options.data.length - this.visibleCount} more`],
        onClick: () => this.toggleExpand(),
      });
      target.appendChild(moreBtn);
    }
  }

  private createItemElement(item: MemorySummary | MemoryFact): HTMLElement {
    const isFact = 'entity' in item;
    const itemEl = createElement('div', {
      class: `memory-item ${isFact ? 'fact' : 'summary'} ${this.options.layer}`,
      'data-id': item.id,
      onClick: () => this.options.onItemClick?.(item),
    });

    if (isFact) {
      return this.createFactElement(item as MemoryFact, itemEl);
    } else {
      return this.createSummaryElement(item as MemorySummary, itemEl);
    }
  }

  private createFactElement(fact: MemoryFact, container: HTMLElement): HTMLElement {
    // Fact header with entity/relation/value
    const header = createElement('div', { class: 'fact-header' });

    const entity = createElement('span', { class: 'fact-entity', children: [escapeHtml(fact.entity)] });
    const relation = createElement('span', { class: 'fact-relation', children: [escapeHtml(fact.relation)] });
    const value = createElement('span', { class: 'fact-value', children: [escapeHtml(fact.value)] });

    header.append(entity, relation, value);

    // Confidence badge
    const confidence = createElement('span', {
      class: `fact-confidence confidence-${this.getConfidenceClass(fact.confidence)}`,
      children: [`${Math.round(fact.confidence * 100)}%`],
    });
    header.appendChild(confidence);

    // Source reference
    if (fact.sourceMessageIds && fact.sourceMessageIds.length > 0) {
      const source = createElement('div', { class: 'fact-source' });
      source.appendChild(createElement('span', { class: 'source-label', children: ['Source:'] }));
      for (const msgId of fact.sourceMessageIds.slice(0, 3)) {
        source.appendChild(createElement('span', { class: 'source-msg-id', children: [msgId.slice(0, 8)] }));
      }
      if (fact.sourceMessageIds.length > 3) {
        source.appendChild(createElement('span', { class: 'source-more', children: [`+${fact.sourceMessageIds.length - 3} more`] }));
      }
      container.append(header, source);
    } else {
      container.appendChild(header);
    }

    // Actions
    if (this.options.showActions) {
      const actions = createElement('div', { class: 'fact-actions' });

      const editBtn = createElement('button', {
        class: 'action-btn edit-btn',
        'aria-label': 'Edit fact',
        children: ['✏️'],
        onClick: (e) => {
          e.stopPropagation();
          this.editFact(fact);
        },
      });

      const deleteBtn = createElement('button', {
        class: 'action-btn delete-btn',
        'aria-label': 'Delete fact',
        children: ['🗑️'],
        onClick: (e) => {
          e.stopPropagation();
          this.deleteFact(fact);
        },
      });

      actions.append(editBtn, deleteBtn);
      container.appendChild(actions);
    }

    // Timestamp
    const meta = createElement('div', { class: 'fact-meta' });
    meta.appendChild(createElement('span', { class: 'fact-time', children: [formatRelativeTime(fact.timestamp)] }));
    if (fact.extractedAt) {
      meta.appendChild(createElement('span', { class: 'fact-extracted', children: [`Extracted: ${formatRelativeTime(fact.extractedAt)}`] }));
    }
    container.appendChild(meta);

    return container;
  }

  private createSummaryElement(summary: MemorySummary, container: HTMLElement): HTMLElement {
    // Summary content
    const content = createElement('div', { class: 'summary-content' });
    content.textContent = truncate(summary.content, 300);

    // Metadata
    const meta = createElement('div', { class: 'summary-meta' });

    const level = createElement('span', { class: `summary-level level-${summary.level}`, children: [`L${summary.level}`] });
    const tokens = createElement('span', { class: 'summary-tokens', children: [`${formatNumber(summary.tokens)} tokens`] });
    const time = createElement('span', { class: 'summary-time', children: [formatRelativeTime(summary.timestamp)] });
    const msgCount = createElement('span', { class: 'summary-msg-count', children: [`${summary.messageCount} msgs`] });

    meta.append(level, tokens, time, msgCount);

    // Source range
    if (summary.sourceRange) {
      const range = createElement('span', { class: 'summary-range', children: [`#${summary.sourceRange.start}-${summary.sourceRange.end}`] });
      meta.appendChild(range);
    }

    container.append(content, meta);

    // Actions
    if (this.options.showActions) {
      const actions = createElement('div', { class: 'summary-actions' });

      const viewBtn = createElement('button', {
        class: 'action-btn view-btn',
        'aria-label': 'View full summary',
        children: ['👁️'],
        onClick: (e) => {
          e.stopPropagation();
          this.viewSummary(summary);
        },
      });

      const deleteBtn = createElement('button', {
        class: 'action-btn delete-btn',
        'aria-label': 'Delete summary',
        children: ['🗑️'],
        onClick: (e) => {
          e.stopPropagation();
          this.deleteSummary(summary);
        },
      });

      actions.append(viewBtn, deleteBtn);
      container.appendChild(actions);
    }

    return container;
  }

  private getLayerTitle(): string {
    switch (this.options.layer) {
      case 'level0': return 'Recent Messages (L0)';
      case 'level1': return 'Summaries (L1)';
      case 'level2': return 'Meta-Summaries (L2)';
      case 'facts': return 'Extracted Facts';
      default: return 'Memory';
    }
  }

  private getCountText(): string {
    const count = this.options.data.length;
    if (this.options.layer === 'facts') {
      return `${count} fact${count !== 1 ? 's' : ''}`;
    }
    return `${count} item${count !== 1 ? 's' : ''}`;
  }

  private getConfidenceClass(confidence: number): string {
    if (confidence >= 0.8) return 'high';
    if (confidence >= 0.5) return 'medium';
    return 'low';
  }

  private toggleExpand(): void {
    if (this.isExpanded) {
      this.collapse();
    } else {
      this.expand();
    }
  }

  private editFact(fact: MemoryFact): void {
    // Create inline edit form
    const itemEl = this.element.querySelector(`[data-id="${fact.id}"]`) as HTMLElement;
    if (!itemEl) return;

    const originalHtml = itemEl.innerHTML;

    const form = createElement('form', { class: 'fact-edit-form' });

    const entityInput = createElement('input', {
      type: 'text',
      class: 'edit-input',
      value: fact.entity,
      required: true,
      'aria-label': 'Entity',
    });
    const relationInput = createElement('input', {
      type: 'text',
      class: 'edit-input',
      value: fact.relation,
      required: true,
      'aria-label': 'Relation',
    });
    const valueInput = createElement('input', {
      type: 'text',
      class: 'edit-input',
      value: fact.value,
      required: true,
      'aria-label': 'Value',
    });
    const confidenceInput = createElement('input', {
      type: 'range',
      class: 'edit-confidence',
      min: '0',
      max: '1',
      step: '0.1',
      value: String(fact.confidence),
      'aria-label': 'Confidence',
    });
    const confidenceLabel = createElement('span', { class: 'confidence-value', children: [`${Math.round(fact.confidence * 100)}%`] });
    confidenceInput.addEventListener('input', () => {
      confidenceLabel.textContent = `${Math.round(parseFloat(confidenceInput.value) * 100)}%`;
    });

    const saveBtn = createElement('button', {
      type: 'submit',
      class: 'btn btn-primary btn-sm',
      children: ['Save'],
    });
    const cancelBtn = createElement('button', {
      type: 'button',
      class: 'btn btn-secondary btn-sm',
      children: ['Cancel'],
      onClick: () => {
        itemEl.innerHTML = originalHtml;
      },
    });

    form.append(
      createElement('div', { class: 'edit-row', children: [createElement('label', { children: ['Entity'] }), entityInput] }),
      createElement('div', { class: 'edit-row', children: [createElement('label', { children: ['Relation'] }), relationInput] }),
      createElement('div', { class: 'edit-row', children: [createElement('label', { children: ['Value'] }), valueInput] }),
      createElement('div', { class: 'edit-row', children: [createElement('label', { children: ['Confidence'] }), confidenceInput, confidenceLabel] }),
      createElement('div', { class: 'edit-actions', children: [saveBtn, cancelBtn] })
    );

    itemEl.innerHTML = '';
    itemEl.appendChild(form);
    entityInput.focus();

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const updatedFact: Partial<MemoryFact> = {
        entity: entityInput.value.trim(),
        relation: relationInput.value.trim(),
        value: valueInput.value.trim(),
        confidence: parseFloat(confidenceInput.value),
      };
      this.options.onFactEdit?.(fact, updatedFact);
    });
  }

  private deleteFact(fact: MemoryFact): void {
    if (confirm(`Delete fact "${fact.entity} ${fact.relation} ${fact.value}"?`)) {
      this.options.onDelete?.(fact.id);
    }
  }

  private viewSummary(summary: MemorySummary): void {
    // Show full summary in a modal or expanded view
    const modal = createElement('div', { class: 'modal summary-modal' });
    modal.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3>Summary (L${summary.level})</h3>
          <button class="modal-close" aria-label="Close">✕</button>
        </div>
        <div class="modal-body">
          <div class="summary-full-content">${escapeHtml(summary.content)}</div>
          <div class="summary-full-meta">
            <span>Tokens: ${formatNumber(summary.tokens)}</span>
            <span>Messages: ${summary.messageCount}</span>
            <span>Created: ${formatRelativeTime(summary.timestamp)}</span>
            ${summary.sourceRange ? `<span>Range: #${summary.sourceRange.start}-${summary.sourceRange.end}</span>` : ''}
          </div>
        </div>
      </div>
    `;

    const close = () => {
      modal.classList.add('closing');
      setTimeout(() => modal.remove(), 200);
    };

    modal.querySelector('.modal-backdrop')?.addEventListener('click', close);
    modal.querySelector('.modal-close')?.addEventListener('click', close);
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
    });

    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('open'), 10);
  }

  private deleteSummary(summary: MemorySummary): void {
    if (confirm(`Delete this summary (${summary.tokens} tokens)?`)) {
      this.options.onDelete?.(summary.id);
    }
  }
}

/** Create a set of memory cards for all layers */
export function createMemoryCardSet(
  data: {
    level0: MemorySummary[];
    level1: MemorySummary[];
    level2: MemorySummary[];
    facts: MemoryFact[];
  },
  handlers: {
    onItemClick?: (item: MemorySummary | MemoryFact) => void;
    onFactEdit?: (fact: MemoryFact, newContent: Partial<MemoryFact>) => void;
    onDelete?: (id: string) => void;
  }
): HTMLElement {
  const container = createElement('div', { class: 'memory-card-set' });

  const layers: Array<{ layer: 'level0' | 'level1' | 'level2' | 'facts'; data: any }> = [
    { layer: 'level0', data: data.level0 },
    { layer: 'level1', data: data.level1 },
    { layer: 'level2', data: data.level2 },
    { layer: 'facts', data: data.facts },
  ];

  for (const { layer, data: layerData } of layers) {
    const card = new MemoryCard({
      layer,
      data: layerData,
      onItemClick: handlers.onItemClick,
      onFactEdit: handlers.onFactEdit,
      onDelete: handlers.onDelete,
      showActions: true,
      maxItems: 10,
    });
    container.appendChild(card.getElement());
  }

  return container;
}