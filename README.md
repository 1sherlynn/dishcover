# Dishcover ✳

Turn what's already in your kitchen into recipes — with honest nutrition, every time.

Dishcover generates a recipe from the ingredients you have on hand (plus your standing Pantry of staples), steered by an optional per-serving **Macro Target** (protein / carbs / fat). Every recipe ships with a full **Nutrition Breakdown**: calories, macros compared against your target, and nine label-style micronutrients — clearly marked as estimates. Follow along hands-free in **Cooking Mode**, a full-screen step player with built-in timers.

The interface is **Riso** — a risograph food-zine design: spot inks on paper, mono type, rubber stamps, sticker tags, and seeded hand-drawn dish art (see [docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md)).

No accounts, no database: everything lives in your browser (device-local), and the only backend is a thin proxy that keeps the LLM key server-side.

## Quick start

```bash
npm install
npm run dev        # → http://localhost:3000
```

That's it — **with no API key the app runs in mock mode**, serving a built-in sample recipe so every screen is testable for free.

### Real generation

Copy the env template and add one LLM key:

```bash
cp .env.example .env.local
```

```dotenv
# either (checked in this order):
GROQ_API_KEY=gsk_…                  # default model: openai/gpt-oss-120b
GOOGLE_GENERATIVE_AI_API_KEY=…      # default model: gemini-2.5-flash
```

Restart the dev server. Providers are swappable via the Vercel AI SDK (`LLM_PROVIDER` / `LLM_MODEL` overrides — note Groq models must support `json_schema` structured output). The proxy has a per-IP rate limit and a daily generation cap, configurable in `.env.local`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | dev server on :3000 |
| `npm test` | Vitest suite (schemas, rate guard, nutrition math, stores, generation client + Generator) |
| `npm run build` | production build — don't run while the dev server is up (both write `.next/`) |

## How it's put together

- **Next.js 15 + TypeScript + Tailwind v4**, deployed on Vercel; design tokens as CSS variables
- **`lib/generation.ts`** — the Generator: prompt rules, retry, kcal self-consistency, model injected (tested against a mock model, no tokens spent)
- **`lib/generate-recipe.ts`** — the Generation Client: gathers standing inputs, maps the error taxonomy, saves the Recipe
- **zustand + localStorage** — recipes, pantry, preferences; no server storage (ADR-0002)

Start with [CONTEXT.md](CONTEXT.md) for the project's vocabulary, [docs/PLAN.md](docs/PLAN.md) for the build plan, and [docs/adr/](docs/adr/) for why things are the way they are. Work is tracked as [GitHub issues](https://github.com/1sherlynn/dishcover/issues) — `ready-for-agent` issues are self-contained and grabbable ([AGENTS.md](AGENTS.md) has the agent workflow).

---

Built as a 30-day challenge. 🤖 Co-developed with [Claude Code](https://claude.com/claude-code).
