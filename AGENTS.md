# Dishcover — Agent Instructions

Recipe generator with a nutrition-first niche. Read `docs/PLAN.md` for the
phase backlog and `docs/PRODUCT-SPEC.md` for scope before starting work.

## Testing policy

TDD where it earns its keep, not everywhere:

- **Logic-bearing code** — pure functions, zod schemas, zustand stores, API
  route behavior, math (rescaling, nutrition, rate limiting): develop
  test-first (red-green-refactor), colocated `*.test.ts`, run with
  `npm test` (Vitest). Existing seams live in `lib/` with their tests.
- **UI-only changes** — markup, styling, animation, layout: no unit tests
  required; verify with `npm run build` plus a browser check.
- Never weaken, skip, or delete a failing test to get to green. If a test
  seems wrong, say so explicitly instead of changing it silently.
- `npm test` and `npm run build` must both pass before any commit.

## Agent skills

### Issue tracker

Issues live in GitHub Issues on `1sherlynn/dishcover` (via the `gh` CLI).
See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles use their default strings (`needs-triage`,
`needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`).
See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` + `docs/adr/` at the repo root.
See `docs/agents/domain.md`.
