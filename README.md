# TRAE Ship Brief

TRAE Ship Brief turns engineering changes into role-specific release communication.

It reads engineering source material (mocked locally for the MVP) and generates four outputs:
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

In this MVP, TRAE integration is represented by a single app API boundary:
- POST `/api/generate-brief` produces a single “weekly” brief from the mocked sources

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
npm run dev
```

Open http://localhost:3000

## What’s Mocked (No Real Integrations Yet)

This MVP intentionally does not include auth, real OAuth, or real Jira/GitHub APIs.

Mock sources live in `data/`:
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

## What The App Generates

The generator returns:
```json
{
  "engineering": "string",
  "pmMarketing": "string",
  "support": "string",
  "audit": "string"
}
```

Key constraint: the generator should not invent unsupported claims.
- It extracts “safe claims” only from the provided mock sources
- It flags missing context and uncertainties in the Audit output

Core logic:
- `src/lib/generateShipBrief.ts`
- `src/lib/mockSources.ts`

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
3. TRAE explains or triggers the Ship Brief workflow (calls the Ship Brief generator)
4. Open the Ship Brief app
5. Click “Generate Ship Brief”
6. Show Engineering tab (what changed, why, verification notes)
7. Show PM and Marketing tab (safe claims + claims to avoid)
8. Show Support tab (what shipped, how to explain, watch-outs)
9. Show Audit tab (sources used, verified claims, assumptions, uncertainties)
10. Close with ROI: 30–60 minutes → a few minutes of review, plus fewer unsupported claims

## How MCP Could Be Added Next (After The App Works)

This repo now includes a local MCP server so TRAE (or any MCP-capable client) can call the app as tools:
- `generate_ship_brief`
- `get_latest_brief`
- `get_support_note`
- `get_marketing_summary`
- `get_audit_report`

The MCP layer is a thin wrapper that calls the running Ship Brief app on `http://localhost:3000`.

### Run MCP Locally

Terminal 1 (app):
```bash
npm run dev
```

Terminal 2 (MCP server, stdio):
```bash
npm run mcp
```

Optional base URL override:
```bash
SHIP_BRIEF_BASE_URL=http://localhost:3000 npm run mcp
```

### Connect TRAE To The MCP Server

In TRAE’s MCP configuration, register a local stdio server that runs:
- Command: `node`
- Args: `/absolute/path/to/trae-may-rs/mcp-server/server.mjs`

Or equivalently:
- Command: `npm`
- Args: `run`, `mcp`
