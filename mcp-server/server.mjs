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
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const args = request.params.arguments ?? {};
  const baseUrl = typeof args.baseUrl === "string" ? args.baseUrl : DEFAULT_BASE_URL;
  const endpoint = `${baseUrl.replace(/\/$/, "")}/api/generate-brief`;

  switch (request.params.name) {
    case "generate_ship_brief": {
      const result = await requestJson("POST", endpoint, {});
      return toolText(JSON.stringify(result, null, 2));
    }
    case "get_latest_brief": {
      const result = await requestJson("GET", endpoint);
      return toolText(JSON.stringify(result, null, 2));
    }
    case "get_support_note": {
      const result = await requestJson("GET", endpoint);
      return toolText(result.brief.support);
    }
    case "get_marketing_summary": {
      const result = await requestJson("GET", endpoint);
      return toolText(result.brief.pmMarketing);
    }
    case "get_audit_report": {
      const result = await requestJson("GET", endpoint);
      return toolText(result.brief.audit);
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

