# Staged nutrition estimation: LLM estimates now, database lookup later

Nutrition credibility is Dishcover's niche, but building a deterministic nutrition pipeline (USDA FoodData Central lookup with fuzzy ingredient matching) would cost roughly a week of a 30-day solo build. We decided the MVP gets its Nutrition Breakdown from the LLM in the same call that generates the recipe, displayed with an explicit "estimated" indicator. To keep the upgrade path open, the recipe schema MUST store a gram (or ml) quantity per ingredient from day one — even though the LLM already returns nutrition totals — so a database-computed pipeline can replace the estimates later without a data-model redesign.

## Considered Options

- **USDA pipeline from day one** — most credible, rejected for schedule cost.
- **LLM estimates permanently** — simplest, rejected because estimation error (±15–25%) undermines the app's core differentiator long-term.
- **Staged (chosen)** — LLM estimates behind an "estimated" badge, schema future-proofed for deterministic computation.
