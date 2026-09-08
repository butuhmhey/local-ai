/**
 * Core type definitions for Ember
 */

/** Chat message roles */
export type MessageRole = 'user' | 'assistant' | 'system';

/** Alias for ChatMessage */
export type Message = ChatMessage;

/** A previous version of an edited message (v1 = original, v2 = first edit, …) */
export interface MessageEditVersion {
  version: number;
  content: string;
  timestamp: number;
}

/** Chat message */
export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  tokens?: number;
  isCompacted?: boolean;
  parentSummaryId?: string;
  modelId?: string;
  /** Previous versions of an edited message; absent for never-edited messages */
  editHistory?: MessageEditVersion[];
  /** Current version number (1 = original); editHistory.length + 1 when edited */
  editVersion?: number;
}

/** Chat session */
export interface ChatSession {
  id: string;
  title: string;
  modelId: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
  compactedAt?: number;
  settings?: ChatSessionSettings;
  memory?: {
    level0: MemoryLayer[];
    level1: MemoryLayer[];
    level2: MemoryLayer[];
    facts: Fact[];
  };
}

/** Chat session settings */
export interface ChatSessionSettings {
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

/** Model definition */
export interface ModelDefinition {
  id: string;
  name: string;
  sizeParams: string;
  quantization: string;
  ramGB: number;
  category: 'general' | 'coding' | 'reasoning' | 'uncensored';
  uncensored: boolean;
  description: string;
  contextWindow?: number;
  downloadSizeMB?: number;
}

/** Model filter options */
export interface ModelFilters {
  maxRAM?: number;
  category?: ModelDefinition['category'];
  uncensoredOnly?: boolean;
  searchQuery?: string;
}

/** Memory layer for hierarchical compaction */
export interface MemoryLayer {
  id: string;
  chatId: string;
  level: 0 | 1 | 2;
  content: string;
  tokens: number;
  timestamp: number;
  sourceMessageIds: string[];
  extractedFacts: Fact[];
}

/** Memory summary (alias for MemoryLayer levels 1-2) */
export interface MemorySummary {
  id: string;
  chatId: string;
  level: 1 | 2;
  content: string;
  tokens: number;
  timestamp: number;
  messageCount: number;
  sourceRange?: { start: number; end: number };
}

/** Extracted fact */
export interface MemoryFact {
  id: string;
  chatId: string;
  entity: string;
  relation: string;
  value: string;
  confidence: number;
  sourceMessageIds: string[];
  extractedAt?: number;
  timestamp: number;
}

/** Fact (storage format) */
export interface Fact {
  id: string;
  chatId: string;
  entity: string;
  relation: string;
  value: string;
  confidence: number;
  sourceMessageId: string;
  sourceMemoryId?: string;
  createdAt: number;
  updatedAt: number;
}

/** Imported chat format */
export type ChatFormat =
  | 'chatgpt'
  | 'sharegpt'
  | 'openai-jsonl'
  | 'generic-json'
  | 'csv'
  | 'markdown'
  | 'text'
  | 'unknown';

/** Import result */
export interface ImportResult {
  sessions: ChatSession[];
  messages: ChatMessage[];
  format: ChatFormat;
  fileName: string;
  warnings: string[];
}

/** Storage schema types */
export interface StoredChat {
  id: string;
  title: string;
  modelId: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
  compactedAt?: number;
  settings?: ChatSessionSettings;
}

export interface StoredMessage {
  id: string;
  chatId: string;
  role: MessageRole;
  content: string;
  tokens: number;
  timestamp: number;
  isCompacted: boolean;
  parentSummaryId?: string;
  modelId?: string;
  editHistory?: MessageEditVersion[];
  editVersion?: number;
}

export interface StoredMemory {
  id: string;
  chatId: string;
  level: 0 | 1 | 2;
  content: string;
  tokens: number;
  facts: Fact[];
  sourceMessageIds: string[];
  createdAt: number;
}

export interface StoredFact {
  id: string;
  chatId: string;
  entity: string;
  relation: string;
  value: string;
  confidence: number;
  sourceMessageId: string;
  sourceMemoryId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface StoredModel {
  id: string;
  modelId: string;
  downloadedAt: number;
  sizeBytes: number;
  lastUsed: number;
}

export interface StoredSetting {
  key: string;
  value: unknown;
}

/** WebLLM engine types */
export interface ModelLoadProgress {
  modelId: string;
  progress: number;
  stage: 'downloading' | 'compiling' | 'loading' | 'ready' | 'error';
  message?: string;
  error?: string;
}

export interface ChatOptions {
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  systemPrompt?: string;
  onProgress?: (token: string) => void;
}

export interface ContextUsage {
  used: number;
  total: number;
  percentage: number;
}

/** Settings */
export interface AppSettings {
  theme: 'light' | 'dark' | 'auto';
  autoCompactThreshold: number; // percentage (default 75)
  recentMessageCount: number; // messages to keep raw (default 10)
  defaultModelId: string;
  autoDownloadModels: boolean;
  compactOnModelSwitch: boolean;
  showTokenCount: boolean;
  enableStreaming: boolean;
}

/** Route types */
export type Route = 'home' | 'chat' | 'models' | 'import' | 'memory' | 'settings';

/** Router event */
export interface RouteChangeEvent extends CustomEvent {
  detail: { route: Route; params?: Record<string, string> };
}

/** Toast notification */
export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

/** File import info */
export interface ImportFile {
  file: File;
  content: string;
  format: ChatFormat;
  preview: ChatMessage[];
  error?: string;
}

/** WebGPU support check */
export interface GPUInfo {
  supported: boolean;
  adapter?: any;
  device?: any;
  error?: string;
}

/** Export formats */
export type ExportFormat = 'json' | 'markdown' | 'csv' | 'txt';

/** Compact trigger result */
export interface CompactResult {
  success: boolean;
  originalTokens: number;
  compactedTokens: number;
  layersCreated: number;
  factsExtracted: number;
  message?: string;
}

/** Memory stats for display */
export interface MemoryStats {
  level0Count: number;
  level1Count: number;
  level2Count: number;
  factCount: number;
  totalTokens: number;
  compressionRatio: number;
}