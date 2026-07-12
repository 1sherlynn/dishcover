# Dishcover Riso — design-sync notes

Repo-specific gotchas for future syncs. One bullet per issue.

## Source shape
- This is a **Next.js app**, not a packaged component library — no `dist/`, no
  `.d.ts` exports, no library build. The converter runs in **synth-entry mode**
  from `components/` (`srcDir: "components"`, no `buildCmd`/`--entry`).
- Reusable DS surface: `components/ui.tsx` (AppHeader, Chip, PrimaryButton,
  HeartButton), `components/NutritionPanel.tsx`, `MacroPresetPicker.tsx`,
  `MealSettingsPicker.tsx`, `PlaceholderArt.tsx`. Screens live in `app/`.

## Styling — Tailwind v4
- Components are styled with **Tailwind v4 utility classes** (`bg-accent`,
  `text-ink`, `rounded-control`, `font-display`, `shadow-[...]`) that map to
  `--th-*` tokens via `@theme inline` in `app/globals.css`. Raw `globals.css`
  is NOT shippable as `cssEntry` — previews need a **compiled** stylesheet with
  the utilities materialized. Generate it with the Tailwind v4 CLI scanning
  `components/` + `app/`, output to `.design-sync/riso.css` (the `cssEntry`).
- `@theme inline` means color utilities substitute `var(--th-*)` inline and no
  `--color-*` custom props are emitted; the `:root[data-theme="riso"]` block
  defines `--th-*`, so the compiled CSS is self-contained. Good.

## Fonts (RESOLVED)
- Shipped Bricolage Grotesque, Courier Prime (400/700), Caveat — latin subset,
  copied from the `next/font` cache in `.next/static/media/` (NO download).
  Files live in `.design-sync/fonts-src/`; `.design-sync/fonts.css` declares the
  `@font-face` under the plain family names; `cfg.extraFonts` folds them into the
  `styles.css` closure and copies the woff2 into `fonts/`. Map hash→family via
  `.next/static/css/app/layout.css`. Latin only (English UI) — add other subsets
  if needed.
- **CRITICAL CSS gotcha** (why fonts silently didn't apply at first): the font
  stacks are `var(--font-bricolage), "Bricolage Grotesque", …`. In the app,
  next/font defines `--font-bricolage` at runtime. In the standalone bundle it's
  **undefined**, and an undefined `var()` with no fallback **invalidates the
  entire `font-family` declaration** — it does NOT fall through to the next
  family in the list. So every heading/body/display element fell back to default
  sans. Fix: define `--font-bricolage/-courier/-caveat` in `:root` (pointing at
  the real family names) inside `.design-sync/riso.in.css`. Also had to add
  explicit `.font-display`/`.font-body` utility rules there (Tailwind v4 doesn't
  emit family utilities whose `@theme` value references a `var()`).
- **Regen order when fonts/tokens change**: edit `riso.in.css` → recompile
  `riso.css` (Tailwind CLI) → rebuild converter. The `:root` font vars and the
  explicit `.font-*` utilities live in `riso.in.css`, not the app source.

## Resolved build fixes (scaffold run, 2026-07-11)
- **App-as-package symlink**: `pkg: "dishcover"` isn't in node_modules, so the
  converter's `PKG_DIR = node_modules/dishcover` didn't exist. Fix:
  `ln -sfn "$PWD" node_modules/dishcover` (gitignored). Rerun on a fresh clone.
- **`next/link` crashes the bundle**: `ui.tsx` imports `next/link` at module
  top, so the synth entry inlined all of Next's link runtime, which references
  `process.env.__NEXT_*` → **"process is not defined"** in the browser, so
  `window.DishcoverDS` never got assigned and every preview showed
  "no PascalCase exports". Fix: alias `next/link` to a browser-safe `<a>` stub
  (`.design-sync/stubs/next-link.tsx`) via a sync-only tsconfig
  (`.design-sync/tsconfig.sync.json`, `cfg.tsconfig`). Verify after build:
  `grep -c "next/dist" ds-bundle/_ds_bundle.js` must be 0.
- **tsconfig.sync.json must be plain JSON — NO `"//"` comment keys**. The
  converter's comment-stripper regex mangles a `"//": "..."` key and silently
  drops `compilerOptions.paths` (plugin returns null, alias never fires).
- **CSS regen step** (run before every build if tokens/utility usage changes):
  `npx @tailwindcss/cli@4.1.0 -i .design-sync/riso.in.css -o .design-sync/riso.css`
- **Real `.d.ts` build (full pass)**: contracts now come from a bundled
  declaration file. `.design-sync/entry.ts` is a barrel re-exporting the 9 DS
  components; `npm run sync:dts` runs `dts-bundle-generator` (installed in
  `.ds-sync`, needs `typescript` there too) → `.design-sync/types/index.d.ts`.
  Wired via `package.json` `"types": ".design-sync/types/index.d.ts"` (the field
  `findTypesRoot` reads). Regenerate whenever a component's props change.
  - 6 components auto-extract cleanly (Chip, PrimaryButton, HeartButton,
    AllowOtherToggle, PlaceholderArt, AppHeader).
  - 3 reference zod-`z.infer` domain types that ts-morph can't resolve
    (→ `recipe: unknown`) or leave dangling type refs (`MealSettings`,
    `MacroTarget`). Pinned self-contained bodies via `cfg.dtsPropsFor` for
    NutritionPanel / MacroPresetPicker / MealSettingsPicker. Keep these in sync
    with `lib/schemas.ts` by hand (small surface).
- **`window.DishcoverDS` exposes ALL module exports** regardless of
  `componentSrcMap` nulls — the exclusions only drop cards/`.d.ts`/previews, not
  the runtime global. Harmless, but means the excluded components are already
  reachable at runtime.
- **No cached Playwright** — skipped the machine render check for the scaffold;
  verified visually via `.review.html` in the Browser pane instead. Full pass:
  install Playwright+chromium (ask first, ~200MB) for the proper render gate.

## Per-component caveats
- `AppHeader` imports `next/link` — now renders fine via the stub (confirmed on
  the global). Safe to include in the full pass; author its preview wrapping the
  header in a realistic container.
- `NutritionPanel` needs a full `Recipe` object (`@/lib/schemas`) as a prop —
  author its preview with a realistic Recipe fixture.
- `MacroPresetPicker` / `MealSettingsPicker` are interaction-driven (useState);
  author static states.
- `@/*` path alias → `./*` (repo root); `tsconfig: "tsconfig.json"` lets esbuild
  resolve it. Type-only `import type` lines are erased at bundle time.

## Re-sync risks
- **Fonts unresolved** (see above) — the single biggest fidelity gap; every
  design renders in a fallback font until fixed.
- **`riso.css` is generated, not committed by the converter** — it's produced by
  a Tailwind CLI step outside the converter. If the token set or utility usage
  changes, regenerate it before building or previews go stale/unstyled.
- Scaffold pass scoped to the `ui.tsx` primitives via `componentSrcMap` nulls —
  the full sync must remove those exclusions.

## Status: full local build COMPLETE (2026-07-12)
- 9 components, real `.d.ts` contracts (6 auto + 3 pinned), all previews authored
  and visually verified in `.review.html` (tokens + all 3 fonts rendering).
- `package-validate.mjs` exits 0 (only the non-blocking `[RENDER_SKIPPED]` warn —
  Playwright not installed; verified in the Browser pane instead).
- Conventions header authored (`.design-sync/conventions.md`, `readmeHeader`) and
  baked into `ds-bundle/README.md`. Full semantic palette safelisted.

## Regenerate-before-build (fresh clone / after source changes)
1. `ln -sfn "$PWD" node_modules/dishcover` (app-as-package symlink)
2. `npm run sync:dts` → `.design-sync/types/index.d.ts` (gitignored)
3. `npx @tailwindcss/cli@4.1.0 -i .design-sync/riso.in.css -o .design-sync/riso.css` (gitignored)
4. `node .ds-sync/package-build.mjs --config .design-sync/config.json --node-modules ./node_modules --out ./ds-bundle`

## Status: uploaded (2026-07-12)
- Auth unblocked via `/design consent` (design-agent access granted for Claude
  Design projects). `list_projects` came back empty, so this was a fresh
  first-time sync per the skill's routing rules.
- Created project **"Dishcover — Riso"** (`projectId` now pinned in
  `.design-sync/config.json`). Pushed all 9 components in a single batch (the
  build was already fully verified locally, so no incremental staging was
  needed) — 62 files, ~1.5 MB (fonts + `_vendor/react.js` are the bulk).
  `list_files` reconciliation found no orphans (fresh project). `_ds_sync.json`
  written last, after the sentinel re-arm, per the close-out sequence.
- Optional follow-up: formal per-cell grade JSONs + Playwright render check
  (visually confirmed already via `.review.html`; not required for upload).

## Blockers (RESOLVED 2026-07-12)
- **Auth**: `create_project` / all DesignSync writes needed design-system
  authorization unavailable in the 2026-07-11 headless session. Resolved via
  `/design consent` in the terminal session that ran the full sync.
