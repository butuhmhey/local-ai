/**
 * Import Engine - Multi-format chat import with AI-powered format detection
 * Supports: ChatGPT, ShareGPT, OpenAI JSONL, Generic JSON, CSV, Markdown, Text
 */

import type {
  ChatMessage,
  ChatSession,
  ChatFormat,
  ImportResult,
  ImportFile
} from '../types/index.js';
import { WebLLMEngine } from './webllmEngine.js';
import { StorageEngine } from './storageEngine.js';
import { generateId } from '../utils/helpers.js';

/** Extended ImportResult with success/error for component usage */
export interface ImportResultExtended {
  success: boolean;
  chats: ChatSession[];
  totalMessages: number;
  format: ChatFormat;
  fileName: string;
  warnings: string[];
  error?: string;
}

// Re-export types from types/index.ts for components
export type { ImportFile, ImportResult };

/** Import preview for UI */
export interface ImportPreview {
  format: ChatFormat;
  confidence: number;
  messageCount: number;
  sample: Array<{ role: string; content: string }>;
}

/** Import Engine Class */
export class ImportEngine {
  private webllm: WebLLMEngine;
  private storage: StorageEngine;
  private static instance: ImportEngine | null = null;

  constructor(webllm: WebLLMEngine, storage: StorageEngine) {
    this.webllm = webllm;
    this.storage = storage;
  }

  static getInstance(): ImportEngine {
    if (!ImportEngine.instance) {
      throw new Error('ImportEngine not initialized');
    }
    return ImportEngine.instance;
  }

  static initialize(webllm: WebLLMEngine, storage: StorageEngine): ImportEngine {
    ImportEngine.instance = new ImportEngine(webllm, storage);
    return ImportEngine.instance;
  }

  /** Detect format from file content and filename */
  detectFormat(content: string, filename: string): ChatFormat {
    const lowerName = filename.toLowerCase();
    const trimmed = content.trim();

    // ChatGPT export
    if (lowerName.includes('conversation') && lowerName.endsWith('.json')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed) && parsed.length > 0 && 'mapping' in parsed[0]) {
          return 'chatgpt';
        }
        if (parsed.conversations && Array.isArray(parsed.conversations)) {
          return 'chatgpt';
        }
      } catch {}
    }

    // ShareGPT format
    if (trimmed.startsWith('{') && trimmed.includes('"conversations"')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.conversations && Array.isArray(parsed.conversations)) {
          const first = parsed.conversations[0];
          if (first && 'id' in first && 'mapping' in first && 'current_node' in first) {
            return 'sharegpt';
          }
        }
      } catch {}
    }

    // OpenAI JSONL (fine-tune format)
    if (lowerName.endsWith('.jsonl') || lowerName.endsWith('.ndjson')) {
      const lines = trimmed.split('\n').filter(l => l.trim());
      if (lines.length > 0) {
        try {
          const first = JSON.parse(lines[0]);
          if (first.messages && Array.isArray(first.messages)) {
            return 'openai-jsonl';
          }
        } catch {}
      }
    }

    // CSV
    if (lowerName.endsWith('.csv')) {
      const lines = trimmed.split('\n').filter(l => l.trim());
      if (lines.length > 0) {
        const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
        if (headers.includes('role') && headers.includes('content')) {
          return 'csv';
        }
      }
    }

    // Markdown
    if (lowerName.endsWith('.md') || lowerName.endsWith('.markdown')) {
      if (trimmed.includes('## User') || trimmed.includes('## Assistant') ||
          trimmed.includes('### User') || trimmed.includes('### Assistant')) {
        return 'markdown';
      }
    }

    // Generic JSON array
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const first = parsed[0];
          if (first && typeof first === 'object' && 'role' in first && 'content' in first) {
            return 'generic-json';
          }
        }
      } catch {}
    }

    // Generic JSON object with messages array
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.messages && Array.isArray(parsed.messages)) {
          const first = parsed.messages[0];
          if (first && typeof first === 'object' && 'role' in first && 'content' in first) {
            return 'generic-json';
          }
        }
        if (parsed.data && Array.isArray(parsed.data)) {
          const first = parsed.data[0];
          if (first && typeof first === 'object' && 'role' in first && 'content' in first) {
            return 'generic-json';
          }
        }
      } catch {}
    }

    // Text fallback
    return 'text';
  }

  /** Parse file content based on detected format */
  async parseFile(file: ImportFile): Promise<ChatMessage[]> {
    const { content, format } = file;

    switch (format) {
      case 'chatgpt':
        return this.parseChatGPTExport(content);
      case 'sharegpt':
        return this.parseShareGPT(content);
      case 'openai-jsonl':
        return this.parseOpenAIJSONL(content);
      case 'generic-json':
        return this.parseGenericJSON(content);
      case 'csv':
        return this.parseCSV(content);
      case 'markdown':
        return this.parseMarkdown(content);
      case 'text':
      default:
        return this.parseText(content);
    }
  }

  /** Parse ChatGPT export format */
  parseChatGPTExport(content: string): ChatMessage[] {
    const messages: ChatMessage[] = [];
    const data = JSON.parse(content);

    // Handle conversations array format
    const conversations = data.conversations || data;

    for (const conv of conversations) {
      if (!conv.mapping) continue;

      // Build message tree from mapping
      const nodes = conv.mapping;
      let currentId = conv.current_node;

      // Traverse from current node backwards
      const messageChain: any[] = [];
      while (currentId && nodes[currentId]) {
        const node = nodes[currentId];
        if (node.message && node.message.content) {
          messageChain.unshift(node.message);
        }
        currentId = node.parent;
      }

      // Convert to our format
      for (const msg of messageChain) {
        if (!msg.content || !msg.content.parts) continue;

        const role = msg.author?.role === 'user' ? 'user' :
                     msg.author?.role === 'assistant' ? 'assistant' : 'system';
        const text = msg.content.parts.join('\n');

        if (text.trim()) {
          messages.push({
            id: generateId(),
            role,
            content: text,
            timestamp: msg.create_time ? Math.floor(msg.create_time * 1000) : Date.now(),
            modelId: msg.metadata?.model_slug,
          });
        }
      }
    }

    return messages;
  }

  /** Parse ShareGPT format */
  parseShareGPT(content: string): ChatMessage[] {
    const messages: ChatMessage[] = [];
    const data = JSON.parse(content);

    for (const conv of data.conversations) {
      if (!conv.mapping || !conv.current_node) continue;

      const nodes = conv.mapping;
      let currentId = conv.current_node;
      const messageChain: any[] = [];

      while (currentId && nodes[currentId]) {
        const node = nodes[currentId];
        if (node.message && node.message.content) {
          messageChain.unshift(node.message);
        }
        currentId = node.parent;
      }

      for (const msg of messageChain) {
        const role = msg.author?.role === 'human' ? 'user' :
                     msg.author?.role === 'gpt' ? 'assistant' : 'system';
        const text = msg.content;

        if (text?.trim()) {
          messages.push({
            id: generateId(),
            role,
            content: text,
            timestamp: Date.now(),
          });
        }
      }
    }

    return messages;
  }

  /** Parse OpenAI JSONL format */
  parseOpenAIJSONL(content: string): ChatMessage[] {
    const messages: ChatMessage[] = [];
    const lines = content.trim().split('\n');

    for (const line of lines) {
      if (!line.trim()) continue;
      const record = JSON.parse(line);

      if (record.messages && Array.isArray(record.messages)) {
        for (const msg of record.messages) {
          if (msg.role && msg.content) {
            messages.push({
              id: generateId(),
              role: msg.role as 'user' | 'assistant' | 'system',
              content: msg.content,
              timestamp: Date.now(),
            });
          }
        }
      }
    }

    return messages;
  }

  /** Parse Generic JSON format */
  parseGenericJSON(content: string): ChatMessage[] {
    const messages: ChatMessage[] = [];
    const data = JSON.parse(content);

    // Handle array format
    let items: any[] = [];
    if (Array.isArray(data)) {
      items = data;
    } else if (data.messages && Array.isArray(data.messages)) {
      items = data.messages;
    } else if (data.data && Array.isArray(data.data)) {
      items = data.data;
    } else if (data.conversations && Array.isArray(data.conversations)) {
      // Might be nested
      for (const conv of data.conversations) {
        if (conv.messages && Array.isArray(conv.messages)) {
          items.push(...conv.messages);
        }
      }
    }

    for (const item of items) {
      if (item && typeof item === 'object' && item.role && item.content) {
        messages.push({
          id: generateId(),
          role: item.role as 'user' | 'assistant' | 'system',
          content: item.content,
          timestamp: item.timestamp ? new Date(item.timestamp).getTime() : Date.now(),
          tokens: item.tokens,
        });
      }
    }

    return messages;
  }

  /** Parse CSV format */
  parseCSV(content: string): ChatMessage[] {
    const messages: ChatMessage[] = [];
    const lines = content.trim().split('\n');
    if (lines.length < 2) return messages;

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const roleIdx = headers.indexOf('role');
    const contentIdx = headers.indexOf('content');
    const timestampIdx = headers.indexOf('timestamp');
    const tokensIdx = headers.indexOf('tokens');

    if (roleIdx === -1 || contentIdx === -1) return messages;

    for (let i = 1; i < lines.length; i++) {
      const cols = this.parseCSVLine(lines[i]);
      if (cols.length <= Math.max(roleIdx, contentIdx)) continue;

      const role = cols[roleIdx].trim().toLowerCase();
      const text = cols[contentIdx].trim();

      if (!text || !['user', 'assistant', 'system'].includes(role)) continue;

      messages.push({
        id: generateId(),
        role: role as 'user' | 'assistant' | 'system',
        content: text,
        timestamp: timestampIdx !== -1 && cols[timestampIdx]
          ? new Date(cols[timestampIdx]).getTime()
          : Date.now(),
        tokens: tokensIdx !== -1 && cols[tokensIdx]
          ? parseInt(cols[tokensIdx], 10)
          : undefined,
      });
    }

    return messages;
  }

  /** Parse CSV line handling quoted fields */
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  }

  /** Parse Markdown format */
  parseMarkdown(content: string): ChatMessage[] {
    const messages: ChatMessage[] = [];
    const lines = content.split('\n');
    let currentRole: 'user' | 'assistant' | 'system' | null = null;
    let currentContent: string[] = [];

    for (const line of lines) {
      // Check for headers indicating role
      const userMatch = line.match(/^#{2,3}\s*(User|Human):?\s*(.*)$/i);
      const assistantMatch = line.match(/^#{2,3}\s*(Assistant|AI|Bot):?\s*(.*)$/i);
      const systemMatch = line.match(/^#{2,3}\s*(System):?\s*(.*)$/i);

      if (userMatch || assistantMatch || systemMatch) {
        // Save previous message
        if (currentRole && currentContent.length > 0) {
          messages.push({
            id: generateId(),
            role: currentRole,
            content: currentContent.join('\n').trim(),
            timestamp: Date.now(),
          });
        }

        // Start new message
        if (userMatch) {
          currentRole = 'user';
          currentContent = userMatch[2] ? [userMatch[2]] : [];
        } else if (assistantMatch) {
          currentRole = 'assistant';
          currentContent = assistantMatch[2] ? [assistantMatch[2]] : [];
        } else if (systemMatch) {
          currentRole = 'system';
          currentContent = systemMatch[2] ? [systemMatch[2]] : [];
        }
      } else if (currentRole) {
        currentContent.push(line);
      }
    }

    // Save last message
    if (currentRole && currentContent.length > 0) {
      messages.push({
        id: generateId(),
        role: currentRole,
        content: currentContent.join('\n').trim(),
        timestamp: Date.now(),
      });
    }

    return messages;
  }

  /** Parse plain text format (simple role: content) */
  parseText(content: string): ChatMessage[] {
    const messages: ChatMessage[] = [];
    const lines = content.split('\n');
    let currentRole: 'user' | 'assistant' | 'system' | null = null;
    let currentContent: string[] = [];

    for (const line of lines) {
      const roleMatch = line.match(/^(User|Human|Assistant|AI|Bot|System):\s*(.*)$/i);
      if (roleMatch) {
        // Save previous
        if (currentRole && currentContent.length > 0) {
          messages.push({
            id: generateId(),
            role: currentRole,
            content: currentContent.join('\n').trim(),
            timestamp: Date.now(),
          });
        }

        // Start new
        const role = roleMatch[1].toLowerCase();
        if (role === 'user' || role === 'human') currentRole = 'user';
        else if (role === 'assistant' || role === 'ai' || role === 'bot') currentRole = 'assistant';
        else currentRole = 'system';

        currentContent = roleMatch[2] ? [roleMatch[2]] : [];
      } else if (currentRole) {
        currentContent.push(line);
      }
    }

    // Save last
    if (currentRole && currentContent.length > 0) {
      messages.push({
        id: generateId(),
        role: currentRole,
        content: currentContent.join('\n').trim(),
        timestamp: Date.now(),
      });
    }

    // If no structured format found, treat as single user message
    if (messages.length === 0 && content.trim()) {
      messages.push({
        id: generateId(),
        role: 'user',
        content: content.trim(),
        timestamp: Date.now(),
      });
    }

    return messages;
  }

  /** LLM-powered conversion for unknown formats */
  async convertWithLLM(rawContent: string, filename: string): Promise<ChatMessage[]> {
    if (!this.webllm.isReady()) {
      throw new Error('No model loaded for format conversion');
    }

    const prompt = `Convert the following chat export from "${filename}" into a JSON array of messages.
Each message must have: role ("user" | "assistant" | "system"), content (string), timestamp (unix ms).

Return ONLY valid JSON array. No explanations.

Content:
${rawContent.slice(0, 10000)}

JSON:`;

    try {
      const response = await this.webllm.chat(
        [{ role: 'user', content: prompt, id: 'convert-prompt', timestamp: Date.now() }],
        { maxTokens: 2000, temperature: 0.1 }
      );

      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.map((msg: any, i: number) => ({
          id: generateId(),
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content,
          timestamp: msg.timestamp || Date.now() - (parsed.length - i) * 1000,
        }));
      }
    } catch (error) {
      console.warn('[ImportEngine] LLM conversion failed:', error);
    }

    // Fallback to text parsing
    return this.parseText(rawContent);
  }

  /** Process imported files and create chat sessions */
  async import(files: File[], targetChatId?: string): Promise<ImportResultExtended> {
    const importFiles: ImportFile[] = [];
    const allMessages: ChatMessage[] = [];
    const warnings: string[] = [];

    // Read and detect each file
    for (const file of files) {
      const content = await this.readFile(file);
      const format = this.detectFormat(content, file.name);
      const preview = await this.parseFile({ file, content, format, preview: [] });

      importFiles.push({ file, content, format, preview: preview.slice(0, 5) });

      if (preview.length === 0) {
        warnings.push(`${file.name}: No messages found`);
      }
    }

    // Parse all files
    for (const imp of importFiles) {
      const messages = await this.parseFile(imp);
      allMessages.push(...messages);
    }

    // Sort by timestamp
    allMessages.sort((a, b) => a.timestamp - b.timestamp);

    // Create or use target chat
    let chat: ChatSession;
    if (targetChatId) {
      const existing = await this.storage.getChat(targetChatId);
      if (existing) {
        chat = existing;
        // Add messages to existing chat
        for (const msg of allMessages) {
          await this.storage.addMessage({ ...msg, chatId: targetChatId });
        }
      } else {
        throw new Error(`Chat ${targetChatId} not found`);
      }
    } else {
      // Create new chat with first model or default
      const modelId = allMessages[0]?.modelId || 'Llama-3.2-3B-Instruct-q4f16_1-MLC';
      chat = await this.storage.createChat({
        title: `Imported ${new Date().toLocaleDateString()}`,
        modelId,
      });

      for (const msg of allMessages) {
        await this.storage.addMessage({ ...msg, chatId: chat.id });
      }
    }

    return {
      success: true,
      chats: [chat],
      totalMessages: allMessages.length,
      format: importFiles[0]?.format || 'unknown',
      fileName: importFiles.map(f => f.file.name).join(', '),
      warnings,
    };
  }

  /** Read file as text */
  private readFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }

  /** Export chat to various formats */
  async exportChat(chatId: string, format: 'json' | 'markdown' | 'csv' | 'txt'): Promise<string> {
    const data = await this.storage.exportChat(chatId);
    if (!data) throw new Error('Chat not found');

    const { chat, messages } = data;

    switch (format) {
      case 'json':
        return JSON.stringify({
          chat: { ...chat, messages: undefined },
          messages,
        }, null, 2);

      case 'markdown':
        return this.toMarkdown(chat, messages);

      case 'csv':
        return this.toCSV(messages);

      case 'txt':
        return this.toText(messages);

      default:
        throw new Error(`Unknown export format: ${format}`);
    }
  }

  /** Convert to Markdown */
  private toMarkdown(chat: ChatSession, messages: ChatMessage[]): string {
    let md = `# ${chat.title}\n\n`;
    md += `**Model:** ${chat.modelId}  \n`;
    md += `**Created:** ${new Date(chat.createdAt).toLocaleString()}  \n`;
    md += `**Messages:** ${messages.length}  \n\n`;
    md += `---\n\n`;

    for (const msg of messages) {
      const role = msg.role === 'user' ? 'User' : msg.role === 'assistant' ? 'Assistant' : 'System';
      md += `## ${role}\n\n${msg.content}\n\n`;
    }

    return md;
  }

  /** Convert to CSV */
  private toCSV(messages: ChatMessage[]): string {
    const headers = 'role,content,timestamp,tokens\n';
    const rows = messages.map(msg =>
      `"${msg.role}","${msg.content.replace(/"/g, '""')}",${msg.timestamp},${msg.tokens || 0}`
    ).join('\n');
    return headers + rows;
  }

  /** Convert to plain text */
  private toText(messages: ChatMessage[]): string {
    return messages.map(msg => {
      const role = msg.role === 'user' ? 'User' : msg.role === 'assistant' ? 'Assistant' : 'System';
      return `${role}: ${msg.content}`;
    }).join('\n\n');
  }
}

// Export singleton (will be properly initialized in main.ts)
export const importEngine = new ImportEngine(
  { isReady: () => false, chat: async () => '', streamChat: async function* () {}, loadModel: async () => {}, switchModel: async () => {}, getContextUsage: () => ({ used: 0, total: 4096, percentage: 0 }), estimateTokens: (text: string) => Math.ceil(text.length / 4), generateSummary: async () => '', extractFacts: async () => [] } as any,
  { getChat: async () => null, getMessages: async () => [], addMessage: async () => '', createChat: async () => ({ id: '', title: '', modelId: '', createdAt: 0, updatedAt: 0 }), updateChat: async () => {}, deleteMessagesForChat: async () => {}, exportChat: async () => null, exportAllData: async () => ({}), importAllData: async () => {}, clearAll: async () => {}, deleteMemoryItem: async () => {}, clearMemory: async () => {} } as any
);