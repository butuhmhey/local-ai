/**
 * ChatPage - Main chat interface with streaming, model selector, compact indicator
 */

import { createElement, generateId, formatTime, escapeHtml, truncate } from '../utils/helpers.js';
import { MessageBubble, createStreamingBubble } from '../components/MessageBubble.js';
import { ModelSelector, createCompactModelSelector } from '../components/ModelSelector.js';
import { CompactIndicator } from '../components/CompactIndicator.js';
import { webllmEngine } from '../services/webllmEngine.js';
import { memoryEngine } from '../services/memoryEngine.js';
import { storageEngine } from '../services/storageEngine.js';
import { modelRegistry, type ModelInfo } from '../models/modelRegistry.js';
import type { Message, ChatSession } from '../types/index.js';

export class ChatPage {
  private element!: HTMLElement;
  private modelSelector!: ModelSelector;
  private compactIndicator!: CompactIndicator;
  private chatContainer!: HTMLElement;
  private inputArea!: HTMLTextAreaElement;
  private sendBtn!: HTMLButtonElement;
  private currentChatId: string | null = null;
  private currentModel: ModelInfo | null = null;
  private isStreaming = false;
  private abortController: AbortController | null = null;
  private messageBubbles: Map<string, MessageBubble> = new Map();
  private pendingUserMessage: Message | null = null;

  constructor() {
    this.element = this.createElement();
    this.bindEvents();
    this.loadLastChat();
  }

  getElement(): HTMLElement {
    return this.element;
  }

  /** Called when page is shown */
  async onShow(params?: Record<string, string>): Promise<void> {
    await this.initModelSelector();
    if (this.currentChatId) {
      await this.loadChat(this.currentChatId);
    }
  }

  /** Called when page is hidden */
  onHide(): void {
    // Cancel any ongoing generation
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /** Create new chat */
  async newChat(): Promise<void> {
    // Save current chat if it has messages
    if (this.currentChatId && this.messageBubbles.size > 0) {
      await this.saveCurrentChat();
    }

    // Create new chat
    const chatId = generateId();
    const modelId = this.currentModel?.id || modelRegistry.getDefault(8)?.id || 'Llama-3.2-3B-Instruct-q4f16_1-MLC';

    const chat = await storageEngine.createChat({
      title: 'New Chat',
      modelId,
    });

    this.currentChatId = chat.id;
    this.clearMessages();
    this.updateChatTitle('New Chat');
    this.compactIndicator.setChatId(chatId);
  }

  /** Load chat by ID */
  async loadChat(chatId: string): Promise<void> {
    try {
      const chat = await storageEngine.getChat(chatId);
      if (!chat) throw new Error('Chat not found');

      this.currentChatId = chatId;
      this.currentModel = modelRegistry.getById(chat.modelId) || null;

      // Update model selector
      if (this.currentModel) {
        this.modelSelector.setSelectedModel(this.currentModel.id);
      }

      // Load messages
      this.clearMessages();
      const messages = await storageEngine.getMessages(chatId);
      for (const msg of messages) {
        this.addMessageBubble(msg, false);
      }

      // Update title
      this.updateChatTitle(chat.title);

      // Update compact indicator
      this.compactIndicator.setChatId(chatId);
      this.compactIndicator.setMaxTokens(this.currentModel?.contextWindow ?? 4096);

      // Scroll to bottom
      this.scrollToBottom();
    } catch (error) {
      console.error('[ChatPage] Failed to load chat:', error);
      this.showToast('Failed to load chat', 'error');
    }
  }

  /** Save current chat */
  async saveCurrentChat(): Promise<void> {
    if (!this.currentChatId) return;

    try {
      const messages = Array.from(this.messageBubbles.values())
        .map(b => b['options'].message)
        .filter(m => m.role !== 'system'); // Don't save system messages

      const chat = await storageEngine.getChat(this.currentChatId);
      if (!chat) return;

      // Update title from first user message if still "New Chat"
      let title = chat.title;
      if (title === 'New Chat') {
        const firstUserMsg = messages.find(m => m.role === 'user');
        if (firstUserMsg) {
          title = truncate(firstUserMsg.content, 50);
        }
      }

      await storageEngine.updateChat(this.currentChatId, {
        title,
        modelId: this.currentModel?.id || chat.modelId,
      });

      // Save messages
      // First delete existing messages
      await storageEngine.deleteMessagesForChat(this.currentChatId);
      // Then add new messages
      for (const msg of messages) {
        await storageEngine.addMessage({ ...msg, chatId: this.currentChatId });
      }

      this.updateChatTitle(title);
    } catch (error) {
      console.error('[ChatPage] Failed to save chat:', error);
    }
  }

  /** Handle sending a message */
  async handleSend(): Promise<void> {
    const text = this.inputArea.value.trim();
    if (!text || this.isStreaming) return;

    if (!this.currentChatId) {
      await this.newChat();
    }

    if (!this.currentModel) {
      this.showToast('Please select a model first', 'warning');
      return;
    }

    // Check if model is loaded
    if (!webllmEngine.isReady()) {
      try {
        await this.loadCurrentModel();
      } catch {
        // loadCurrentModel already shows its own error toast — abort the send
        // without throwing, so no unhandled promise rejection reaches the app.
        return;
      }
    }

    // Create user message
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    this.addMessageBubble(userMessage, false);
    this.pendingUserMessage = userMessage;
    this.inputArea.value = '';
    this.autoResizeTextarea();

    // Create streaming assistant bubble
    const assistantId = generateId();
    const streamingBubble = createStreamingBubble(assistantId,
      (text) => navigator.clipboard.writeText(text),
      (id) => this.regenerateMessage(id)
    );
    this.addMessageBubble(streamingBubble['options'].message, true);
    this.messageBubbles.set(assistantId, streamingBubble);

    this.isStreaming = true;
    this.sendBtn.disabled = true;
    this.sendBtn.textContent = '⏹️ Stop';
    this.inputArea.disabled = true;

    this.abortController = new AbortController();

    try {
      // Build context with memory
      const context = await memoryEngine.buildContextWindow(
        this.currentChatId!,
        this.currentModel.contextWindow ?? 4096
      );

      // Add current user message to context
      context.push(userMessage);

      // Stream response
      let fullResponse = '';
      for await (const chunk of webllmEngine.streamChat(context, {
        temperature: 0.7,
        topP: 0.95,
        maxTokens: 2048,
      })) {
        fullResponse += chunk;
        streamingBubble.append(chunk);
        this.scrollToBottom();
      }

      // Complete streaming
      streamingBubble.complete();
      this.isStreaming = false;
      this.sendBtn.disabled = false;
      this.sendBtn.textContent = '➤ Send';
      this.inputArea.disabled = false;
      this.inputArea.focus();

      // Save assistant message
      const assistantMessage: Message = {
        id: assistantId,
        role: 'assistant',
        content: fullResponse,
        timestamp: Date.now(),
      };
      streamingBubble['options'].message = assistantMessage;
      this.messageBubbles.set(assistantId, streamingBubble);

      // Check if auto-compact needed
      await this.maybeAutoCompact();

      // Save chat
      await this.saveCurrentChat();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        streamingBubble.setError('Stopped');
      } else {
        console.error('[ChatPage] Generation error:', error);
        streamingBubble.setError('Generation failed');
        this.showToast('Failed to generate response', 'error');
      }
      this.isStreaming = false;
      this.sendBtn.disabled = false;
      this.sendBtn.textContent = '➤ Send';
      this.inputArea.disabled = false;
      this.inputArea.focus();
    } finally {
      this.abortController = null;
      this.pendingUserMessage = null;
    }
  }

  /** Stop generation */
  handleStop(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  /** Regenerate last assistant message */
  async regenerateMessage(messageId: string): Promise<void> {
    // Find the user message before this assistant message
    const messages = Array.from(this.messageBubbles.values())
      .map(b => b['options'].message);

    const assistantIndex = messages.findIndex(m => m.id === messageId);
    if (assistantIndex <= 0) return;

    // Remove this and all subsequent messages
    const toRemove = messages.slice(assistantIndex);
    for (const msg of toRemove) {
      this.messageBubbles.get(msg.id)?.getElement().remove();
      this.messageBubbles.delete(msg.id);
    }

    // Re-send from the user message before
    const userMessage = messages[assistantIndex - 1];
    if (userMessage.role === 'user') {
      this.inputArea.value = userMessage.content;
      await this.handleSend();
    }
  }

  /** Handle model change */
  async onModelChange(model: ModelInfo): Promise<void> {
    if (this.currentModel?.id === model.id) return;

    this.currentModel = model;
    this.compactIndicator.setMaxTokens(model.contextWindow ?? 4096);

    // If there's an active chat, switch model
    if (this.currentChatId && this.messageBubbles.size > 0) {
      this.showToast(`Switching to ${model.name}...`, 'info');

      try {
        const messages = Array.from(this.messageBubbles.values())
          .map(b => b['options'].message);

        await webllmEngine.switchModel(model.id, messages);
        this.showToast(`Switched to ${model.name}`, 'success');
      } catch (error) {
        console.error('[ChatPage] Model switch failed:', error);
        this.showToast('Failed to switch model', 'error');
      }
    }

    await this.saveCurrentChat();
  }

  /** Load current model */
  private async loadCurrentModel(): Promise<void> {
    if (!this.currentModel) return;

    const loadingToast = this.showToast(`Loading ${this.currentModel.name}...`, 'info');

    try {
      await webllmEngine.loadModel(this.currentModel.id, (progress: any) => {
        const p = typeof progress === 'number' ? progress : progress?.progress ?? 0;
        loadingToast.textContent = `Loading ${this.currentModel!.name}: ${Math.round(p * 100)}%`;
      });
      loadingToast.remove();
      this.showToast(`${this.currentModel.name} ready`, 'success');
    } catch (error) {
      loadingToast.remove();
      console.error('[ChatPage] Model load failed:', error);
      // Surface the real reason (e.g. unsupported WebGPU) instead of a generic message
      this.showToast(error instanceof Error ? error.message : `Failed to load ${this.currentModel.name}`, 'error');
      throw error;
    }
  }

  /** Check if auto-compact needed */
  private async maybeAutoCompact(): Promise<void> {
    if (!this.currentChatId) return;

    const messages = Array.from(this.messageBubbles.values())
      .map(b => b['options'].message);

    await memoryEngine.maybeCompact(messages, this.currentChatId);
    this.compactIndicator.refresh();
  }

  /** Handle manual compact */
  async handleCompact(): Promise<void> {
    if (!this.currentChatId) return;

    const messages = Array.from(this.messageBubbles.values())
      .map(b => b['options'].message);

    this.compactIndicator.setCompacting(true);

    try {
      await memoryEngine.maybeCompact(messages, this.currentChatId);
      this.showToast('Conversation compacted', 'success');
    } catch (error) {
      console.error('[ChatPage] Compact failed:', error);
      this.showToast('Compaction failed', 'error');
    } finally {
      this.compactIndicator.setCompacting(false);
      this.compactIndicator.refresh();
    }
  }

  /** Clear message display */
  private clearMessages(): void {
    this.chatContainer.innerHTML = '';
    this.messageBubbles.clear();
    // Re-add welcome state
    this.showWelcome();
  }

  private showWelcome(): void {
    const welcome = this.chatContainer.querySelector('#chat-welcome');
    if (welcome) return; // already there
    const welcomeEl = createElement('div', { class: 'chat-welcome', id: 'chat-welcome' });
    welcomeEl.innerHTML = `
      <div class="welcome-icon">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2c1 3 2.5 3.5 3.5 4.5A5 5 0 0 1 17 10a5 5 0 1 1-10 0c0-1 .5-2.5 1.5-3.5C9.5 5.5 11 5 12 2z"></path>
        </svg>
      </div>
      <h2 class="welcome-title">What's on your mind?</h2>
      <p class="welcome-subtitle">Your conversations stay right here — nothing leaves your browser. Pick a model above and start a chat.</p>
      <div class="welcome-features">
        <div class="welcome-feature">
          <div class="welcome-feature-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" stroke-width="2" stroke-linecap="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
          <span class="welcome-feature-title">Fully Private</span>
          <span class="welcome-feature-desc">No data ever leaves your device</span>
        </div>
        <div class="welcome-feature">
          <div class="welcome-feature-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" stroke-width="2" stroke-linecap="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
            </svg>
          </div>
          <span class="welcome-feature-title">Blazing Fast</span>
          <span class="welcome-feature-desc">Powered by WebGPU in your browser</span>
        </div>
        <div class="welcome-feature">
          <div class="welcome-feature-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" stroke-width="2" stroke-linecap="round">
              <path d="M12 2a7 7 0 0 0-7 7c0 3 2 5.5 4 7.5L12 20l3-3.5c2-2 4-4.5 4-7.5a7 7 0 0 0-7-7z"></path>
              <circle cx="12" cy="9" r="2"></circle>
            </svg>
          </div>
          <span class="welcome-feature-title">Smart Memory</span>
          <span class="welcome-feature-desc">Auto-compacting context for long chats</span>
        </div>
      </div>
      <div class="welcome-hint">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2" stroke-linecap="round">
          <path d="M12 2c1 3 2.5 3.5 3.5 4.5A5 5 0 0 1 17 10a5 5 0 1 1-10 0c0-1 .5-2.5 1.5-3.5C9.5 5.5 11 5 12 2z"></path>
        </svg>
        <span>Select a model to get started</span>
      </div>
    `;
    this.chatContainer.appendChild(welcomeEl);
  }

  private hideWelcome(): void {
    const welcome = this.chatContainer.querySelector('#chat-welcome');
    if (welcome) welcome.remove();
  }

  /** Add message bubble to chat */
  private addMessageBubble(message: Message, isStreaming: boolean): void {
    this.hideWelcome();
    const bubble = new MessageBubble({
      message,
      isStreaming,
      onCopy: (text) => navigator.clipboard.writeText(text),
      onRegenerate: (id) => this.regenerateMessage(id),
      onEdit: (id, content) => this.editMessage(id, content),
      onDelete: (id) => this.deleteMessage(id),
    });

    this.chatContainer.appendChild(bubble.getElement());
    this.messageBubbles.set(message.id, bubble);
    this.scrollToBottom();
  }

  /** Edit a user message */
  private async editMessage(messageId: string, newContent: string): Promise<void> {
    // Remove this and all subsequent messages
    const messages = Array.from(this.messageBubbles.values())
      .map(b => b['options'].message);

    const index = messages.findIndex(m => m.id === messageId);
    if (index < 0) return;

    const toRemove = messages.slice(index + 1);
    for (const msg of toRemove) {
      this.messageBubbles.get(msg.id)?.getElement().remove();
      this.messageBubbles.delete(msg.id);
    }

    // Re-send from edited message
    this.inputArea.value = newContent;
    await this.handleSend();
  }

  /** Delete a message */
  private deleteMessage(messageId: string): void {
    const bubble = this.messageBubbles.get(messageId);
    if (bubble) {
      bubble.getElement().remove();
      this.messageBubbles.delete(messageId);
    }
  }

  /** Scroll chat to bottom */
  private scrollToBottom(): void {
    this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
  }

  /** Auto-resize textarea */
  private autoResizeTextarea(): void {
    this.inputArea.style.height = 'auto';
    this.inputArea.style.height = `${Math.min(this.inputArea.scrollHeight, 200)}px`;
  }

  /** Update chat title in header */
  private updateChatTitle(title: string): void {
    const titleEl = this.element.querySelector('.chat-title');
    if (titleEl) titleEl.textContent = title;
  }

  /** Initialize model selector */
  private async initModelSelector(): Promise<void> {
    this.modelSelector = createCompactModelSelector(
      this.currentModel?.id || '',
      (model) => this.onModelChange(model)
    );

    const selectorContainer = this.element.querySelector('.model-selector-container');
    if (selectorContainer) {
      selectorContainer.innerHTML = '';
      selectorContainer.appendChild(this.modelSelector.getElement());
    }

    // Don't auto-load a model on first visit — user picks from selector.
    // Auto-loading can fail when WebGPU is unavailable (headless, older
    // browsers) or the default model isn't in WebLLM's model_list.
  }

  /** Load last active chat */
  private async loadLastChat(): Promise<void> {
    try {
      const chats = await storageEngine.getAllChats();
      if (chats.length > 0) {
        // Sort by updatedAt desc
        chats.sort((a: ChatSession, b: ChatSession) => b.updatedAt - a.updatedAt);
        this.currentChatId = chats[0].id;
      }
    } catch (error) {
      console.warn('[ChatPage] No previous chats found');
    }
  }

  private createElement(): HTMLElement {
    const page = createElement('div', { class: 'page chat-page' });

    // Header
    const header = createElement('header', { class: 'chat-header' });
    const title = createElement('h1', { class: 'chat-title', children: ['New Chat'] });
    const modelContainer = createElement('div', { class: 'model-selector-container' });
    header.append(title, modelContainer);

    // Chat container
    this.chatContainer = createElement('div', { class: 'chat-container' });

    // Welcome state (shown when no messages)
    const welcomeState = createElement('div', { class: 'chat-welcome', id: 'chat-welcome' });
    welcomeState.innerHTML = `
      <div class="welcome-icon">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2c1 3 2.5 3.5 3.5 4.5A5 5 0 0 1 17 10a5 5 0 1 1-10 0c0-1 .5-2.5 1.5-3.5C9.5 5.5 11 5 12 2z"></path>
        </svg>
      </div>
      <h2 class="welcome-title">What's on your mind?</h2>
      <p class="welcome-subtitle">Your conversations stay right here — nothing leaves your browser. Pick a model above and start a chat.</p>
      <div class="welcome-features">
        <div class="welcome-feature">
          <div class="welcome-feature-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" stroke-width="2" stroke-linecap="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
          <span class="welcome-feature-title">Fully Private</span>
          <span class="welcome-feature-desc">No data ever leaves your device</span>
        </div>
        <div class="welcome-feature">
          <div class="welcome-feature-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" stroke-width="2" stroke-linecap="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
            </svg>
          </div>
          <span class="welcome-feature-title">Blazing Fast</span>
          <span class="welcome-feature-desc">Powered by WebGPU in your browser</span>
        </div>
        <div class="welcome-feature">
          <div class="welcome-feature-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" stroke-width="2" stroke-linecap="round">
              <path d="M12 2a7 7 0 0 0-7 7c0 3 2 5.5 4 7.5L12 20l3-3.5c2-2 4-4.5 4-7.5a7 7 0 0 0-7-7z"></path>
              <circle cx="12" cy="9" r="2"></circle>
            </svg>
          </div>
          <span class="welcome-feature-title">Smart Memory</span>
          <span class="welcome-feature-desc">Auto-compacting context for long chats</span>
        </div>
      </div>
      <div class="welcome-hint">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2" stroke-linecap="round">
          <path d="M12 2c1 3 2.5 3.5 3.5 4.5A5 5 0 0 1 17 10a5 5 0 1 1-10 0c0-1 .5-2.5 1.5-3.5C9.5 5.5 11 5 12 2z"></path>
        </svg>
        <span>Select a model to get started</span>
      </div>
    `;
    this.chatContainer.appendChild(welcomeState);

    // Compact indicator
    this.compactIndicator = new CompactIndicator({
      chatId: this.currentChatId || '',
      maxTokens: this.currentModel?.contextWindow || 4096,
      onCompact: () => this.handleCompact(),
      showDetails: true,
    });

    // Input area
    const inputWrapper = createElement('div', { class: 'chat-input-wrapper' });
    const inputRow = createElement('div', { class: 'chat-input-row' });

    this.inputArea = createElement('textarea', {
      class: 'chat-input',
      placeholder: 'Type a message... (Shift+Enter for new line)',
      rows: 1,
      onInput: () => this.autoResizeTextarea(),
      onKeydown: (e: KeyboardEvent) => this.handleInputKeydown(e),
    });

    this.sendBtn = createElement('button', {
      class: 'btn btn-primary send-btn',
      type: 'button',
      children: ['➤ Send'],
      onClick: () => this.handleSend(),
    });

    inputRow.append(this.inputArea, this.sendBtn);

    // Compact indicator + actions
    const actionsRow = createElement('div', { class: 'chat-actions-row' });
    actionsRow.append(
      this.compactIndicator.getElement(),
      createElement('button', {
        class: 'btn btn-secondary new-chat-btn',
        type: 'button',
        children: ['+ New Chat'],
        onClick: () => this.newChat(),
      })
    );

    inputWrapper.append(inputRow, actionsRow);

    page.append(header, this.chatContainer, inputWrapper);
    return page;
  }

  private handleInputKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!this.isStreaming) {
        this.handleSend();
      } else {
        this.handleStop();
      }
    }
  }

  private bindEvents(): void {
    // Auto-resize on input
    this.inputArea?.addEventListener('input', () => this.autoResizeTextarea());
  }

  private showToast(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success'): HTMLElement {
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
    return toast;
  }
}