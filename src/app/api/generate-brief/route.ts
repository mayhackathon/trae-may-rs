import { readFile } from "node:fs/promises";
import path from "node:path";

type StoredBrief = {
  generatedAt: string;
  brief: {
    engineering: string;
    pmMarketing: string;
    support: string;
    audit: string;
    businessImpact?: string;
  };
} & Record<string, unknown>;

const latestBriefPath = path.join(process.cwd(), "data", "latest-brief.json");

async function readLatestBrief(): Promise<StoredBrief | null> {
  try {
    const raw = await readFile(latestBriefPath, "utf-8");
    return JSON.parse(raw) as StoredBrief;
  } catch (e) {
    const code =
      e && typeof e === "object" && "code" in e ? (e as { code?: unknown }).code : undefined;
    if (code === "ENOENT") return null;
    throw e;
  }
}

export async function GET() {
  const latest = await readLatestBrief();
  if (!latest) return Response.json({ error: "No brief generated yet." }, { status: 404 });
  return Response.json(latest);
}
