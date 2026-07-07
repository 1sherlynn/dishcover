# Riso is Dishcover's art direction, superseding the four-theme plan

Sherlynn designed "Dishcover Riso" in Claude Design (reference/claude-design-v1-riso.html) — a risograph food-zine direction with its own token sheet (the Ink Kit), component morphology (2px ink borders, dashed chips, hard offset shadows, rubber stamps, sticker tags, zine folios), and a seeded dish-art illustration style. We decided Riso **replaces** the original Hearth/Midnight/Market/Playful theme lineup as the app's single design direction, rather than joining it as a fifth switchable theme — the morphology changes (stamps, dashed borders, zine chrome) don't survive a token-only theme swap, and a diluted Riso was judged worse than no Riso.

Rollout is phased per the design file itself: Phase 1 = token system + Recipe Detail + dish-art range; remaining screens are restyled only after in-app sign-off. Until then other screens inherit Riso tokens but keep their existing structure. The CSS-variable token architecture stays — Midnight's token set survives for Cooking Mode's always-dark palette, and future "ink swap" variants of Riso remain possible cheaply.

Consequences: issue #9 (three additional themes + ThemePicker) is superseded in its original form; DESIGN-SYSTEM.md is rewritten around the Ink Kit; the user-switchable Theme picker leaves the MVP scope unless Riso ink-swap variants are introduced later.
