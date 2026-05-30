import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function main() {
  const client = new Client({ name: "ship-brief-test-client", version: "0.1.0" });

  const transport = new StdioClientTransport({
    command: "node",
    args: ["mcp-server/server.mjs"],
    env: {
      ...process.env,
      SHIP_BRIEF_BASE_URL: process.env.SHIP_BRIEF_BASE_URL ?? "http://localhost:3000",
    },
  });

  await client.connect(transport);

  const tools = await client.listTools();
  process.stdout.write(`Tools: ${tools.tools.map((t) => t.name).join(", ")}\n`);

  await client.callTool({ name: "generate_ship_brief", arguments: {} });
  process.stdout.write(`generate_ship_brief ok\n`);

  const support = await client.callTool({ name: "get_support_note", arguments: {} });
  process.stdout.write(`get_support_note ok\n`);

  const latest = await client.callTool({ name: "get_latest_brief", arguments: {} });
  process.stdout.write(`get_latest_brief ok\n`);

  const shipped = await client.callTool({ name: "what_shipped_this_week", arguments: {} });
  process.stdout.write(`what_shipped_this_week ok\n`);

  process.stdout.write("\nSupport note preview:\n");
  process.stdout.write(String(support.content?.[0]?.text ?? "") + "\n");

  process.stdout.write("\nLatest brief payload keys:\n");
  process.stdout.write(String(latest.content?.[0]?.text ?? "").slice(0, 200) + "\n");

  process.stdout.write("\nWhat shipped this week preview:\n");
  process.stdout.write(String(shipped.content?.[0]?.text ?? "").slice(0, 400) + "\n");

  await client.close();
}

main().catch((err) => {
  process.stderr.write(String(err?.stack ?? err) + "\n");
  process.exit(1);
});
