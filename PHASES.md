# PHASES.md — Master Roadmap

## Project: Local AI Chat (WebLLM-based)

---

## Phase 1 — Setup & Foundation ✅ COMPLETE
**Status:** Done  
**Goal:** Project scaffolding, types, styling, routing skeleton

### Completed:
- [x] Vite + TypeScript + PWA (vite-plugin-pwa) configured
- [x] Package.json with all dependencies (`@mlc-ai/web-llm`, `idb`, `tiktoken`)
- [x] tsconfig.json with strict mode, path aliases
- [x] vite.config.ts with PWA, code splitting, COEP/COOP headers
- [x] index.html entry point with manifest, theme-color
- [x] **Type definitions** (`src/types/index.ts`) — all interfaces for chats, messages, models, memory, facts, settings, import/export
- [x] **CSS Variables** (`src/styles/variables.css`) — light/dark/auto themes, spacing, typography, colors, shadows, z-index, sidebar dimensions
- [x] **Global CSS** (`src/styles/global.css`) — reset, base styles, utilities, animations, scrollbar, focus-visible, skeleton loaders
- [x] **Components CSS** (`src/styles/components.css`) — buttons, inputs, cards, badges, dropdowns, modals, toasts, tabs, progress, avatars, code blocks, sidebar, page layout
- [x] Routing types (`Route`, `RouteChangeEvent`) defined
- [x] `src/main.ts` — App bootstrap, router, service registration
- [x] `public/manifest.json` — PWA manifest (name, icons, shortcuts, theme)
- [x] Route outlet + navigation shell (sidebar + header)

---

## Phase 2 — Core Engines & Services ✅ COMPLETE
**Status:** Done  
**Goal:** All business logic services working independently

### Completed:
- [x] **Model Registry** (`src/models/modelRegistry.ts`)
  - 100+ model definitions from WebLLM supported models
  - Computed fields: `contextWindow`, `downloadSizeMB`
  - Filters: `getModelsUnderRAM(gb)`, `getUncensoredModels()`, `getByCategory(cat)`, `searchModels()`

- [x] **StorageEngine** (`src/services/storageEngine.ts`)
  - IndexedDB via `idb` library
  - Tables: chats, messages, memories, facts, models, settings
  - CRUD + query helpers for each entity
  - Export/import chat data

- [x] **WebLLMEngine** (`src/services/webllmEngine.ts`)
  - `loadModel(modelId, onProgress)` → MLCEngine
  - `streamChat(messages, options)` → AsyncGenerator<string>
  - `getContextUsage()` → { used, total, percentage }
  - `switchModel(newModelId, currentMessages)` — re-encode with new tokenizer
  - WebGPU detection + fallback notice
  - Summary generation and fact extraction

- [x] **MemoryEngine** (`src/services/memoryEngine.ts`) — **Core Feature**
  - Hierarchical memory: Level 0 (raw recent), Level 1 (summaries), Level 2 (meta-summaries)
  - `maybeCompact(messages, chatId)` — triggers at 75% context
  - Recursive summarization via LLM
  - Fact extraction: {entity, relation, value, confidence}
  - `buildContextWindow(chatId, maxTokens)` — [System] + [Facts] + [Meta] + [Summaries] + [Recent Raw]
  - Never discards — all layers persisted to IndexedDB

- [x] **ImportEngine** (`src/services/importEngine.ts`)
  - `detectFormat(content, filename)` → ChatFormat
  - Parsers: ChatGPT, ShareGPT, Generic JSON, JSONL, CSV, Markdown, Text
  - `convertWithLLM(rawContent, engine)` — LLM fallback for unknown formats
  - `import(files: File[])` → ChatSession[]
  - Export to JSON/MD/CSV/TXT

- [x] **CacheEngine** (`src/services/cacheEngine.ts`)
  - Service Worker registration
  - Model weight caching strategy (Cache API, max-age)
  - Offline-ready app shell
  - Persistent storage request

- [x] **ThemeEngine** (`src/services/themeEngine.ts`)
  - Light / Dark / Auto (system preference)
  - Persists to localStorage + applies to document.documentElement
  - UI components: toggle button, dropdown selector

- [x] **Utils**
  - `formatDetector.ts` — format detection logic with confidence scores
  - `tokenizer.ts` — tiktoken WASM for token estimation (cl100k_base)
  - `helpers.ts` — date formatting, ID generation, debounce, throttle, etc.

---

## Phase 3 — Pages, Components & Polish ✅ COMPLETE
**Status:** Done  
**Goal:** Complete UI, integration, PWA polish, deployment

### Pages:
- [x] **ChatPage** (`src/pages/ChatPage.ts`)
  - Streaming message bubbles, model selector, compact indicator (75% warning), manual compact button, token counter, copy/regenerate
  - Components: `MessageBubble.ts`, `ModelSelector.ts`, `CompactIndicator.ts`

- [x] **ModelLibraryPage** (`src/pages/ModelLibraryPage.ts`)
  - Search, filter (RAM ≤4GB/≤8GB, category, uncensored), sort
  - One-click download with progress, delete cached models
  - Components: `ModelSelector.ts` (reuse), model cards

- [x] **ImportExportPage** (`src/pages/ImportExportPage.ts`)
  - Drag-drop 1-3 files, format preview, LLM conversion progress
  - Merge/replace options, export JSON/MD/CSV/TXT
  - Components: `ImportDropzone.ts`

- [x] **MemoryPage** (`src/pages/MemoryPage.ts`)
  - Hierarchical view: Raw → Summaries → Meta → Facts
  - Search facts, edit/delete facts, export memory
  - Components: `MemoryCard.ts`

- [x] **SettingsPage** (`src/pages/SettingsPage.ts`)
  - Theme (light/dark/auto), auto-compact threshold (default 75%)
  - Recent message count, default model, auto-download models, clear cache

### Polish & Deploy:
- [x] Animations, error states, loading skeletons
- [x] Accessibility (ARIA, keyboard nav, focus management)
- [x] `public/sw.js` — Service Worker (generated by vite-plugin-pwa, verify)
- [x] Build verification: `npm run build` → `dist/`
- [x] Deploy to Render Free Tier (Static Site)

---

## Autonomous Execution Rules
- Loop through phases until complete or escalation trigger hit
- Every response → git commit + push
- On phase complete → update PHASES.md status, commit, push, proceed to next phase
- **CRITICAL: ALWAYS PUSH AND COMMIT AFTER EVERY SINGLE RESPONSE**

---

## Verification Checklist (All Phases)

| Feature | Test |
|---------|------|
| **Model loading** | Load Llama-3.2-3B (4GB), verify streaming works |
| **Model switching** | Start chat with Llama-3.2-3B, switch to Phi-3.5-mini mid-chat, context preserved |
| **Auto-compact** | Chat until 75% context, verify compact triggers, facts extracted, no detail lost |
| **Memory persistence** | Refresh page, verify chat + memories restored |
| **Import** | Drop ChatGPT export + custom JSON + CSV, verify all convert to valid chat |
| **Offline** | Load model, go offline, send message, verify works |
| **PWA** | Install on desktop/mobile, verify icon + splash |
| **Theme** | Toggle light/dark/auto, verify persistence |
| **Uncensored models** | Load Dolphin-2.2.1-Mistral-7B, test unrestricted response |

---

## Key Decisions (Reference)

| Question | Decision |
|----------|----------|
| Model list | Use provided 100+ model JSON from ChatGPT |
| Uncensored models | 3: Dolphin-Mistral-7B, Dolphin-Phi-2, Llama-3-8B-Abliterated |
| Auto-compact | Recursive summarization (3 levels) + structured fact extraction |
| Trigger | 75% context window |
| Import formats | ChatGPT, ShareGPT, JSON, CSV, MD, TXT + LLM fallback |
| Files per import | 1-3 files |
| Pages | 5: Chat, Model Library, Import/Export, Memory, Settings |
| Theme | Light / Dark / Auto (system) |
| Streaming | Yes (WebLLM native) |
| Model switch mid-chat | Yes, preserves context via re-encoding |
| WebGPU fallback | Notice only (no WASM - too slow) |
| Offline | Service Worker + Cache API + IndexedDB |
| Database | IndexedDB via `idb` library |
| Hosting | Render static site (free tier) |