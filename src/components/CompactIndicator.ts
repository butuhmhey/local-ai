/**
 * CompactIndicator - Context usage display with manual compact trigger
 * Shows token usage, percentage, warning at 75%, manual compact button
 */

import { createElement } from '../utils/helpers.js';
import { formatNumber } from '../utils/helpers.js';
import { MemoryEngine } from '../services/memoryEngine.js';
import type { MemoryStats } from '../types/index.js';

export interface CompactIndicatorOptions {
  chatId: string;
  maxTokens?: number;
  onCompact?: () => Promise<void>;
  showDetails?: boolean;
  warningThreshold?: number; // 0-1, default 0.75
  updateInterval?: number; // ms
}

export class CompactIndicator {
  private element: HTMLElement;
  private options: CompactIndicatorOptions;
  private memoryEngine: MemoryEngine;
  private updateTimer: ReturnType<typeof setInterval> | null = null;
  private currentUsage: { used: number; total: number; percentage: number } | null = null;
  private stats: MemoryStats | null = null;

  constructor(options: CompactIndicatorOptions) {
    this.options = {
      maxTokens: 4096,
      warningThreshold: 0.75,
      showDetails: true,
      updateInterval: 2000,
      ...options,
    };
    this.memoryEngine = MemoryEngine.getInstance();
    this.element = this.createElement();
    this.startUpdates();
  }

  getElement(): HTMLElement {
    return this.element;
  }

  /** Update max tokens (e.g., when model changes) */
  setMaxTokens(maxTokens: number): void {
    this.options.maxTokens = maxTokens;
    this.updateDisplay();
  }

  /** Set chat ID */
  setChatId(chatId: string): void {
    this.options.chatId = chatId;
    this.updateDisplay();
  }

  /** Manually trigger update */
  async refresh(): Promise<void> {
    await this.updateDisplay();
  }

  /** Show compact in progress */
  setCompacting(compacting: boolean): void {
    const btn = this.element.querySelector('.compact-btn') as HTMLButtonElement;
    const indicator = this.element.querySelector('.compact-indicator') as HTMLElement;

    if (compacting) {
      this.element.classList.add('compacting');
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '⏳ Compacting...';
      }
    } else {
      this.element.classList.remove('compacting');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '🗜️ Compact';
      }
      this.updateDisplay();
    }
  }

  /** Destroy and cleanup */
  destroy(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
  }

  private createElement(): HTMLElement {
    const container = createElement('div', { class: 'compact-indicator' });

    // Main indicator bar
    const bar = createElement('div', { class: 'compact-bar' });
    const fill = createElement('div', { class: 'compact-fill' });
    bar.appendChild(fill);

    // Labels
    const labels = createElement('div', { class: 'compact-labels' });
    const usedLabel = createElement('span', { class: 'compact-used', children: ['0 tokens'] });
    const totalLabel = createElement('span', { class: 'compact-total', children: [`/${formatNumber(this.options.maxTokens!)}`] });
    const percentLabel = createElement('span', { class: 'compact-percent', children: ['0%'] });
    labels.append(usedLabel, totalLabel, percentLabel);

    // Warning badge
    const warning = createElement('div', { class: 'compact-warning hidden', children: ['⚠️ Approaching context limit — consider compacting'] });

    // Details (collapsible)
    let details: HTMLElement | null = null;
    if (this.options.showDetails) {
      details = createElement('div', { class: 'compact-details hidden' });
      const detailsContent = createElement('div', { class: 'compact-details-content' });
      details.appendChild(detailsContent);
    }

    // Compact button
    const btn = createElement('button', {
      class: 'compact-btn',
      type: 'button',
      children: ['🗜️ Compact'],
      'aria-label': 'Compact conversation history',
      onClick: () => this.handleCompact(),
    });

    container.append(bar, labels, warning);
    if (details) container.appendChild(details);
    container.appendChild(btn);

    return container;
  }

  private startUpdates(): void {
    // Initial update
    this.updateDisplay();

    // Periodic updates
    this.updateTimer = setInterval(() => {
      this.updateDisplay();
    }, this.options.updateInterval);
  }

  private async updateDisplay(): Promise<void> {
    try {
      // Get context usage from memory engine
      const context = await this.memoryEngine.buildContextWindow(this.options.chatId, this.options.maxTokens!);
      const usedTokens = context.tokensUsed;
      const totalTokens = this.options.maxTokens!;
      const percentage = Math.min(1, usedTokens / totalTokens);

      this.currentUsage = { used: usedTokens, total: totalTokens, percentage };
      this.stats = this.memoryEngine.getMemoryStats(this.options.chatId);

      // Update bar
      const fill = this.element.querySelector('.compact-fill') as HTMLElement;
      fill.style.width = `${percentage * 100}%`;

      // Update colors based on percentage
      this.element.classList.remove('warning', 'danger');
      if (percentage >= this.options.warningThreshold!) {
        this.element.classList.add('warning');
      }
      if (percentage >= 0.95) {
        this.element.classList.add('danger');
      }

      // Update labels
      const usedLabel = this.element.querySelector('.compact-used');
      const percentLabel = this.element.querySelector('.compact-percent');
      if (usedLabel) usedLabel.textContent = `${formatNumber(usedTokens)} tokens`;
      if (percentLabel) percentLabel.textContent = `${Math.round(percentage * 100)}%`;

      // Show/hide warning
      const warning = this.element.querySelector('.compact-warning') as HTMLElement;
      if (percentage >= this.options.warningThreshold!) {
        warning.classList.remove('hidden');
      } else {
        warning.classList.add('hidden');
      }

      // Update details
      if (this.options.showDetails && this.stats) {
        this.updateDetails();
      }
    } catch (error) {
      console.warn('[CompactIndicator] Failed to update:', error);
    }
  }

  private updateDetails(): void {
    const details = this.element.querySelector('.compact-details-content');
    if (!details || !this.stats) return;

    const { level0Count, level1Count, level2Count, factCount, totalTokens } = this.stats;

    details.innerHTML = '';

    const rows = [
      { label: 'Recent messages (L0)', value: level0Count, class: 'level-0' },
      { label: 'Summaries (L1)', value: level1Count, class: 'level-1' },
      { label: 'Meta-summaries (L2)', value: level2Count, class: 'level-2' },
      { label: 'Extracted facts', value: factCount, class: 'facts' },
      { label: 'Total tokens in memory', value: formatNumber(totalTokens), class: 'total' },
    ];

    for (const row of rows) {
      const rowEl = createElement('div', { class: `detail-row ${row.class}` });
      rowEl.append(
        createElement('span', { class: 'detail-label', children: [row.label] }),
        createElement('span', { class: 'detail-value', children: [String(row.value)] })
      );
      details.appendChild(rowEl);
    }
  }

  private async handleCompact(): Promise<void> {
    this.setCompacting(true);

    try {
      if (this.options.onCompact) {
        await this.options.onCompact();
      } else {
        // Default: trigger memory engine compact
        await this.memoryEngine.maybeCompact([], this.options.chatId);
      }
    } catch (error) {
      console.error('[CompactIndicator] Compact failed:', error);
      this.showError('Compact failed');
    } finally {
      this.setCompacting(false);
      await this.updateDisplay();
    }
  }

  private showError(message: string): void {
    const toast = createElement('div', {
      class: 'toast toast-error',
      children: [message],
    });
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}

/** Create a minimal compact indicator for chat header */
export function createMinimalCompactIndicator(chatId: string, maxTokens: number): CompactIndicator {
  return new CompactIndicator({
    chatId,
    maxTokens,
    showDetails: false,
    updateInterval: 5000,
  });
}