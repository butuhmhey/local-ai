# Session Brief — Local AI Chat

**Last Updated:** 2026-09-06  
**Current Phase:** Phase 2 — Core Engines & Services (IN PROGRESS)  
**GitHub:** butuhmhey/local-ai  
**User:** Kasper Kal (kasper.kal@proton.me)

---

## Project State

### What's Done (Phase 1 ✅)
- Vite + TypeScript + PWA configured
- All dependencies installed (`@mlc-ai/web-llm`, `idb`, `tiktoken`)
- **Complete type system** in `src/types/index.ts` — chats, messages, models, memory layers, facts, import/export, settings
- **Complete styling system**:
  - `variables.css` — CSS custom properties for light/dark/auto themes
  - `global.css` — reset, base, utilities, animations, skeletons
  - `components.css` — buttons, inputs, cards, badges, dropdowns, modals, toasts, tabs, progress, avatars, code blocks, sidebar, page layout
- Routing types defined (`Route`, `RouteChangeEvent`)

### In Progress (Phase 2)
- **Next:** Model Registry → StorageEngine → WebLLMEngine → MemoryEngine → ImportEngine → CacheEngine → ThemeEngine → Utils

### File Structure Status
```
/workspaces/local-ai/
├── index.html                    ✅
├── vite.config.ts                ✅
├── package.json                  ✅
├── tsconfig.json                 ✅
├── public/
│   └── manifest.json             ❌ (needed)
├── src/
│   ├── main.ts                   ❌ (needed - bootstrap + router)
│   ├── styles/
│   │   ├── variables.css         ✅
│   │   ├── global.css            ✅
│   │   └── components.css        ✅
│   ├── models/
│   │   └── modelRegistry.ts      ❌
│   ├── services/
│   │   ├── webllmEngine.ts       ❌
│   │   ├── memoryEngine.ts       ❌
│   │   ├── importEngine.ts       ❌
│   │   ├── storageEngine.ts      ❌
│   │   ├── cacheEngine.ts        ❌
│   │   └── themeEngine.ts        ❌
│   ├── pages/                    ❌ (all 5 pages)
│   ├── components/               ❌ (all 5 components)
│   ├── utils/                    ❌ (3 utils)
│   └── types/
│       └── index.ts              ✅
```

---

## Change Record (newest first)

| Time | Change | Files |
|------|--------|-------|
| 2026-09-06 | Created PHASES.md with 3-phase roadmap | PHASES.md |
| 2026-09-06 | Read existing codebase (types, styles, config) | — |
| 2026-09-06 | Initial workspace exploration | — |

---

## Active Threads

1. **Model Registry** — Need to embed 100+ model definitions from ChatGPT data
2. **StorageEngine** — IndexedDB schema with idb library
3. **WebLLMEngine** — WebLLM wrapper with streaming, model switching
4. **MemoryEngine** — Auto-compacting hierarchical memory (core feature)
5. **ImportEngine** — Multi-format parser + LLM fallback
6. **main.ts** — App bootstrap, router, service registration

---

## Next Actions (Priority Order)

1. ✅ **Create PHASES.md** — Done
2. ⏳ **Create session-brief.md** — Doing now
3. ⏳ **Create KNOWLEDGE.md** — Durable facts & rules
4. 🔲 **Create `public/manifest.json`** — PWA manifest
5. 🔲 **Create `src/main.ts`** — App bootstrap + router
6. 🔲 **Create `src/models/modelRegistry.ts`** — 100+ model definitions
7. 🔲 **Create `src/services/storageEngine.ts`** — IndexedDB wrapper
8. 🔲 **Create `src/services/webllmEngine.ts`** — WebLLM wrapper
9. 🔲 **Create `src/services/memoryEngine.ts`** — Auto-compact engine
10. 🔲 **Create `src/services/importEngine.ts`** — Import engine
11. 🔲 **Create `src/services/cacheEngine.ts`** — SW registration
12. 🔲 **Create `src/services/themeEngine.ts`** — Theme management
13. 🔲 **Create utils** — formatDetector, tokenizer, helpers
14. 🔲 **Create all 5 pages + 5 components** — Phase 3
15. 🔲 **Build & deploy** — Render free tier

---

## Escalation Triggers
- If WebGPU unavailable in test environment → document limitation, proceed
- If model download fails → check CDN, fallback to smaller model
- If IndexedDB quota exceeded → implement cleanup strategy
- If Phase 2 takes >3 sessions → consider splitting further