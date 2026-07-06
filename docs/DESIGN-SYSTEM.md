# Dishcover — Design System

A custom token-based system (no off-the-shelf kit). Every Theme is a complete token set; components consume only semantic tokens, never raw values. Unstyled accessible primitives (Radix) may be used underneath where useful (dialog, popover, switch, tabs).

## Token architecture

CSS custom properties, scoped by `data-theme` on `<html>`:

```css
:root[data-theme="hearth"] { --color-bg: #FAF3E8; /* … */ }
```

Semantic tokens (the full contract — every theme must define all of these):

| Token | Role |
|---|---|
| `--color-bg` | App background |
| `--color-surface` | Cards, sheets |
| `--color-surface-alt` | Nested/tinted panels (e.g. step cards) |
| `--color-ink` | Primary text |
| `--color-ink-soft` | Secondary text |
| `--color-accent` | Primary actions, FAB |
| `--color-accent-ink` | Text/icon on accent |
| `--color-highlight` | Hearts, active chips, progress fill |
| `--color-positive / --color-warn / --color-danger` | Macro on-target / near / far; errors |
| `--radius-card / --radius-control` | Card and button/chip rounding |
| `--shadow-card` | Elevation style |
| `--font-display / --font-body` | Type pairing |
| `--motion-speed` | Base transition duration multiplier |

Tailwind maps utilities to these variables (e.g. `bg-surface`, `text-ink`, `rounded-card`); no hex values in component code. Nutrition bar colors derive from `--color-positive/warn/danger` by distance-to-target bands (within 10% / within 25% / beyond).

## The four Themes

### Hearth — default (Crumb-familiar)
Warm, organic, gentle. bg `#FAF3E8` cream · surface `#FFFFFF` · surface-alt `#F5E9D9` · ink `#2E4633` deep olive · ink-soft `#B98A6F` dusty clay · accent `#F5A83C` amber (ink `#3A2E15`) · highlight `#E8542F` tomato. Radii 24/999px (pill controls) · soft diffuse shadows · display **Fraunces** (warm serif), body **Nunito Sans** · placeholder art: hand-drawn ingredient doodles on cream blobs.

### Midnight — dark, candlelit
Calm evening kitchen; also the permanent Cooking Mode palette. bg `#1C271F` · surface `#26342A` · surface-alt `#31423630` tint · ink `#F2EDE3` · ink-soft `#A8B5A0` · accent `#D9906F` terracotta (ink `#231512`) · highlight `#E8B14E` candle gold. Radii 20/999px · shadows near-none, borders `#3A4A3E` · display **Fraunces**, body **Inter** · placeholder art: engraved-style line illustrations in gold on deep green.

### Market — fresh, crisp, airy
Farmers-market morning. bg `#FFFFFF` · surface `#F6F8F5` · surface-alt `#EEF3EC` · ink `#1F2937` · ink-soft `#6B7280` · accent `#16A34A` produce green (ink `#FFFFFF`) · highlight `#F97316` carrot. Radii 12/10px (squarer) · hairline borders `#E5E7EB`, minimal shadow · display **Sora**, body **Inter** · placeholder art: flat geometric produce shapes on white.

### Playful — bold citrus energy
Crumb's orange dictate screen turned into a whole personality. bg `#FFF4E0` · surface `#FFFFFF` · surface-alt `#FFE3B3` · ink `#33230F` · ink-soft `#8A6B44` · accent `#FF8A00` (ink `#FFFFFF`) · highlight `#F43F5E`. Radii 28/999px, chunky 2px borders `#33230F`, hard offset shadows (`4px 4px 0`) · display **Bricolage Grotesque** (chunky), body **Nunito** · placeholder art: sticker-style emoji-scale food icons.

Fonts self-hosted via `next/font` (no external requests at runtime).

## Component inventory

Layout: AppShell (header, safe-area, max-width column) · BottomFAB with expanding action menu.
Inputs: Chip (selectable/removable) · ChipGroup · IngredientInput (autocomplete + chips) · Stepper (−/n/+) · MacroPresetPicker (chips → 3 gram fields) · Toggle · Select sheet.
Content: RecipeCard · RecipeGrid · PlaceholderArt (theme-aware, seeded by recipe id) · TagChip · MetaRow (time/kcal/difficulty) · Tabs · IngredientRow · StepCard · NutrientBar (target vs actual) · NutrientTable · EstimatedBadge.
Flow: GeneratingScreen · CookStep (progress segments, TimerControl) · ThemePicker (swatch cards) · EmptyState · ErrorState/Toast.

## Responsive rules

- Design at 390px; single column, thumb-reach CTAs, FAB bottom-right.
- ≥768px: app column centered at 640px; recipe grid 2-up → 3-up ≥1024px; FAB becomes inline "New recipe" button in header.
- Cooking Mode is always full-viewport regardless of breakpoint.
- Touch targets ≥44px; body text ≥16px; contrast AA on all token pairs (verify per theme).

## Motion

Subtle spring on FAB expansion and tab underline; 150–250ms fades elsewhere; skeleton shimmer on the recipe grid. All gated by `prefers-reduced-motion` and scaled by `--motion-speed` (Playful runs snappier, Midnight slower).
