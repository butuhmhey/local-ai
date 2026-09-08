/**
 * MessageBubble - Streaming message display component
 * Supports user/assistant/system roles, streaming, copy, regenerate, edit
 */

import { createElement, formatTime, escapeHtml, truncate } from '../utils/helpers.js';
import { iconEl } from '../utils/icons.js';
import type { Message, MessageEditVersion } from '../types/index.js';

export interface MessageBubbleOptions {
  message: Message;
  isStreaming?: boolean;
  onCopy?: (text: string) => void;
  onRegenerate?: (messageId: string) => void;
  onEdit?: (messageId: string, newContent: string) => void;
  onDelete?: (messageId: string) => void;
  showActions?: boolean;
}

export class MessageBubble {
  private element: HTMLElement;
  private contentElement: HTMLElement;
  private options: MessageBubbleOptions;
  private streamingContent = '';
  private isEditing = false;
  private originalContent = '';
  private versionBadge: HTMLElement | null = null;

  constructor(options: MessageBubbleOptions) {
    this.options = {
      showActions: true,
      isStreaming: false,
      ...options,
    };
    this.originalContent = this.options.message.content;
    this.element = this.createElement();
    const contentEl = this.element.querySelector('.message-content');
    if (!(contentEl instanceof HTMLElement)) {
      throw new Error('Content element not found');
    }
    this.contentElement = contentEl;
    this.updateContent(this.options.message.content);
    this.refreshVersionBadge();
  }

  getElement(): HTMLElement {
    return this.element;
  }

  /** Update the message (for streaming) */
  update(content: string): void {
    this.streamingContent = content;
    this.updateContent(content);
  }

  /** Append to streaming content */
  append(chunk: string): void {
    this.streamingContent += chunk;
    this.updateContent(this.streamingContent);
  }

  /** Mark streaming as complete */
  complete(): void {
    this.options.isStreaming = false;
    this.element.classList.remove('streaming');
    this.updateActions();
  }

  /** Start editing mode */
  startEdit(): void {
    if (this.isEditing) return;
    this.isEditing = true;
    this.originalContent = this.options.message.content;
    this.renderEditMode();
  }

  /** Cancel editing */
  cancelEdit(): void {
    this.isEditing = false;
    this.updateContent(this.originalContent);
    this.updateActions();
  }

  /** Save edit */
  saveEdit(): void {
    const textarea = this.element.querySelector('textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const newContent = textarea.value;
    this.isEditing = false;
    this.commitContent(newContent);

    if (this.options.onEdit) {
      this.options.onEdit(this.options.message.id, newContent);
    }
  }

  /**
   * Apply new content to the message, recording the previous version into
   * editHistory. Each save/restore bumps editVersion (v1 → v2 → …).
   */
  private commitContent(newContent: string): void {
    const prev = this.options.message.content;

    if (prev !== newContent) {
      const history = this.options.message.editHistory || [];
      const currentVersion = this.options.message.editVersion ?? 1;
      history.push({ version: currentVersion, content: prev, timestamp: Date.now() });
      this.options.message.editHistory = history;
      this.options.message.editVersion = currentVersion + 1;
    }

    this.options.message.content = newContent;
    this.originalContent = newContent;
    this.updateContent(newContent);
    this.updateActions();
    this.refreshVersionBadge();
  }

  /** Set loading state */
  setLoading(loading: boolean): void {
    if (loading) {
      this.element.classList.add('loading');
    } else {
      this.element.classList.remove('loading');
    }
  }

  /** Set error state */
  setError(error: string): void {
    this.element.classList.add('error');
    this.updateContent(escapeHtml(error));
  }

  private createElement(): HTMLElement {
    const isUser = this.options.message.role === 'user';
    const isSystem = this.options.message.role === 'system';

    const bubble = createElement('div', {
      class: `message-bubble ${isUser ? 'user' : ''} ${isSystem ? 'system' : ''} ${this.options.isStreaming ? 'streaming' : ''}`,
      'data-message-id': this.options.message.id,
    });

    // Avatar
    const avatar = createElement('div', {
      class: 'message-avatar',
      children: [
        createElement('span', {
          class: 'avatar-icon',
          children: [iconEl(isUser ? 'user' : isSystem ? 'gear' : 'flame', 16)],
        }),
      ],
    });

    // Content wrapper
    const contentWrapper = createElement('div', { class: 'message-content-wrapper' });

    // Header with role and timestamp
    const header = createElement('div', { class: 'message-header' });
    const roleLabel = createElement('span', {
      class: 'message-role',
      children: [this.getRoleLabel()],
    });
    const timeLabel = createElement('span', {
      class: 'message-time',
      children: [formatTime(this.options.message.timestamp)],
    });

    // Version badge (v1/v2…) — hidden until the message has been edited
    this.versionBadge = createElement('button', {
      class: 'version-badge',
      type: 'button',
      title: 'View message versions',
      'aria-label': 'View message versions',
      style: 'display: none;',
      children: [iconEl('history', 12), createElement('span', { class: 'version-badge-label' })],
      onClick: () => this.toggleVersionDropdown(),
    });

    header.append(roleLabel, this.versionBadge, timeLabel);

    // Content
    this.contentElement = createElement('div', { class: 'message-content' });
    this.updateContent(this.options.message.content);

    // Actions
    const actions = createElement('div', { class: 'message-actions' });
    if (this.options.showActions && !isSystem) {
      this.createActions(actions);
    }

    contentWrapper.append(header, this.contentElement, actions);
    bubble.append(avatar, contentWrapper);

    return bubble;
  }

  private createActions(container: HTMLElement): void {
    const isUser = this.options.message.role === 'user';

    if (!isUser) {
      // Copy button
      const copyBtn = createElement('button', {
        class: 'action-btn copy-btn',
        title: 'Copy message',
        'aria-label': 'Copy message',
        children: [iconEl('copy', 16)],
        onClick: () => this.handleCopy(),
      });
      container.appendChild(copyBtn);

      // Regenerate button (for assistant messages)
      const regenBtn = createElement('button', {
        class: 'action-btn regen-btn',
        title: 'Regenerate response',
        'aria-label': 'Regenerate response',
        children: [iconEl('refresh', 16)],
        onClick: () => this.handleRegenerate(),
      });
      container.appendChild(regenBtn);
    }

    // Edit button (for user messages)
    if (isUser) {
      const editBtn = createElement('button', {
        class: 'action-btn edit-btn',
        title: 'Edit message',
        'aria-label': 'Edit message',
        children: [iconEl('edit', 16)],
        onClick: () => this.startEdit(),
      });
      container.appendChild(editBtn);
    }

    // Delete button
    const deleteBtn = createElement('button', {
      class: 'action-btn delete-btn',
      title: 'Delete message',
      'aria-label': 'Delete message',
      children: [iconEl('trash', 16)],
      onClick: () => this.handleDelete(),
    });
    container.appendChild(deleteBtn);
  }

  private updateActions(): void {
    const actions = this.element.querySelector('.message-actions') as HTMLElement | null;
    if (!actions) return;

    actions.innerHTML = '';
    if (this.options.showActions && this.options.message.role !== 'system' && !this.isEditing) {
      this.createActions(actions);
    } else if (this.isEditing) {
      // Save/Cancel buttons in edit mode
      const saveBtn = createElement('button', {
        class: 'action-btn save-btn',
        title: 'Save',
        'aria-label': 'Save changes',
        children: [iconEl('check', 16)],
        onClick: () => this.saveEdit(),
      });
      const cancelBtn = createElement('button', {
        class: 'action-btn cancel-btn',
        title: 'Cancel',
        'aria-label': 'Cancel editing',
        children: [iconEl('close', 16)],
        onClick: () => this.cancelEdit(),
      });
      actions.append(saveBtn, cancelBtn);
    }
  }

  private renderEditMode(): void {
    this.contentElement.innerHTML = '';
    const textarea = createElement('textarea', {
      class: 'message-edit-textarea',
      value: this.originalContent,
      rows: 3,
    });
    this.contentElement.appendChild(textarea);
    textarea.focus();
    this.updateActions();
  }

  /** Show/hide + label the version badge based on edit history */
  private refreshVersionBadge(): void {
    if (!this.versionBadge) return;
    const history = this.options.message.editHistory || [];
    if (history.length === 0) {
      this.versionBadge.style.display = 'none';
      return;
    }
    this.versionBadge.style.display = 'inline-flex';
    const current = this.options.message.editVersion ?? history.length + 1;
    const label = this.versionBadge.querySelector('.version-badge-label');
    if (label) label.textContent = `v${current}`;
  }

  /** Open/close the version history dropdown */
  private toggleVersionDropdown(): void {
    const existing = this.element.querySelector('.version-dropdown');
    if (existing) {
      existing.remove();
      return;
    }

    const history = this.options.message.editHistory || [];
    if (history.length === 0) return;

    const dropdown = createElement('div', { class: 'version-dropdown' });
    // Newest first
    const sorted = [...history].sort((a, b) => b.version - a.version);

    for (const v of sorted) {
      const row = createElement('div', { class: 'version-row' });
      const info = createElement('div', { class: 'version-info' });
      info.append(
        createElement('span', { class: 'version-num', children: [`v${v.version}`] }),
        createElement('span', { class: 'version-preview', children: [truncate(v.content, 70)] })
      );
      const restore = createElement('button', {
        class: 'version-restore',
        type: 'button',
        children: ['Restore'],
        onClick: () => this.restoreVersion(v),
      });
      row.append(info, restore);
      dropdown.appendChild(row);
    }

    this.element.appendChild(dropdown);

    // Close on outside click (one-time)
    const onDocClick = (e: MouseEvent) => {
      if (!dropdown.contains(e.target as Node)) {
        dropdown.remove();
        document.removeEventListener('click', onDocClick);
      }
    };
    document.addEventListener('click', onDocClick);
  }

  /** Restore a previous version — records current content as a new version too */
  private restoreVersion(v: MessageEditVersion): void {
    this.element.querySelector('.version-dropdown')?.remove();
    this.commitContent(v.content);
    if (this.options.onEdit) {
      this.options.onEdit(this.options.message.id, v.content);
    }
  }

  private updateContent(content: string): void {
    if (this.isEditing) return;

    // Render markdown-like content
    this.contentElement.innerHTML = this.renderMarkdown(content);
  }

  private renderMarkdown(text: string): string {
    // Escape HTML first
    let html = escapeHtml(text);

    // Code blocks (```lang\ncode\n```). `html` is already HTML-escaped above,
    // so the captured lang/code must NOT be escaped again — re-escaping turned
    // < > & inside code blocks into literal &lt; &amp; etc.
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (_match, lang, code) => {
      const language = lang || 'text';
      return `<pre><code class="language-${language}">${code.trim()}</code></pre>`;
    });

    // Inline code (`code`)
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Bold (**text** or __text__)
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');

    // Italic (*text* or _text_)
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    html = html.replace(/_([^_]+)_/g, '<em>$1</em>');

    // Strikethrough (~~text~~)
    html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>');

    // Links [text](url)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    // Line breaks
    html = html.replace(/\n/g, '<br>');

    return html;
  }

  private getRoleLabel(): string {
    switch (this.options.message.role) {
      case 'user': return 'You';
      case 'assistant': return 'Assistant';
      case 'system': return 'System';
      default: return this.options.message.role;
    }
  }

  private handleCopy(): void {
    if (this.options.onCopy) {
      this.options.onCopy(this.options.message.content);
    } else {
      navigator.clipboard.writeText(this.options.message.content);
    }
    this.showToast('Copied!');
  }

  private handleRegenerate(): void {
    if (this.options.onRegenerate) {
      this.options.onRegenerate(this.options.message.id);
    }
  }

  private handleDelete(): void {
    if (this.options.onDelete) {
      this.options.onDelete(this.options.message.id);
    }
  }

  private showToast(message: string): void {
    const toast = createElement('div', {
      class: 'toast toast-success',
      children: [message],
    });
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('show');
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
      }, 2000);
    }, 10);
  }
}

/** Create a message bubble for a new assistant message (streaming) */
export function createStreamingBubble(
  messageId: string,
  onCopy?: (text: string) => void,
  onRegenerate?: (messageId: string) => void
): MessageBubble {
  const bubble = new MessageBubble({
    message: {
      id: messageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    },
    isStreaming: true,
    onCopy,
    onRegenerate,
  });
  return bubble;
}