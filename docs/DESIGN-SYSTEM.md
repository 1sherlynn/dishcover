# Dishcover — Design System: Riso

Dishcover's art direction is **Riso** — a risograph food-zine: spot inks slightly misregistered on warm paper, mono type, rubber stamps, sticker tags, halftone dots, and a page folio on every screen. Source of truth: `reference/claude-design-v1-riso.html` (Claude Design, "Dishcover Riso — Phase 1"). Decision record: ADR-0004.

Rollout: **Phase 1 = tokens + Recipe Detail + dish art** (shipped); **Phase 2 = Home, Pantry, Build a Recipe as zine pages** (shipped after sign-off). Cooking Mode stays Midnight. A dedicated Cookbook screen (filter tabs All/Favorites/Quick) exists in the reference and is tracked as its own issue.

## Screens (Phase 2)

- **Home** — greeting micro-label, `WHAT'S COOKING?` display, plum `+ ADD NEW RECIPE` slab, `IN YOUR PANTRY` dotted-rule section with dashed shelf chips and a `manage →` link, `MADE FOR YOU` with the latest recipe as a featured wide card (`LATEST` sticker) above the grid, folio `PG. 01`.
- **Pantry** — `THE PANTRY` display title, mono intro, boxed input with plum `+`, `ON THE SHELF` dotted rule with item count, solid-border chips with ink `×` boxes, `QUICK ADD` dashed chips with plum `+`, folio `PG. 02`.
- **Build a Recipe** — `INGREDIENTS` label with the Type/Dictate/Scan segmented row (unbuilt modes render dimmed), boxed input, dashed suggestion chips, `MACRO TARGET` panel on teal wash (pop label tab, preset chips, boxed gram fields, Caveat aside), folio `PG. 04`, plum `COOK THIS UP ✦` slab. Meal Settings (guests/time/cuisine) and the allow-other toggle join this screen via issue #4 using the reference's boxed-stepper and dashed-chip patterns.

## The Ink Kit (tokens)

Foundations: **Ink** `#2E2620` · **Paper** `#FAF3E3` · **Pop** `#4E74B8` (blueberry).

Spot inks (each has a 50→900 scale in the reference; the app uses these working values):

| Ink | Value | Used for |
|---|---|---|
| Teal | `#1E958A` | quantities, macros-protein, serve steppers, hand annotations |
| Mustard | `#E3A21E` | art frames, macros-carbs, warn band, timers |
| Moss | `#6F9A4E` | macros-fat, positive band |
| Blueberry | `#4E74B8` | pop accents, links |
| Plum | `#B85F87` | CTAs, stickers, favorites, selected chips |

Semantic token mapping (CSS variables on `:root[data-theme="riso"]`; the contract from the original system is preserved so all components keep working):

`--th-bg` paper · `--th-surface` lighter paper `#FDF8EC` · `--th-surface-alt` deep paper `#F1E6CC` · `--th-ink` ink · `--th-ink-soft` `#6A5F4F` · `--th-accent` plum (ink-on-accent: paper) · `--th-highlight` teal · `--th-positive` moss · `--th-warn` mustard · `--th-danger` `#BE4B33` · `--th-radius-card` 4px · `--th-radius-control` 2px · `--th-shadow-card` hard offset `6px 6px 0 rgba(46,38,32,0.14)`.

Riso-specific additions to the contract: `--th-wash` (teal panel wash `#DDEFE8`), `--th-frame` (mustard), `--th-pop` (blueberry), `--font-hand` (Caveat).

**Midnight** tokens survive unchanged for Cooking Mode (`.force-midnight`). Hearth/Market/Playful are retired (ADR-0004).

## Type

Trio, scale ×1.25 (from the Ink Kit sheet):

- **Bricolage Grotesque** — display/headers, heavy, often uppercase. DISPLAY 40 / H1 33 / H2 26.
- **Courier Prime** — body & UI text, mono. BODY 16 / MICRO 11 (uppercase, letterspaced for labels).
- **Caveat** — hand-written annotations only ("don't crowd the pan!"), teal ink, sparing.

## Morphology

- **Borders carry the design**: 2px solid ink on interactive elements; dashed ink borders for add/suggestion chips and stamps; dotted leaders between label and value.
- **Shadows are print offsets**, never blurs: pages `6px 6px 0` translucent ink; primary buttons solid ink offset.
- **Corners near-square** (2–4px).
- **Zine chrome**: every screen is a zine page — header `DISHCOVER ZINE · No.NN` (mono micro), footer folio `✳ DISHCOVER … PG. NN`.
- **Stamps & stickers**: rubber-stamp boxes (dashed border, mono uppercase, slight rotation, e.g. `SERVES 2 ✓`); sticker tags (plum block, paper text, rotated ~-3°, e.g. `FRESH`).
- **Halftone / grain / overprint**: paper grain overlay app-wide; halftone dot patterns inside dish art; spot fills sit 2–3px misregistered from their ink outlines.

## Dish art

Seeded riso illustrations (no photos, no AI images — consistent with the placeholder-art decision). Four archetypes: bowl-with-chopsticks, plated-fillet, sesame bowl, steak-and-fries. Ink outlines with hand wobble, spot-color fills misregistered, halftone dots, steam squiggles. Deterministic from `artSeed`; framed in a mustard dotted double frame on Recipe Detail.

## Recipe Detail (Phase 1 reference)

Single scrolling zine page (no tabs): framed dish art with sticker tag + `SERVES n ✓` stamp → uppercase Bricolage title → ticket-stub meta row (TIME / KCAL / LEVEL as dashed stubs on a pale-gold strip) → **MACROS · PER SERVING** panel on teal wash (kcal donut in spot inks; per-macro rows with square swatches and `42g / 40g` target values; Caveat verdict line when a Macro Target was set) → serves stepper (−/+ ink boxes, + teal) → ingredients with dotted leaders (mono name left, teal Bricolage quantity right, `TO BUY` stamp when applicable) → steps as ink-bordered cards → micronutrient dotted list with an `~ ESTIMATED` stamp.

## Motion & responsiveness

Rise/stagger entrances and reduced-motion rules unchanged. Layout rules unchanged (mobile-first 390px, centered 640px column, grid widening at ≥768/1024px). Lighthouse and contrast targets unchanged — ink on paper clears AA everywhere; check plum-on-paper for small text (use ink for body, plum for display-size only).
