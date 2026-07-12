# Dishcover — Riso design system

Riso is a risograph food-zine art direction: spot inks on warm paper, 2px ink
borders, hard offset (never blurred) shadows, mono type, rubber stamps, sticker
tags, and seeded dish-art illustrations. Build with the real components below;
style your own layout glue with the utility classes and tokens they use.

## Setup — no provider needed

Components are styled entirely by the shipped stylesheet (`styles.css` and its
imports: the compiled tokens/utilities and `fonts/fonts.css`). There is **no
theme provider or context to wrap** — render a component and it's styled. The
design tokens are defined on `:root`, so they apply globally.

- The three brand fonts ship as `@font-face`: **Bricolage Grotesque** (display),
  **Courier Prime** (mono body/UI), **Caveat** (hand annotations).
- Cooking Mode is the one always-dark surface: put `class="force-midnight"` on an
  ancestor to flip that subtree to the Midnight palette. Everything else is Riso.

## Styling idiom — Tailwind v4 utilities mapped to semantic tokens

Never use raw hex. Style with these utility classes (they resolve to `--th-*`
tokens, so they stay on-brand and theme-correctly):

| Concern | Classes |
|---|---|
| Surfaces | `bg-bg` (paper), `bg-surface`, `bg-surface-alt`, `bg-wash` (teal panel wash) |
| Text | `text-ink`, `text-ink-soft`, `text-accent-ink` (on accent), `text-highlight` (teal) |
| Accents | `bg-accent` / `text-accent` (plum CTA), `bg-pop` (blueberry), `text-positive` (moss), `text-warn` (mustard), `text-danger` |
| Borders | `border-ink` + `border-2` (or `border-[1.5px]`); dashed for add/suggestion chips |
| Corners | `rounded-card` (4px), `rounded-control` (2px) — always near-square |
| Shadow | `shadow-card` (hard 6px offset) or `shadow-[4px_4px_0_var(--th-ink)]` for buttons |
| Type | `font-display` (Bricolage, usually `uppercase tracking-wider`), `font-body` (Courier), `font-hand` (Caveat, teal, sparingly) |

Riso helper classes (defined globally): `.zine-label` (mono 11px uppercase
letterspaced label), `.stamp` (dashed rubber-stamp box, slight rotation),
`.sticker` (plum block tag, rotated), `.rise` (staggered entrance animation).

## Where the truth lives

- **`styles.css`** and its imports — the full token + utility + font contract.
  Read these before styling.
- Per-component `.d.ts` (the prop contract) and `.prompt.md` (usage) under each
  `components/<group>/<Name>/`.

## Idiomatic snippet

```tsx
import { PrimaryButton, Chip } from "dishcover";

// A zine-style action row. Library components for the controls; utility classes
// (never raw hex) for your own layout glue.
<section className="rounded-card border-2 border-ink bg-surface p-5 shadow-card">
  <p className="zine-label text-ink-soft">In your pantry</p>
  <div className="mt-2 flex flex-wrap gap-2">
    <Chip selected>Eggs</Chip>
    <Chip onRemove={() => {}}>Spinach</Chip>
    <Chip onClick={() => {}}>Olive oil</Chip>
  </div>
  <div className="mt-4">
    <PrimaryButton>Cook this up ✦</PrimaryButton>
  </div>
</section>
```
