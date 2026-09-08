# KNOWLEDGE.md — Durable Facts & Permanent Rules

## Project: Local AI Chat (WebLLM-based)

---

## How Things Work (Technical Facts)

### Architecture
- **Single Page App**: Vite + Vanilla TypeScript (no framework) + CSS Modules via custom properties
- **Routing**: Hash-based (`#chat`, `#models`, `#import`, `#memory`, `#settings`) — no server needed
- **State**: Services are singletons instantiated in `main.ts`, passed to pages via constructor
- **Persistence**: IndexedDB via `idb` library — auto-created in browser, no setup

### Model Loading (WebLLM)
- Package: `@mlc-ai/web-llm` v0.2.35+
- Models download from WebLLM CDN (jsDelivr) on first use
- WebGPU required — no WASM fallback (too slow for LLMs)
- Streaming via `MLCEngine.chat.completions.create({ stream: true })`
- Context window varies by model (4k, 32k, 128k) — stored in model registry
- Model switching: re-encode conversation with new model's tokenizer

### Memory System (Auto-Compact)
- **3 Levels**: L0=raw recent (configurable, default 10), L1=summaries (~500 tokens each), L2=meta-summaries
- **Trigger**: 75% of model's context window (configurable in settings)
- **Fact Extraction**: LLM extracts {entity, relation, value, confidence} tuples
- **Context Build**: [System Prompt] + [Facts] + [L2 Meta] + [L1 Summaries] + [L0 Raw Recent]
- **Never Discards**: All layers + facts persisted to IndexedDB per chat

### Import System
- **Formats**: ChatGPT (`conversations.json`), ShareGPT, OpenAI JSONL, Generic JSON, CSV, Markdown, Raw Text
- **Detection**: Heuristic (filename + structure) → LLM fallback for unknown
- **LLM Conversion**: Unknown formats sent to loaded model with conversion prompt
- **Batch**: 1-3 files per import operation

### Offline / PWA
- **App Shell**: Cached by Service Worker (vite-plugin-pwa, autoUpdate)
- **Models**: Cached via Cache API on first download (max-age 30-60 days)
- **Background Sync**: Export queue for when online
- **Installable**: manifest.json + SW → "Add to Home Screen"

### Theming
- **CSS Variables**: All colors, spacing, typography in `variables.css`
- **Modes**: Light (default), Dark, Auto (prefers-color-scheme)
- **Persistence**: localStorage `theme` key + applied to `document.documentElement[data-theme]`

---

## Permanent Rules (Must Follow)

### Development
1. **Zero Budget**: Every service, API, library must be permanently free. No free trials.
2. **Git Discipline**: Commit + push after EVERY response. Message format: `<what I just did>`
3. **File Organization**: Follow the declared structure in PHASES.md exactly
4. **Type Safety**: Strict TypeScript — no `any` unless absolutely necessary
5. **CSS**: Use CSS custom properties from `variables.css` — no hardcoded values

### Premium Design Doctrine (Senior PM Standard — applies to ALL UI work)
This is the design voice. Every screen must read as shipped by a mature product team, never vibe-coded.
1. **Spacing rhythm**: Strict 4/8-point scale for all margins, padding, gaps. Never invent random values (6/10/14/26/44px are off-scale). All spacing via `--spacing-*` tokens.
2. **Typography system**: One heading font, one body font, a fixed type ramp (see `--font-size-*`). Apply without improvisation. Body never over/under-weighted. Consistent text-block spacing.
3. **Disciplined palette**: Small warm palette (Ember amber / stone / cream) + semantic accents only. No neon, no purple, NO sparkles (user rule). Every accent reinforces hierarchy.
4. **One design language**: Every button/card/input/modal/nav shares radius, shadow, padding, alignment. No mixing radiuses/shadows.
5. **Subtle, intentional interaction**: Hover never distorts layout. Timing feels natural. No decoration-only motion. Every interactive element must actually work.
6. **Grid discipline**: Content aligns cleanly; nothing drifts or wobbles; balanced sections; no random stacking; no over-centered content.
7. **Loading states everywhere**: Every delay has a loading state — buttons shift to spinners, data-heavy areas use skeletons. Content never pops in abruptly.
8. **Grounded copy**: Specific, real, no generic hero lines, no filler, no fake testimonials, correct footer. 
9. **Technical fundamentals complete**: page title, meta description, OG tags, favicon, social links, accessible, mobile == desktop.
10. **Actively remove vibe-code signals**: emoji as decoration, sparkles, purple gradients, fake testimonials, unintentional shadows, inconsistent spacing, mismatched radiuses, generic hero lines, broken responsiveness, missing loading states, chaotic animation. Catch and revise before presenting.
11. **Icons**: Prefer inline SVG or clean typographic glyphs (`▸` `×` `⌄`) over emoji. If an emoji has zero semantic value as an icon, remove it.

### Code Patterns
- **Services**: Classes with clear public APIs, instantiated once in `main.ts`
- **Pages**: Classes that receive services via constructor, render into route outlet
- **Components**: Reusable UI pieces (MessageBubble, ModelSelector, etc.)
- **Utils**: Pure functions, no side effects
- **Events**: CustomEvent for route changes, toast notifications

### WebLLM Specific
- Always check `navigator.gpu` before initializing
- Show clear notice if WebGPU unavailable (no silent failure)
- Handle model loading progress callbacks for UX
- Cache model metadata (downloadedAt, sizeBytes, lastUsed) in IndexedDB

### Memory Specific
- Compact threshold configurable (default 75%) — respect user setting
- Fact confidence threshold: only store facts with confidence ≥ 0.7
- Summarization prompt: "Summarize the following conversation preserving key details, decisions, and entities"
- Fact extraction prompt: "Extract structured facts as {entity, relation, value, confidence} from this text"

### Import Specific
- Max 3 files per import — enforce in UI
- Preview first 5 messages per file before confirming import
- Preserve original timestamps where possible
- Generate new UUIDs for imported messages/chats

### Storage Specific
- Use `idb` library — wrap in try/catch, handle quota errors
- Schema version: start at 1, plan for migrations
- Indexes: chatId on messages, chatId+level on memories, chatId+entity on facts

---

## Key Decisions (Reference)

| Topic | Decision | Rationale |
|-------|----------|-----------|
| Framework | Vanilla TS | Zero deps, smaller bundle, full control |
| Routing | Hash-based | Works on static hosting (Render), no server config |
| Database | IndexedDB (idb) | Browser-native, async, supports indexes |
| Models | 100+ from WebLLM | Pre-quantized, optimized for WebGPU |
| Uncensored | 3 models | Dolphin-Mistral-7B, Dolphin-Phi-2, Llama-3-8B-Abliterated |
| Compact Trigger | 75% context | Balance between context retention and performance |
| Import Files | 1-3 files | UX balance — batch but not overwhelming |
| Theme | Light/Dark/Auto | Standard trio, respects system preference |
| Hosting | Render Free Tier | Static site, HTTPS, custom domains, zero cost |

---

## Escalation Triggers
- WebGPU not available in CI/test → document, proceed with manual testing
- Model download fails repeatedly → check jsDelivr status, try smaller model
- IndexedDB quota exceeded → implement LRU cleanup for old models/chats
- Phase 2 exceeds 3 sessions → split into Phase 2a/2b

---

## Useful Commands
```bash
npm run dev        # Start dev server (port 5173)
npm run build      # Type-check + build to dist/
npm run preview    # Preview production build
npm run lint       # ESLint on src/
```

---

## External References
- WebLLM Docs: https://github.com/mlc-ai/web-llm
- WebGPU Guide: https://webgpufundamentals.org/
- IndexedDB (idb): https://github.com/jakearchibald/idb
- PWA Checklist: https://web.dev/pwa-checklist/
- Render Static Sites: https://render.com/docs/static-sites