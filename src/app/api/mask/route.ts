export const runtime = "nodejs";
/** Same-origin proxy for YouCam's short-lived mask images so the browser can store them. */
export async function GET(req: Request) {
  const u = new URL(req.url).searchParams.get("u") || "";
  let host = "";
  try { host = new URL(u).hostname; } catch { return new Response("bad url", { status: 400 }); }
  if (!/(\.amazonaws\.com|\.perfectcorp\.com|\.makeupar\.com|\.cloudfront\.net)$/.test(host)) return new Response("host not allowed", { status: 403 });
  const r = await fetch(u, { cache: "no-store" });
  if (!r.ok) return new Response("mask fetch failed", { status: 502 });
  return new Response(r.body, { headers: { "Content-Type": r.headers.get("content-type") || "image/png", "Cache-Control": "private, max-age=3600" } });
}
