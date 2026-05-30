import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const repoRoot = process.cwd();
const latestBriefPath = path.join(repoRoot, "data", "latest-brief.json");

function toolText(text) {
  return { content: [{ type: "text", text }] };
}

async function readLatestBrief() {
  try {
    const raw = await readFile(latestBriefPath, "utf-8");
    return JSON.parse(raw);
  } catch (e) {
    const code = e && typeof e === "object" && "code" in e ? e.code : undefined;
    if (code === "ENOENT") return null;
    throw e;
  }
}

async function writeLatestBriefAtomic(payload) {
  await mkdir(path.dirname(latestBriefPath), { recursive: true });
  const tmpPath = `${latestBriefPath}.tmp-${process.pid}-${Date.now()}`;
  await writeFile(tmpPath, JSON.stringify(payload, null, 2) + "\n", "utf-8");
  await rename(tmpPath, latestBriefPath);
}

async function deleteLatestBrief() {
  try {
    await unlink(latestBriefPath);
    return true;
  } catch (e) {
    const code = e && typeof e === "object" && "code" in e ? e.code : undefined;
    if (code === "ENOENT") return false;
    throw e;
  }
}

function toInt(value, fallback) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function clampInt(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

async function getRawGitActivity({ days }) {
  const safeDays = clampInt(toInt(days, 7), 1, 30);
  const to = new Date();
  const from = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000);

  const args = [
    "log",
    `--since=${from.toISOString()}`,
    "--max-count=200",
    "--date=iso-strict",
    "--pretty=format:%H%x09%an%x09%ad%x09%s",
  ];

  const { stdout } = await execFileAsync("git", args, { cwd: repoRoot, maxBuffer: 1024 * 1024 * 10 });
  const lines = String(stdout).split("\n").filter(Boolean);
  const commits = lines.map((line) => {
    const [hash, author, date, subject] = line.split("\t");
    return { hash, author, date, subject };
  });

  return {
    range: { type: "lastDays", days: safeDays, from: from.toISOString(), to: to.toISOString() },
    commits,
    raw: String(stdout).trim(),
  };
}

function firstNonEmptyLine(text) {
  for (const line of String(text).split("\n")) {
    const t = line.trim();
    if (t) return t;
  }
  return "";
}

function safeSectionLines(text, heading, limit) {
  const lines = String(text).split("\n");
  const start = lines.findIndex((l) => l.trim() === heading);
  if (start === -1) return [];

  const out = [];
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      if (out.length) break;
      continue;
    }
    if (line.startsWith("- ")) out.push(line.slice(2));
    else if (out.length) break;
    if (out.length >= limit) break;
  }
  return out;
}

function formatTldr(brief) {
  const firstTitle = firstNonEmptyLine(brief.engineering);
  const verified = safeSectionLines(brief.audit, "Verified claims (supported by sources)", 3);
  const uncertainties = safeSectionLines(brief.audit, "Uncertainties / needs verification", 3);

  const out = [];
  out.push(`TL;DR (${firstTitle || "Ship Brief"})`);
  out.push("");
  out.push("Top verified claims");
  out.push(verified.length ? verified.map((v) => `- ${v}`).join("\n") : "- None found in sources.");
  out.push("");
  out.push("Key uncertainties");
  out.push(
    uncertainties.length ? uncertainties.map((u) => `- ${u}`).join("\n") : "- None flagged in sources."
  );
  return out.join("\n");
}

function buildShipBriefPromptText(days) {
  return [
    "You are generating a role-specific Ship Brief for a software release.",
    "",
    "Goal",
    "- Produce four sections: Engineering changelog, PM/Marketing brief, Support note, Audit report.",
    "- Do not invent claims. Every factual claim must be supported by sources you include.",
    "",
    "Time range",
    `- Last ${days} days.`,
    "",
    "Steps",
    `1) Call tool get_raw_git_activity with {\"days\": ${days}}.`,
    "2) Fetch PRs and tickets for the same time range using any other MCP connectors available in your environment (GitHub/GitLab/Jira/Linear/etc). If none are available, ask the user to paste PRs/tickets.",
    "3) Optionally gather support signals (support notes, Zendesk, Slack escalations) if connectors exist; otherwise leave empty.",
    "4) Write the brief text with clear headings and bullet lists where appropriate.",
    "5) Produce an audit section with:",
    "   - Sources used",
    "   - Verified claims (supported by sources)",
    "   - Assumptions",
    "   - Uncertainties / needs verification",
    "   - Missing context",
    "6) Call tool save_latest_brief to persist the result using this JSON shape:",
    "",
    "{",
    '  "generatedAt": "ISO-8601 string",',
    `  "range": { "type": "lastDays", "days": ${days}, "from": "ISO", "to": "ISO" },`,
    '  "sources": {',
    '    "git": { "summary": "string", "raw": "string|object" },',
    '    "prs": { "summary": "string", "raw": "string|object" },',
    '    "tickets": { "summary": "string", "raw": "string|object" },',
    '    "supportNotes": { "summary": "string", "raw": "string|object" }',
    "  },",
    '  "brief": {',
    '    "engineering": "string",',
    '    "pmMarketing": "string",',
    '    "support": "string",',
    '    "audit": "string"',
    "  }",
    "}",
  ].join("\n");
}

const server = new Server(
  { name: "trae-ship-brief", version: "0.2.0" },
  {
    capabilities: {
      tools: {},
      prompts: {},
    },
  }
);

server.registerCapabilities({
  tools: { listChanged: true },
  prompts: { listChanged: true },
});

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_raw_git_activity",
        description: "Return raw git activity for the last N days from the local repository.",
        inputSchema: { type: "object", properties: { days: { type: "number" } } },
      },
      {
        name: "save_latest_brief",
        description: "Persist the latest ship brief to data/latest-brief.json.",
        inputSchema: {
          type: "object",
          properties: {
            generatedAt: { type: "string" },
            range: { type: "object" },
            sources: { type: "object" },
            brief: {
              type: "object",
              properties: {
                engineering: { type: "string" },
                pmMarketing: { type: "string" },
                support: { type: "string" },
                audit: { type: "string" },
              },
              required: ["engineering", "pmMarketing", "support", "audit"],
            },
          },
          required: ["brief"],
        },
      },
      {
        name: "get_latest_brief",
        description: "Return the persisted latest ship brief (if one exists).",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "delete_latest_brief",
        description: "Delete data/latest-brief.json if it exists.",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "approve_brief",
        description: "Mark the latest generated brief as approved. (Mock workflow action)",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "post_to_slack",
        description: "Post a specific brief section to Slack. (Mock workflow action)",
        inputSchema: {
          type: "object",
          properties: {
            channel: {
              type: "string",
              description: "The Slack channel to post to (e.g., #engineering, #support).",
            },
            content: {
              type: "string",
              description: "The content to post to Slack.",
            },
          },
          required: ["channel", "content"],
        },
      },
      {
        name: "what_shipped_this_week",
        description:
          "Return a demo-friendly answer for “What shipped this week?” Uses the latest saved brief if present.",
        inputSchema: {
          type: "object",
          properties: {
            days: { type: "number" },
          },
        },
      },
    ],
  };
});

server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: "ship_brief",
        description: "Template prompt to generate a ship brief using TRAE + MCP tools (TRAE acts as the generator).",
        arguments: [
          {
            name: "days",
            description: "Number of days to include (default 7).",
            required: false,
          },
        ],
      },
    ],
  };
});

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const args = request.params.arguments ?? {};
  const days = clampInt(toInt(args.days, 7), 1, 30);

  if (request.params.name !== "ship_brief") throw new Error(`Unknown prompt: ${request.params.name}`);
  return {
    messages: [
      {
        role: "user",
        content: { type: "text", text: buildShipBriefPromptText(days) },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const args = request.params.arguments ?? {};

  switch (request.params.name) {
    case "get_raw_git_activity": {
      const result = await getRawGitActivity({ days: args.days });
      return toolText(JSON.stringify(result, null, 2));
    }
    case "save_latest_brief": {
      const generatedAt = typeof args.generatedAt === "string" ? args.generatedAt : new Date().toISOString();
      const brief = args.brief;
      const payload = {
        generatedAt,
        range: typeof args.range === "object" && args.range ? args.range : undefined,
        sources: typeof args.sources === "object" && args.sources ? args.sources : undefined,
        brief,
      };
      await writeLatestBriefAtomic(payload);
      return toolText(JSON.stringify(payload, null, 2));
    }
    case "get_latest_brief": {
      const latest = await readLatestBrief();
      if (!latest) return toolText("No latest brief saved yet.");
      return toolText(JSON.stringify(latest, null, 2));
    }
    case "delete_latest_brief": {
      const deleted = await deleteLatestBrief();
      return toolText(deleted ? "Deleted data/latest-brief.json." : "No latest brief file to delete.");
    }
    case "approve_brief": {
      return toolText("Successfully marked the latest brief as approved.");
    }
    case "post_to_slack": {
      return toolText(`Successfully posted to Slack channel ${args.channel}.\n\nContent preview:\n${args.content.substring(0, 100)}...`);
    }
    case "what_shipped_this_week": {
      const latest = await readLatestBrief();
      if (latest?.brief) {
        return toolText(
          [
            "Here’s what shipped this week (from the latest saved brief):",
            "",
            formatTldr(latest.brief),
            "",
            "Saved at: data/latest-brief.json",
          ].join("\n")
        );
      }
      const days = clampInt(toInt(args.days, 7), 1, 30);
      return toolText(
        [
          "No latest brief is saved yet.",
          "",
          `Use the ship_brief prompt (days=${days}) to generate one, then call save_latest_brief to persist it.`,
        ].join("\n")
      );
    }
    default:
      throw new Error(`Unknown tool: ${request.params.name}`);
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("TRAE Ship Brief MCP server running");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
