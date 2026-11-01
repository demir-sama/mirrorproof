import { hasKey } from "@/lib/youcam";
export const dynamic = "force-dynamic";
export async function GET() { return Response.json({ live: hasKey() }); }
