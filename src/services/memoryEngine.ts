/**
 * Memory Engine - Auto-compacting hierarchical memory system
 * Core feature: recursive summarization + structured fact extraction
 * Never discards information - all layers persisted to IndexedDB
 */

import type {
  ChatMessage,
  MemoryLayer,
  Fact,
  CompactResult,
  AppSettings,
  MemoryStats,
  MemorySummary,
  MemoryFact
} from '../types/index.js';
import { WebLLMEngine } from './webllmEngine.js';
import { StorageEngine } from './storageEngine.js';

/** Memory Engine Class */
export class MemoryEngine {
  private webllm: WebLLMEngine;
  private storage: StorageEngine;
  private settings: AppSettings;
  private static instance: MemoryEngine | null = null;

  constructor(webllm: WebLLMEngine, storage: StorageEngine) {
    this.webllm = webllm;
    this.storage = storage;
    this.settings = {
      theme: 'auto',
      autoCompactThreshold: 75,
      recentMessageCount: 10,
      defaultModelId: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
      autoDownloadModels: false,
      compactOnModelSwitch: true,
      showTokenCount: true,
      enableStreaming: true,
    };
  }

  static getInstance(): MemoryEngine {
    if (!MemoryEngine.instance) {
      throw new Error('MemoryEngine not initialized');
    }
    return MemoryEngine.instance;
  }

  static initialize(webllm: WebLLMEngine, storage: StorageEngine): MemoryEngine {
    const instance = new MemoryEngine(webllm, storage);
    MemoryEngine.instance = instance;
    // Reassign the module singleton so pages using `memoryEngine` get the real engine
    memoryEngine = instance;
    return instance;
  }

  /** Update settings */
  updateSettings(settings: Partial<AppSettings>): void {
    this.settings = { ...this.settings, ...settings };
  }

  /** Check if compaction should trigger */
  shouldCompact(messages: ChatMessage[]): boolean {
    const usage = this.webllm.getContextUsage();
    return usage.percentage >= this.settings.autoCompactThreshold;
  }

  /** Main compaction entry point - called when context reaches threshold */
  async maybeCompact(messages: ChatMessage[], chatId: string): Promise<CompactResult> {
    const usage = this.webllm.getContextUsage();

    if (!this.shouldCompact(messages)) {
      return {
        success: false,
        originalTokens: usage.used,
        compactedTokens: usage.used,
        layersCreated: 0,
        factsExtracted: 0,
        message: `Context at ${usage.percentage}% - no compaction needed`
      };
    }

    console.log(`[MemoryEngine] Compacting chat ${chatId} at ${usage.percentage}% context`);

    try {
      // Separate recent messages (keep raw) from older messages (to compact)
      const recentCount = this.settings.recentMessageCount;
      const recentMessages = messages.slice(-recentCount);
      const olderMessages = messages.slice(0, -recentCount);

      if (olderMessages.length === 0) {
        return {
          success: false,
          originalTokens: usage.used,
          compactedTokens: usage.used,
          layersCreated: 0,
          factsExtracted: 0,
          message: 'No older messages to compact'
        };
      }

      // Build text from older messages
      const textToCompact = this.messagesToText(olderMessages);
      const originalTokens = this.webllm.estimateTokens(textToCompact);

      // Step 1: Create Level 1 summary
      const level1Summary = await this.createLevel1Summary(textToCompact, olderMessages.map(m => m.id), chatId);

      // Step 2: Extract facts from older messages
      const facts = await this.extractFacts(textToCompact, chatId);

      // Step 3: Check if we need Level 2 (meta-summary)
      let level2Summary: MemoryLayer | null = null;
      const existingLevel1 = await this.storage.getMemoriesByLevel(chatId, 1);

      if (existingLevel1.length >= 3) {
        // We have multiple Level 1 summaries, create Level 2 meta-summary
        level2Summary = await this.createLevel2Summary(existingLevel1, chatId);
      }

      const layersCreated = 1 + (level2Summary ? 1 : 0);
      const compactedTokens = this.webllm.estimateTokens(
        this.messagesToText(recentMessages)
      ) + (level1Summary ? level1Summary.tokens : 0) + (level2Summary ? level2Summary.tokens : 0);

      // Update chat compactedAt timestamp
      await this.storage.updateChat(chatId, { compactedAt: Date.now() });

      return {
        success: true,
        originalTokens,
        compactedTokens,
        layersCreated,
        factsExtracted: facts.length,
        message: `Compacted ${originalTokens} tokens → ${compactedTokens} tokens (${layersCreated} layers, ${facts.length} facts)`
      };
    } catch (error) {
      console.error('[MemoryEngine] Compaction failed:', error);
      return {
        success: false,
        originalTokens: usage.used,
        compactedTokens: usage.used,
        layersCreated: 0,
        factsExtracted: 0,
        message: `Compaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /** Build context window for model: [System] + [Facts] + [Meta] + [Summaries] + [Recent Raw] */
  async buildContextWindow(chatId: string, maxTokens: number): Promise<ChatMessage[]> {
    const messages: ChatMessage[] = [];
    let usedTokens = 0;

    // 1. Get recent raw messages (Level 0)
    const recentCount = this.settings.recentMessageCount;
    const allMessages = await this.storage.getMessages(chatId);
    const recentMessages = allMessages.slice(-recentCount);

    // 2. Get facts (high confidence only)
    const facts = await this.storage.getFacts(chatId, 0.7);
    if (facts.length > 0) {
      const factText = this.factsToText(facts);
      const factTokens = this.webllm.estimateTokens(factText);

      if (usedTokens + factTokens <= maxTokens * 0.15) { // Max 15% for facts
        messages.unshift({
          id: `facts-${chatId}`,
          role: 'system',
          content: `Key facts to remember:\n${factText}`,
          timestamp: Date.now(),
          tokens: factTokens,
          isCompacted: true
        });
        usedTokens += factTokens;
      }
    }

    // 3. Get Level 2 meta-summaries (oldest first)
    const level2Memories = await this.storage.getMemoriesByLevel(chatId, 2);
    for (const mem of level2Memories) {
      if (usedTokens + mem.tokens <= maxTokens * 0.25) { // Max 25% for meta
        messages.push({
          id: mem.id,
          role: 'system',
          content: `[Meta-Summary] ${mem.content}`,
          timestamp: mem.timestamp,
          tokens: mem.tokens,
          isCompacted: true,
          parentSummaryId: mem.id
        });
        usedTokens += mem.tokens;
      }
    }

    // 4. Get Level 1 summaries (oldest first)
    const level1Memories = await this.storage.getMemoriesByLevel(chatId, 1);
    for (const mem of level1Memories) {
      if (usedTokens + mem.tokens <= maxTokens * 0.35) { // Max 35% for summaries
        messages.push({
          id: mem.id,
          role: 'system',
          content: `[Summary] ${mem.content}`,
          timestamp: mem.timestamp,
          tokens: mem.tokens,
          isCompacted: true,
          parentSummaryId: mem.id
        });
        usedTokens += mem.tokens;
      }
    }

    // 5. Add recent raw messages (fill remaining space)
    for (const msg of recentMessages) {
      const msgTokens = msg.tokens || this.webllm.estimateTokens(msg.content);
      if (usedTokens + msgTokens <= maxTokens) {
        messages.push({ ...msg });
        usedTokens += msgTokens;
      }
    }

    // Sort by timestamp
    messages.sort((a, b) => a.timestamp - b.timestamp);

    return messages;
  }

  /** Create Level 1 summary from messages */
  private async createLevel1Summary(
    text: string,
    sourceMessageIds: string[],
    chatId: string
  ): Promise<MemoryLayer> {
    const summaryText = await this.webllm.generateSummary(text, 500);
    const tokens = this.webllm.estimateTokens(summaryText);

    const memory: Omit<MemoryLayer, 'id' | 'createdAt'> = {
      chatId,
      level: 1,
      content: summaryText,
      tokens,
      timestamp: Date.now(),
      sourceMessageIds,
      extractedFacts: [] // Will be populated by fact extraction
    };

    return this.storage.addMemory(memory);
  }

  /** Create Level 2 meta-summary from Level 1 summaries */
  private async createLevel2Summary(
    level1Memories: MemoryLayer[],
    chatId: string
  ): Promise<MemoryLayer> {
    // Combine Level 1 summaries
    const combinedText = level1Memories.map(m => m.content).join('\n\n');
    const summaryText = await this.webllm.generateSummary(combinedText, 300);
    const tokens = this.webllm.estimateTokens(summaryText);

    const memory: Omit<MemoryLayer, 'id' | 'createdAt'> = {
      chatId,
      level: 2,
      content: summaryText,
      tokens,
      timestamp: Date.now(),
      sourceMessageIds: level1Memories.flatMap(m => m.sourceMessageIds),
      extractedFacts: []
    };

    return this.storage.addMemory(memory);
  }

  /** Extract facts from text */
  private async extractFacts(text: string, chatId: string): Promise<Fact[]> {
    const extracted = await this.webllm.extractFacts(text);

    const facts: Fact[] = [];
    for (const fact of extracted) {
      const newFact = await this.storage.addFact({
        chatId,
        entity: fact.entity,
        relation: fact.relation,
        value: fact.value,
        confidence: fact.confidence,
        sourceMessageId: 'compacted', // Could track specific message
      });
      facts.push(newFact);
    }

    return facts;
  }

  /** Convert messages to text for summarization */
  private messagesToText(messages: ChatMessage[]): string {
    return messages.map(m => `${m.role === 'user' ? 'User' : m.role === 'assistant' ? 'Assistant' : 'System'}: ${m.content}`).join('\n\n');
  }

  /** Convert facts to text for context */
  private factsToText(facts: Fact[]): string {
    return facts.map(f => `- ${f.entity} ${f.relation} ${f.value} (confidence: ${Math.round(f.confidence * 100)}%)`).join('\n');
  }

  /** Force manual compaction */
  async forceCompact(chatId: string): Promise<CompactResult> {
    const messages = await this.storage.getMessages(chatId);
    return this.maybeCompact(messages, chatId);
  }

  /** Get memory stats for a chat */
  async getMemoryStats(chatId: string): Promise<MemoryStats> {
    const [level0, level1, level2, facts] = await Promise.all([
      this.storage.getMemoriesByLevel(chatId, 0),
      this.storage.getMemoriesByLevel(chatId, 1),
      this.storage.getMemoriesByLevel(chatId, 2),
      this.storage.getFacts(chatId),
    ]);

    const totalTokens = [...level0, ...level1, ...level2].reduce((sum, m) => sum + m.tokens, 0);
    const originalTokens = totalTokens * 3; // rough estimate
    const compressionRatio = originalTokens > 0 ? originalTokens / totalTokens : 1;

    return {
      level0Count: level0.length,
      level1Count: level1.length,
      level2Count: level2.length,
      factCount: facts.length,
      totalTokens,
      compressionRatio,
    };
  }

  /** Sync version for components that need it */
  getMemoryStatsSync(chatId: string): MemoryStats {
    // Return default/empty stats - will be updated async
    return {
      level0Count: 0,
      level1Count: 0,
      level2Count: 0,
      factCount: 0,
      totalTokens: 0,
      compressionRatio: 1,
    };
  }

  /** Update a fact */
  async updateFact(chatId: string, fact: MemoryFact): Promise<void> {
    await this.storage.updateFact(chatId, fact);
  }

  /** Delete a memory item (summary or fact) */
  async deleteMemoryItem(chatId: string, id: string): Promise<void> {
    await this.storage.deleteMemoryItem(chatId, id);
  }

  /** Clear all memory for a chat */
  async clearMemory(chatId: string): Promise<void> {
    await this.storage.clearMemory(chatId);
  }

  /** Set auto-compact settings */
  setAutoCompactSettings(enabled: boolean, threshold: number): void {
    this.settings.autoCompactThreshold = threshold * 100; // Convert 0-1 to percentage
  }

  /** Reconstruct full conversation from memory layers (for export) */
  async reconstructConversation(chatId: string): Promise<ChatMessage[]> {
    const messages = await this.storage.getMessages(chatId);
    return messages;
  }
}

// Singleton placeholder until MemoryEngine.initialize() is called in main.ts.
// initialize() reassigns this binding so pages get the real, wired engine.
export let memoryEngine: MemoryEngine = new MemoryEngine(
  { isReady: () => false, getContextUsage: () => ({ used: 0, total: 4096, percentage: 0 }), estimateTokens: (text: string) => Math.ceil(text.length / 4) } as any,
  { getMessages: async () => [], getMemoryStatsSync: () => ({ totalMessages: 0, totalFacts: 0, totalSummaries: 0, totalTokens: 0, lastCompactedAt: null }) } as any
);