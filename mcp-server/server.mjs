import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const DEFAULT_BASE_URL = process.env.SHIP_BRIEF_BASE_URL ?? "http://localhost:3000";

async function requestJson(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response from Ship Brief API (${res.status}).`);
  }

  if (!res.ok) {
    const message = json?.error ? String(json.error) : `Request failed (${res.status}).`;
    throw new Error(message);
  }

  return json;
}

function toolText(text) {
  return { content: [{ type: "text", text }] };
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

function formatFullBriefResponse(payload, appUrl) {
  const { generatedAt, brief } = payload;
  return [
    "TRAE Ship Brief",
    `Generated at: ${generatedAt}`,
    "Sources: local mock JSON (git history, PR summary, ticket context, support notes)",
    "",
    formatTldr(brief),
    "",
    "Review and copy in the Ship Brief app:",
    appUrl,
    "",
    "Engineering",
    brief.engineering,
    "",
    "PM and Marketing",
    brief.pmMarketing,
    "",
    "Support",
    brief.support,
    "",
    "Audit",
    brief.audit,
  ].join("\n");
}

const server = new Server(
  { name: "trae-ship-brief", version: "0.1.0" },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_raw_git_history",
        description: "Return the raw git history for the latest release (mock data).",
        inputSchema: {
          type: "object",
          properties: {
            baseUrl: {
              type: "string",
              description: "Ship Brief app base URL (defaults to SHIP_BRIEF_BASE_URL or http://localhost:3000).",
            },
          },
        },
      },
      {
        name: "get_raw_prs",
        description: "Return the raw pull request summaries for the latest release (mock data).",
        inputSchema: {
          type: "object",
          properties: {
            baseUrl: {
              type: "string",
              description: "Ship Brief app base URL (defaults to SHIP_BRIEF_BASE_URL or http://localhost:3000).",
            },
          },
        },
      },
      {
        name: "get_raw_tickets",
        description: "Return the raw ticket context for the latest release (mock data).",
        inputSchema: {
          type: "object",
          properties: {
            baseUrl: {
              type: "string",
              description: "Ship Brief app base URL (defaults to SHIP_BRIEF_BASE_URL or http://localhost:3000).",
            },
          },
        },
      },
      {
        name: "get_raw_support_notes",
        description: "Return the raw support notes for the latest release (mock data).",
        inputSchema: {
          type: "object",
          properties: {
            baseUrl: {
              type: "string",
              description: "Ship Brief app base URL (defaults to SHIP_BRIEF_BASE_URL or http://localhost:3000).",
            },
          },
        },
      },
      {
        name: "approve_brief",
        description: "Mark the latest generated brief as approved. (Mock workflow action)",
        inputSchema: {
          type: "object",
          properties: {
            baseUrl: {
              type: "string",
              description: "Ship Brief app base URL (defaults to SHIP_BRIEF_BASE_URL or http://localhost:3000).",
            },
          },
        },
      },
      {
        name: "post_to_slack",
        description: "Post a specific brief section to Slack. (Mock workflow action)",
        inputSchema: {
          type: "object",
          properties: {
            baseUrl: {
              type: "string",
              description: "Ship Brief app base URL (defaults to SHIP_BRIEF_BASE_URL or http://localhost:3000).",
            },
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
        name: "generate_ship_brief",
        description: "Generate a ship brief from the latest sources and store it as the latest brief.",
        inputSchema: {
          type: "object",
          properties: {
            baseUrl: {
              type: "string",
              description: "Ship Brief app base URL (defaults to SHIP_BRIEF_BASE_URL or http://localhost:3000).",
            },
          },
        },
      },
      {
        name: "get_latest_brief",
        description: "Return the latest generated ship brief (if one exists).",
        inputSchema: {
          type: "object",
          properties: {
            baseUrl: {
              type: "string",
              description: "Ship Brief app base URL (defaults to SHIP_BRIEF_BASE_URL or http://localhost:3000).",
            },
          },
        },
      },
      {
        name: "get_support_note",
        description: "Return the support-facing note for the latest release brief.",
        inputSchema: {
          type: "object",
          properties: {
            baseUrl: {
              type: "string",
              description: "Ship Brief app base URL (defaults to SHIP_BRIEF_BASE_URL or http://localhost:3000).",
            },
          },
        },
      },
      {
        name: "get_marketing_summary",
        description: "Return the PM and Marketing brief for the latest release.",
        inputSchema: {
          type: "object",
          properties: {
            baseUrl: {
              type: "string",
              description: "Ship Brief app base URL (defaults to SHIP_BRIEF_BASE_URL or http://localhost:3000).",
            },
          },
        },
      },
      {
        name: "get_audit_report",
        description: "Return the audit and uncertainty report for the latest release brief.",
        inputSchema: {
          type: "object",
          properties: {
            baseUrl: {
              type: "string",
              description: "Ship Brief app base URL (defaults to SHIP_BRIEF_BASE_URL or http://localhost:3000).",
            },
          },
        },
      },
      {
        name: "what_shipped_this_week",
        description:
          "Return a demo-friendly answer for “What shipped this week?” Retrieves latest brief if present, otherwise generates one.",
        inputSchema: {
          type: "object",
          properties: {
            baseUrl: {
              type: "string",
              description: "Ship Brief app base URL (defaults to SHIP_BRIEF_BASE_URL or http://localhost:3000).",
            },
          },
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const args = request.params.arguments ?? {};
  const baseUrl = typeof args.baseUrl === "string" ? args.baseUrl : DEFAULT_BASE_URL;
  const endpoint = `${baseUrl.replace(/\/$/, "")}/api/generate-brief`;
  const appUrl = `${baseUrl.replace(/\/$/, "")}/`;

  switch (request.params.name) {
    case "get_raw_git_history": {
      const result = await requestJson("GET", `${baseUrl.replace(/\/$/, "")}/data/git-history.json`);
      return toolText(JSON.stringify(result, null, 2));
    }
    case "get_raw_prs": {
      const result = await requestJson("GET", `${baseUrl.replace(/\/$/, "")}/data/prs.json`);
      return toolText(JSON.stringify(result, null, 2));
    }
    case "get_raw_tickets": {
      const result = await requestJson("GET", `${baseUrl.replace(/\/$/, "")}/data/tickets.json`);
      return toolText(JSON.stringify(result, null, 2));
    }
    case "get_raw_support_notes": {
      const result = await requestJson("GET", `${baseUrl.replace(/\/$/, "")}/data/support-notes.json`);
      return toolText(JSON.stringify(result, null, 2));
    }
    case "approve_brief": {
      return toolText("Successfully marked the latest brief as approved.");
    }
    case "post_to_slack": {
      return toolText(`Successfully posted to Slack channel ${args.channel}.\n\nContent preview:\n${args.content.substring(0, 100)}...`);
    }
    case "generate_ship_brief": {
      const result = await requestJson("POST", endpoint, {});
      return toolText(formatFullBriefResponse(result, appUrl));
    }
    case "get_latest_brief": {
      const result = await requestJson("GET", endpoint);
      return toolText(
        [
          "TRAE Ship Brief (latest)",
          `Generated at: ${result.generatedAt}`,
          "Sources: local mock JSON",
          "",
          formatTldr(result.brief),
          "",
          "Review and copy in the Ship Brief app:",
          appUrl,
        ].join("\n")
      );
    }
    case "get_support_note": {
      const result = await requestJson("GET", endpoint);
      return toolText(
        ["Source: Ship Brief (mock data)", "", result.brief.support, "", "Review and copy:", appUrl].join(
          "\n"
        )
      );
    }
    case "get_marketing_summary": {
      const result = await requestJson("GET", endpoint);
      return toolText(
        [
          "Source: Ship Brief (mock data)",
          "",
          result.brief.pmMarketing,
          "",
          "Review and copy:",
          appUrl,
        ].join("\n")
      );
    }
    case "get_audit_report": {
      const result = await requestJson("GET", endpoint);
      return toolText(
        ["Source: Ship Brief (mock data)", "", result.brief.audit, "", "Review and copy:", appUrl].join(
          "\n"
        )
      );
    }
    case "what_shipped_this_week": {
      try {
        const latest = await requestJson("GET", endpoint);
        return toolText(
          [
            "Here’s what shipped this week (latest brief already generated):",
            "",
            formatTldr(latest.brief),
            "",
            "Review and copy the full brief:",
            appUrl,
          ].join("\n")
        );
      } catch (e) {
        if (!(e instanceof Error) || !String(e.message).includes("No brief generated yet.")) throw e;
        const generated = await requestJson("POST", endpoint, {});
        return toolText(
          [
            "Here’s what shipped this week (generated now):",
            "",
            formatTldr(generated.brief),
            "",
            "Review and copy the full brief:",
            appUrl,
          ].join("\n")
        );
      }
    }
    default:
      throw new Error(`Unknown tool: ${request.params.name}`);
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`TRAE Ship Brief MCP server running (base URL: ${DEFAULT_BASE_URL})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
