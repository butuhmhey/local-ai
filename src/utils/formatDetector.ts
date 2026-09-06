/**
 * Format Detector - Detects chat export formats from file content
 * Supports: ChatGPT, ShareGPT, OpenAI JSONL, Generic JSON, CSV, Markdown, Text
 */

import type { ChatFormat } from '../types/index.js';

/** Format detection result */
export interface FormatDetectionResult {
  format: ChatFormat;
  confidence: number; // 0-1
  details?: string;
}

/** Detect chat format from content and filename */
export function detectFormat(content: string, filename: string): FormatDetectionResult {
  const trimmed = content.trim();
  const lowerName = filename.toLowerCase();

  // ChatGPT export (conversations.json)
  if (lowerName.includes('conversation') && lowerName.endsWith('.json')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        const first = parsed[0];
        if (first && first.mapping && first.current_node) {
          return { format: 'chatgpt', confidence: 0.95, details: 'ChatGPT conversations.json format' };
        }
        if (first && first.conversations && Array.isArray(first.conversations)) {
          return { format: 'chatgpt', confidence: 0.9, details: 'ChatGPT nested conversations format' };
        }
      }
      if (parsed.conversations && Array.isArray(parsed.conversations)) {
        return { format: 'chatgpt', confidence: 0.9, details: 'ChatGPT export with conversations key' };
      }
    } catch {}
  }

  // ShareGPT format
  if (trimmed.startsWith('{') && trimmed.includes('"conversations"')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.conversations && Array.isArray(parsed.conversations)) {
        const first = parsed.conversations[0];
        if (first && first.id && first.mapping && first.current_node) {
          return { format: 'sharegpt', confidence: 0.98, details: 'ShareGPT format with mapping' };
        }
      }
    } catch {}
  }

  // OpenAI JSONL (fine-tuning format)
  if (lowerName.endsWith('.jsonl') || lowerName.endsWith('.ndjson')) {
    const lines = trimmed.split('\n').filter(l => l.trim());
    if (lines.length > 0) {
      let jsonlCount = 0;
      for (const line of lines.slice(0, 10)) {
        try {
          const parsed = JSON.parse(line);
          if (parsed.messages && Array.isArray(parsed.messages)) {
            jsonlCount++;
          }
        } catch {}
      }
      if (jsonlCount > 0) {
        return { format: 'openai-jsonl', confidence: 0.95, details: `OpenAI JSONL format (${jsonlCount}/10 lines match)` };
      }
    }
  }

  // CSV with role/content columns
  if (lowerName.endsWith('.csv')) {
    const lines = trimmed.split('\n').filter(l => l.trim());
    if (lines.length > 1) {
      const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));
      if (headers.includes('role') && headers.includes('content')) {
        return { format: 'csv', confidence: 0.9, details: 'CSV with role and content columns' };
      }
    }
  }

  // Markdown with ## User / ## Assistant headers
  if (lowerName.endsWith('.md') || lowerName.endsWith('.markdown')) {
    if (trimmed.match(/^#{2,3}\s*(User|Human|Assistant|AI|Bot|System)/im)) {
      return { format: 'markdown', confidence: 0.9, details: 'Markdown with role headers' };
    }
  }

  // Generic JSON array of messages
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const first = parsed[0];
        if (first && typeof first === 'object' && 'role' in first && 'content' in first) {
          return { format: 'generic-json', confidence: 0.85, details: 'JSON array of message objects' };
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
          return { format: 'generic-json', confidence: 0.85, details: 'JSON object with messages array' };
        }
      }
      if (parsed.data && Array.isArray(parsed.data)) {
        const first = parsed.data[0];
        if (first && typeof first === 'object' && 'role' in first && 'content' in first) {
          return { format: 'generic-json', confidence: 0.8, details: 'JSON object with data array' };
        }
      }
      if (parsed.conversations && Array.isArray(parsed.conversations)) {
        // Could be nested format
        return { format: 'generic-json', confidence: 0.7, details: 'JSON with conversations array' };
      }
    } catch {}
  }

  // Plain text with role: content pattern
  if (trimmed.match(/^(User|Human|Assistant|AI|Bot|System):\s/m)) {
    return { format: 'text', confidence: 0.8, details: 'Plain text with role prefixes' };
  }

  // Unknown - default to text
  return { format: 'text', confidence: 0.3, details: 'Unknown format, treating as plain text' };
}

/** Get all supported formats with descriptions */
export function getSupportedFormats(): Array<{ format: ChatFormat; name: string; extensions: string[]; description: string }> {
  return [
    {
      format: 'chatgpt',
      name: 'ChatGPT Export',
      extensions: ['.json'],
      description: 'Official ChatGPT data export (conversations.json)'
    },
    {
      format: 'sharegpt',
      name: 'ShareGPT',
      extensions: ['.json'],
      description: 'ShareGPT conversation format with mapping'
    },
    {
      format: 'openai-jsonl',
      name: 'OpenAI JSONL',
      extensions: ['.jsonl', '.ndjson'],
      description: 'OpenAI fine-tuning format ({"messages": [...]})'
    },
    {
      format: 'generic-json',
      name: 'Generic JSON',
      extensions: ['.json'],
      description: 'JSON array or object with messages array'
    },
    {
      format: 'csv',
      name: 'CSV',
      extensions: ['.csv'],
      description: 'CSV with role,content columns'
    },
    {
      format: 'markdown',
      name: 'Markdown',
      extensions: ['.md', '.markdown'],
      description: 'Markdown with ## User / ## Assistant headers'
    },
    {
      format: 'text',
      name: 'Plain Text',
      extensions: ['.txt', '.text'],
      description: 'Plain text with role: content lines'
    },
  ];
}

/** Get file extension for format */
export function getExtensionForFormat(format: ChatFormat): string {
  const formats = getSupportedFormats();
  const f = formats.find(x => x.format === format);
  return f?.extensions[0] || '.txt';
}

/** Validate messages array */
export function validateMessages(messages: any[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!Array.isArray(messages)) {
    return { valid: false, errors: ['Messages must be an array'] };
  }

  if (messages.length === 0) {
    return { valid: false, errors: ['No messages found'] };
  }

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (!msg || typeof msg !== 'object') {
      errors.push(`Message ${i}: not an object`);
      continue;
    }
    if (!msg.role || !['user', 'assistant', 'system'].includes(msg.role)) {
      errors.push(`Message ${i}: invalid or missing role`);
    }
    if (!msg.content || typeof msg.content !== 'string') {
      errors.push(`Message ${i}: missing or invalid content`);
    }
  }

  return { valid: errors.length === 0, errors };
}