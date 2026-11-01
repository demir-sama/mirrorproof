"use client";
import type { ConcernId } from "./catalog";
import type { ConcernResult } from "./types";
import { putBlob } from "./store";
import { fileToDataUrl } from "./capture";

export async function runScan(dataUrl: string, actions: ConcernId[], onStage: (s: string) => void): Promise<{ results: ConcernResult[]; taskId: string }> {
  onStage("Uploading to YouCam");
  const r = await fetch("/api/scan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: dataUrl, actions }) });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || "Scan failed");
  const taskId: string = j.taskId;
  onStage("YouCam Skin AI analysing");
  const t0 = Date.now();
  for (;;) {
    await new Promise((res) => setTimeout(res, Date.now() - t0 < 6000 ? 1500 : 2500));
    const p = await (await fetch(`/api/scan/${encodeURIComponent(taskId)}`)).json();
    if (p.status === "error") throw new Error(p.error || "Analysis failed");
    if (p.status === "success") {
      onStage("Saving detection masks");
      const results: ConcernResult[] = [];
      for (const o of p.results as { type: ConcernId; ui: number; raw: number; maskUrl?: string }[]) {
        let mask: string | undefined;
        if (o.maskUrl) {
          try { const m = await fetch(`/api/mask?u=${encodeURIComponent(o.maskUrl)}`); if (m.ok) mask = await putBlob(await fileToDataUrl(await m.blob())); } catch {}
        }
        results.push({ type: o.type, ui: o.ui, raw: o.raw, mask });
      }
      return { results, taskId };
    }
    if (Date.now() - t0 > 120_000) throw new Error("YouCam is taking unusually long. Try again in a minute.");
  }
}
