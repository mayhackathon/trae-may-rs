## Summary

Overhaul the repo so TRAE (the MCP client + LLM) becomes the generator of the ship brief, while this repository provides:

- A local MCP server that supplies source-of-truth data (at minimum, git activity for the last 7 days) plus a reusable “Ship Brief” prompt template that instructs TRAE how to gather PRs/tickets via other MCP connectors.
- A persistence layer (local file) for the “latest brief”, and read-only retrieval tools.
- A Next.js UI that remains as a viewer/review surface for the latest saved brief (no longer the generator).

## Current State Analysis

### What generates today

- The Next.js API `POST /api/generate-brief` calls a deterministic template generator [generateShipBrief.ts](file:///Users/salmanfatahillah/Repositories/trae-may-rs/src/lib/generateShipBrief.ts) which reads local mock JSON via [mockSources.ts](file:///Users/salmanfatahillah/Repositories/trae-may-rs/src/lib/mockSources.ts), then writes `data/latest-brief.json` [route.ts](file:///Users/salmanfatahillah/Repositories/trae-may-rs/src/app/api/generate-brief/route.ts).
- The UI has a “Generate Ship Brief” button that calls the API POST [home-client.tsx](file:///Users/salmanfatahillah/Repositories/trae-may-rs/src/app/home-client.tsx).

### What MCP does today

- The MCP server exposes “app-generated workflow” tools (generate/get sections) by calling the Next.js HTTP endpoint [server.mjs](file:///Users/salmanfatahillah/Repositories/trae-may-rs/mcp-server/server.mjs).
- It also exposes “raw source” tools but those still fetch the mocked JSON via the Next.js app’s `/data/*.json` endpoints.
- No MCP prompts are exposed yet; only tools.

## Goal & Success Criteria

### Goal

Make TRAE the generator: TRAE should compose the brief using its own model, using tools/prompts from this repo plus external MCP connectors for PRs and tickets.

### Success Criteria

- “Generate ship brief” no longer depends on the Next.js template generator or mocked sources.
- The MCP server can run without the Next.js app running (no baseUrl / HTTP dependency for core workflows).
- TRAE can:
  - Retrieve last-7-days git activity from this repo via MCP.
  - Follow an MCP-provided prompt template that guides it to gather PRs + tickets via other MCP connectors.
  - Save the generated brief back into this repo as the canonical “latest brief”.
- The Next.js UI displays the latest saved brief (and refreshes via GET).

## Proposed Architecture (MCP-First, UI As Viewer)

### Data flow

1. User asks TRAE: “Generate a ship brief for the last 7 days.”
2. TRAE uses this repo’s MCP prompt `ship_brief` which:
   - Calls this repo’s `get_raw_git_activity` tool (real git, last 7 days).
   - Calls external MCP connector tools (e.g. GitHub/GitLab for PRs; Jira/Linear for tickets) to fetch items for the same time range.
   - Optionally incorporates support notes (if available via another connector or user-provided text).
   - Generates 4 role-specific outputs + an audit/uncertainty section.
3. TRAE calls this repo’s `save_latest_brief` tool to persist the result to `data/latest-brief.json`.
4. UI (or TRAE) calls `get_latest_brief` to view what’s saved.

### “Latest brief” canonical storage

Keep `data/latest-brief.json` as the canonical latest brief file, but shift ownership:

- Written only by the MCP server tool `save_latest_brief` (not by Next.js).
- Read by both MCP server and Next.js API (GET-only).

Define the persisted schema as:

```json
{
  "generatedAt": "ISO-8601 string",
  "range": { "type": "lastDays", "days": 7, "from": "ISO", "to": "ISO" },
  "sources": {
    "git": { "repo": "string", "summary": "string", "raw": "string|object" },
    "prs": { "summary": "string", "raw": "string|object" },
    "tickets": { "summary": "string", "raw": "string|object" },
    "supportNotes": { "summary": "string", "raw": "string|object" }
  },
  "brief": {
    "engineering": "string",
    "pmMarketing": "string",
    "support": "string",
    "audit": "string"
  }
}
```

Notes:
- `raw` fields intentionally allow either structured JSON or pasted text so TRAE can store exactly what it used.

## Proposed Changes (By File)

### MCP server overhaul

**Modify** [mcp-server/server.mjs](file:///Users/salmanfatahillah/Repositories/trae-may-rs/mcp-server/server.mjs)

- Remove the dependency on the running Next.js app (`SHIP_BRIEF_BASE_URL`, HTTP fetch calls).
- Add “real source” tools:
  - `get_raw_git_activity` (primary): reads local git log for the last N days (default 7), returns a structured JSON summary plus a raw text block.
  - Optional helper tools (non-LLM) for:
    - `get_repo_metadata` (repo name, default branch if detectable)
    - `get_changed_files_summary` (if feasible, based on `git diff --name-only` for the range)
- Add persistence tools:
  - `save_latest_brief` (write `data/latest-brief.json`): validates minimal schema and writes atomically.
  - `get_latest_brief` (read file): returns the stored payload (or a friendly “none yet” response).
  - Optional: `delete_latest_brief` (local cleanup) if useful for demos.
- Add MCP prompt(s):
  - `ship_brief` prompt: a template that instructs TRAE how to:
    - call `get_raw_git_activity`
    - call external MCP connectors for PRs and tickets for the same range
    - produce the 4 sections + audit with explicit uncertainty handling
    - call `save_latest_brief`
  - The prompt includes a strict output contract and an explicit “don’t invent claims” rubric.

Implementation notes:
- Use `child_process` to run `git` commands from Node, scoped to the repo root.
- Compute the time range as “now” to “now - 7 days” (user-selected).
- Ensure outputs are bounded (truncate raw logs, limit commit count) so the prompt stays usable.

**Modify** [mcp-server/test-client.mjs](file:///Users/salmanfatahillah/Repositories/trae-may-rs/mcp-server/test-client.mjs)

- Update it to:
  - call `get_raw_git_activity`
  - call `get_latest_brief`
  - call `save_latest_brief` with a small fixture payload (so we can test persistence without an LLM)

### Next.js changes (viewer-only)

**Modify** [src/app/api/generate-brief/route.ts](file:///Users/salmanfatahillah/Repositories/trae-may-rs/src/app/api/generate-brief/route.ts)

- Convert to GET-only “latest brief” endpoint:
  - `GET` continues to read and return `data/latest-brief.json`.
  - `POST` is removed (or returns 405) so the app no longer generates.
- Update types to match the new stored schema while keeping backward compatibility for the UI where practical.

**Modify** [src/app/home-client.tsx](file:///Users/salmanfatahillah/Repositories/trae-may-rs/src/app/home-client.tsx)

- Remove/disable the “Generate Ship Brief” button and any POST usage.
- Keep “Get Latest Brief” and auto-refresh-on-load (GET).
- Update labels to clarify that generation happens via TRAE.
- Update the “Mock JSON” badges in the source cards:
  - Either remove them, or change to “Last saved sources” / “Snapshot” once the stored schema includes `sources.*.summary`.

**Modify** [src/app/page.tsx](file:///Users/salmanfatahillah/Repositories/trae-may-rs/src/app/page.tsx) and [mockSources.ts](file:///Users/salmanfatahillah/Repositories/trae-may-rs/src/lib/mockSources.ts) (as needed)

- If the UI still shows a “source summary”, change it to read from `data/latest-brief.json` (saved sources summary) instead of `data/*.json`.
- Keep `data/*.json` only as optional demo fixtures (not the source of truth).

### Documentation updates

**Modify** [README.md](file:///Users/salmanfatahillah/Repositories/trae-may-rs/README.md)

- Reframe the architecture as MCP-first:
  - TRAE generates (LLM)
  - MCP server provides git source tools + prompt template + persistence
  - UI is a viewer for the latest saved brief
- Add a “How to use with TRAE” section:
  - Example chat prompt using the MCP prompt `ship_brief`
  - Explanation that PRs/tickets come from separate MCP connectors (user-configured) and are fetched by TRAE during the run
- Keep a “Mock data” section as optional fallback only.

## Assumptions & Decisions (Locked For This Plan)

- UI stays, but as a viewer/review surface only (no generation button).
- “What shipped” range defaults to last 7 days.
- PRs and tickets are fetched via other MCP connectors available in the TRAE client environment; this repo does not embed GitHub/Jira API tokens or implement OAuth.
- This repo’s MCP server is responsible for local git extraction and for persisting the final brief.

## Edge Cases & Failure Modes

- Repo is not a git checkout or `git` is unavailable: `get_raw_git_activity` returns a clear error and the prompt instructs TRAE to proceed with PR/ticket-only context (or abort).
- Too much git activity in 7 days: tool truncates to a safe cap (e.g., N commits, M lines) and reports truncation.
- No external MCP connectors configured: prompt instructs the user to paste PR/ticket lists manually; saved brief still works.
- Concurrent writes to `data/latest-brief.json`: write atomically (temp file + rename) to avoid partial reads.

## Verification Steps

- MCP server:
  - Start `npm run mcp` and verify tools list includes `get_raw_git_activity`, `save_latest_brief`, `get_latest_brief`, and prompt `ship_brief`.
  - Run `test-client.mjs` to confirm:
    - git activity returns successfully
    - saving a brief writes `data/latest-brief.json`
    - reading returns the same payload
- Next.js UI:
  - Start `npm run dev`, load `/`, click “Get Latest Brief”, confirm it renders the saved brief.
  - Confirm there is no UI path that POSTs generation.
- Compatibility:
  - Confirm the UI handles “no latest brief yet” cleanly (404 from GET).

