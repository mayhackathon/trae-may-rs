# TRAE Ship Brief

TRAE Ship Brief turns engineering changes into role-specific release communication.

It produces four outputs:
- Engineering changelog
- PM and Marketing brief
- Support-facing note
- Audit and uncertainty report (sources, assumptions, and claims needing verification)

This is a hackathon MVP for the Productivity Enhancement Track.

## Why TRAE Is The Entry Point

Release communication is a cross-functional workflow that starts from engineering truth (commits/PRs/tickets/support signals) and ends with multiple role-specific narratives.

TRAE Ship Brief is designed so a user can ask TRAE:
- “What shipped this week?”

And TRAE can:
- Trigger brief generation, or retrieve the latest brief
- Return the right role-specific output for the user (PM, Marketing, Support, Engineering)
- Surface uncertainty so teams avoid unsupported claims

In this repo, TRAE is the generator:
- TRAE uses an MCP prompt (`ship_brief`) and tools from this repo to gather sources and write the brief.
- The latest brief is persisted locally to `data/latest-brief.json`.
- The Next.js app is a viewer that reads the latest saved brief.
- GET `/api/generate-brief` returns the latest saved brief (or 404 if none exists).

## Productivity Impact

Typical pain:
- Engineering leads spend 30–60 minutes per release translating technical changes for non-engineering teams.

With TRAE Ship Brief:
- Reduce this to a few minutes of review by generating first drafts per role.
- Reduce missed shipped changes by deriving outputs from the same shared sources.
- Reduce unsupported marketing/support claims by explicitly listing uncertainties and missing context.
- Improve support readiness after release by generating a support-facing note from support signals + engineering truth.

## How To Run

```bash
npm install
```

UI viewer (optional):
```bash
npm run dev
```

MCP server (for TRAE):
```bash
npm run mcp
```

Open http://localhost:3000 to view the latest saved brief.

## What’s Mocked (No Real Integrations Yet)

This MVP intentionally does not include auth, real OAuth, or embedded Jira/GitHub API tokens.

Optional fixture sources live in `data/`:
- `data/git-history.json`
- `data/prs.json`
- `data/tickets.json`
- `data/support-notes.json`

Current scenario: “Checkout coupon fix”
- Shipping coupon was being applied twice
- Payment intent calculation was updated
- Regression test was added
- Support had customer complaints about confusing coupon totals
- There is uncertainty around whether shipping discounts should affect cobbler payout

## What Gets Stored

The persisted brief shape includes:
```json
{
  "generatedAt": "string",
  "range": {},
  "sources": {},
  "brief": {
    "engineering": "string",
    "pmMarketing": "string",
    "support": "string",
    "audit": "string"
  }
}
```

Key constraint: the generator should not invent unsupported claims.
- Every factual claim must be supported by the sources captured in `sources.*`.
- Uncertainties and missing context must be explicitly listed in the Audit output.

Core logic:
- `mcp-server/server.mjs` (tools, prompt template, persistence)

API route:
- `src/app/api/generate-brief/route.ts`

UI:
- `src/app/page.tsx`
- `src/app/home-client.tsx`

## Example TRAE Prompts (Demo Narrative)

- “What shipped this week?”
- “Generate a support note for the latest release.”
- “Explain the latest engineering changes for PM and marketing.”
- “What claims should we avoid because the sources do not support them?”

## 2-Minute Demo Script

1. Open TRAE
2. Ask: “What shipped this week?”
3. TRAE uses the `ship_brief` prompt + tools to gather sources and draft the brief
4. TRAE saves it via `save_latest_brief`
5. Open the Ship Brief app
6. Click “Get Latest Brief”
6. Show Engineering tab (what changed, why, verification notes)
7. Show PM and Marketing tab (safe claims + claims to avoid)
8. Show Support tab (what shipped, how to explain, watch-outs)
9. Show Audit tab (sources used, verified claims, assumptions, uncertainties)
10. Close with ROI: 30–60 minutes → a few minutes of review, plus fewer unsupported claims

## MCP Architecture

This repo includes a local MCP server so TRAE (or any MCP-capable client) can:
- Fetch local git activity for the last N days (`get_raw_git_activity`)
- Use a prompt template (`ship_brief`) to orchestrate PR/ticket gathering via other MCP connectors
- Persist the latest brief (`save_latest_brief`) and retrieve it (`get_latest_brief`)

### Run MCP Locally

Terminal 1 (app):
```bash
npm run dev
```

Terminal 2 (MCP server, stdio):
```bash
npm run mcp
```

### Connect TRAE To The MCP Server

In TRAE’s MCP configuration, register a local stdio server that runs:
- Command: `node`
- Args: `/absolute/path/to/trae-may-rs/mcp-server/server.mjs`

Or equivalently:
- Command: `npm`
- Args: `run`, `mcp`
