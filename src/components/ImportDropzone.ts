/**
 * ImportDropzone - Drag & drop file import with preview
 * Supports multiple files, format detection preview, progress display
 */

import { createElement, formatBytes, escapeHtml } from '../utils/helpers.js';
import { iconEl } from '../utils/icons.js';
import { detectFormat, getSupportedFormats, validateMessages } from '../utils/formatDetector.js';
import { ImportEngine, type ImportPreview, type ImportFile, type ImportResultExtended } from '../services/importEngine.js';
import type { ChatFormat, ChatSession, ChatMessage } from '../types/index.js';

export interface ImportDropzoneOptions {
  accept?: string; // File extensions
  maxFiles?: number;
  maxFileSize?: number; // bytes
  onImport?: (result: ImportResultExtended) => void;
  onPreview?: (previews: ImportPreview[]) => void;
  showPreview?: boolean;
  multiple?: boolean;
}

export interface FilePreview {
  file: File;
  format: ChatFormat;
  confidence: number;
  messageCount: number;
  sampleMessages: Array<{ role: string; content: string }>;
  error?: string;
}

export class ImportDropzone {
  private element!: HTMLElement;
  private dropArea!: HTMLElement;
  private fileInput!: HTMLInputElement;
  private previewContainer: HTMLElement | null = null;
  private options!: ImportDropzoneOptions;
  private selectedFiles: File[] = [];
  private previews: FilePreview[] = [];
  private importEngine!: ImportEngine;
  private isDragging = false;

  constructor(options: ImportDropzoneOptions = {}) {
    this.options = {
      accept: '.json,.jsonl,.ndjson,.csv,.md,.markdown,.txt',
      maxFiles: 3,
      maxFileSize: 50 * 1024 * 1024, // 50MB
      showPreview: true,
      multiple: true,
      ...options,
    };
    this.importEngine = ImportEngine.getInstance();
    this.element = this.createElement();
    this.bindEvents();
  }

  getElement(): HTMLElement {
    return this.element;
  }

  /** Get selected files */
  getFiles(): File[] {
    return [...this.selectedFiles];
  }

  /** Clear selection */
  clear(): void {
    this.selectedFiles = [];
    this.previews = [];
    this.updateUI();
  }

  /** Trigger file picker */
  pickFiles(): void {
    this.fileInput.click();
  }

  /** Import selected files */
  async import(): Promise<void> {
    if (this.selectedFiles.length === 0) return;

    const loadingEl = this.showLoading('Importing files...');

    try {
      const result = await this.importEngine.import(this.selectedFiles);
      this.hideLoading(loadingEl);

      if (this.options.onImport) {
        this.options.onImport(result);
      }

      if (result.success) {
        this.showToast(`Imported ${result.chats.length} chat(s) with ${result.totalMessages} messages`, 'success');
        this.clear();
      } else {
        this.showToast(`Import failed: ${result.error}`, 'error');
      }
    } catch (error) {
      this.hideLoading(loadingEl);
      const msg = error instanceof Error ? error.message : 'Import failed';
      this.showToast(msg, 'error');
    }
  }

  private createElement(): HTMLElement {
    const container = createElement('div', { class: 'import-dropzone' });

    // Drop area
    this.dropArea = createElement('div', {
      class: 'drop-area',
      children: [
        createElement('div', { class: 'drop-icon', children: [iconEl('folder', 32)] }),
        createElement('div', { class: 'drop-text', children: ['Drag & drop chat export files here'] }),
        createElement('div', { class: 'drop-hint', children: ['or'] }),
        createElement('button', {
          class: 'btn btn-primary drop-btn',
          type: 'button',
          children: ['Browse Files'],
          onClick: () => this.pickFiles(),
        }),
        createElement('div', { class: 'drop-formats', children: [this.getSupportedFormatsText()] }),
      ],
    });

    // Hidden file input
    this.fileInput = createElement('input', {
      type: 'file',
      class: 'file-input',
      accept: this.options.accept,
      multiple: this.options.multiple,
      onChange: (e: Event) => this.handleFileSelect(e.target as HTMLInputElement),
    });

    // Preview container (initially hidden)
    if (this.options.showPreview) {
      this.previewContainer = createElement('div', { class: 'import-preview hidden' });
      container.append(this.dropArea, this.fileInput, this.previewContainer);
    } else {
      container.append(this.dropArea, this.fileInput);
    }

    return container;
  }

  private bindEvents(): void {
    // Drag and drop
    this.dropArea.addEventListener('dragover', (e: DragEvent) => this.handleDragOver(e));
    this.dropArea.addEventListener('dragleave', (e: DragEvent) => this.handleDragLeave(e));
    this.dropArea.addEventListener('drop', (e: DragEvent) => this.handleDrop(e));
    this.dropArea.addEventListener('click', () => this.pickFiles());

    // Prevent default drag behavior on document
    document.addEventListener('dragover', (e: DragEvent) => e.preventDefault());
    document.addEventListener('drop', (e: DragEvent) => e.preventDefault());
  }

  private handleDragOver(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    if (!this.isDragging) {
      this.isDragging = true;
      this.dropArea.classList.add('dragging');
    }
  }

  private handleDragLeave(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    // Only remove dragging if leaving the drop area entirely
    if (!this.dropArea.contains(e.relatedTarget as Node)) {
      this.isDragging = false;
      this.dropArea.classList.remove('dragging');
    }
  }

  private handleDrop(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.isDragging = false;
    this.dropArea.classList.remove('dragging');

    const files = Array.from(e.dataTransfer?.files || []);
    this.addFiles(files);
  }

  private handleFileSelect(input: HTMLInputElement): void {
    const files = Array.from(input.files || []);
    this.addFiles(files);
    input.value = ''; // Reset for re-selection
  }

  private addFiles(files: File[]): void {
    // Filter valid files
    const validFiles = files.filter(file => this.validateFile(file));

    // Check max files
    const remainingSlots = this.options.maxFiles! - this.selectedFiles.length;
    const filesToAdd = validFiles.slice(0, remainingSlots);

    if (filesToAdd.length === 0) {
      if (validFiles.length > 0) {
        this.showToast(`Maximum ${this.options.maxFiles} files allowed`, 'warning');
      }
      return;
    }

    // Add files
    this.selectedFiles.push(...filesToAdd);

    // Generate previews
    this.generatePreviews();

    // Update UI
    this.updateUI();

    if (filesToAdd.length < validFiles.length) {
      this.showToast(`Only first ${this.options.maxFiles} files added`, 'warning');
    }
  }

  private validateFile(file: File): boolean {
    // Check size
    if (file.size > this.options.maxFileSize!) {
      this.showToast(`${file.name}: File too large (max ${formatBytes(this.options.maxFileSize!)})`, 'error');
      return false;
    }

    // Check extension
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    const accepted = this.options.accept!.split(',').map(e => e.trim());
    if (!accepted.includes(ext) && !accepted.includes('*')) {
      this.showToast(`${file.name}: Unsupported file type`, 'error');
      return false;
    }

    return true;
  }

  private async generatePreviews(): Promise<void> {
    this.previews = [];

    for (const file of this.selectedFiles) {
      try {
        const content = await file.text();
        const detection = detectFormat(content, file.name);

        let messageCount = 0;
        let sampleMessages: Array<{ role: string; content: string }> = [];
        let error: string | undefined;

        try {
          const importFile: ImportFile = { file, content, format: detection.format, preview: [] };
          const parsed = await this.importEngine.parseFile(importFile);
          messageCount = parsed.length;
          sampleMessages = parsed.slice(0, 3).map(m => ({ role: m.role, content: m.content.slice(0, 100) }));
        } catch (e) {
          error = e instanceof Error ? e.message : 'Parse failed';
        }

        this.previews.push({
          file,
          format: detection.format,
          confidence: detection.confidence,
          messageCount,
          sampleMessages,
          error,
        });
      } catch (error) {
        this.previews.push({
          file,
          format: 'text',
          confidence: 0,
          messageCount: 0,
          sampleMessages: [],
          error: error instanceof Error ? error.message : 'Failed to read file',
        });
      }
    }

    if (this.options.onPreview) {
      this.options.onPreview(this.previews.map(p => ({
        format: p.format,
        confidence: p.confidence,
        messageCount: p.messageCount,
        sample: p.sampleMessages,
      })));
    }
  }

  private updateUI(): void {
    const hasFiles = this.selectedFiles.length > 0;

    if (hasFiles) {
      this.dropArea.classList.add('has-files');
      this.renderFileList();
    } else {
      this.dropArea.classList.remove('has-files');
      if (this.previewContainer) {
        this.previewContainer.classList.add('hidden');
      }
    }

    // Show/hide preview
    if (this.previewContainer) {
      if (hasFiles && this.options.showPreview) {
        this.previewContainer.classList.remove('hidden');
        this.renderPreview();
      } else {
        this.previewContainer.classList.add('hidden');
      }
    }
  }

  private renderFileList(): void {
    // Remove existing file list
    const existingList = this.dropArea.querySelector('.file-list');
    existingList?.remove();

    const list = createElement('div', { class: 'file-list' });

    for (let i = 0; i < this.selectedFiles.length; i++) {
      const file = this.selectedFiles[i];
      const preview = this.previews[i];

      const item = createElement('div', { class: 'file-item' });

      // File info
      const info = createElement('div', { class: 'file-info' });
      const name = createElement('span', { class: 'file-name', children: [escapeHtml(file.name)] });
      const size = createElement('span', { class: 'file-size', children: [formatBytes(file.size)] });
      info.append(name, size);

      // Format badge
      let badgeText = 'Unknown';
      let badgeClass = 'badge-unknown';
      if (preview) {
        const formats = getSupportedFormats();
        const fmt = formats.find(f => f.format === preview.format);
        badgeText = fmt?.name || preview.format;
        badgeClass = preview.error ? 'badge-error' : `badge-${preview.format}`;
      }
      const badge = createElement('span', { class: `file-badge ${badgeClass}`, children: [badgeText] });

      // Confidence
      let confidenceEl: HTMLElement | null = null;
      if (preview && !preview.error) {
        const confPercent = Math.round(preview.confidence * 100);
        confidenceEl = createElement('span', { class: 'file-confidence', children: [`${confPercent}%`] });
      }

      // Remove button
      const removeBtn = createElement('button', {
        class: 'file-remove-btn',
        'aria-label': `Remove ${file.name}`,
        children: ['✕'],
        onClick: (e: MouseEvent) => {
          e.stopPropagation();
          this.removeFile(i);
        },
      });

      item.append(info, badge);
      if (confidenceEl) item.appendChild(confidenceEl);
      item.appendChild(removeBtn);
      list.appendChild(item);
    }

    // Import button
    const importBtn = createElement('button', {
      class: 'btn btn-primary import-btn',
      type: 'button',
      children: [`Import ${this.selectedFiles.length} file(s)`],
      onClick: () => this.import(),
    });
    list.appendChild(importBtn);

    this.dropArea.appendChild(list);
  }

  private renderPreview(): void {
    if (!this.previewContainer) return;

    this.previewContainer.innerHTML = '';

    const title = createElement('h3', { class: 'preview-title', children: ['Import Preview'] });
    this.previewContainer.appendChild(title);

    for (let i = 0; i < this.previews.length; i++) {
      const preview = this.previews[i];
      const card = createElement('div', { class: 'preview-card' });

      // Header
      const header = createElement('div', { class: 'preview-header' });
      const fileName = createElement('span', { class: 'preview-filename', children: [escapeHtml(preview.file.name)] });
      const formatBadge = createElement('span', { class: `preview-format-badge badge-${preview.format}`, children: [preview.format] });
      const confidence = createElement('span', { class: 'preview-confidence', children: [`${Math.round(preview.confidence * 100)}%`] });
      header.append(fileName, formatBadge, confidence);

      // Error or stats
      if (preview.error) {
        const errorEl = createElement('div', { class: 'preview-error', children: [`Error: ${escapeHtml(preview.error)}`] });
        card.append(header, errorEl);
      } else {
        const stats = createElement('div', { class: 'preview-stats' });
        stats.append(
          createElement('span', { children: [`${preview.messageCount} messages`] }),
          createElement('span', { children: [`${formatBytes(preview.file.size)}`] })
        );

        // Sample messages
        const samples = createElement('div', { class: 'preview-samples' });
        for (const msg of preview.sampleMessages) {
          const sample = createElement('div', { class: `preview-sample ${msg.role}` });
          const role = createElement('span', { class: 'sample-role', children: [msg.role] });
          const content = createElement('span', { class: 'sample-content', children: [escapeHtml(msg.content)] });
          sample.append(role, content);
          samples.appendChild(sample);
        }

        card.append(header, stats, samples);
      }

      this.previewContainer.appendChild(card);
    }
  }

  private removeFile(index: number): void {
    this.selectedFiles.splice(index, 1);
    this.previews.splice(index, 1);
    this.updateUI();
  }

  private getSupportedFormatsText(): string {
    const formats = getSupportedFormats();
    const extensions = formats.flatMap(f => f.extensions).join(', ');
    return `Supported: ${extensions}`;
  }

  private showLoading(message: string): HTMLElement {
    const loading = createElement('div', {
      class: 'import-loading',
      children: [
        createElement('div', { class: 'spinner' }),
        createElement('span', { children: [message] }),
      ],
    });
    this.element.appendChild(loading);
    return loading;
  }

  private hideLoading(loadingEl: HTMLElement): void {
    loadingEl.remove();
  }

  private showToast(message: string, type: 'success' | 'error' | 'warning' = 'success'): void {
    const toast = createElement('div', {
      class: `toast toast-${type}`,
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

/** Create import dropzone for ImportExportPage */
export function createImportDropzone(onImport: (result: ImportResultExtended) => void): ImportDropzone {
  return new ImportDropzone({
    onImport,
    showPreview: true,
    maxFiles: 3,
  });
}