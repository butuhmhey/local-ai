/**
 * Storage Engine - IndexedDB wrapper using idb library
 * Handles all persistence: chats, messages, memories, facts, models, settings
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type {
  ChatSession,
  ChatMessage,
  MemoryLayer,
  Fact,
  StoredChat,
  StoredMessage,
  StoredMemory,
  StoredFact,
  StoredModel,
  StoredSetting,
  ModelDefinition,
  AppSettings,
  ChatSessionSettings
} from '../types/index.js';

/** Database schema */
interface LocalAIDB extends DBSchema {
  chats: {
    key: string;
    value: StoredChat;
    indexes: { 'by-updatedAt': number; 'by-modelId': string };
  };
  messages: {
    key: string;
    value: StoredMessage;
    indexes: { 'by-chatId': string; 'by-timestamp': number };
  };
  memories: {
    key: string;
    value: StoredMemory;
    indexes: { 'by-chatId': string; 'by-level': number };
  };
  facts: {
    key: string;
    value: StoredFact;
    indexes: { 'by-chatId': string; 'by-entity': string; 'by-confidence': number };
  };
  models: {
    key: string;
    value: StoredModel;
    indexes: { 'by-modelId': string; 'by-lastUsed': number };
  };
  settings: {
    key: string;
    value: StoredSetting;
  };
}

/** Database name and version */
const DB_NAME = 'local-ai-chat';
const DB_VERSION = 1;

/** Default app settings */
const DEFAULT_SETTINGS: AppSettings = {
  theme: 'auto',
  autoCompactThreshold: 75,
  recentMessageCount: 10,
  defaultModelId: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
  autoDownloadModels: false,
  compactOnModelSwitch: true,
  showTokenCount: true,
  enableStreaming: true,
};

/** Storage Engine Class */
export class StorageEngine {
  private db: IDBPDatabase<LocalAIDB> | null = null;
  private initPromise: Promise<void> | null = null;

  /** Initialize the database */
  async init(): Promise<void> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      this.db = await openDB<LocalAIDB>(DB_NAME, DB_VERSION, {
        upgrade(db, oldVersion, newVersion, transaction) {
          // Chats store
          if (!db.objectStoreNames.contains('chats')) {
            const chatStore = db.createObjectStore('chats', { keyPath: 'id' });
            chatStore.createIndex('by-updatedAt', 'updatedAt');
            chatStore.createIndex('by-modelId', 'modelId');
          }

          // Messages store
          if (!db.objectStoreNames.contains('messages')) {
            const msgStore = db.createObjectStore('messages', { keyPath: 'id' });
            msgStore.createIndex('by-chatId', 'chatId');
            msgStore.createIndex('by-timestamp', 'timestamp');
          }

          // Memories store
          if (!db.objectStoreNames.contains('memories')) {
            const memStore = db.createObjectStore('memories', { keyPath: 'id' });
            memStore.createIndex('by-chatId', 'chatId');
            memStore.createIndex('by-level', 'level');
          }

          // Facts store
          if (!db.objectStoreNames.contains('facts')) {
            const factStore = db.createObjectStore('facts', { keyPath: 'id' });
            factStore.createIndex('by-chatId', 'chatId');
            factStore.createIndex('by-entity', 'entity');
            factStore.createIndex('by-confidence', 'confidence');
          }

          // Models store
          if (!db.objectStoreNames.contains('models')) {
            const modelStore = db.createObjectStore('models', { keyPath: 'id' });
            modelStore.createIndex('by-modelId', 'modelId');
            modelStore.createIndex('by-lastUsed', 'lastUsed');
          }

          // Settings store
          if (!db.objectStoreNames.contains('settings')) {
            db.createObjectStore('settings', { keyPath: 'key' });
          }
        },
        blocked() {
          console.warn('[StorageEngine] Database blocked');
        },
        blocking() {
          console.warn('[StorageEngine] Database blocking');
        },
      });

      // Initialize default settings if not present
      await this.ensureDefaultSettings();

      console.log('[StorageEngine] Database initialized');
    })();

    return this.initPromise;
  }

  /** Ensure database is ready */
  private async ensureDB(): Promise<IDBPDatabase<LocalAIDB>> {
    if (! this.db) {
      await this.init();
    }
    return this.db!;
  }

  /** Generate unique ID */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }

  // ===== Settings =====

  /** Ensure default settings exist */
  private async ensureDefaultSettings(): Promise<void> {
    const db = await this.ensureDB();
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      const existing = await db.get('settings', key);
      if (!existing) {
        await db.put('settings', { key, value });
      }
    }
  }

  /** Get a setting */
  async getSetting<K extends keyof AppSettings>(key: K): Promise<AppSettings[K]> {
    const db = await this.ensureDB();
    const setting = await db.get('settings', key);
    return setting?.value as AppSettings[K] ?? DEFAULT_SETTINGS[key];
  }

  /** Get all settings */
  async getAllSettings(): Promise<AppSettings> {
    const db = await this.ensureDB();
    const settings = await db.getAll('settings');
    const result = { ...DEFAULT_SETTINGS };
    for (const s of settings) {
      (result as any)[s.key] = s.value;
    }
    return result;
  }

  /** Set a setting */
  async setSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<void> {
    const db = await this.ensureDB();
    await db.put('settings', { key, value });
  }

  /** Update multiple settings */
  async updateSettings(partial: Partial<AppSettings>): Promise<void> {
    const db = await this.ensureDB();
    const tx = db.transaction('settings', 'readwrite');
    for (const [key, value] of Object.entries(partial)) {
      await tx.store.put({ key, value });
    }
    await tx.done;
  }

  // ===== Chats =====

  /** Create a new chat session */
  async createChat(chat: Omit<ChatSession, 'id' | 'createdAt' | 'updatedAt' | 'messageCount'>): Promise<ChatSession> {
    const db = await this.ensureDB();
    const now = Date.now();
    const newChat: StoredChat = {
      id: this.generateId(),
      title: chat.title,
      modelId: chat.modelId,
      createdAt: now,
      updatedAt: now,
      messageCount: 0,
      compactedAt: chat.compactedAt,
      settings: chat.settings,
    };
    await db.put('chats', newChat);
    return this.toChatSession(newChat);
  }

  /** Get a chat by ID */
  async getChat(id: string): Promise<ChatSession | null> {
    const db = await this.ensureDB();
    const stored = await db.get('chats', id);
    return stored ? this.toChatSession(stored) : null;
  }

  /** Get all chats, sorted by updatedAt desc */
  async getAllChats(): Promise<ChatSession[]> {
    const db = await this.ensureDB();
    const stored = await db.getAllFromIndex('chats', 'by-updatedAt');
    return stored.reverse().map(this.toChatSession);
  }

  /** Update chat metadata */
  async updateChat(id: string, updates: Partial<Pick<ChatSession, 'title' | 'modelId' | 'compactedAt' | 'settings'>>): Promise<void> {
    const db = await this.ensureDB();
    const chat = await db.get('chats', id);
    if (!chat) throw new Error(`Chat ${id} not found`);

    const updated: StoredChat = {
      ...chat,
      ...updates,
      updatedAt: Date.now(),
    };
    await db.put('chats', updated);
  }

  /** Delete a chat and all its messages/memories/facts */
  async deleteChat(id: string): Promise<void> {
    const db = await this.ensureDB();
    const tx = db.transaction(['chats', 'messages', 'memories', 'facts'], 'readwrite');

    await tx.objectStore('chats').delete(id);

    // Delete messages
    const msgIndex = tx.objectStore('messages').index('by-chatId');
    const messages = await msgIndex.getAllKeys(id);
    for (const key of messages) {
      await tx.objectStore('messages').delete(key);
    }

    // Delete memories
    const memIndex = tx.objectStore('memories').index('by-chatId');
    const memories = await memIndex.getAllKeys(id);
    for (const key of memories) {
      await tx.objectStore('memories').delete(key);
    }

    // Delete facts
    const factIndex = tx.objectStore('facts').index('by-chatId');
    const facts = await factIndex.getAllKeys(id);
    for (const key of facts) {
      await tx.objectStore('facts').delete(key);
    }

    await tx.done;
  }

  /** Increment message count */
  async incrementMessageCount(chatId: string): Promise<void> {
    const db = await this.ensureDB();
    const chat = await db.get('chats', chatId);
    if (chat) {
      chat.messageCount++;
      chat.updatedAt = Date.now();
      await db.put('chats', chat);
    }
  }

  // ===== Messages =====

  /** Add a message */
  async addMessage(message: Omit<ChatMessage, 'id' | 'timestamp'> & { timestamp?: number }): Promise<ChatMessage> {
    const db = await this.ensureDB();
    const now = message.timestamp ?? Date.now();
    const newMsg: StoredMessage = {
      id: this.generateId(),
      chatId: message.chatId,
      role: message.role,
      content: message.content,
      tokens: message.tokens ?? 0,
      timestamp: now,
      isCompacted: message.isCompacted ?? false,
      parentSummaryId: message.parentSummaryId,
      modelId: message.modelId,
    };
    await db.put('messages', newMsg);
    await this.incrementMessageCount(message.chatId);
    return this.toChatMessage(newMsg);
  }

  /** Get messages for a chat */
  async getMessages(chatId: string, limit?: number): Promise<ChatMessage[]> {
    const db = await this.ensureDB();
    const stored = await db.getAllFromIndex('messages', 'by-chatId', chatId);
    const sorted = stored.sort((a, b) => a.timestamp - b.timestamp);
    return (limit ? sorted.slice(-limit) : sorted).map(this.toChatMessage);
  }

  /** Get recent messages for a chat */
  async getRecentMessages(chatId: string, count: number): Promise<ChatMessage[]> {
    const db = await this.ensureDB();
    const stored = await db.getAllFromIndex('messages', 'by-chatId', chatId);
    const sorted = stored.sort((a, b) => b.timestamp - a.timestamp);
    return sorted.slice(0, count).reverse().map(this.toChatMessage);
  }

  /** Update a message */
  async updateMessage(id: string, updates: Partial<Pick<ChatMessage, 'content' | 'tokens' | 'isCompacted' | 'parentSummaryId'>>): Promise<void> {
    const db = await this.ensureDB();
    const msg = await db.get('messages', id);
    if (!msg) throw new Error(`Message ${id} not found`);

    const updated: StoredMessage = { ...msg, ...updates };
    await db.put('messages', updated);
  }

  /** Delete a message */
  async deleteMessage(id: string): Promise<void> {
    const db = await this.ensureDB();
    await db.delete('messages', id);
  }

  /** Delete all messages for a chat */
  async deleteMessagesForChat(chatId: string): Promise<void> {
    const db = await this.ensureDB();
    const tx = db.transaction('messages', 'readwrite');
    const index = tx.store.index('by-chatId');
    const keys = await index.getAllKeys(chatId);
    for (const key of keys) {
      await tx.store.delete(key);
    }
    await tx.done;
  }

  // ===== Memories =====

  /** Add a memory layer */
  async addMemory(memory: Omit<MemoryLayer, 'id' | 'createdAt'> & { id?: string }): Promise<MemoryLayer> {
    const db = await this.ensureDB();
    const newMem: StoredMemory = {
      id: memory.id ?? this.generateId(),
      chatId: memory.chatId,
      level: memory.level,
      content: memory.content,
      tokens: memory.tokens,
      facts: memory.extractedFacts,
      sourceMessageIds: memory.sourceMessageIds,
      createdAt: Date.now(),
    };
    await db.put('memories', newMem);
    return this.toMemoryLayer(newMem);
  }

  /** Get memories for a chat */
  async getMemories(chatId: string): Promise<MemoryLayer[]> {
    const db = await this.ensureDB();
    const stored = await db.getAllFromIndex('memories', 'by-chatId', chatId);
    return stored.map(this.toMemoryLayer).sort((a, b) => a.timestamp - b.timestamp);
  }

  /** Get memories by level */
  async getMemoriesByLevel(chatId: string, level: 0 | 1 | 2): Promise<MemoryLayer[]> {
    const db = await this.ensureDB();
    const stored = await db.getAllFromIndex('memories', 'by-chatId', chatId);
    return stored
      .filter(m => m.level === level)
      .map(this.toMemoryLayer)
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  /** Delete a memory */
  async deleteMemory(id: string): Promise<void> {
    const db = await this.ensureDB();
    await db.delete('memories', id);
  }

  /** Delete all memories for a chat */
  async deleteMemoriesForChat(chatId: string): Promise<void> {
    const db = await this.ensureDB();
    const tx = db.transaction('memories', 'readwrite');
    const index = tx.store.index('by-chatId');
    const keys = await index.getAllKeys(chatId);
    for (const key of keys) {
      await tx.store.delete(key);
    }
    await tx.done;
  }

  // ===== Facts =====

  /** Add a fact */
  async addFact(fact: Omit<Fact, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<Fact> {
    const db = await this.ensureDB();
    const now = Date.now();
    const newFact: StoredFact = {
      id: fact.id ?? this.generateId(),
      chatId: fact.chatId,
      entity: fact.entity,
      relation: fact.relation,
      value: fact.value,
      confidence: fact.confidence,
      sourceMessageId: fact.sourceMessageId,
      sourceMemoryId: fact.sourceMemoryId,
      createdAt: now,
      updatedAt: now,
    };
    await db.put('facts', newFact);
    return this.toFact(newFact);
  }

  /** Get facts for a chat */
  async getFacts(chatId: string, minConfidence = 0): Promise<Fact[]> {
    const db = await this.ensureDB();
    const stored = await db.getAllFromIndex('facts', 'by-chatId', chatId);
    return stored
      .filter(f => f.confidence >= minConfidence)
      .map(this.toFact)
      .sort((a, b) => b.confidence - a.confidence);
  }

  /** Get facts by entity */
  async getFactsByEntity(chatId: string, entity: string): Promise<Fact[]> {
    const db = await this.ensureDB();
    const stored = await db.getAllFromIndex('facts', 'by-chatId', chatId);
    return stored
      .filter(f => f.entity.toLowerCase() === entity.toLowerCase())
      .map(this.toFact);
  }

  /** Update a fact */
  async updateFact(id: string, updates: Partial<Pick<Fact, 'entity' | 'relation' | 'value' | 'confidence'>>): Promise<void> {
    const db = await this.ensureDB();
    const fact = await db.get('facts', id);
    if (!fact) throw new Error(`Fact ${id} not found`);

    const updated: StoredFact = {
      ...fact,
      ...updates,
      updatedAt: Date.now(),
    };
    await db.put('facts', updated);
  }

  /** Delete a fact */
  async deleteFact(id: string): Promise<void> {
    const db = await this.ensureDB();
    await db.delete('facts', id);
  }

  /** Search facts */
  async searchFacts(chatId: string, query: string): Promise<Fact[]> {
    const db = await this.ensureDB();
    const stored = await db.getAllFromIndex('facts', 'by-chatId', chatId);
    const q = query.toLowerCase();
    return stored
      .filter(f =>
        f.entity.toLowerCase().includes(q) ||
        f.relation.toLowerCase().includes(q) ||
        f.value.toLowerCase().includes(q)
      )
      .map(this.toFact);
  }

  // ===== Models =====

  /** Record a model as downloaded */
  async recordModelDownload(modelId: string, sizeBytes: number): Promise<void> {
    const db = await this.ensureDB();
    const existing = await db.getFromIndex('models', 'by-modelId', modelId);
    const now = Date.now();

    const stored: StoredModel = {
      id: existing?.id ?? this.generateId(),
      modelId,
      downloadedAt: existing?.downloadedAt ?? now,
      sizeBytes,
      lastUsed: now,
    };
    await db.put('models', stored);
  }

  /** Update model last used */
  async updateModelLastUsed(modelId: string): Promise<void> {
    const db = await this.ensureDB();
    const existing = await db.getFromIndex('models', 'by-modelId', modelId);
    if (existing) {
      existing.lastUsed = Date.now();
      await db.put('models', existing);
    }
  }

  /** Get downloaded models */
  async getDownloadedModels(): Promise<StoredModel[]> {
    const db = await this.ensureDB();
    return db.getAllFromIndex('models', 'by-lastUsed');
  }

  /** Check if model is downloaded */
  async isModelDownloaded(modelId: string): Promise<boolean> {
    const db = await this.ensureDB();
    const model = await db.getFromIndex('models', 'by-modelId', modelId);
    return !!model;
  }

  /** Delete a downloaded model record */
  async deleteModelRecord(modelId: string): Promise<void> {
    const db = await this.ensureDB();
    const existing = await db.getFromIndex('models', 'by-modelId', modelId);
    if (existing) {
      await db.delete('models', existing.id);
    }
  }

  // ===== Export/Import =====

  /** Export all data for a chat */
  async exportChat(chatId: string): Promise<{
    chat: ChatSession;
    messages: ChatMessage[];
    memories: MemoryLayer[];
    facts: Fact[];
  } | null> {
    const [chat, messages, memories, facts] = await Promise.all([
      this.getChat(chatId),
      this.getMessages(chatId),
      this.getMemories(chatId),
      this.getFacts(chatId),
    ]);

    if (!chat) return null;
    return { chat, messages, memories, facts };
  }

  /** Import chat data */
  async importChat(data: {
    chat: Omit<ChatSession, 'id' | 'createdAt' | 'updatedAt' | 'messageCount'>;
    messages: Omit<ChatMessage, 'id' | 'timestamp'>[];
    memories?: Omit<MemoryLayer, 'id' | 'createdAt'>[];
    facts?: Omit<Fact, 'id' | 'createdAt' | 'updatedAt'>[];
  }): Promise<ChatSession> {
    const db = await this.ensureDB();
    const tx = db.transaction(['chats', 'messages', 'memories', 'facts'], 'readwrite');

    // Create chat
    const now = Date.now();
    const chatId = this.generateId();
    const newChat: StoredChat = {
      id: chatId,
      title: data.chat.title,
      modelId: data.chat.modelId,
      createdAt: now,
      updatedAt: now,
      messageCount: data.messages.length,
      compactedAt: data.chat.compactedAt,
      settings: data.chat.settings,
    };
    await tx.objectStore('chats').put(newChat);

    // Add messages
    for (const msg of data.messages) {
      const newMsg: StoredMessage = {
        id: this.generateId(),
        chatId,
        role: msg.role,
        content: msg.content,
        tokens: msg.tokens ?? 0,
        timestamp: msg.timestamp ?? now,
        isCompacted: msg.isCompacted ?? false,
        parentSummaryId: msg.parentSummaryId,
        modelId: msg.modelId,
      };
      await tx.objectStore('messages').put(newMsg);
    }

    // Add memories
    if (data.memories) {
      for (const mem of data.memories) {
        const newMem: StoredMemory = {
          id: this.generateId(),
          chatId,
          level: mem.level,
          content: mem.content,
          tokens: mem.tokens,
          facts: mem.extractedFacts,
          sourceMessageIds: mem.sourceMessageIds,
          createdAt: now,
        };
        await tx.objectStore('memories').put(newMem);
      }
    }

    // Add facts
    if (data.facts) {
      for (const fact of data.facts) {
        const newFact: StoredFact = {
          id: this.generateId(),
          chatId,
          entity: fact.entity,
          relation: fact.relation,
          value: fact.value,
          confidence: fact.confidence,
          sourceMessageId: fact.sourceMessageId,
          sourceMemoryId: fact.sourceMemoryId,
          createdAt: now,
          updatedAt: now,
        };
        await tx.objectStore('facts').put(newFact);
      }
    }

    await tx.done;
    return this.toChatSession(newChat);
  }

  /** Clear all data (for testing/reset) */
  async clearAll(): Promise<void> {
    const db = await this.ensureDB();
    const tx = db.transaction(['chats', 'messages', 'memories', 'facts', 'models'], 'readwrite');
    await Promise.all([
      tx.objectStore('chats').clear(),
      tx.objectStore('messages').clear(),
      tx.objectStore('memories').clear(),
      tx.objectStore('facts').clear(),
      tx.objectStore('models').clear(),
    ]);
    await tx.done;
    // Re-initialize default settings
    await this.ensureDefaultSettings();
  }

  /** Get database size estimate */
  async getDBSize(): Promise<number> {
    if (!('storage' in navigator) || !('estimate' in navigator.storage)) {
      return 0;
    }
    const estimate = await navigator.storage.estimate();
    return estimate.usage ?? 0;
  }

  // ===== Converters =====

  private toChatSession(stored: StoredChat): ChatSession {
    return {
      id: stored.id,
      title: stored.title,
      modelId: stored.modelId,
      createdAt: stored.createdAt,
      updatedAt: stored.updatedAt,
      messageCount: stored.messageCount,
      compactedAt: stored.compactedAt,
      settings: stored.settings,
    };
  }

  private toChatMessage(stored: StoredMessage): ChatMessage {
    return {
      id: stored.id,
      role: stored.role,
      content: stored.content,
      timestamp: stored.timestamp,
      tokens: stored.tokens,
      isCompacted: stored.isCompacted,
      parentSummaryId: stored.parentSummaryId,
      modelId: stored.modelId,
    };
  }

  private toMemoryLayer(stored: StoredMemory): MemoryLayer {
    return {
      id: stored.id,
      chatId: stored.chatId,
      level: stored.level,
      content: stored.content,
      tokens: stored.tokens,
      timestamp: stored.createdAt,
      sourceMessageIds: stored.sourceMessageIds,
      extractedFacts: stored.facts,
    };
  }

  private toFact(stored: StoredFact): Fact {
    return {
      id: stored.id,
      chatId: stored.chatId,
      entity: stored.entity,
      relation: stored.relation,
      value: stored.value,
      confidence: stored.confidence,
      sourceMessageId: stored.sourceMessageId,
      sourceMemoryId: stored.sourceMemoryId,
      createdAt: stored.createdAt,
      updatedAt: stored.updatedAt,
    };
  }

  /** Close database connection */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
    }
  }
}

// Export singleton
export const storageEngine = new StorageEngine();