---
name: "sprint-brief"
description: "Automatically boots localhost, pulls last 7 days from AFFiNE GitHub and Jira, updates Jira tickets, and generates a 4-role email brief with Jira ticket references."
---

# Sprint Brief

This skill instantly executes a zero-input, automated workflow to gather the last 7 days of shipped changes, reconcile Jira tickets, update statuses, and prepare a 4-role brief formatted as an email.

## Goal

Produce an email-ready brief containing five sections:
- Engineering changelog
- PM and Marketing brief
- Support note
- Audit report
- Business Impact (ROI metrics)

**CRITICAL REQUIREMENT:** The generated email brief MUST explicitly reference Jira ticket numbers (e.g., `RS-123`) next to relevant changes, bullet points, or summaries.

## Workflow (STRICT PERFORMANCE MODE - MUST COMPLETE < 2 MINS)

To guarantee fast execution, you MUST parallelize tool calls and limit data fetching. Do not perform deep, sequential exploratory searches. Do NOT ask the user for inputs or confirmation—start immediately.

1. Fast Infrastructure Boot & Browser Open
- If the servers are not already running, use `RunCommand` (with `blocking: false`) to start `npm run dev` and `npm run mcp` in the background.
- IMMEDIATELY use the `integrated_browser` MCP server with the `browser_navigate` tool (set `url: "http://localhost:3000/"`, `newTab: true`) to force the UI open.

2. Parallel Data Fetching (Last 7 Days - MAX 1 CALL EACH)
- Make exactly ONE call to GitHub MCP (e.g., `list_commits` with `owner: "toeverything"`, `repo: "AFFiNE"`, `perPage: 15`).
- Make exactly ONE call to Jira MCP (`searchJiraIssuesUsingJql` with `maxResults: 15` for the last 7 days, e.g., `updated >= -7d`).
- **CRITICAL:** Execute these MCP tool calls CONCURRENTLY in a single response.

3. Reconcile & Jira Automation (Batch Mode)
- Group the fetched GitHub commits and Jira items into coherent shipped themes.
- If GitHub PRs/commits show work is merged/completed but the corresponding Jira tickets are still open, use Jira MCP to transition those tickets to "Done".
- Execute any Jira MCP updates concurrently to save time.

4. Generate the Email Brief
- Format the output as an email.
- **CRITICAL:** Do NOT use Markdown formatting (no asterisks for bold, no hash for headers, no markdown links). Use purely plain normal text.
- Ensure Jira ticket numbers (e.g., RS-45) are referenced on every relevant bullet point.
- Include the 5 sections:
  - **Engineering**: precise technical changes, dependencies, fixes, migrations.
  - **PM and Marketing**: user-visible value, safe claims, feature framing.
  - **Support**: what changed, expected customer questions, watch-outs.
  - **Audit**: sources used, verified claims, assumptions, missing context.
  - **Business Impact**: clear ROI metrics, e.g., "Saves ~X hours of cross-departmental sync meetings per sprint", "Reduces miscommunication errors by automating changelog parsing", efficiency gains, etc.

5. Persist the Brief
- Use the local MCP tool `save_latest_brief` to write the JSON to `data/latest-brief.json` so it populates the `localhost:3000` UI.

## Quality Bar

- Prefer source-backed summaries over exhaustive raw dumps.
- Mark internal chores separately from user-facing changes.
- Every claim must be traceable to the retrieved source material. Do not invent shipped work.
- If the evidence is weak, say it in Audit instead of guessing.

## Workspace Notes

This workspace includes:
- A local MCP server for ship-brief persistence and retrieval.
- A Next.js viewer at `http://localhost:3000`.
