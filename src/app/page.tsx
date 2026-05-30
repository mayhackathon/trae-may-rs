import HomeClient from "@/app/home-client";
import { readFile } from "node:fs/promises";
import path from "node:path";

async function readLatestBrief(): Promise<Record<string, unknown> | null> {
  const latestBriefPath = path.join(process.cwd(), "data", "latest-brief.json");
  try {
    const raw = await readFile(latestBriefPath, "utf-8");
    return JSON.parse(raw) as Record<string, unknown>;
  } catch (e) {
    const code =
      e && typeof e === "object" && "code" in e ? (e as { code?: unknown }).code : undefined;
    if (code === "ENOENT") return null;
    throw e;
  }
}

export default async function Home() {
  const latest = await readLatestBrief();
  const sources =
    latest && typeof latest.sources === "object" && latest.sources
      ? (latest.sources as Record<string, unknown>)
      : null;

  const generatedAt = latest && typeof latest.generatedAt === "string" ? latest.generatedAt : null;

  function getSummary(key: string): string | null {
    if (!sources) return null;
    const entry = sources[key];
    if (!entry || typeof entry !== "object") return null;
    if (!("summary" in entry)) return null;
    const summary = (entry as { summary?: unknown }).summary;
    if (typeof summary !== "string") return null;
    return summary;
  }

  const sourceSummary = {
    gitHistory: {
      title: "Git history",
      lines: [
        getSummary("git") ?? "No saved git snapshot yet.",
        generatedAt ? `Generated: ${generatedAt}` : "Generate via TRAE to populate.",
      ],
    },
    prs: {
      title: "PR summaries",
      lines: [
        getSummary("prs") ?? "No saved PR snapshot yet.",
        "Fetched via MCP connectors in TRAE.",
      ],
    },
    tickets: {
      title: "Ticket context",
      lines: [
        getSummary("tickets") ?? "No saved ticket snapshot yet.",
        "Fetched via MCP connectors in TRAE.",
      ],
    },
    supportNotes: {
      title: "Support notes",
      lines: [
        getSummary("supportNotes") ?? "No saved support snapshot yet.",
        "Optional input from support signals.",
      ],
    },
  };

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 font-sans">
      <main className="flex flex-1 flex-col">
        <HomeClient sourceSummary={sourceSummary} />
      </main>
    </div>
  );
}
