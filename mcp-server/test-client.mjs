import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function main() {
  const client = new Client({ name: "ship-brief-test-client", version: "0.1.0" });

  const transport = new StdioClientTransport({
    command: "node",
    args: ["mcp-server/server.mjs"],
    env: { ...process.env },
  });

  await client.connect(transport);

  const tools = await client.listTools();
  process.stdout.write(`Tools: ${tools.tools.map((t) => t.name).join(", ")}\n`);

  const prompts = await client.listPrompts();
  process.stdout.write(`Prompts: ${prompts.prompts.map((p) => p.name).join(", ")}\n`);

  const git = await client.callTool({ name: "get_raw_git_activity", arguments: { days: 7 } });
  process.stdout.write(`get_raw_git_activity ok\n`);

  const fixture = {
    generatedAt: new Date().toISOString(),
    range: { type: "lastDays", days: 7 },
    sources: {
      git: { summary: "Fixture run", raw: String(git.content?.[0]?.text ?? "") },
      prs: { summary: "None", raw: "" },
      tickets: { summary: "None", raw: "" },
      supportNotes: { summary: "None", raw: "" },
    },
    brief: {
      engineering: "Engineering changelog\n\n- Fixture brief",
      pmMarketing: "PM and Marketing brief\n\n- Fixture brief",
      support: "Support-facing note\n\n- Fixture brief",
      audit: "Audit and uncertainty report\n\nSources used\n- Fixture",
    },
  };

  await client.callTool({ name: "save_latest_brief", arguments: fixture });
  process.stdout.write(`save_latest_brief ok\n`);

  const latest = await client.callTool({ name: "get_latest_brief", arguments: {} });
  process.stdout.write(`get_latest_brief ok\n`);

  const shipped = await client.callTool({ name: "what_shipped_this_week", arguments: {} });
  process.stdout.write(`what_shipped_this_week ok\n`);

  process.stdout.write("\nLatest brief preview:\n");
  process.stdout.write(String(latest.content?.[0]?.text ?? "").slice(0, 400) + "\n");

  process.stdout.write("\nWhat shipped this week preview:\n");
  process.stdout.write(String(shipped.content?.[0]?.text ?? "").slice(0, 400) + "\n");

  await client.close();
}

main().catch((err) => {
  process.stderr.write(String(err?.stack ?? err) + "\n");
  process.exit(1);
});
