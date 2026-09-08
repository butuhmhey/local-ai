/**
 * MemoryPage - Hierarchical memory viewer with fact editing
 * Shows L0 (raw), L1 (summaries), L2 (meta), Facts
 */

import { createElement, formatNumber, formatRelativeTime, escapeHtml } from '../utils/helpers.js';
import { iconEl } from '../utils/icons.js';
import { createMemoryCardSet, MemoryCard } from '../components/MemoryCard.js';
import { memoryEngine } from '../services/memoryEngine.js';
import { storageEngine } from '../services/storageEngine.js';
import type { MemoryFact, MemorySummary, ChatSession, MemoryLayer, Fact } from '../types/index.js';

export class MemoryPage {
  private element!: HTMLElement;
  private chatSelect!: HTMLSelectElement;
  private memoryCardsContainer!: HTMLElement;
  private statsContainer!: HTMLElement;
  private currentChatId: string | null = null;
  private memoryCards: Map<string, MemoryCard> = new Map();

  constructor() {
    this.element = this.createElement();
    this.bindEvents();
  }

  getElement(): HTMLElement {
    return this.element;
  }

  /** Called when page is shown */
  async onShow(): Promise<void> {
    await this.refreshChatList();
  }

  private createElement(): HTMLElement {
    const page = createElement('div', { class: 'page memory-page' });

    // Header
    const header = createElement('header', { class: 'page-header' });
    header.append(
      createElement('h1', { children: ['Memory & Knowledge'] }),
      createElement('p', { class: 'page-subtitle', children: ['View and manage hierarchical conversation memory'] })
    );

    // Chat selector
    const selectorSection = createElement('section', { class: 'memory-selector card' });
    const selectorLabel = createElement('label', { for: 'memory-chat', children: ['Select Conversation'] });
    this.chatSelect = createElement('select', {
      id: 'memory-chat',
      class: 'form-select',
      onChange: (e: Event) => this.onChatChange((e.target as HTMLSelectElement).value),
    });
    selectorSection.append(selectorLabel, this.chatSelect);

    // Stats overview
    this.statsContainer = createElement('div', { class: 'memory-stats' });

    // Memory cards
    this.memoryCardsContainer = createElement('div', { class: 'memory-cards-container' });

    // Actions
    const actionsSection = createElement('section', { class: 'memory-actions card' });
    const actionsHeader = createElement('h3', { children: ['Actions'] });
    const actionsGrid = createElement('div', { class: 'actions-grid' });

    const exportBtn = createElement('button', {
      class: 'btn btn-secondary',
      children: [iconEl('upload', 16), 'Export Memory'],
      onClick: () => this.exportMemory(),
    });
    const compactBtn = createElement('button', {
      class: 'btn btn-primary',
      children: [iconEl('refresh', 16), 'Force Compact'],
      onClick: () => this.forceCompact(),
    });
    const clearBtn = createElement('button', {
      class: 'btn btn-danger',
      children: [iconEl('trash', 16), 'Clear Memory'],
      onClick: () => this.clearMemory(),
    });

    actionsGrid.append(exportBtn, compactBtn, clearBtn);
    actionsSection.append(actionsHeader, actionsGrid);

    page.append(header, selectorSection, this.statsContainer, this.memoryCardsContainer, actionsSection);
    return page;
  }

  private bindEvents(): void {
    window.addEventListener('chats-updated', () => this.refreshChatList());
  }

  private async refreshChatList(): Promise<void> {
    try {
      const chats = await storageEngine.getAllChats();
      chats.sort((a, b) => b.updatedAt - a.updatedAt);

      const currentValue = this.chatSelect.value;

      this.chatSelect.innerHTML = '<option value="">-- Select a conversation --</option>';
      for (const chat of chats) {
        const messages = await storageEngine.getMessages(chat.id);
        const option = createElement('option', {
          value: chat.id,
          children: [`${chat.title} (${messages.length} msgs)`],
        });
        this.chatSelect.appendChild(option);
      }

      if (currentValue) {
        this.chatSelect.value = currentValue;
        await this.onChatChange(currentValue);
      } else if (chats.length > 0) {
        // Auto-select first chat
        this.chatSelect.value = chats[0].id;
        await this.onChatChange(chats[0].id);
      }
    } catch (error) {
      console.error('[MemoryPage] Failed to load chats:', error);
    }
  }

  private async onChatChange(chatId: string): Promise<void> {
    this.currentChatId = chatId || null;

    if (!chatId) {
      this.statsContainer.innerHTML = '';
      this.memoryCardsContainer.innerHTML = '';
      return;
    }

    await this.loadMemory(chatId);
  }

  private async loadMemory(chatId: string): Promise<void> {
    try {
      // Get chat for message count
      const chat = await storageEngine.getChat(chatId);
      if (!chat) throw new Error('Chat not found');

      // Get memory stats
      const stats = await memoryEngine.getMemoryStats(chatId);

      // Get memory data
      const memory = chat.memory || { level0: [], level1: [], level2: [], facts: [] };

      // Render stats
      this.renderStats(stats, chat);

      // Convert MemoryLayer[] to MemorySummary[] for all levels
      const convertToSummary = (layers: MemoryLayer[]): MemorySummary[] => layers.map(l => ({
        id: l.id,
        chatId: l.chatId,
        level: l.level as 1 | 2,
        content: l.content,
        tokens: l.tokens,
        timestamp: l.timestamp,
        messageCount: l.sourceMessageIds.length,
        sourceRange: undefined,
      }));

      // Convert Fact[] to MemoryFact[]
      const convertToMemoryFact = (facts: Fact[]): MemoryFact[] => facts.map(f => ({
        id: f.id,
        chatId: f.chatId,
        entity: f.entity,
        relation: f.relation,
        value: f.value,
        confidence: f.confidence,
        sourceMessageIds: [f.sourceMessageId],
        extractedAt: f.createdAt,
        timestamp: f.createdAt,
      }));

      // Render memory cards
      this.renderMemoryCards({
        level0: convertToSummary(memory.level0),
        level1: convertToSummary(memory.level1),
        level2: convertToSummary(memory.level2),
        facts: convertToMemoryFact(memory.facts),
      });
    } catch (error) {
      console.error('[MemoryPage] Failed to load memory:', error);
      this.showToast('Failed to load memory', 'error');
    }
  }

  private renderStats(stats: any, chat: ChatSession): void {
    this.statsContainer.innerHTML = '';

    const statCards = [
      { label: 'Total Tokens', value: formatNumber(stats.totalTokens), icon: 'database', class: 'tokens' },
      { label: 'Recent Messages (L0)', value: stats.level0Count, icon: 'message', class: 'level0' },
      { label: 'Summaries (L1)', value: stats.level1Count, icon: 'file', class: 'level1' },
      { label: 'Meta-Summaries (L2)', value: stats.level2Count, icon: 'layers', class: 'level2' },
      { label: 'Extracted Facts', value: stats.factCount, icon: 'target', class: 'facts' },
      { label: 'Compression Ratio', value: `${stats.compressionRatio.toFixed(1)}x`, icon: 'gauge', class: 'ratio' },
    ];

    for (const stat of statCards) {
      const card = createElement('div', { class: `stat-card stat-${stat.class}` });
      card.append(
        createElement('div', { class: 'stat-icon', children: [iconEl(stat.icon, 18)] }),
        createElement('div', { class: 'stat-info', children: [
          createElement('span', { class: 'stat-value', children: [stat.value] }),
          createElement('span', { class: 'stat-label', children: [stat.label] }),
        ]})
      );
      this.statsContainer.appendChild(card);
    }
  }

  private renderMemoryCards(data: {
    level0: MemorySummary[];
    level1: MemorySummary[];
    level2: MemorySummary[];
    facts: MemoryFact[];
  }): void {
    this.memoryCardsContainer.innerHTML = '';
    this.memoryCards.clear();

    const cardSet = createMemoryCardSet(data, {
      onItemClick: (item) => this.onItemClick(item),
      onFactEdit: (fact, updates) => this.onFactEdit(fact, updates),
      onDelete: (id) => this.onItemDelete(id),
    });

    this.memoryCardsContainer.appendChild(cardSet);
  }

  private onItemClick(item: MemorySummary | MemoryFact): void {
    // Could expand to show full content
    console.log('[MemoryPage] Item clicked:', item);
  }

  private async onFactEdit(fact: MemoryFact, updates: Partial<MemoryFact>): Promise<void> {
    if (!this.currentChatId) return;

    try {
      const updatedFact = { ...fact, ...updates };
      await memoryEngine.updateFact(this.currentChatId, updatedFact);
      this.showToast('Fact updated', 'success');
      await this.loadMemory(this.currentChatId);
    } catch (error) {
      console.error('[MemoryPage] Fact edit failed:', error);
      this.showToast('Failed to update fact', 'error');
    }
  }

  private async onItemDelete(id: string): Promise<void> {
    if (!this.currentChatId) return;

    if (!confirm('Delete this item?')) return;

    try {
      // Determine type and delete
      await memoryEngine.deleteMemoryItem(this.currentChatId, id);
      this.showToast('Deleted', 'success');
      await this.loadMemory(this.currentChatId);
    } catch (error) {
      console.error('[MemoryPage] Delete failed:', error);
      this.showToast('Failed to delete', 'error');
    }
  }

  private async exportMemory(): Promise<void> {
    if (!this.currentChatId) {
      this.showToast('Select a conversation first', 'warning');
      return;
    }

    try {
      const chat = await storageEngine.getChat(this.currentChatId);
      if (!chat || !chat.memory) throw new Error('No memory data');

      let content = `# Memory Export: ${chat.title}\n\n`;
      content += `Exported: ${new Date().toLocaleString()}\n`;
      content += `Messages: ${(await storageEngine.getMessages(this.currentChatId!)).length}\n\n`;

      // Facts
      if (chat.memory.facts.length > 0) {
        content += `## Extracted Facts (${chat.memory.facts.length})\n\n`;
        for (const fact of chat.memory.facts) {
          content += `- **${escapeHtml(fact.entity)}** ${escapeHtml(fact.relation)} **${escapeHtml(fact.value)}** (${Math.round(fact.confidence * 100)}%)\n`;
        }
        content += `\n`;
      }

      // Summaries
      if (chat.memory.level1.length > 0) {
        content += `## Summaries L1 (${chat.memory.level1.length})\n\n`;
        for (const s of chat.memory.level1) {
          content += `### ${s.id.slice(0, 8)} (${formatNumber(s.tokens)} tokens)\n${escapeHtml(s.content)}\n\n`;
        }
      }

      if (chat.memory.level2.length > 0) {
        content += `## Meta-Summaries L2 (${chat.memory.level2.length})\n\n`;
        for (const s of chat.memory.level2) {
          content += `### ${s.id.slice(0, 8)} (${formatNumber(s.tokens)} tokens)\n${escapeHtml(s.content)}\n\n`;
        }
      }

      const filename = `memory-${chat.title.replace(/[^a-z0-9]/gi, '-')}-${Date.now()}.md`;
      const blob = new Blob([content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = createElement('a', { href: url, download: filename });
      a.click();
      URL.revokeObjectURL(url);

      this.showToast('Memory exported', 'success');
    } catch (error) {
      console.error('[MemoryPage] Export failed:', error);
      this.showToast('Export failed', 'error');
    }
  }

  private async forceCompact(): Promise<void> {
    if (!this.currentChatId) {
      this.showToast('Select a conversation first', 'warning');
      return;
    }

    try {
      const chat = await storageEngine.getChat(this.currentChatId);
      if (!chat) throw new Error('Chat not found');

      const messages = await storageEngine.getMessages(this.currentChatId);

      this.showToast('Compacting...', 'info');

      await memoryEngine.maybeCompact(messages, this.currentChatId);

      this.showToast('Compaction complete', 'success');
      await this.loadMemory(this.currentChatId);
    } catch (error) {
      console.error('[MemoryPage] Compact failed:', error);
      this.showToast('Compaction failed', 'error');
    }
  }

  private async clearMemory(): Promise<void> {
    if (!this.currentChatId) {
      this.showToast('Select a conversation first', 'warning');
      return;
    }

    if (!confirm('Clear ALL memory for this conversation? This cannot be undone.')) return;

    try {
      await memoryEngine.clearMemory(this.currentChatId);
      this.showToast('Memory cleared', 'success');
      await this.loadMemory(this.currentChatId);
    } catch (error) {
      console.error('[MemoryPage] Clear failed:', error);
      this.showToast('Failed to clear memory', 'error');
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