/**
 * Tokenizer utility - Uses tiktoken WASM for accurate token counting
 * Falls back to rough estimation if WASM fails
 */

let tiktokenInstance: any = null;
let encoding: any = null;

/** Initialize tiktoken WASM */
export async function initTokenizer(): Promise<void> {
  if (encoding) return; // Already initialized

  try {
    // Dynamic import to avoid bundling issues
    const tiktoken = await import('tiktoken');
    tiktokenInstance = tiktoken;

    // Use cl100k_base encoding (used by GPT-3.5/4, Llama, etc.)
    encoding = tiktoken.get_encoding('cl100k_base');
    console.log('[Tokenizer] Initialized with cl100k_base');
  } catch (error) {
    console.warn('[Tokenizer] Failed to load tiktoken, using fallback:', error);
    encoding = null;
  }
}

/** Encode text to tokens */
export function encode(text: string): number[] {
  if (!encoding) {
    // Fallback: rough estimation (~4 chars per token)
    return roughTokenEstimate(text);
  }
  try {
    return encoding.encode(text);
  } catch {
    return roughTokenEstimate(text);
  }
}

/** Decode tokens to text */
export function decode(tokens: number[]): string {
  if (!encoding) {
    // Can't decode without tiktoken
    return tokens.map(t => `[${t}]`).join('');
  }
  try {
    return encoding.decode(tokens);
  } catch {
    return tokens.map(t => `[${t}]`).join('');
  }
}

/** Count tokens in text */
export function countTokens(text: string): number {
  if (!encoding) {
    return roughTokenCount(text);
  }
  try {
    return encoding.encode(text).length;
  } catch {
    return roughTokenCount(text);
  }
}

/** Count tokens for chat messages */
export function countMessageTokens(messages: Array<{ role: string; content: string }>): number {
  let total = 0;
  for (const msg of messages) {
    // Each message has overhead: role + formatting ~4 tokens
    total += 4;
    total += countTokens(msg.content);
  }
  // Add 2 for assistant primer
  total += 2;
  return total;
}

/** Rough token estimation fallback */
function roughTokenEstimate(text: string): number[] {
  // Very rough: split by whitespace and punctuation
  const words = text.split(/[\s\p{P}]+/u).filter(w => w.length > 0);
  // Approximate: 1 token per ~4 chars, but words vary
  return words.map((_, i) => i);
}

function roughTokenCount(text: string): number {
  // ~4 characters per token for English
  return Math.ceil(text.length / 4);
}

/** Truncate text to max tokens */
export function truncateToTokens(text: string, maxTokens: number): string {
  if (!encoding) {
    // Rough truncation
    const maxChars = maxTokens * 4;
    return text.length > maxChars ? text.slice(0, maxChars) + '...' : text;
  }

  const tokens = encoding.encode(text);
  if (tokens.length <= maxTokens) return text;

  const truncatedTokens = tokens.slice(0, maxTokens);
  return encoding.decode(truncatedTokens) + '...';
}

/** Get encoding name */
export function getEncodingName(): string {
  return encoding ? 'cl100k_base' : 'fallback';
}

/** Check if tiktoken is available */
export function isTokenizerReady(): boolean {
  return !!encoding;
}