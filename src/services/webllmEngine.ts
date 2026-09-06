/**
 * WebLLM Engine - Wrapper around @mlc-ai/web-llm
 * Handles model loading, streaming chat, context management, model switching
 */

import { CreateMLCEngine, MLCEngineInterface, InitProgressCallback } from '@mlc-ai/web-llm';
import type {
  ChatMessage,
  ChatOptions,
  ContextUsage,
  ModelLoadProgress,
  ModelDefinition
} from '../types/index.js';
import { modelRegistry } from '../models/modelRegistry.js';

/** Model loading state */
type ModelState = 'idle' | 'loading' | 'ready' | 'error';

/** WebLLM Engine Class */
export class WebLLMEngine {
  private engine: MLCEngineInterface | null = null;
  private currentModelId: string | null = null;
  private modelState: ModelState = 'idle';
  private loadProgressCallback: ((progress: ModelLoadProgress) => void) | null = null;
  private contextWindow: number = 4096;

  /** Check if WebGPU is available */
  static isWebGPUSupported(): boolean {
    return 'gpu' in navigator;
  }

  /** Get WebGPU adapter info */
  static async getGPUInfo(): Promise<{ supported: boolean; adapter?: any; error?: string }> {
    if (!this.isWebGPUSupported()) {
      return { supported: false, error: 'WebGPU not supported in this browser' };
    }

    try {
      const nav = navigator as Navigator & { gpu: { requestAdapter: (options: any) => Promise<any> } };
      const adapter = await nav.gpu.requestAdapter({
        powerPreference: 'high-performance',
      });

      if (!adapter) {
        return { supported: false, error: 'No WebGPU adapter found' };
      }

      return { supported: true, adapter };
    } catch (error) {
      return {
        supported: false,
        error: error instanceof Error ? error.message : 'Unknown WebGPU error'
      };
    }
  }

  /** Initialize the engine (check WebGPU) */
  async init(): Promise<void> {
    const gpuInfo = await WebLLMEngine.getGPUInfo();
    if (!gpuInfo.supported) {
      console.warn('[WebLLMEngine] WebGPU not available:', gpuInfo.error);
      // Don't throw - let the UI handle it
    }
    console.log('[WebLLMEngine] Initialized');
  }

  /** Load a model with progress callback */
  async loadModel(
    modelId: string,
    onProgress?: (progress: ModelLoadProgress) => void
  ): Promise<MLCEngineInterface> {
    const modelDef = modelRegistry.getById(modelId);
    if (!modelDef) {
      throw new Error(`Model ${modelId} not found in registry`);
    }

    this.modelState = 'loading';
    this.currentModelId = modelId;
    this.contextWindow = modelDef.contextWindow ?? 4096;
    this.loadProgressCallback = onProgress ?? null;

    // Report initial progress
    this.reportProgress({
      modelId,
      progress: 0,
      stage: 'downloading',
      message: `Preparing to load ${modelDef.name}...`
    });

    try {
      // Create progress callback for WebLLM
      const progressCallback: InitProgressCallback = (report) => {
        const progress = report.progress ?? 0;
        const stage = this.mapStage(report.text);
        this.reportProgress({
          modelId,
          progress: Math.round(progress * 100),
          stage,
          message: report.text
        });
      };

      // Load the model
      this.engine = await CreateMLCEngine(modelId, {
        initProgressCallback: progressCallback,
      });

      this.modelState = 'ready';
      this.reportProgress({
        modelId,
        progress: 100,
        stage: 'ready',
        message: `${modelDef.name} loaded successfully`
      });

      console.log(`[WebLLMEngine] Model ${modelId} loaded`);
      return this.engine;
    } catch (error) {
      this.modelState = 'error';
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.reportProgress({
        modelId,
        progress: 0,
        stage: 'error',
        message: `Failed to load ${modelDef.name}`,
        error: errorMsg
      });
      console.error(`[WebLLMEngine] Failed to load ${modelId}:`, error);
      throw error;
    }
  }

  /** Map WebLLM stage to our stage */
  private mapStage(text: string): ModelLoadProgress['stage'] {
    const lower = text.toLowerCase();
    if (lower.includes('download')) return 'downloading';
    if (lower.includes('compil')) return 'compiling';
    if (lower.includes('load')) return 'loading';
    if (lower.includes('ready') || lower.includes('complete')) return 'ready';
    if (lower.includes('error') || lower.includes('fail')) return 'error';
    return 'downloading';
  }

  /** Report progress to callback */
  private reportProgress(progress: ModelLoadProgress): void {
    if (this.loadProgressCallback) {
      this.loadProgressCallback(progress);
    }
  }

  /** Stream chat completion */
  async *streamChat(
    messages: ChatMessage[],
    options: ChatOptions = {}
  ): AsyncGenerator<string> {
    if (!this.engine) {
      throw new Error('No model loaded. Call loadModel() first.');
    }

    if (this.modelState !== 'ready') {
      throw new Error(`Model not ready (state: ${this.modelState})`);
    }

    // Convert messages to WebLLM format
    const webllmMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    // Create completion with streaming
    const completion = await this.engine.chat.completions.create({
      messages: webllmMessages,
      temperature: options.temperature ?? 0.7,
      top_p: options.topP ?? 0.95,
      max_tokens: options.maxTokens ?? 2048,
      stream: true,
      stream_options: { include_usage: true },
    });

    // Yield tokens as they arrive
    for await (const chunk of completion) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        // Call progress callback if provided
        if (options.onProgress) {
          options.onProgress(delta);
        }
        yield delta;
      }
    }
  }

  /** Non-streaming chat completion */
  async chat(
    messages: ChatMessage[],
    options: ChatOptions = {}
  ): Promise<string> {
    if (!this.engine) {
      throw new Error('No model loaded. Call loadModel() first.');
    }

    const webllmMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    const completion = await this.engine.chat.completions.create({
      messages: webllmMessages,
      temperature: options.temperature ?? 0.7,
      top_p: options.topP ?? 0.95,
      max_tokens: options.maxTokens ?? 2048,
      stream: false,
    });

    return completion.choices[0]?.message?.content ?? '';
  }

  /** Get current context usage */
  getContextUsage(): ContextUsage {
    if (!this.engine) {
      return { used: 0, total: this.contextWindow, percentage: 0 };
    }

    // WebLLM provides context usage via getMessageStats
    try {
      const engineWithStats = this.engine as MLCEngineInterface & { getMessageStats?: () => { prompt_tokens?: number } };
      const stats = engineWithStats.getMessageStats?.();
      if (stats) {
        const used = stats.prompt_tokens ?? 0;
        const total = this.contextWindow;
        return {
          used,
          total,
          percentage: total > 0 ? Math.round((used / total) * 100) : 0
        };
      }
    } catch {
      // Ignore errors
    }

    return { used: 0, total: this.contextWindow, percentage: 0 };
  }

  /** Get context window size for current model */
  getContextWindow(): number {
    return this.contextWindow;
  }

  /** Get current model ID */
  getCurrentModelId(): string | null {
    return this.currentModelId;
  }

  /** Get model state */
  getModelState(): ModelState {
    return this.modelState;
  }

  /** Check if model is loaded and ready */
  isReady(): boolean {
    return this.modelState === 'ready' && this.engine !== null;
  }

  /** Switch model preserving conversation context */
  async switchModel(
    newModelId: string,
    currentMessages: ChatMessage[],
    onProgress?: (progress: ModelLoadProgress) => void
  ): Promise<void> {
    if (newModelId === this.currentModelId) {
      return; // Already loaded
    }

    const newModelDef = modelRegistry.getById(newModelId);
    if (!newModelDef) {
      throw new Error(`Model ${newModelId} not found in registry`);
    }

    console.log(`[WebLLMEngine] Switching from ${this.currentModelId} to ${newModelId}`);

    // Load new model
    await this.loadModel(newModelId, onProgress);

    // Note: WebLLM handles tokenizer differences internally
    // The conversation history is re-encoded with the new model's tokenizer
    // when we send the next message
  }

  /** Unload current model */
  async unloadModel(): Promise<void> {
    if (this.engine) {
      // WebLLM doesn't have explicit unload, but we can dereference
      this.engine = null;
      this.currentModelId = null;
      this.modelState = 'idle';
      this.contextWindow = 4096;
      console.log('[WebLLMEngine] Model unloaded');
    }
  }

  /** Generate a summary using the current model */
  async generateSummary(text: string, maxTokens = 500): Promise<string> {
    if (!this.engine || this.modelState !== 'ready') {
      throw new Error('Model not ready');
    }

    const prompt = `Summarize the following conversation preserving key details, decisions, and entities. Be concise but comprehensive.\n\nConversation:\n${text}\n\nSummary:`;

    const summary = await this.chat(
      [{ role: 'user', content: prompt, id: 'summary-prompt', timestamp: Date.now() }],
      { maxTokens, temperature: 0.3 }
    );

    return summary.trim();
  }

  /** Extract structured facts using the current model */
  async extractFacts(text: string): Promise<Array<{ entity: string; relation: string; value: string; confidence: number }>> {
    if (!this.engine || this.modelState !== 'ready') {
      throw new Error('Model not ready');
    }

    const prompt = `Extract structured facts from the following text as JSON array of objects with fields: entity, relation, value, confidence (0-1).
Only extract clear, factual statements. Ignore opinions and uncertainty.
Return ONLY valid JSON array.

Text:
${text}

Facts:`;

    try {
      const response = await this.chat(
        [{ role: 'user', content: prompt, id: 'fact-prompt', timestamp: Date.now() }],
        { maxTokens: 1000, temperature: 0.1 }
      );

      // Try to parse JSON from response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const facts = JSON.parse(jsonMatch[0]);
        return facts.filter((f: any) =>
          f.entity && f.relation && f.value && typeof f.confidence === 'number' && f.confidence >= 0.7
        );
      }
    } catch (error) {
      console.warn('[WebLLMEngine] Failed to extract facts:', error);
    }

    return [];
  }

  /** Estimate tokens for text (rough approximation) */
  estimateTokens(text: string): number {
    // Rough estimation: ~4 chars per token for English
    return Math.ceil(text.length / 4);
  }

  /** Get engine instance (for advanced usage) */
  getEngine(): MLCEngineInterface | null {
    return this.engine;
  }

  /** Cleanup */
  async destroy(): Promise<void> {
    await this.unloadModel();
  }
}

// Export singleton
export const webllmEngine = new WebLLMEngine();