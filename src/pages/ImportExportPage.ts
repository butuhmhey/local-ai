/**
 * ImportExportPage - Import/export chats with drag-drop, preview, multiple formats
 */

import { createElement, formatBytes, downloadFile, generateId, formatDate } from '../utils/helpers.js';
import { ImportDropzone, type FilePreview } from '../components/ImportDropzone.js';
import { importEngine, type ImportPreview } from '../services/importEngine.js';
import { storageEngine } from '../services/storageEngine.js';
import type { ChatSession, ChatFormat, ImportResult, ExportFormat } from '../types/index.js';
import type { ImportResultExtended } from '../services/importEngine.js';

export class ImportExportPage {
  private element!: HTMLElement;
  private importDropzone!: ImportDropzone;
  private exportSection!: HTMLElement;
  private currentPreviews: ImportPreview[] = [];

  constructor() {
    this.element = this.createElement();
    this.bindEvents();
  }

  getElement(): HTMLElement {
    return this.element;
  }

  /** Called when page is shown */
  async onShow(): Promise<void> {
    await this.refreshExportList();
  }

  private createElement(): HTMLElement {
    const page = createElement('div', { class: 'page import-export-page' });

    // Header
    const header = createElement('header', { class: 'page-header' });
    header.append(
      createElement('h1', { children: ['Import / Export'] }),
      createElement('p', { class: 'page-subtitle', children: ['Transfer chats between platforms and backup your conversations'] })
    );

    // Two column layout
    const main = createElement('main', { class: 'import-export-main' });

    // Import section
    const importSection = createElement('section', { class: 'import-section card' });
    const importHeader = createElement('div', { class: 'section-header' });
    importHeader.append(
      createElement('h2', { children: ['Import Chats'] }),
      createElement('span', { class: 'section-badge', children: ['1-3 files'] })
    );

    const importDesc = createElement('p', { class: 'section-desc', children: [
      'Drag and drop ChatGPT exports, ShareGPT conversations, JSONL, CSV, Markdown, or plain text files. ',
      'Format is auto-detected with confidence scoring.'
    ]});

    this.importDropzone = new ImportDropzone({
      onImport: (result) => this.handleImportComplete(result),
      onPreview: (previews) => this.currentPreviews = previews,
      showPreview: true,
      maxFiles: 3,
    });

    importSection.append(importHeader, importDesc, this.importDropzone.getElement());

    // Export section
    this.exportSection = createElement('section', { class: 'export-section card' });
    const exportHeader = createElement('div', { class: 'section-header' });
    exportHeader.appendChild(createElement('h2', { children: ['Export Chats'] }));

    const exportDesc = createElement('p', { class: 'section-desc', children: [
      'Export your chats to various formats for backup or migration to other platforms.'
    ]});

    const exportForm = createElement('form', { class: 'export-form', onSubmit: (e: SubmitEvent) => this.handleExport(e) });

    // Chat selector
    const chatGroup = createElement('div', { class: 'form-group' });
    chatGroup.append(
      createElement('label', { for: 'export-chat', children: ['Select Chat'] }),
      createElement('select', { id: 'export-chat', class: 'form-select', required: true, children: [
        createElement('option', { value: '', children: ['-- Choose a chat --'] }),
      ]})
    );

    // Format selector
    const formatGroup = createElement('div', { class: 'form-group' });
    formatGroup.append(
      createElement('label', { for: 'export-format', children: ['Format'] }),
      createElement('select', { id: 'export-format', class: 'form-select', required: true, children: [
        createElement('option', { value: 'json', children: ['JSON (Full Data)'] }),
        createElement('option', { value: 'markdown', children: ['Markdown (Readable)'] }),
        createElement('option', { value: 'csv', children: ['CSV (Spreadsheet)'] }),
        createElement('option', { value: 'txt', children: ['Plain Text'] }),
      ]})
    );

    // Options
    const optionsGroup = createElement('div', { class: 'form-group options-group' });
    const includeMemory = createElement('label', { class: 'checkbox-label' });
    includeMemory.append(
      createElement('input', { type: 'checkbox', id: 'export-memory', checked: true }),
      createElement('span', { children: ['Include memory (summaries & facts)'] })
    );
    const includeMetadata = createElement('label', { class: 'checkbox-label' });
    includeMetadata.append(
      createElement('input', { type: 'checkbox', id: 'export-metadata', checked: true }),
      createElement('span', { children: ['Include metadata (timestamps, model info)'] })
    );
    optionsGroup.append(includeMemory, includeMetadata);

    // Export button
    const exportBtn = createElement('button', {
      type: 'submit',
      class: 'btn btn-primary export-btn',
      children: ['📤 Export Chat'],
    });

    exportForm.append(chatGroup, formatGroup, optionsGroup, exportBtn);
    this.exportSection.append(exportHeader, exportDesc, exportForm);

    main.append(importSection, this.exportSection);
    page.append(header, main);

    return page;
  }

  private bindEvents(): void {
    // Listen for chat list updates
    window.addEventListener('chats-updated', () => this.refreshExportList());
  }

  private async refreshExportList(): Promise<void> {
    const select = this.element.querySelector('#export-chat') as HTMLSelectElement;
    if (!select) return;

    try {
      const chats = await storageEngine.getAllChats();
      chats.sort((a, b) => b.updatedAt - a.updatedAt);

      // Preserve current selection
      const currentValue = select.value;

      select.innerHTML = '<option value="">-- Choose a chat --</option>';
      for (const chat of chats) {
        // Get message count from storage
        const messages = await storageEngine.getMessages(chat.id);
        const option = createElement('option', {
          value: chat.id,
          children: [`${chat.title} (${messages.length} msgs, ${formatDate(chat.updatedAt)})`],
        });
        select.appendChild(option);
      }

      if (currentValue) {
        select.value = currentValue;
      }
    } catch (error) {
      console.error('[ImportExportPage] Failed to load chats:', error);
    }
  }

  private async handleImportComplete(result: ImportResultExtended): Promise<void> {
    if (result.success) {
      this.showToast(`Successfully imported ${result.chats.length} chat(s) with ${result.totalMessages} messages`, 'success');
      // Notify other pages
      window.dispatchEvent(new CustomEvent('chats-updated'));
    } else {
      this.showToast(`Import failed: ${result.error}`, 'error');
    }
  }

  private async handleExport(e: SubmitEvent): Promise<void> {
    e.preventDefault();

    const form = e.target as HTMLFormElement;
    const chatId = (form.querySelector('#export-chat') as HTMLSelectElement).value;
    const format = (form.querySelector('#export-format') as HTMLSelectElement).value as ExportFormat;
    const includeMemory = (form.querySelector('#export-memory') as HTMLInputElement).checked;
    const includeMetadata = (form.querySelector('#export-metadata') as HTMLInputElement).checked;

    if (!chatId) {
      this.showToast('Please select a chat', 'warning');
      return;
    }

    const btn = form.querySelector('.export-btn') as HTMLButtonElement;
    btn.disabled = true;
    btn.textContent = 'Exporting...';

    try {
      const chat = await storageEngine.getChat(chatId);
      if (!chat) throw new Error('Chat not found');

      // Get messages from storage
      const messages = await storageEngine.getMessages(chatId);

      let content: string;
      let mimeType: string;
      let extension: string;

      switch (format) {
        case 'json':
          content = this.exportToJSON(chat, messages, includeMemory, includeMetadata);
          mimeType = 'application/json';
          extension = 'json';
          break;
        case 'markdown':
          content = this.exportToMarkdown(chat, messages, includeMemory, includeMetadata);
          mimeType = 'text/markdown';
          extension = 'md';
          break;
        case 'csv':
          content = this.exportToCSV(messages, includeMetadata);
          mimeType = 'text/csv';
          extension = 'csv';
          break;
        case 'txt':
          content = this.exportToText(chat, messages, includeMetadata);
          mimeType = 'text/plain';
          extension = 'txt';
          break;
        default:
          throw new Error(`Unknown format: ${format}`);
      }

      const filename = `${chat.title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.${extension}`;
      downloadFile(content, filename, mimeType);

      this.showToast(`Exported as ${format.toUpperCase()}`, 'success');
    } catch (error) {
      console.error('[ImportExportPage] Export failed:', error);
      this.showToast('Export failed', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = '📤 Export Chat';
    }
  }

  private exportToJSON(chat: ChatSession, messages: any[], includeMemory: boolean, includeMetadata: boolean): string {
    const exportData: any = {
      id: chat.id,
      title: chat.title,
      modelId: chat.modelId,
      messages: messages,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
    };

    if (includeMetadata) {
      exportData.settings = chat.settings;
    }

    if (includeMemory && chat.memory) {
      exportData.memory = chat.memory;
    }

    return JSON.stringify(exportData, null, 2);
  }

  private exportToMarkdown(chat: ChatSession, messages: any[], includeMemory: boolean, includeMetadata: boolean): string {
    let md = `# ${chat.title}\n\n`;

    if (includeMetadata) {
      md += `**Model:** ${chat.modelId}  \n`;
      md += `**Created:** ${new Date(chat.createdAt).toLocaleString()}  \n`;
      md += `**Updated:** ${new Date(chat.updatedAt).toLocaleString()}  \n`;
      md += `**Messages:** ${messages.length}  \n\n`;
      md += `---\n\n`;
    }

    for (const msg of messages) {
      const role = msg.role === 'user' ? '## You' : msg.role === 'assistant' ? '## Assistant' : '## System';
      const time = includeMetadata ? ` *(${new Date(msg.timestamp).toLocaleTimeString()})*` : '';
      md += `${role}${time}\n\n${msg.content}\n\n`;
    }

    if (includeMemory && chat.memory) {
      md += `---\n\n# Memory\n\n`;

      if (chat.memory.facts.length > 0) {
        md += `## Extracted Facts\n\n`;
        for (const fact of chat.memory.facts) {
          md += `- **${fact.entity}** ${fact.relation} **${fact.value}** (${Math.round(fact.confidence * 100)}% confidence)\n`;
        }
        md += `\n`;
      }

      if (chat.memory.level1.length > 0) {
        md += `## Summaries (L1)\n\n`;
        for (const summary of chat.memory.level1) {
          md += `### Summary #${summary.id.slice(0, 8)}\n\n${summary.content}\n\n`;
        }
      }

      if (chat.memory.level2.length > 0) {
        md += `## Meta-Summaries (L2)\n\n`;
        for (const summary of chat.memory.level2) {
          md += `### Meta-Summary #${summary.id.slice(0, 8)}\n\n${summary.content}\n\n`;
        }
      }
    }

    return md;
  }

  private exportToCSV(messages: any[], includeMetadata: boolean): string {
    const headers = includeMetadata
      ? ['id', 'role', 'content', 'timestamp', 'modelId']
      : ['role', 'content'];

    const rows = [headers.join(',')];

    for (const msg of messages) {
      const row = includeMetadata
        ? [
            msg.id,
            msg.role,
            `"${msg.content.replace(/"/g, '""')}"`,
            new Date(msg.timestamp).toISOString(),
            msg.modelId || '',
          ]
        : [
            msg.role,
            `"${msg.content.replace(/"/g, '""')}"`,
          ];
      rows.push(row.join(','));
    }

    return rows.join('\n');
  }

  private exportToText(chat: ChatSession, messages: any[], includeMetadata: boolean): string {
    let txt = `${chat.title}\n`;
    txt += '='.repeat(chat.title.length) + '\n\n';

    if (includeMetadata) {
      txt += `Model: ${chat.modelId}\n`;
      txt += `Created: ${new Date(chat.createdAt).toLocaleString()}\n`;
      txt += `Updated: ${new Date(chat.updatedAt).toLocaleString()}\n`;
      txt += `Messages: ${messages.length}\n\n`;
      txt += '-'.repeat(40) + '\n\n';
    }

    for (const msg of messages) {
      const role = msg.role === 'user' ? 'You' : msg.role === 'assistant' ? 'Assistant' : 'System';
      const time = includeMetadata ? ` [${new Date(msg.timestamp).toLocaleTimeString()}]` : '';
      txt += `${role}${time}: ${msg.content}\n\n`;
    }

    return txt;
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