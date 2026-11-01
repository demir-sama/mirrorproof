import { pollSkinAnalysis, friendly } from "@/lib/youcam";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const r = await pollSkinAnalysis(id);
    if (!r.outputs) return Response.json({ status: r.status || "running" });
    return Response.json({
      status: "success",
      results: r.outputs.map((o) => ({ type: o.type, ui: o.ui_score, raw: o.raw_score, maskUrl: o.mask_urls?.[0] })),
    });
  } catch (e) {
    console.error("scan poll", e);
    return Response.json({ status: "error", error: friendly(e) }, { status: 200 });
  }
}
