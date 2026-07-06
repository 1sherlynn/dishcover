# Dishcover — Build Plan

Ordered task backlog for the 30-day challenge. No fixed calendar — phases are strictly ordered (each produces something usable), tasks within a phase mostly are. Cut line: shipping through Phase 6 is a successful challenge; 7–8 are polish; 9 is stretch.

## Phase 0 — Documentation ✅
Specs, design system, data model, generation contract, glossary, ADRs 0001–0003. (This document set.)

## Phase 1 — Walking skeleton (deployed core loop)
- [x] Scaffold Next.js + TypeScript + Tailwind; token architecture with Hearth theme only
- [ ] Deploy to Vercel from day one (needs Sherlynn's Vercel account — `npx vercel` in the repo)
- [x] `/api/generate` proxy via Vercel AI SDK + zod structured output (GENERATION-CONTRACT.md), rate limit + spend cap; mock mode when no API key is set
- [x] New Recipe screen, minimal: type-to-add ingredient chips + Create CTA (defaults for everything else)
- [x] Generating screen with themed loading states + error states
- [x] Recipe Detail: Ingredients/Steps/Nutrition tabs, macro share bars, EstimatedBadge, placeholder art v1 (target-vs-actual bars arrive with Phase 2 targets)
- [x] Persist recipes to localStorage (DATA-MODEL.md stores, zod-validated, versioned)
- [x] *(pulled forward from Phase 4)* Servings stepper with live quantity rescaling

**Exit test**: on a phone, type 3 ingredients → generate → read a plausible recipe with full Nutrition Breakdown, on the public URL.

## Phase 2 — Macro Targets (the differentiator)
- [x] MacroPresetPicker: Balanced / High Protein / Low Carb / Keto-ish / Custom / None → editable gram fields *(issue #1, agent wave 1)*
- [x] Wire `macroTarget` through request + Nutrition tab comparison bars *(issue #1)*
- [ ] Prompt tuning pass: verify macro adherence + kcal self-consistency across ~20 varied test generations *(issue #7)*

## Phase 3 — Standing preferences
- [x] Home screen: pantry card *(issue #2)*; FAB still pending *(with Scan, issue #6)*
- [x] Pantry screen (suggestion chips + add/remove) *(issue #2, agent wave 1)*
- [ ] Settings: Dietary Preferences, Avoid List, Equipment
- [ ] Meal Settings row on New Recipe: guests / time / cuisine chips
- [ ] Allow Other Ingredients toggle + "to buy" marking end-to-end

## Phase 4 — Library & recipe management
- [x] *(pulled forward)* My Recipes grid: favorites (heart), delete, empty state
- [x] *(pulled forward to Phase 1)* Servings stepper with live quantity rescaling
- [ ] Draft persistence for the New Recipe form

## Phase 5 — Cooking Mode
- [x] Full-screen step player (always-Midnight palette): progress segments, next/back, close *(issue #5, agent wave 1)*
- [x] Countdown timers on steps with `timerSeconds`; wake-lock where supported *(issue #5)*

## Phase 6 — Scan my fridge
- [ ] `/api/scan` vision endpoint per contract
- [ ] Client capture: camera/file input, client-side compression, review-chips screen
- [ ] FAB action wiring (Scan + Type)

## Phase 7 — Themes
- [ ] Midnight, Market, Playful token sets + per-theme placeholder-art styles
- [ ] ThemePicker in Settings with live swatches; persistence; AA contrast audit per theme

## Phase 8 — Polish & PWA
- [ ] PWA manifest + icons + installability pass
- [ ] Desktop layout refinements (centered column, 3-up grid, header button replaces FAB)
- [ ] Lighthouse pass (perf ≥90 / a11y ≥95 on Home + Recipe Detail); reduced-motion audit
- [ ] Friends test round; fix what confuses them

## Phase 9 — Stretch (any order)
- [ ] USDA FoodData Central nutrition pipeline replacing LLM estimates (schema is ready — ADR-0001)
- [ ] Dictate capture (server-side transcription)
- [ ] AI recipe images
- [ ] Onboarding checklist (Crumb's "Ready to cook?" card)
- [ ] Capacitor iOS wrapper
