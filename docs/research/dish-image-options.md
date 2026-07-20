# Dish image options and their per-recipe cost

Research for issue #24, feeding the decision in **Decide the dish-art direction** (#27).
**This document does not pick a direction.** It lays out the option space with costs so a human can.

Every price below carries the date it was checked. Pricing changes; re-verify before committing.

---

## The constraint that shapes everything

Three facts about this repo bound the option space before any provider is considered.

**1. Reversing a recorded decision is part of the price.**
`docs/DESIGN-SYSTEM.md:56` says dish art is "seeded riso illustrations (no photos, no AI images)".
`docs/adr/0004-riso-art-direction.md` locks Riso as the app's single art direction, and its
rationale is explicitly about coherence: the morphology (2px ink borders, dashed chips, hard
offset shadows, halftone, paper grain) doesn't survive dilution, and **"a diluted Riso was judged
worse than no Riso."** That sentence is the reversal cost. It is not merely "write a superseding
ADR" — it is reopening the argument that holds the whole design system together. An option that
drops a glossy photograph into that page is not a small amendment to ADR-0004; it is a test of
whether ADR-0004 still holds at all.

The reversal is **not uniform across options** — this is the most decision-relevant distinction
in this document:

| Option | Violates "no photos" | Violates "no AI images" | Visually on-brand |
|---|---|---|---|
| Ingredient-aware procedural | no | no | yes |
| AI image, riso-styled prompt | no | **yes** | plausibly |
| AI image, photoreal | **yes** (in effect) | **yes** | no |
| Stock photography | **yes** | no | no |

The middle row is the interesting one: it breaks the *letter* of the ban while arguably serving
its *intent*. #27 should decide whether the ban was about provenance or about appearance.

**2. There is no server-side storage, by decision.**
`docs/adr/0002-client-only-persistence-thin-proxy.md`: all user data lives in browser storage;
the only backend is a thin proxy that holds the API key, rate-limits, and enforces a daily spend
cap (`DAILY_GENERATION_CAP`, default 100 — `lib/rate-guard.ts:49`). There is "deliberately no
server-side record of users or recipes."

So a generated raster image has nowhere good to go:

- **Into localStorage with the recipe.** Recipes persist via zustand `persist` +
  `createJSONStorage(() => localStorage)` (`lib/store.ts`), and **nothing caps how many recipes a
  user accumulates**. Base64 inflates bytes by ~33%. The HTML Standard leaves the storage quota
  implementation-defined ([WHATWG HTML, §Storage](https://html.spec.whatwg.org/multipage/webstorage.html) —
  checked 2026-07-19), but ~5 MiB per origin is the common browser convention. At a realistic
  40–80 KB per compressed image that is roughly **60–120 recipes before the cookbook starts
  failing to save** — and it degrades silently, taking the recipe text down with the image.
- **Into blob storage.** Solves the quota problem but **contradicts ADR-0002 directly**: it adds a
  server-side record of user content, a new vendor dependency, a new cost line, and a
  content-moderation surface the app does not currently have.

There is no third option. **Any raster-image direction forces an ADR-0002 decision as well as an
ADR-0004 one.** #24 was scoped to ADR-0004; this is the finding that widens it.

**3. Latency lands on a screen the user is already waiting at.**
Recipe generation already shows a "Generating" screen. Image generation is a second
multi-second call. Either it blocks the reveal (adding its full latency to a wait that already
exists), or it resolves asynchronously and the card must render a placeholder first — which means
**the procedural generator has to keep existing regardless**, as the fallback for
pending/failed/rate-limited generation. No AI option removes the current component; they all
add on top of it.

---

## What exists today

`components/PlaceholderArt.tsx` — 186 lines. Signature is `PlaceholderArt({ seed, className })`.
It picks one of four hardcoded archetypes with `Math.floor(rnd() * 4)` (bowl-with-chopsticks,
plated fillet, sesame bowl, steak-and-fries) and renders a seeded SVG: wobbly ink outlines, spot
fills misregistered 2–3px, a halftone dot pattern, steam. Cost: zero. Latency: zero (synchronous
render). It knows nothing about the dish — which is the entire complaint.

Called in four places: `app/page.tsx` (×2), `app/cookbook/page.tsx`, `app/recipe/[id]/page.tsx`.
It is also a **pushed design-system component** — `.design-sync/entry.ts` exports it and
`.design-sync/previews/PlaceholderArt.tsx` is one of the 9 components in the Claude Design
project. Changing its contract has a sync consequence, not just a code one.

**The asset nobody has spent yet:** `lib/schemas.ts:9` requires each ingredient's `name` to be a
*"canonical lowercase ingredient name"*, and the recipe also carries `cuisine`, `tag`,
`difficulty`, and per-ingredient `grams`. The data needed to draw the actual dish is **already in
the model and already validated** — the art generator simply never receives it. This materially
lowers the cost of the procedural option relative to a from-scratch estimate, because a
name→visual lookup can match on exact strings rather than needing fuzzy matching.

The caveat: the vocabulary is *lowercase*, not *bounded*. It is LLM-generated free text, so a
lookup table will always need a graceful fallback for unmatched ingredients.

---

## Options at a glance

All prices checked **2026-07-19**. Sources are linked per row below the table.

| | Per-recipe cost | Latency | Survives Riso? | Storage | Licensing risk |
|---|---|---|---|---|---|
| **A. Ingredient-aware procedural** | **$0.00** | 0 ms | **Yes** — is Riso | none (SVG from data) | none |
| **B. AI image, riso-styled prompt** | $0.006–$0.211 | ~5 s–2 min | Plausibly; unverified | raster; needs a home | output ownership OK; ADR-0004 reversal |
| **C. AI image, photoreal** | same as B | same as B | **No** | same as B | same as B |
| **D. Stock photography** | $0.00 (free tiers) | ~200–800 ms lookup | **No** | hotlink or cache | **attribution + anti-competing-use clauses** |
| **E. Hybrid: procedural default, AI on tap** | $0.00 baseline, B on demand | 0 ms default | Baseline yes | only for tapped recipes | as B, but opt-in |

**Headline per-image prices (2026-07-19):**

| Provider / model | Price per image | Notes |
|---|---|---|
| OpenAI **GPT Image 2**, low, 1024² | **$0.006** | flat per-image; portrait/landscape $0.005 |
| OpenAI GPT Image 2, medium, 1024² | $0.053 | |
| OpenAI GPT Image 2, high, 1024² | $0.211 | |
| Google **Gemini 2.5 Flash Image** ("Nano Banana") | **$0.039** | batch/flex $0.0195; priority $0.0702 |
| Google Gemini 3.1 Flash Image | $0.067 per 1K image | varies by resolution |
| Google Imagen 4 fast / standard / ultra | $0.02 / $0.04 / $0.06 | **deprecated — shuts down 2026-08-17** |

Sources: [OpenAI image-generation guide](https://developers.openai.com/api/docs/guides/image-generation)
and [OpenAI pricing](https://developers.openai.com/api/docs/pricing);
[Google Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing). All checked 2026-07-19.

**What the bill actually looks like.** An image is generated **once per recipe and stored**, so
this is a one-time cost per recipe, not a recurring one — amortisation is total, and the interesting
number is not "monthly bill" but "new recipes that month × per-image".

| New recipes/month | GPT Image 2 low | Gemini 2.5 Flash | GPT Image 2 high |
|---|---|---|---|
| 10 | $0.06 | $0.39 | $2.11 |
| 100 | $0.60 | $3.90 | $21.10 |
| 1,000 | $6.00 | $39.00 | $211.00 |

**The existing spend cap already bounds this.** `DAILY_GENERATION_CAP` defaults to 100
(`lib/rate-guard.ts:49`), so the ceiling is ~3,000 images/month: **$18/mo** at GPT Image 2 low,
**$117/mo** at Gemini standard, **$633/mo** at GPT Image 2 high. The cap is global across both
proxy endpoints, so image generation would compete with recipe generation for the same budget
unless a separate cap is added. At Dishcover's stated scale (personal + friends, per ADR-0002),
the realistic figure is the 10–100 row, i.e. **cents to a few dollars a month.**

**Cost is therefore not the deciding factor.** The honest read of these numbers is that the
per-recipe bill is small enough at this app's scale that it should not drive the decision. The
real costs are the ADR-0004 reversal, the ADR-0002 storage problem, and the latency — not dollars.

---

### A. Ingredient-aware procedural SVG

Keep the generator, replace `artSeed % 4` with a composition driven by the recipe's actual
`ingredients[]`, `cuisine`, and `tag`.

**Per-recipe cost: $0.00. Latency: 0 ms (synchronous render). ADR reversal: none.**
No storage, no licensing, no attribution, no network, no failure mode, no rate limit, no
moderation surface, works offline in the PWA. It is the only option with none of those columns.

What it takes, concretely — this is a build estimate, not a spike:

1. **A visual-primitive library.** Roughly 15–25 shapes: leafy greens, noodle tangle, rice/grain
   bed, protein slab (with grill-mark and hatching variants), small-rounds (egg, meatball, cherry
   tomato), sliced-rounds (carrot, cucumber, citrus), broth surface, herb garnish, sauce drizzle.
   Each drawn in the existing idiom — wobbly ink outline, misregistered spot fill, halftone.
   The current file already contains the primitives for outline wobble, misregistration, halftone
   and steam, so this is extension, not invention.
2. **A name→primitive matcher.** Cheap because `lib/schemas.ts:9` already guarantees canonical
   lowercase names. Exact-match table plus a substring pass, plus a category fallback.
3. **A vessel chooser.** Bowl / plate / skillet / board, inferred from `cuisine` plus the presence
   of broth-like or noodle-like ingredients.
4. **A layout function.** Place the top 3–5 ingredients by `grams` within the vessel bounds with
   seeded jitter and no overlap.
5. **Keep the 4 archetypes as the fallback** when nothing matches.

Estimated ~400–700 lines, replacing 186. The component signature must change from `seed` to
something recipe-shaped, which touches four call sites and the `.design-sync` preview.

**The honest ceiling — and it is the crux of this option.** This produces art that is
**genre-legible, not dish-legible**. It will reliably distinguish a salad from a steak from a
noodle soup, and it will show the actual ingredients, which is what Sherlynn asked for. It will
**never** distinguish laksa from ramen, or a beef rendang from a beef stew — both are "brown
protein chunks in a bowl". If the requirement is "reads as *this* dish", procedural cannot get
there at any effort level. If the requirement is "stops showing a steak for a curry", it gets
there for free and stays on-brand.

### B / C. AI image generation

**Integration cost here is unusually low, and this is a genuine finding.** `@ai-sdk/google` is
already a dependency, `lib/generation.ts:41` already constructs a `google(...)` provider, and
`GOOGLE_GENERATIVE_AI_API_KEY` is already a configured env var. Gemini image generation would
reuse an SDK, a key, and a provider-abstraction that all already exist. No new vendor, no new
credential, no new billing relationship. OpenAI would need all three.

**Anthropic offers no image generation API.** Confirmed against the `claude-api` skill rather than
from memory: the Claude API surface is Messages with image *input* (vision), PDF input, and
server-side tools. There is no image-generation endpoint anywhere in the model catalog or
endpoint reference. Dishcover already calling Claude buys nothing here.

**Latency is the real cost, not money.** OpenAI documents that "complex prompts may take up to 2
minutes to process" and does **not** publish a typical figure. Two minutes is intolerable on the
`app/new/page.tsx` generating screen (the simmer-rings phase). This forces async generation, which
in turn forces a placeholder — see constraint 3 above. Practically: **the procedural generator
survives in every AI scenario.**

**On-brand steering (B vs C) is the open question.** Whether a prompt like *"risograph print, two
spot inks on warm cream paper, visible halftone, hard offset shadow, slight misregistration"*
produces something that sits convincingly beside hand-drawn ink borders is **not answerable from
documentation** — it needs images in front of a human. That is exactly what #27 is scoped to do
with `/prototype`. Note also that AI output is *inconsistent* across recipes in a way the seeded
generator is not; Riso's coherence argument may be strained by variance even when each individual
image looks on-brand.

**Ownership:** commercial use and ownership of generated output is granted by both OpenAI and
Google under their standard API terms. I did **not** independently verify the current wording of
either terms-of-service document — see below.

### D. Stock / open-licence photography

Free at the tiers that matter, but **licensing is the sharpest risk in this document, not cost.**

[Unsplash License](https://unsplash.com/license) (checked 2026-07-19): grants an "irrevocable,
nonexclusive, worldwide copyright license" to use images free, including commercially, with
attribution *appreciated but not required*. **But** it prohibits compiling Unsplash photos "to
replicate a similar or competing service." Programmatically pulling a food photo per generated
recipe into a recipe app is a **grey area against that clause** — not obviously a violation, not
obviously safe. This needs a human read, not an agent's.

[Pexels API](https://www.pexels.com/api/) (checked 2026-07-19): **attribution is required** —
"Photo by John Doe on Pexels" with a link. That is a visible credit line on every dish card, which
is itself a design intrusion into the zine layout. Rate limits are described only as "a default
limit" with no published number; Pexels states limits can be lifted free of charge if attribution
is shown properly.

**Coverage is the unquantified killer.** Dishcover's recipes are LLM-generated with free-text
titles. A dish named "miso-glazed aubergine with charred spring onion" will not have a matching
stock photo. The realistic behaviour is falling back to a generic bowl-of-something — i.e.
**exactly the failure mode Sherlynn is complaining about today**, but now off-brand *and* with a
photographer credit attached. I could not quantify hit-rate (see below), but the structural
argument does not depend on the number.

### E. Hybrid

Procedural by default (free, instant, on-brand), AI image generated on explicit user tap and then
cached. This is the option that **defers the ADR-0002 storage problem** rather than solving it —
only tapped recipes consume storage — and makes the ADR-0004 reversal *opt-in per recipe* rather
than global. It also inherits option A's full build cost, because the default path still has to be
good. Worth putting in front of Sherlynn precisely because it does not require choosing between
the two philosophies up front.

### Storage, if a raster direction wins

[Cloudflare R2 pricing](https://developers.cloudflare.com/r2/pricing/) (checked 2026-07-19):
**$0.015/GB-month** standard, **egress free**, with a free tier of **10 GB-month**, 1M Class A and
10M Class B operations per month. At ~50 KB per compressed image, 10 GB is roughly **200,000
images** — so at Dishcover's scale, **object storage is effectively free** and comfortably inside
the free tier.

The cost of adding blob storage is therefore **not the invoice — it is ADR-0002.** It introduces a
server-side record of user-generated content where the ADR says there deliberately is none.

---

## What I could not determine

Stated plainly rather than guessed:

- **FLUX / Black Forest Labs per-image pricing.** `https://bfl.ai/pricing` renders its rates
  through an interactive calculator; no numeric per-image figure was extractable from the page.
  Same for Replicate and fal.ai, which price per-second of compute for many models rather than
  per-image, making a per-recipe figure model- and hardware-dependent. **If open-weights hosting
  is a serious candidate, this needs a follow-up with an actual API call.**
- **Typical AI generation latency.** OpenAI publishes only an upper bound ("up to 2 minutes");
  Google publishes none. The 5 s figure in the table above is a common-experience estimate, **not
  a sourced number** — treat it as unverified. This matters, because latency is the binding
  constraint for options B/C, and it is the one number I could not source.
- **Stock-photo coverage rate.** What fraction of LLM-generated dish titles would find a
  plausible Unsplash/Pexels match is not published by either provider and cannot be derived from
  documentation. Measuring it would mean running ~50 real generated titles through both APIs and
  scoring the results by hand — a small prototype, not a research task.
- **Whether riso-styled prompting actually holds up.** Not a documentation question. Requires
  generated images judged by a human, which is #27's job.
- **Current OpenAI/Google terms-of-service wording on generated-output ownership.** I relied on
  the widely-documented position that both grant commercial use and ownership of outputs; I did
  not fetch and read either ToS document in full. Verify before shipping if this matters legally.
- **Exact localStorage quota per target browser.** The HTML Standard leaves it
  implementation-defined; ~5 MiB is convention, not specification. The 60–120 recipe estimate
  above is arithmetic on that convention, not a measured limit.

---

## For the decision (#27)

Not a recommendation — the shape of the choice:

1. **Is the requirement "shows the ingredients" or "reads as this exact dish"?** Procedural clears
   the first and can never clear the second. This single question eliminates either option A or
   options B/C/D outright, and nothing else in this document matters until it is answered.
2. **Was "no AI images" about provenance or appearance?** If appearance, a riso-styled AI image is
   a smaller reversal than it looks. If provenance, options B/C/E are all off the table together.
3. **Cost is not the constraint.** Cents to a few dollars a month at this scale. The binding
   constraints are ADR-0002 (raster images have nowhere to live), latency, and Riso's coherence.
4. **The procedural generator survives every path** — as the product, or as the placeholder and
   failure fallback. Improving it is not wasted work under any outcome.
