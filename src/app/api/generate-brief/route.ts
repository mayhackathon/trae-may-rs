import { generateShipBrief } from "@/lib/generateShipBrief";

export async function POST() {
  const brief = await generateShipBrief();
  return Response.json(brief);
}
