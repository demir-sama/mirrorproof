import { startSkinAnalysis, friendly, hasKey } from "@/lib/youcam";
import { CONCERNS, MAX_CONCERNS } from "@/lib/catalog";
export const runtime = "nodejs";
export const maxDuration = 60;

const hits = new Map<string, number[]>();
const LIMIT = Number(process.env.SCANS_PER_HOUR || 8);

export async function POST(req: Request) {
  if (!hasKey()) return Response.json({ error: "Live scanning is offline: no YouCam API key is configured." }, { status: 503 });
  const ip = (req.headers.get("x-forwarded-for") || "local").split(",")[0].trim();
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 3_600_000);
  if (recent.length >= LIMIT) return Response.json({ error: `Demo limit: ${LIMIT} live scans per hour. Try the sample trial meanwhile.` }, { status: 429 });
  const { image, actions } = await req.json();
  const acts: string[] = (Array.isArray(actions) ? actions : []).filter((a: string) => a in CONCERNS).slice(0, MAX_CONCERNS);
  if (!acts.length) return Response.json({ error: "Pick at least one concern." }, { status: 400 });
  const m = /^data:image\/jpeg;base64,(.+)$/.exec(image || "");
  if (!m) return Response.json({ error: "Expected a JPEG data URL." }, { status: 400 });
  const bytes = Buffer.from(m[1], "base64");
  if (bytes.length > 8_000_000) return Response.json({ error: "Photo too large." }, { status: 413 });
  try {
    const taskId = await startSkinAnalysis(bytes, acts);
    recent.push(now); hits.set(ip, recent);
    return Response.json({ taskId });
  } catch (e) {
    console.error("scan start", e);
    return Response.json({ error: friendly(e) }, { status: 502 });
  }
}
