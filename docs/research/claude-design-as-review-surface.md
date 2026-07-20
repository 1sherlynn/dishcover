# Claude Design as a review-and-annotate surface

**Ticket:** [Research what Claude Design can do as a review-and-annotate surface](https://github.com/1sherlynn/dishcover/issues/23)
**Date:** 2026-07-19
**Project under study:** "Dishcover — Riso", `363ffc14-dc2b-4968-a983-c1481b09b99e`

## TL;DR

A human can annotate richly in Claude Design — inline comments pinned to the canvas, drag/resize/align, adjustment knobs. **None of it is machine-readable back out.** The `DesignSync` MCP surface is five file operations and nothing else; there is no comment or annotation API, and Anthropic's own docs describe no export path for comments.

The one channel that could work is a **human-authored file at a path the bundle does not own**. That survives a normal resync, but is destroyed by a resync that loses its anchor, and cannot be created at all if the design-system UI has no file-creation affordance — which I could not verify (see [What I could not determine](#what-i-could-not-determine)).

The headline footgun is narrower than the ticket feared, but real, and it has a second head the ticket did not ask about:

| Regime | Human-created file at a new path | Human edit to a bundle-owned file |
|---|---|---|
| Anchored resync (normal) | **Survives** | **Clobbered** |
| No-anchor resync | **Deleted** | **Clobbered** |

---

## 1. What a human can actually do

Primary sources: [Get started with Claude Design](https://support.claude.com/en/articles/14604416-get-started-with-claude-design), [Introducing Claude Design](https://www.anthropic.com/news/claude-design-anthropic-labs), [Claude Design stays on brand](https://claude.com/blog/claude-design-stays-on-brand-for-daily-work).

- **Inline comments** — "click directly on a specific part of the canvas and request a targeted change". Annotations are pinned to a location on the canvas and surfaced in a "comments view".
- **Direct canvas editing** — "drag, resize, and align elements directly".
- **Adjustment knobs / sliders** — Claude generates controls to "tweak spacing, color, and layout live".
- **Chat refinement** — conversational requests for structural changes.
- **No code editing.** The docs describe no code editor in Claude Design; code changes are a handoff to Claude Code.

A **design system** is a distinct project kind: "When you create a project, it automatically inherits your organization's design system", and components are brought in "from a GitHub repo, design files, or raw uploads" — which is what `.ds-sync` does for us.

**Documented reliability caveat**, straight from the help centre: inline comments "occasionally don't appear on the page", and the official workaround for comments not being picked up is to *paste the feedback into the chat instead*. Comments are not a durable store even inside the product.

## 2. What is machine-readable back out

The complete `DesignSync` method surface, from a grep over the vendored sync toolchain (`.ds-sync/`):

```
list_files   get_file   write_files   delete_files   finalize_plan
```

Plus one telemetry call, `report_validate` (`.ds-sync/storybook/SKILL.md:232`).

**That is the entire API. There is no comment, annotation, or thread method.** Anthropic's help centre confirms an MCP server exists (`claude mcp add --scope user --transport http claude-design https://api.anthropic.com/v1/design/mcp`) but documents no programmatic access to comments.

So:

- **Inline comments → not readable.** No method returns them. No documented export.
- **Canvas edits (drag/resize/knobs) → unknown.** If they mutate the component's stored files, `get_file` would see the diff. If they are view-state layered over the component, they are invisible. I could not test this (§5).
- **Files → readable.** `list_files` and `get_file` are the only windows into the project, and they only see files.

## 3. What a resync destroys

### 3a. Deletes — derived from our own manifest, not from the live project

This is the reassuring half, and the mechanism matters.

`.ds-sync/lib/remote-diff.mjs` computes `upload.deletePaths` (lines 184–199) **entirely from the remote `_ds_sync.json` sidecar**. It never calls `list_files`. The sidecar is the manifest *we wrote at our last upload* — for this project, 27 paths under `components/**` plus 9 `renderHashes` entries (verified against `ds-bundle/_ds_sync.json`).

The path filter is decisive (`remote-diff.mjs:108–118`):

```js
for (const path of Object.keys(sourceHashes)) {
  const seg = path.split('/');
  if (seg[0] !== 'components' || seg.length < 4) continue;
  ...
}
```

Anything that is not `components/<group>/<Name>/<file>` is discarded before deletion is even considered. `deletePaths` is therefore a subset of:

- paths we previously pushed, that this build no longer produces, plus
- derived siblings: `components/<group>/<Name>/<Name>.html`, `_preview/<Name>.js`, `_preview/<Name>.css`.

**A file a human created — at any path we never pushed — cannot appear in `deletePaths`.** The structural diff is structurally blind to it. And the skill forbids widening the list: "Anchored re-syncs: verbatim from the diff — copy `.sync-diff.json`'s `upload.deletePaths` exactly; **never hand-derive the list**" (`.ds-sync/storybook/SKILL.md:280`).

**Verdict: an anchored resync does not delete human-created files.**

### 3b. The no-anchor regime — where they *do* get deleted

Same line of the same skill, second half:

> **No anchor** (a re-adopted or recovered non-empty project being fully re-verified): the diff can't see the project's history, so **review its `list_files` NOW** — before `finalize_plan` — **for files this build doesn't produce, and put those reviewed paths in the plan's `deletes`**.

A human-authored annotation file is, by definition, "a file this build doesn't produce". In the no-anchor path the agent is *instructed* to sweep it into the delete list.

The anchor is lost whenever `anchorReason !== 'ok'` (`remote-diff.mjs:87–104`), i.e. the remote sidecar is:

| `anchorReason` | Cause |
|---|---|
| `not_provided` | `--remote` omitted — agent skipped the `get_file` anchor fetch |
| `unreadable` | fetch failed or file absent from the project |
| `malformed` | sidecar fails the `validSidecar` shape check |
| `shape_changed` | project `shape` moved (ours is `package`; a move to `storybook` trips this) |

None of these are exotic. A skipped anchor fetch is a one-step slip, and it silently converts "deletes nothing of yours" into "audits your files for deletion".

### 3c. The second head — full writes clobber edits in *every* regime

The ticket asked about deletion. Overwriting is the bigger practical hazard, and it is unconditional.

`.ds-sync/storybook/SKILL.md:279`:

> **Writes — everything, always** (full re-verifies and re-syncs alike): `writes: ["components/**", "tokens/**", "fonts/**", "_vendor/**", "_preview/**", "guidelines/**", "_ds_bundle.js", "_ds_bundle.css", "styles.css", "README.md", "_ds_sync.json", "_ds_needs_recompile"]`. … An under-scoped writes list silently and permanently desyncs the project — full writes are the safe default.

And `remote-diff.mjs:36–38` is explicit that the changed-component list must **not** be used to narrow this:

> `components: [..]` — informational … **NOT a write scope**: the skill mandates full writes on every upload.

So any human edit to a file under those globs is overwritten on the next upload — whether or not that component changed, whether or not the anchor is healthy. The only reprieve is `upload.any === false`, where the upload is skipped entirely.

**In particular, `guidelines/**` is fully overwritten.** It is tempting as an annotation drop-zone because it already holds prose (`guidelines/docs/DESIGN-SYSTEM.md` and friends). It is exactly the wrong place — it is bundle-owned and rewritten every push.

## 4. Which round-trip mechanisms are therefore possible

| # | Mechanism | Verdict |
|---|---|---|
| 1 | Harvest inline comments via API → file issues | **Impossible today.** No API method exists. |
| 2 | Human writes a file at a non-bundle path (e.g. `feedback/2026-07-19.md`); agent reads it with `list_files` + `get_file` and files issues | **The only viable file channel** — but conditional, see below |
| 3 | Human edits component `.jsx` / `.prompt.md` in place as annotation | **Unusable.** Clobbered by full writes every upload. |
| 4 | Human copy-pastes from the comments view into chat or an issue | **Works, fully manual.** Already Anthropic's own documented workaround for dropped comments. |

**Mechanism 2 carries three conditions**, all of which must hold:

1. The design-system UI must let a human create a file at an arbitrary path. **Unverified** — the docs describe a canvas, not a file browser.
2. The path must sit outside every `writes` glob in §3c. `feedback/**` or `annotations/**` qualify; `guidelines/**` does not.
3. Every resync must run anchored. A single no-anchor resync puts the file on the deletion audit list.

Condition 3 is worth hardening regardless: if we adopt mechanism 2, the annotation directory should be added to the no-anchor review as an explicit *keep*, so a recovery resync cannot quietly eat the human's feedback.

Absent all that, **mechanism 4 is the honest default**: the round-trip stays manual, and the map's assumption that "annotations → tickets" can be automated is not yet supported by anything the platform exposes.

## 5. What I could not determine

The `DesignSync` MCP server **was not connected in this session** — `claude mcp list` returns Google Drive, Calendar, Gmail, Trigger and Robinhood, with no `claude-design` entry, and `ToolSearch` for `DesignSync` finds nothing. The ticket's live probe of project `363ffc14-dc2b-4968-a983-c1481b09b99e` was therefore **not performed**. Everything above about deletion is read off the source that computes it, which is authoritative for behaviour; the following are genuinely open:

- **Does `list_files` show files a human created that we never pushed?** Untested. The delete logic never consults `list_files`, so this does not change §3a — but it decides whether mechanism 2 can be *read*.
- **Can a human create a file at all in a design-system project?** The single highest-value unknown. Mechanism 2 collapses without it, and no documentation answers it.
- **Do canvas edits (drag/resize/knobs) mutate stored component files?** If yes, `get_file` diffing becomes a crude annotation channel — and §3c means those edits are also being silently overwritten every push, which would be worth knowing.
- **Are comments retrievable via `get_file` at some undocumented path?** Would need a live `list_files` to rule out.
- **Does the project currently hold any non-bundle files?** Unknown.

To close these, connect the server per the help centre and re-probe read-only:

```
claude mcp add --scope user --transport http claude-design https://api.anthropic.com/v1/design/mcp
```

I deliberately did **not** attempt any destructive test. In particular, "does a resync delete a human file" was answered by reading `remote-diff.mjs` and the upload doctrine rather than by pushing a resync, and no write, delete, or resync touched the live project.

## Sources

**Primary — repo source (authoritative for sync behaviour):**
- `/Users/sherlynn/Desktop/claude/dishcover/.ds-sync/lib/remote-diff.mjs` — lines 108–118 (`byName` path filter), 184–199 (`deletePaths` derivation), 87–104 (`anchorReason`), 36–38 (writes are not scoped by the component list)
- `/Users/sherlynn/Desktop/claude/dishcover/.ds-sync/resync.mjs` — verdict schema (lines 40–58), stage chain, `upload` passthrough (line 398)
- `/Users/sherlynn/Desktop/claude/dishcover/.ds-sync/storybook/SKILL.md` — §6 Upload: line 279 (full writes), line 280 (anchored vs no-anchor deletes), line 292 (delete sequence)
- `/Users/sherlynn/Desktop/claude/dishcover/.design-sync/config.json` — `projectId`, `shape: "package"`
- `/Users/sherlynn/Desktop/claude/dishcover/ds-bundle/_ds_sync.json` — sidecar shape; 9 components, 27 `sourceHashes` paths, all under `components/**`

Note: `.ds-sync/`, `ds-bundle/` and `.design-sync/.cache/` are gitignored (`.gitignore:19–26`), so they exist only in the primary checkout, not in worktrees.

**Primary — vendor documentation:**
- [Get started with Claude Design](https://support.claude.com/en/articles/14604416-get-started-with-claude-design) — editing affordances, comments view, MCP install command
- [Introducing Claude Design by Anthropic Labs](https://www.anthropic.com/news/claude-design-anthropic-labs) — inline comments, direct edits, sliders
- [Claude Design now stays on brand for daily work](https://claude.com/blog/claude-design-stays-on-brand-for-daily-work) — design systems, component ingestion, admin edit-locking
- [Claude Design admin guide](https://support.claude.com/en/articles/14604406-claude-design-admin-guide-for-team-and-enterprise-plans)
