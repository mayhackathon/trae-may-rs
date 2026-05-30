import { generateShipBrief } from "@/lib/generateShipBrief";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type StoredBrief = {
  generatedAt: string;
  brief: Awaited<ReturnType<typeof generateShipBrief>>;
};

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

async function writeLatestBrief(payload: StoredBrief): Promise<void> {
  await mkdir(path.dirname(latestBriefPath), { recursive: true });
  await writeFile(latestBriefPath, JSON.stringify(payload, null, 2) + "\n", "utf-8");
}

export async function GET() {
  const latest = await readLatestBrief();
  if (!latest) return Response.json({ error: "No brief generated yet." }, { status: 404 });
  return Response.json(latest);
}

export async function POST() {
  const brief = await generateShipBrief();
  const latest = { generatedAt: new Date().toISOString(), brief };
  await writeLatestBrief(latest);
  return Response.json(latest);
}
