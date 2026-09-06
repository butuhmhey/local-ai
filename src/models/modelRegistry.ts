/**
 * Model Registry - 100+ Model Definitions for WebLLM
 * Source: MLC-LLM / WebLLM supported models
 */

import type { ModelDefinition, ModelFilters } from '../types/index.js';

/**
 * Complete model registry with all WebLLM-supported models
 * Includes computed fields: contextWindow, downloadSizeMB
 */
export const MODEL_REGISTRY: ModelDefinition[] = [
  // ===== Llama 3.2 Models =====
  {
    id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    name: 'Llama 3.2 1B Instruct',
    sizeParams: '1B',
    quantization: 'q4f16_1',
    ramGB: 1.5,
    category: 'general',
    uncensored: false,
    description: 'Tiny but capable 1B model, great for quick tasks and low-RAM devices',
    contextWindow: 131072,
    downloadSizeMB: 800
  },
  {
    id: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
    name: 'Llama 3.2 3B Instruct',
    sizeParams: '3B',
    quantization: 'q4f16_1',
    ramGB: 3,
    category: 'general',
    uncensored: false,
    description: 'Balanced 3B model with strong performance for its size',
    contextWindow: 131072,
    downloadSizeMB: 2000
  },
  {
    id: 'Llama-3.2-3B-Instruct-q8f16_1-MLC',
    name: 'Llama 3.2 3B Instruct (q8)',
    sizeParams: '3B',
    quantization: 'q8f16_1',
    ramGB: 4,
    category: 'general',
    uncensored: false,
    description: 'Higher quality 3B quantization',
    contextWindow: 131072,
    downloadSizeMB: 3500
  },

  // ===== Llama 3.1 Models =====
  {
    id: 'Llama-3.1-8B-Instruct-q4f16_1-MLC',
    name: 'Llama 3.1 8B Instruct',
    sizeParams: '8B',
    quantization: 'q4f16_1',
    ramGB: 6,
    category: 'general',
    uncensored: false,
    description: 'Flagship 8B model with 128K context, strong reasoning',
    contextWindow: 131072,
    downloadSizeMB: 5000
  },
  {
    id: 'Llama-3.1-8B-Instruct-q8f16_1-MLC',
    name: 'Llama 3.1 8B Instruct (q8)',
    sizeParams: '8B',
    quantization: 'q8f16_1',
    ramGB: 8,
    category: 'general',
    uncensored: false,
    description: 'Higher quality 8B quantization',
    contextWindow: 131072,
    downloadSizeMB: 8500
  },
  {
    id: 'Llama-3.1-70B-Instruct-q4f16_1-MLC',
    name: 'Llama 3.1 70B Instruct',
    sizeParams: '70B',
    quantization: 'q4f16_1',
    ramGB: 40,
    category: 'general',
    uncensored: false,
    description: 'Large 70B model - requires high RAM',
    contextWindow: 131072,
    downloadSizeMB: 40000
  },

  // ===== Llama 3 Models =====
  {
    id: 'Llama-3-8B-Instruct-q4f16_1-MLC',
    name: 'Llama 3 8B Instruct',
    sizeParams: '8B',
    quantization: 'q4f16_1',
    ramGB: 6,
    category: 'general',
    uncensored: false,
    description: 'Original Llama 3 8B instruct model',
    contextWindow: 8192,
    downloadSizeMB: 5000
  },
  {
    id: 'Llama-3-8B-Instruct-q8f16_1-MLC',
    name: 'Llama 3 8B Instruct (q8)',
    sizeParams: '8B',
    quantization: 'q8f16_1',
    ramGB: 8,
    category: 'general',
    uncensored: false,
    description: 'Higher quality Llama 3 8B',
    contextWindow: 8192,
    downloadSizeMB: 8500
  },

  // ===== Phi-3.5 Models =====
  {
    id: 'Phi-3.5-mini-instruct-q4f16_1-MLC',
    name: 'Phi-3.5 Mini Instruct',
    sizeParams: '3.8B',
    quantization: 'q4f16_1',
    ramGB: 3,
    category: 'general',
    uncensored: false,
    description: 'Microsoft\'s efficient 3.8B model with 128K context',
    contextWindow: 131072,
    downloadSizeMB: 2200
  },
  {
    id: 'Phi-3.5-mini-instruct-q8f16_1-MLC',
    name: 'Phi-3.5 Mini Instruct (q8)',
    sizeParams: '3.8B',
    quantization: 'q8f16_1',
    ramGB: 4,
    category: 'general',
    uncensored: false,
    description: 'Higher quality Phi-3.5 Mini',
    contextWindow: 131072,
    downloadSizeMB: 4000
  },
  {
    id: 'Phi-3.5-vision-instruct-q4f16_1-MLC',
    name: 'Phi-3.5 Vision Instruct',
    sizeParams: '4.2B',
    quantization: 'q4f16_1',
    ramGB: 4,
    category: 'general',
    uncensored: false,
    description: 'Multimodal Phi-3.5 with vision capabilities',
    contextWindow: 131072,
    downloadSizeMB: 2500
  },

  // ===== Phi-3 Models =====
  {
    id: 'Phi-3-mini-4k-instruct-q4f16_1-MLC',
    name: 'Phi-3 Mini 4K Instruct',
    sizeParams: '3.8B',
    quantization: 'q4f16_1',
    ramGB: 3,
    category: 'general',
    uncensored: false,
    description: 'Microsoft\'s Phi-3 Mini with 4K context',
    contextWindow: 4096,
    downloadSizeMB: 2200
  },
  {
    id: 'Phi-3-mini-128k-instruct-q4f16_1-MLC',
    name: 'Phi-3 Mini 128K Instruct',
    sizeParams: '3.8B',
    quantization: 'q4f16_1',
    ramGB: 3,
    category: 'general',
    uncensored: false,
    description: 'Phi-3 Mini with extended 128K context',
    contextWindow: 131072,
    downloadSizeMB: 2200
  },
  {
    id: 'Phi-3-medium-4k-instruct-q4f16_1-MLC',
    name: 'Phi-3 Medium 4K Instruct',
    sizeParams: '14B',
    quantization: 'q4f16_1',
    ramGB: 10,
    category: 'general',
    uncensored: false,
    description: 'Larger Phi-3 Medium model',
    contextWindow: 4096,
    downloadSizeMB: 8000
  },
  {
    id: 'Phi-3-medium-128k-instruct-q4f16_1-MLC',
    name: 'Phi-3 Medium 128K Instruct',
    sizeParams: '14B',
    quantization: 'q4f16_1',
    ramGB: 10,
    category: 'general',
    uncensored: false,
    description: 'Phi-3 Medium with 128K context',
    contextWindow: 131072,
    downloadSizeMB: 8000
  },

  // ===== Gemma 2 Models =====
  {
    id: 'gemma-2-2b-it-q4f16_1-MLC',
    name: 'Gemma 2 2B Instruct',
    sizeParams: '2B',
    quantization: 'q4f16_1',
    ramGB: 2,
    category: 'general',
    uncensored: false,
    description: 'Google\'s efficient 2B model',
    contextWindow: 8192,
    downloadSizeMB: 1500
  },
  {
    id: 'gemma-2-9b-it-q4f16_1-MLC',
    name: 'Gemma 2 9B Instruct',
    sizeParams: '9B',
    quantization: 'q4f16_1',
    ramGB: 7,
    category: 'general',
    uncensored: false,
    description: 'Google\'s 9B Gemma 2 model',
    contextWindow: 8192,
    downloadSizeMB: 5500
  },
  {
    id: 'gemma-2-27b-it-q4f16_1-MLC',
    name: 'Gemma 2 27B Instruct',
    sizeParams: '27B',
    quantization: 'q4f16_1',
    ramGB: 16,
    category: 'general',
    uncensored: false,
    description: 'Large Gemma 2 model',
    contextWindow: 8192,
    downloadSizeMB: 16000
  },

  // ===== Gemma Models =====
  {
    id: 'gemma-1.1-2b-it-q4f16_1-MLC',
    name: 'Gemma 1.1 2B Instruct',
    sizeParams: '2B',
    quantization: 'q4f16_1',
    ramGB: 2,
    category: 'general',
    uncensored: false,
    description: 'Google\'s original Gemma 2B',
    contextWindow: 8192,
    downloadSizeMB: 1500
  },
  {
    id: 'gemma-1.1-7b-it-q4f16_1-MLC',
    name: 'Gemma 1.1 7B Instruct',
    sizeParams: '7B',
    quantization: 'q4f16_1',
    ramGB: 5,
    category: 'general',
    uncensored: false,
    description: 'Google\'s original Gemma 7B',
    contextWindow: 8192,
    downloadSizeMB: 4500
  },

  // ===== Qwen 2.5 Models =====
  {
    id: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
    name: 'Qwen 2.5 0.5B Instruct',
    sizeParams: '0.5B',
    quantization: 'q4f16_1',
    ramGB: 1,
    category: 'general',
    uncensored: false,
    description: 'Ultra-tiny 0.5B model for minimal RAM',
    contextWindow: 32768,
    downloadSizeMB: 400
  },
  {
    id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
    name: 'Qwen 2.5 1.5B Instruct',
    sizeParams: '1.5B',
    quantization: 'q4f16_1',
    ramGB: 2,
    category: 'general',
    uncensored: false,
    description: 'Small but capable 1.5B model',
    contextWindow: 32768,
    downloadSizeMB: 1000
  },
  {
    id: 'Qwen2.5-3B-Instruct-q4f16_1-MLC',
    name: 'Qwen 2.5 3B Instruct',
    sizeParams: '3B',
    quantization: 'q4f16_1',
    ramGB: 3,
    category: 'general',
    uncensored: false,
    description: 'Balanced 3B Qwen 2.5 model',
    contextWindow: 32768,
    downloadSizeMB: 2000
  },
  {
    id: 'Qwen2.5-7B-Instruct-q4f16_1-MLC',
    name: 'Qwen 2.5 7B Instruct',
    sizeParams: '7B',
    quantization: 'q4f16_1',
    ramGB: 5,
    category: 'general',
    uncensored: false,
    description: 'Strong 7B Qwen 2.5 model',
    contextWindow: 32768,
    downloadSizeMB: 4500
  },
  {
    id: 'Qwen2.5-14B-Instruct-q4f16_1-MLC',
    name: 'Qwen 2.5 14B Instruct',
    sizeParams: '14B',
    quantization: 'q4f16_1',
    ramGB: 10,
    category: 'general',
    uncensored: false,
    description: 'Large 14B Qwen 2.5 model',
    contextWindow: 32768,
    downloadSizeMB: 8500
  },
  {
    id: 'Qwen2.5-32B-Instruct-q4f16_1-MLC',
    name: 'Qwen 2.5 32B Instruct',
    sizeParams: '32B',
    quantization: 'q4f16_1',
    ramGB: 20,
    category: 'general',
    uncensored: false,
    description: 'Very large 32B Qwen 2.5 model',
    contextWindow: 32768,
    downloadSizeMB: 19000
  },
  {
    id: 'Qwen2.5-72B-Instruct-q4f16_1-MLC',
    name: 'Qwen 2.5 72B Instruct',
    sizeParams: '72B',
    quantization: 'q4f16_1',
    ramGB: 42,
    category: 'general',
    uncensored: false,
    description: 'Massive 72B Qwen 2.5 model',
    contextWindow: 32768,
    downloadSizeMB: 42000
  },

  // ===== Qwen 2 Models =====
  {
    id: 'Qwen2-0.5B-Instruct-q4f16_1-MLC',
    name: 'Qwen 2 0.5B Instruct',
    sizeParams: '0.5B',
    quantization: 'q4f16_1',
    ramGB: 1,
    category: 'general',
    uncensored: false,
    description: 'Original Qwen 2 0.5B',
    contextWindow: 32768,
    downloadSizeMB: 400
  },
  {
    id: 'Qwen2-1.5B-Instruct-q4f16_1-MLC',
    name: 'Qwen 2 1.5B Instruct',
    sizeParams: '1.5B',
    quantization: 'q4f16_1',
    ramGB: 2,
    category: 'general',
    uncensored: false,
    description: 'Original Qwen 2 1.5B',
    contextWindow: 32768,
    downloadSizeMB: 1000
  },
  {
    id: 'Qwen2-7B-Instruct-q4f16_1-MLC',
    name: 'Qwen 2 7B Instruct',
    sizeParams: '7B',
    quantization: 'q4f16_1',
    ramGB: 5,
    category: 'general',
    uncensored: false,
    description: 'Original Qwen 2 7B',
    contextWindow: 32768,
    downloadSizeMB: 4500
  },

  // ===== Mistral Models =====
  {
    id: 'Mistral-7B-Instruct-v0.3-q4f16_1-MLC',
    name: 'Mistral 7B Instruct v0.3',
    sizeParams: '7B',
    quantization: 'q4f16_1',
    ramGB: 5,
    category: 'general',
    uncensored: false,
    description: 'Mistral\'s latest 7B instruct model',
    contextWindow: 32768,
    downloadSizeMB: 4500
  },
  {
    id: 'Mistral-7B-Instruct-v0.3-q8f16_1-MLC',
    name: 'Mistral 7B Instruct v0.3 (q8)',
    sizeParams: '7B',
    quantization: 'q8f16_1',
    ramGB: 7,
    category: 'general',
    uncensored: false,
    description: 'Higher quality Mistral 7B',
    contextWindow: 32768,
    downloadSizeMB: 7500
  },
  {
    id: 'Mistral-Nemo-Instruct-2407-q4f16_1-MLC',
    name: 'Mistral Nemo 12B Instruct',
    sizeParams: '12B',
    quantization: 'q4f16_1',
    ramGB: 8,
    category: 'general',
    uncensored: false,
    description: 'Mistral Nemo 12B with 128K context',
    contextWindow: 131072,
    downloadSizeMB: 7000
  },

  // ===== Mixtral Models =====
  {
    id: 'Mixtral-8x7B-Instruct-v0.1-q4f16_1-MLC',
    name: 'Mixtral 8x7B Instruct',
    sizeParams: '8x7B',
    quantization: 'q4f16_1',
    ramGB: 26,
    category: 'general',
    uncensored: false,
    description: 'Mixture of Experts model, 46.7B active params',
    contextWindow: 32768,
    downloadSizeMB: 26000
  },
  {
    id: 'Mixtral-8x22B-Instruct-v0.1-q4f16_1-MLC',
    name: 'Mixtral 8x22B Instruct',
    sizeParams: '8x22B',
    quantization: 'q4f16_1',
    ramGB: 70,
    category: 'general',
    uncensored: false,
    description: 'Large MoE model',
    contextWindow: 65536,
    downloadSizeMB: 70000
  },

  // ===== Yi Models =====
  {
    id: 'Yi-1.5-6B-Chat-q4f16_1-MLC',
    name: 'Yi 1.5 6B Chat',
    sizeParams: '6B',
    quantization: 'q4f16_1',
    ramGB: 4,
    category: 'general',
    uncensored: false,
    description: '01.AI\'s Yi 1.5 6B chat model',
    contextWindow: 32768,
    downloadSizeMB: 3500
  },
  {
    id: 'Yi-1.5-9B-Chat-q4f16_1-MLC',
    name: 'Yi 1.5 9B Chat',
    sizeParams: '9B',
    quantization: 'q4f16_1',
    ramGB: 6,
    category: 'general',
    uncensored: false,
    description: '01.AI\'s Yi 1.5 9B chat model',
    contextWindow: 32768,
    downloadSizeMB: 5500
  },
  {
    id: 'Yi-1.5-34B-Chat-q4f16_1-MLC',
    name: 'Yi 1.5 34B Chat',
    sizeParams: '34B',
    quantization: 'q4f16_1',
    ramGB: 20,
    category: 'general',
    uncensored: false,
    description: 'Large Yi 1.5 34B model',
    contextWindow: 32768,
    downloadSizeMB: 20000
  },

  // ===== DeepSeek Models =====
  {
    id: 'DeepSeek-Coder-V2-Lite-Instruct-q4f16_1-MLC',
    name: 'DeepSeek Coder V2 Lite',
    sizeParams: '16B',
    quantization: 'q4f16_1',
    ramGB: 10,
    category: 'coding',
    uncensored: false,
    description: 'DeepSeek\'s coding-focused model (lite version)',
    contextWindow: 131072,
    downloadSizeMB: 9500
  },
  {
    id: 'DeepSeek-Coder-V2-Lite-Instruct-q8f16_1-MLC',
    name: 'DeepSeek Coder V2 Lite (q8)',
    sizeParams: '16B',
    quantization: 'q8f16_1',
    ramGB: 12,
    category: 'coding',
    uncensored: false,
    description: 'Higher quality DeepSeek Coder V2 Lite',
    contextWindow: 131072,
    downloadSizeMB: 16000
  },
  {
    id: 'DeepSeek-R1-Distill-Qwen-1.5B-q4f16_1-MLC',
    name: 'DeepSeek R1 Distill Qwen 1.5B',
    sizeParams: '1.5B',
    quantization: 'q4f16_1',
    ramGB: 2,
    category: 'reasoning',
    uncensored: false,
    description: 'Reasoning model distilled from DeepSeek R1',
    contextWindow: 32768,
    downloadSizeMB: 1000
  },
  {
    id: 'DeepSeek-R1-Distill-Qwen-7B-q4f16_1-MLC',
    name: 'DeepSeek R1 Distill Qwen 7B',
    sizeParams: '7B',
    quantization: 'q4f16_1',
    ramGB: 5,
    category: 'reasoning',
    uncensored: false,
    description: '7B reasoning model from DeepSeek R1',
    contextWindow: 32768,
    downloadSizeMB: 4500
  },
  {
    id: 'DeepSeek-R1-Distill-Qwen-14B-q4f16_1-MLC',
    name: 'DeepSeek R1 Distill Qwen 14B',
    sizeParams: '14B',
    quantization: 'q4f16_1',
    ramGB: 10,
    category: 'reasoning',
    uncensored: false,
    description: '14B reasoning model from DeepSeek R1',
    contextWindow: 32768,
    downloadSizeMB: 8500
  },
  {
    id: 'DeepSeek-R1-Distill-Qwen-32B-q4f16_1-MLC',
    name: 'DeepSeek R1 Distill Qwen 32B',
    sizeParams: '32B',
    quantization: 'q4f16_1',
    ramGB: 20,
    category: 'reasoning',
    uncensored: false,
    description: '32B reasoning model from DeepSeek R1',
    contextWindow: 32768,
    downloadSizeMB: 19000
  },
  {
    id: 'DeepSeek-R1-Distill-Llama-8B-q4f16_1-MLC',
    name: 'DeepSeek R1 Distill Llama 8B',
    sizeParams: '8B',
    quantization: 'q4f16_1',
    ramGB: 6,
    category: 'reasoning',
    uncensored: false,
    description: '8B Llama-based reasoning model',
    contextWindow: 32768,
    downloadSizeMB: 5000
  },
  {
    id: 'DeepSeek-R1-Distill-Llama-70B-q4f16_1-MLC',
    name: 'DeepSeek R1 Distill Llama 70B',
    sizeParams: '70B',
    quantization: 'q4f16_1',
    ramGB: 40,
    category: 'reasoning',
    uncensored: false,
    description: '70B Llama-based reasoning model',
    contextWindow: 32768,
    downloadSizeMB: 40000
  },

  // ===== CodeLlama Models =====
  {
    id: 'CodeLlama-7b-Instruct-hf-q4f16_1-MLC',
    name: 'CodeLlama 7B Instruct',
    sizeParams: '7B',
    quantization: 'q4f16_1',
    ramGB: 5,
    category: 'coding',
    uncensored: false,
    description: 'Meta\'s CodeLlama 7B for code generation',
    contextWindow: 16384,
    downloadSizeMB: 4500
  },
  {
    id: 'CodeLlama-13b-Instruct-hf-q4f16_1-MLC',
    name: 'CodeLlama 13B Instruct',
    sizeParams: '13B',
    quantization: 'q4f16_1',
    ramGB: 9,
    category: 'coding',
    uncensored: false,
    description: 'Meta\'s CodeLlama 13B',
    contextWindow: 16384,
    downloadSizeMB: 7500
  },
  {
    id: 'CodeLlama-34b-Instruct-hf-q4f16_1-MLC',
    name: 'CodeLlama 34B Instruct',
    sizeParams: '34B',
    quantization: 'q4f16_1',
    ramGB: 20,
    category: 'coding',
    uncensored: false,
    description: 'Meta\'s large CodeLlama 34B',
    contextWindow: 16384,
    downloadSizeMB: 20000
  },

  // ===== StarCoder Models =====
  {
    id: 'StarCoder2-3B-q4f16_1-MLC',
    name: 'StarCoder2 3B',
    sizeParams: '3B',
    quantization: 'q4f16_1',
    ramGB: 3,
    category: 'coding',
    uncensored: false,
    description: 'BigCode\'s StarCoder2 3B for code',
    contextWindow: 16384,
    downloadSizeMB: 2000
  },
  {
    id: 'StarCoder2-7B-q4f16_1-MLC',
    name: 'StarCoder2 7B',
    sizeParams: '7B',
    quantization: 'q4f16_1',
    ramGB: 5,
    category: 'coding',
    uncensored: false,
    description: 'BigCode\'s StarCoder2 7B',
    contextWindow: 16384,
    downloadSizeMB: 4500
  },
  {
    id: 'StarCoder2-15B-q4f16_1-MLC',
    name: 'StarCoder2 15B',
    sizeParams: '15B',
    quantization: 'q4f16_1',
    ramGB: 10,
    category: 'coding',
    uncensored: false,
    description: 'BigCode\'s StarCoder2 15B',
    contextWindow: 16384,
    downloadSizeMB: 9000
  },

  // ===== StableCode Models =====
  {
    id: 'StableCode-Instruct-Alpha-3B-q4f16_1-MLC',
    name: 'StableCode Instruct 3B',
    sizeParams: '3B',
    quantization: 'q4f16_1',
    ramGB: 3,
    category: 'coding',
    uncensored: false,
    description: 'Stability AI\'s coding model',
    contextWindow: 16384,
    downloadSizeMB: 2000
  },

  // ===== WizardCoder Models =====
  {
    id: 'WizardCoder-15B-V1.0-q4f16_1-MLC',
    name: 'WizardCoder 15B V1.0',
    sizeParams: '15B',
    quantization: 'q4f16_1',
    ramGB: 10,
    category: 'coding',
    uncensored: false,
    description: 'WizardCoder 15B for code generation',
    contextWindow: 16384,
    downloadSizeMB: 9000
  },
  {
    id: 'WizardCoder-34B-V1.0-q4f16_1-MLC',
    name: 'WizardCoder 34B V1.0',
    sizeParams: '34B',
    quantization: 'q4f16_1',
    ramGB: 20,
    category: 'coding',
    uncensored: false,
    description: 'Large WizardCoder 34B',
    contextWindow: 16384,
    downloadSizeMB: 20000
  },

  // ===== Nemotron Models =====
  {
    id: 'Nemotron-3-8B-Chat-q4f16_1-MLC',
    name: 'Nemotron 3 8B Chat',
    sizeParams: '8B',
    quantization: 'q4f16_1',
    ramGB: 6,
    category: 'general',
    uncensored: false,
    description: 'NVIDIA\'s Nemotron 3 8B chat model',
    contextWindow: 4096,
    downloadSizeMB: 5000
  },

  // ===== OLMo Models =====
  {
    id: 'OLMo-7B-Instruct-q4f16_1-MLC',
    name: 'OLMo 7B Instruct',
    sizeParams: '7B',
    quantization: 'q4f16_1',
    ramGB: 5,
    category: 'general',
    uncensored: false,
    description: 'Allen Institute\'s OLMo 7B instruct',
    contextWindow: 4096,
    downloadSizeMB: 4500
  },

  // ===== Zephyr Models =====
  {
    id: 'zephyr-7b-beta-q4f16_1-MLC',
    name: 'Zephyr 7B Beta',
    sizeParams: '7B',
    quantization: 'q4f16_1',
    ramGB: 5,
    category: 'general',
    uncensored: false,
    description: 'HuggingFace\'s Zephyr 7B beta',
    contextWindow: 4096,
    downloadSizeMB: 4500
  },
  {
    id: 'zephyr-7b-gemma-v0.1-q4f16_1-MLC',
    name: 'Zephyr 7B Gemma',
    sizeParams: '7B',
    quantization: 'q4f16_1',
    ramGB: 5,
    category: 'general',
    uncensored: false,
    description: 'Zephyr fine-tuned on Gemma',
    contextWindow: 8192,
    downloadSizeMB: 4500
  },

  // ===== OpenChat Models =====
  {
    id: 'openchat-3.5-1210-q4f16_1-MLC',
    name: 'OpenChat 3.5',
    sizeParams: '7B',
    quantization: 'q4f16_1',
    ramGB: 5,
    category: 'general',
    uncensored: false,
    description: 'OpenChat 3.5 - strong general purpose',
    contextWindow: 8192,
    downloadSizeMB: 4500
  },
  {
    id: 'openchat-3.6-8b-20240522-q4f16_1-MLC',
    name: 'OpenChat 3.6 8B',
    sizeParams: '8B',
    quantization: 'q4f16_1',
    ramGB: 6,
    category: 'general',
    uncensored: false,
    description: 'Latest OpenChat 3.6 8B',
    contextWindow: 8192,
    downloadSizeMB: 5000
  },

  // ===== Neural-Chat Models =====
  {
    id: 'neural-chat-7b-v3-1-q4f16_1-MLC',
    name: 'Neural Chat 7B v3.1',
    sizeParams: '7B',
    quantization: 'q4f16_1',
    ramGB: 5,
    category: 'general',
    uncensored: false,
    description: 'Intel\'s Neural Chat 7B',
    contextWindow: 8192,
    downloadSizeMB: 4500
  },

  // ===== Starling Models =====
  {
    id: 'Starling-LM-7B-alpha-q4f16_1-MLC',
    name: 'Starling LM 7B Alpha',
    sizeParams: '7B',
    quantization: 'q4f16_1',
    ramGB: 5,
    category: 'general',
    uncensored: false,
    description: 'Berkeley\'s Starling LM 7B',
    contextWindow: 8192,
    downloadSizeMB: 4500
  },

  // ===== Tulu Models =====
  {
    id: 'tulu-2-dpo-7b-q4f16_1-MLC',
    name: 'Tulu 2 DPO 7B',
    sizeParams: '7B',
    quantization: 'q4f16_1',
    ramGB: 5,
    category: 'general',
    uncensored: false,
    description: 'Allen Institute\'s Tulu 2 DPO',
    contextWindow: 4096,
    downloadSizeMB: 4500
  },
  {
    id: 'tulu-2-dpo-13b-q4f16_1-MLC',
    name: 'Tulu 2 DPO 13B',
    sizeParams: '13B',
    quantization: 'q4f16_1',
    ramGB: 9,
    category: 'general',
    uncensored: false,
    description: 'Allen Institute\'s Tulu 2 DPO 13B',
    contextWindow: 4096,
    downloadSizeMB: 7500
  },
  {
    id: 'tulu-2-dpo-70b-q4f16_1-MLC',
    name: 'Tulu 2 DPO 70B',
    sizeParams: '70B',
    quantization: 'q4f16_1',
    ramGB: 40,
    category: 'general',
    uncensored: false,
    description: 'Large Tulu 2 DPO 70B',
    contextWindow: 4096,
    downloadSizeMB: 40000
  },

  // ===== Solar Models =====
  {
    id: 'Solar-10.7B-Instruct-v1.0-q4f16_1-MLC',
    name: 'Solar 10.7B Instruct',
    sizeParams: '10.7B',
    quantization: 'q4f16_1',
    ramGB: 8,
    category: 'general',
    uncensored: false,
    description: 'Upstage\'s Solar 10.7B model',
    contextWindow: 4096,
    downloadSizeMB: 6500
  },

  // ===== Dolphin Models (Uncensored) =====
  {
    id: 'Dolphin-2.2.1-Mistral-7B-q4f16_1-MLC',
    name: 'Dolphin 2.2.1 Mistral 7B',
    sizeParams: '7B',
    quantization: 'q4f16_1',
    ramGB: 5,
    category: 'uncensored',
    uncensored: true,
    description: 'Uncensored Dolphin model based on Mistral 7B',
    contextWindow: 32768,
    downloadSizeMB: 4500
  },
  {
    id: 'Dolphin-2.9.2-Qwen2-7B-q4f16_1-MLC',
    name: 'Dolphin 2.9.2 Qwen2 7B',
    sizeParams: '7B',
    quantization: 'q4f16_1',
    ramGB: 5,
    category: 'uncensored',
    uncensored: true,
    description: 'Uncensored Dolphin model based on Qwen2 7B',
    contextWindow: 32768,
    downloadSizeMB: 4500
  },
  {
    id: 'Dolphin-2.9.4-Yi-1.5-34B-q4f16_1-MLC',
    name: 'Dolphin 2.9.4 Yi 1.5 34B',
    sizeParams: '34B',
    quantization: 'q4f16_1',
    ramGB: 20,
    category: 'uncensored',
    uncensored: true,
    description: 'Uncensored Dolphin model based on Yi 1.5 34B',
    contextWindow: 32768,
    downloadSizeMB: 20000
  },
  {
    id: 'Dolphin-2.9-Llama3-70B-q4f16_1-MLC',
    name: 'Dolphin 2.9 Llama3 70B',
    sizeParams: '70B',
    quantization: 'q4f16_1',
    ramGB: 40,
    category: 'uncensored',
    uncensored: true,
    description: 'Uncensored Dolphin model based on Llama 3 70B',
    contextWindow: 32768,
    downloadSizeMB: 40000
  },
  {
    id: 'Dolphin-2.9.3-Llama-3.1-8B-q4f16_1-MLC',
    name: 'Dolphin 2.9.3 Llama 3.1 8B',
    sizeParams: '8B',
    quantization: 'q4f16_1',
    ramGB: 6,
    category: 'uncensored',
    uncensored: true,
    description: 'Uncensored Dolphin model based on Llama 3.1 8B',
    contextWindow: 131072,
    downloadSizeMB: 5000
  },

  // ===== Abliterated Models (Uncensored) =====
  {
    id: 'Llama-3-8B-Abliterated-q4f16_1-MLC',
    name: 'Llama 3 8B Abliterated',
    sizeParams: '8B',
    quantization: 'q4f16_1',
    ramGB: 6,
    category: 'uncensored',
    uncensored: true,
    description: 'Llama 3 8B with refusal directions removed',
    contextWindow: 8192,
    downloadSizeMB: 5000
  },
  {
    id: 'Llama-3.1-8B-Abliterated-q4f16_1-MLC',
    name: 'Llama 3.1 8B Abliterated',
    sizeParams: '8B',
    quantization: 'q4f16_1',
    ramGB: 6,
    category: 'uncensored',
    uncensored: true,
    description: 'Llama 3.1 8B with refusal directions removed',
    contextWindow: 131072,
    downloadSizeMB: 5000
  },
  {
    id: 'Llama-3.1-70B-Abliterated-q4f16_1-MLC',
    name: 'Llama 3.1 70B Abliterated',
    sizeParams: '70B',
    quantization: 'q4f16_1',
    ramGB: 40,
    category: 'uncensored',
    uncensored: true,
    description: 'Llama 3.1 70B with refusal directions removed',
    contextWindow: 131072,
    downloadSizeMB: 40000
  },
  {
    id: 'Mistral-7B-Abliterated-q4f16_1-MLC',
    name: 'Mistral 7B Abliterated',
    sizeParams: '7B',
    quantization: 'q4f16_1',
    ramGB: 5,
    category: 'uncensored',
    uncensored: true,
    description: 'Mistral 7B with refusal directions removed',
    contextWindow: 32768,
    downloadSizeMB: 4500
  },
  {
    id: 'Phi-3-mini-4k-instruct-Abliterated-q4f16_1-MLC',
    name: 'Phi-3 Mini Abliterated',
    sizeParams: '3.8B',
    quantization: 'q4f16_1',
    ramGB: 3,
    category: 'uncensored',
    uncensored: true,
    description: 'Phi-3 Mini with refusal directions removed',
    contextWindow: 4096,
    downloadSizeMB: 2200
  },

  // ===== Hermes Models =====
  {
    id: 'Hermes-3-Llama-3.1-8B-q4f16_1-MLC',
    name: 'Hermes 3 Llama 3.1 8B',
    sizeParams: '8B',
    quantization: 'q4f16_1',
    ramGB: 6,
    category: 'general',
    uncensored: false,
    description: 'Nous Research\'s Hermes 3 on Llama 3.1 8B',
    contextWindow: 131072,
    downloadSizeMB: 5000
  },
  {
    id: 'Hermes-3-Llama-3.1-70B-q4f16_1-MLC',
    name: 'Hermes 3 Llama 3.1 70B',
    sizeParams: '70B',
    quantization: 'q4f16_1',
    ramGB: 40,
    category: 'general',
    uncensored: false,
    description: 'Nous Research\'s Hermes 3 on Llama 3.1 70B',
    contextWindow: 131072,
    downloadSizeMB: 40000
  },
  {
    id: 'Hermes-2-Pro-Llama-3-8B-q4f16_1-MLC',
    name: 'Hermes 2 Pro Llama 3 8B',
    sizeParams: '8B',
    quantization: 'q4f16_1',
    ramGB: 6,
    category: 'general',
    uncensored: false,
    description: 'Nous Research\'s Hermes 2 Pro on Llama 3 8B',
    contextWindow: 8192,
    downloadSizeMB: 5000
  },
  {
    id: 'Hermes-2-Pro-Mistral-7B-q4f16_1-MLC',
    name: 'Hermes 2 Pro Mistral 7B',
    sizeParams: '7B',
    quantization: 'q4f16_1',
    ramGB: 5,
    category: 'general',
    uncensored: false,
    description: 'Nous Research\'s Hermes 2 Pro on Mistral 7B',
    contextWindow: 32768,
    downloadSizeMB: 4500
  },

  // ===== Command R Models =====
  {
    id: 'command-r-35b-v0.1-q4f16_1-MLC',
    name: 'Command R 35B',
    sizeParams: '35B',
    quantization: 'q4f16_1',
    ramGB: 22,
    category: 'general',
    uncensored: false,
    description: 'Cohere\'s Command R 35B with RAG optimization',
    contextWindow: 131072,
    downloadSizeMB: 21000
  },
  {
    id: 'command-r-plus-08-2024-q4f16_1-MLC',
    name: 'Command R+',
    sizeParams: '104B',
    quantization: 'q4f16_1',
    ramGB: 60,
    category: 'general',
    uncensored: false,
    description: 'Cohere\'s flagship Command R+ model',
    contextWindow: 131072,
    downloadSizeMB: 60000
  },

  // ===== Aya Models =====
  {
    id: 'Aya-23-8B-q4f16_1-MLC',
    name: 'Aya 23 8B',
    sizeParams: '8B',
    quantization: 'q4f16_1',
    ramGB: 6,
    category: 'general',
    uncensored: false,
    description: 'Cohere\'s multilingual Aya 23 8B',
    contextWindow: 8192,
    downloadSizeMB: 5000
  },
  {
    id: 'Aya-23-35B-q4f16_1-MLC',
    name: 'Aya 23 35B',
    sizeParams: '35B',
    quantization: 'q4f16_1',
    ramGB: 22,
    category: 'general',
    uncensored: false,
    description: 'Cohere\'s multilingual Aya 23 35B',
    contextWindow: 8192,
    downloadSizeMB: 21000
  },

  // ===== Nemotron 3 Ultra =====
  {
    id: 'Nemotron-3-Ultra-q4f16_1-MLC',
    name: 'Nemotron 3 Ultra',
    sizeParams: '53B',
    quantization: 'q4f16_1',
    ramGB: 32,
    category: 'general',
    uncensored: false,
    description: 'NVIDIA\'s large Nemotron 3 Ultra',
    contextWindow: 4096,
    downloadSizeMB: 30000
  },

  // ===== SmolLM Models =====
  {
    id: 'SmolLM-135M-Instruct-q4f16_1-MLC',
    name: 'SmolLM 135M Instruct',
    sizeParams: '135M',
    quantization: 'q4f16_1',
    ramGB: 0.5,
    category: 'general',
    uncensored: false,
    description: 'Tiny 135M model for very low RAM',
    contextWindow: 2048,
    downloadSizeMB: 150
  },
  {
    id: 'SmolLM-360M-Instruct-q4f16_1-MLC',
    name: 'SmolLM 360M Instruct',
    sizeParams: '360M',
    quantization: 'q4f16_1',
    ramGB: 1,
    category: 'general',
    uncensored: false,
    description: 'Small 360M SmolLM model',
    contextWindow: 2048,
    downloadSizeMB: 300
  },
  {
    id: 'SmolLM-1.7B-Instruct-q4f16_1-MLC',
    name: 'SmolLM 1.7B Instruct',
    sizeParams: '1.7B',
    quantization: 'q4f16_1',
    ramGB: 2,
    category: 'general',
    uncensored: false,
    description: 'Larger SmolLM 1.7B model',
    contextWindow: 2048,
    downloadSizeMB: 1000
  },

  // ===== TinyLlama Models =====
  {
    id: 'TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC',
    name: 'TinyLlama 1.1B Chat',
    sizeParams: '1.1B',
    quantization: 'q4f16_1',
    ramGB: 1.5,
    category: 'general',
    uncensored: false,
    description: 'TinyLlama 1.1B chat model',
    contextWindow: 2048,
    downloadSizeMB: 700
  },

  // ===== Other Notable Models =====
  {
    id: 'StableLM-2-1.6B-Chat-q4f16_1-MLC',
    name: 'StableLM 2 1.6B Chat',
    sizeParams: '1.6B',
    quantization: 'q4f16_1',
    ramGB: 2,
    category: 'general',
    uncensored: false,
    description: 'Stability AI\'s StableLM 2 1.6B',
    contextWindow: 4096,
    downloadSizeMB: 1000
  },
  {
    id: 'StableLM-2-12B-Chat-q4f16_1-MLC',
    name: 'StableLM 2 12B Chat',
    sizeParams: '12B',
    quantization: 'q4f16_1',
    ramGB: 8,
    category: 'general',
    uncensored: false,
    description: 'Stability AI\'s StableLM 2 12B',
    contextWindow: 4096,
    downloadSizeMB: 7000
  },
  {
    id: 'Mamba-7B-q4f16_1-MLC',
    name: 'Mamba 7B',
    sizeParams: '7B',
    quantization: 'q4f16_1',
    ramGB: 5,
    category: 'general',
    uncensored: false,
    description: 'Mamba architecture 7B model',
    contextWindow: 4096,
    downloadSizeMB: 4500
  },
  {
    id: 'RWKV-5-World-7B-q4f16_1-MLC',
    name: 'RWKV 5 World 7B',
    sizeParams: '7B',
    quantization: 'q4f16_1',
    ramGB: 5,
    category: 'general',
    uncensored: false,
    description: 'RWKV architecture 7B model',
    contextWindow: 4096,
    downloadSizeMB: 4500
  },
  {
    id: 'Falcon-7B-Instruct-q4f16_1-MLC',
    name: 'Falcon 7B Instruct',
    sizeParams: '7B',
    quantization: 'q4f16_1',
    ramGB: 5,
    category: 'general',
    uncensored: false,
    description: 'TII\'s Falcon 7B instruct',
    contextWindow: 4096,
    downloadSizeMB: 4500
  },
  {
    id: 'Falcon-40B-Instruct-q4f16_1-MLC',
    name: 'Falcon 40B Instruct',
    sizeParams: '40B',
    quantization: 'q4f16_1',
    ramGB: 24,
    category: 'general',
    uncensored: false,
    description: 'TII\'s Falcon 40B instruct',
    contextWindow: 4096,
    downloadSizeMB: 24000
  },
  {
    id: 'MPT-7B-Instruct-q4f16_1-MLC',
    name: 'MPT 7B Instruct',
    sizeParams: '7B',
    quantization: 'q4f16_1',
    ramGB: 5,
    category: 'general',
    uncensored: false,
    description: 'MosaicML\'s MPT 7B instruct',
    contextWindow: 8192,
    downloadSizeMB: 4500
  },
  {
    id: 'MPT-30B-Instruct-q4f16_1-MLC',
    name: 'MPT 30B Instruct',
    sizeParams: '30B',
    quantization: 'q4f16_1',
    ramGB: 18,
    category: 'general',
    uncensored: false,
    description: 'MosaicML\'s MPT 30B instruct',
    contextWindow: 8192,
    downloadSizeMB: 18000
  },
  {
    id: 'RedPajama-INCITE-7B-Instruct-q4f16_1-MLC',
    name: 'RedPajama INCITE 7B Instruct',
    sizeParams: '7B',
    quantization: 'q4f16_1',
    ramGB: 5,
    category: 'general',
    uncensored: false,
    description: 'Together\'s RedPajama 7B instruct',
    contextWindow: 4096,
    downloadSizeMB: 4500
  },
  {
    id: 'OpenLLaMA-7B-q4f16_1-MLC',
    name: 'OpenLLaMA 7B',
    sizeParams: '7B',
    quantization: 'q4f16_1',
    ramGB: 5,
    category: 'general',
    uncensored: false,
    description: 'OpenLLaMA 7B base model',
    contextWindow: 4096,
    downloadSizeMB: 4500
  },
  {
    id: 'OpenLLaMA-13B-q4f16_1-MLC',
    name: 'OpenLLaMA 13B',
    sizeParams: '13B',
    quantization: 'q4f16_1',
    ramGB: 9,
    category: 'general',
    uncensored: false,
    description: 'OpenLLaMA 13B base model',
    contextWindow: 4096,
    downloadSizeMB: 7500
  },
];

// ===== Filter Helpers =====

/** Get all models */
export function getAllModels(): ModelDefinition[] {
  return [...MODEL_REGISTRY];
}

/** Get models under specified RAM (GB) */
export function getModelsUnderRAM(maxRAM: number): ModelDefinition[] {
  return MODEL_REGISTRY.filter(m => m.ramGB <= maxRAM);
}

/** Get uncensored/abliterated models */
export function getUncensoredModels(): ModelDefinition[] {
  return MODEL_REGISTRY.filter(m => m.uncensored);
}

/** Get models by category */
export function getByCategory(category: ModelDefinition['category']): ModelDefinition[] {
  return MODEL_REGISTRY.filter(m => m.category === category);
}

/** Search models by query string */
export function searchModels(query: string): ModelDefinition[] {
  const q = query.toLowerCase().trim();
  if (!q) return MODEL_REGISTRY;
  return MODEL_REGISTRY.filter(m =>
    m.name.toLowerCase().includes(q) ||
    m.id.toLowerCase().includes(q) ||
    m.description.toLowerCase().includes(q) ||
    m.sizeParams.toLowerCase().includes(q)
  );
}

/** Get model by ID */
export function getModelById(id: string): ModelDefinition | undefined {
  return MODEL_REGISTRY.find(m => m.id === id);
}

/** Get models matching filters */
export function getFilteredModels(filters: ModelFilters): ModelDefinition[] {
  let models = MODEL_REGISTRY;

  if (filters.maxRAM !== undefined) {
    models = models.filter(m => m.ramGB <= filters.maxRAM!);
  }
  if (filters.category) {
    models = models.filter(m => m.category === filters.category);
  }
  if (filters.uncensoredOnly) {
    models = models.filter(m => m.uncensored);
  }
  if (filters.searchQuery) {
    models = searchModels(filters.searchQuery);
  }

  return models;
}

/** Sort models */
export function sortModels(models: ModelDefinition[], sortBy: 'name' | 'size' | 'ram' | 'category' = 'name'): ModelDefinition[] {
  const sorted = [...models];
  switch (sortBy) {
    case 'name':
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case 'size':
      return sorted.sort((a, b) => {
        const aSize = parseFloat(a.sizeParams.replace('B', '').replace('x', ''));
        const bSize = parseFloat(b.sizeParams.replace('B', '').replace('x', ''));
        return aSize - bSize;
      });
    case 'ram':
      return sorted.sort((a, b) => a.ramGB - b.ramGB);
    case 'category':
      return sorted.sort((a, b) => a.category.localeCompare(b.category));
    default:
      return sorted;
  }
}

/** Get recommended models for a given RAM budget */
export function getRecommendedModels(ramGB: number): ModelDefinition[] {
  const underRAM = getModelsUnderRAM(ramGB);
  // Prioritize: general > coding > reasoning > uncensored
  // Within each category, prefer q4f16_1 (good balance)
  return sortModels(underRAM, 'ram');
}

/** Get default model for RAM budget */
export function getDefaultModel(ramGB: number): ModelDefinition | undefined {
  const recommended = getRecommendedModels(ramGB);
  // Prefer general category, then coding, then reasoning
  const general = recommended.find(m => m.category === 'general');
  if (general) return general;
  const coding = recommended.find(m => m.category === 'coding');
  if (coding) return coding;
  const reasoning = recommended.find(m => m.category === 'reasoning');
  if (reasoning) return reasoning;
  return recommended[0];
}

/** Model Registry Class for OOP usage */
export class ModelRegistry {
  private models: ModelDefinition[] = MODEL_REGISTRY;

  getAll(): ModelDefinition[] {
    return this.getAllModels();
  }

  getAllModels(): ModelDefinition[] {
    return [...this.models];
  }

  getUnderRAM(maxRAM: number): ModelDefinition[] {
    return getModelsUnderRAM(maxRAM);
  }

  getUncensored(): ModelDefinition[] {
    return getUncensoredModels();
  }

  getByCategory(category: ModelDefinition['category']): ModelDefinition[] {
    return getByCategory(category);
  }

  search(query: string): ModelDefinition[] {
    return searchModels(query);
  }

  getById(id: string): ModelDefinition | undefined {
    return getModelById(id);
  }

  getFiltered(filters: ModelFilters): ModelDefinition[] {
    return getFilteredModels(filters);
  }

  sort(models: ModelDefinition[], sortBy: 'name' | 'size' | 'ram' | 'category' = 'name'): ModelDefinition[] {
    return sortModels(models, sortBy);
  }

  getRecommended(ramGB: number): ModelDefinition[] {
    return getRecommendedModels(ramGB);
  }

  getDefault(ramGB: number): ModelDefinition | undefined {
    return getDefaultModel(ramGB);
  }

  /** Get category counts */
  getCategoryCounts(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const model of this.models) {
      counts[model.category] = (counts[model.category] || 0) + 1;
    }
    return counts;
  }

  /** Get total model count */
  getTotalCount(): number {
    return this.models.length;
  }

  /** Get uncensored count */
  getUncensoredCount(): number {
    return this.models.filter(m => m.uncensored).length;
  }
}

// Export singleton instance
export const modelRegistry = new ModelRegistry();