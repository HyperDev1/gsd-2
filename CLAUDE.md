# CLAUDE.md

## Proje
- GSD (Get Shit Done) — AI coding agent CLI, Pi SDK üzerine inşa
- TypeScript ESM monorepo, Node.js >= 22, MIT lisanslı

## Mimari
- Entry: src/loader.ts → src/cli.ts
- Core extension: src/resources/extensions/gsd/
- Paketler: packages/{pi-tui, pi-ai, pi-agent-core, pi-coding-agent, native}
- State: .gsd/ dizini (disk-only, session'lar arası kalıcı)
- Config: ~/.gsd/preferences.md (global), .gsd/preferences.md (proje)
- Agent tanımları: src/resources/agents/
- Extension'lar: src/resources/extensions/ (19 extension)

## Build & Test
- npm run build          # full build
- npm run build:pi       # sadece paketler
- npm run build:native   # Rust native modüller
- npm run test:unit      # unit testler
- npm run test:integration # integration testler
- npm run test           # tümü
- npm run dev            # geliştirme modu
- npm run typecheck:extensions

## Kod Konvansiyonları
- ESM only, import'larda .js uzantısı
- TypeScript strict, ES2022, moduleResolution: NodeNext
- Node.js built-in test runner (node --test, --experimental-strip-types)
- Commit: fix(scope): desc, feat:, refactor:, docs:, chore:, test:
- Error handling: getErrorMessage() (error-utils.ts)
- Dosya yazma: atomic-write.ts
- Unit ID parse: parseUnitId() (unit-id.ts)

## Kritik Modüller
- auto-dispatch.ts — orkestrasyon motoru
- state.ts — .gsd/ disk state derivation
- session-lock.ts — kilit yönetimi
- auto-worktree.ts — worktree lifecycle
- model-router.ts — LLM model yönlendirme
- preferences.ts — ayar yönetimi

## Extension Geliştirme
- extension-manifest.json + index.ts yapısı
- pi.registerTool(), pi.registerCommand() API
- Detay: docs/extending-pi/ (25 bölüm)

## Patternler
- İki dosyalı loader: loader.ts env ayarlar (sıfır SDK import), cli.ts import yapar
- Her dispatch'te fresh agent session (context birikmez)
- Lazy LLM provider loading (ilk kullanımda yüklenir)
- pkg/ shim: PI_PACKAGE_DIR ile tema çakışması önlenir
