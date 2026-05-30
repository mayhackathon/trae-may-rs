import { generateShipBrief } from "@/lib/generateShipBrief";

let latest:
  | {
      generatedAt: string;
      brief: Awaited<ReturnType<typeof generateShipBrief>>;
    }
  | null = null;

export async function GET() {
  if (!latest) return Response.json({ error: "No brief generated yet." }, { status: 404 });
  return Response.json(latest);
}

export async function POST() {
  const brief = await generateShipBrief();
  latest = { generatedAt: new Date().toISOString(), brief };
  return Response.json(latest);
}
