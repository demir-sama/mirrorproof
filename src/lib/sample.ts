"use client";
import type { Trial, Scan } from "./types";
import { normalise } from "./capture";
import data from "../../public/samples/sample.json";

const DAY = 86_400_000;
/** Builds the bundled sample trial from YouCam results recorded on the three sample photos. */
export async function buildSample(): Promise<Trial> {
  const start = new Date(Date.now() - 28.4 * DAY);
  const scans: Scan[] = [];
  for (const s of data.scans) {
    const { quality } = await normalise(s.image);
    scans.push({
      id: "sample-" + s.day, takenAt: new Date(start.getTime() + s.day * DAY + 3_600_000).toISOString(),
      image: s.image, quality, source: "sample", taskId: s.taskId,
      results: s.results.map((r) => ({ type: r.type as Scan["results"][number]["type"], ui: r.ui, raw: r.raw, mask: r.mask || undefined })),
    });
  }
  return {
    id: "sample-ava", sample: true, product: data.product, brand: data.brand, ingredient: data.ingredient as Trial["ingredient"],
    price: data.price, currency: data.currency, startedAt: start.toISOString(), windowDays: data.windowDays,
    concerns: data.concerns as Trial["concerns"], scans,
  };
}
export const sampleRecorded = data.recorded as boolean;
