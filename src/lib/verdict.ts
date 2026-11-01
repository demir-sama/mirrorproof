import { CONCERNS, INGREDIENTS, type ConcernId } from "./catalog";
import type { Scan, Trial } from "./types";

const DAY = 86_400_000;
/** Scan-to-scan noise of a YouCam raw_score under good capture, in score points (1–100 scale). */
export const NOISE = 2.5;

export type Point = { day: number; raw: number; ui: number; w: number; scanId: string };
export type ConcernTrend = {
  type: ConcernId; points: Point[]; baseline: number; latest: number; delta: number;
  slope: number; /** points per week */ perWeek: number; projected: number; z: number; projZ: number;
  status: "improving" | "flat" | "worsening" | "early";
};
export type VerdictKind = "BASELINE" | "KEEP_TESTING" | "KEEP" | "RETURN" | "STOP" | "WATCH";
export type Analysis = {
  verdict: VerdictKind; headline: string; reasons: string[];
  trends: ConcernTrend[]; day: number; deadline: Date; daysLeft: number; nextScan: Date | null;
  onsetWarning: string | null; confidence: number; comparability: { scanId: string; w: number; why: string | null }[];
};

export const dayOf = (t: Trial, iso: string) => Math.max(0, (new Date(iso).getTime() - new Date(t.startedAt).getTime()) / DAY);

/** How comparable a scan is with the baseline: lighting & sharpness drift lower its weight. */
export function comparability(base: Scan, s: Scan): { w: number; why: string | null } {
  if (base.id === s.id) return { w: 1, why: null };
  const db = Math.abs(s.quality.brightness - base.quality.brightness);
  const dw = Math.abs(s.quality.warmth - base.quality.warmth);
  const sharp = Math.min(1, s.quality.sharpness / Math.max(1, base.quality.sharpness));
  let w = 1 - Math.max(0, db - 6) / 50 - Math.max(0, dw - 8) / 60 - (1 - sharp) * 0.4;
  w = Math.max(0.25, Math.min(1, w));
  const why = w > 0.85 ? null
    : db > 12 ? `lighting ${s.quality.brightness > base.quality.brightness ? "brighter" : "darker"} than baseline`
    : dw > 14 ? "colour temperature differs from baseline"
    : "photo softer than baseline";
  return { w, why };
}

function wfit(pts: Point[]) {
  const sw = pts.reduce((a, p) => a + p.w, 0);
  const mx = pts.reduce((a, p) => a + p.w * p.day, 0) / sw;
  const my = pts.reduce((a, p) => a + p.w * p.raw, 0) / sw;
  const sxx = pts.reduce((a, p) => a + p.w * (p.day - mx) ** 2, 0);
  const sxy = pts.reduce((a, p) => a + p.w * (p.day - mx) * (p.raw - my), 0);
  const slope = sxx > 0 ? sxy / sxx : 0;
  const resid = pts.length > 2 ? Math.sqrt(pts.reduce((a, p) => a + p.w * (p.raw - (my + slope * (p.day - mx))) ** 2, 0) / (sw * (pts.length - 2) / pts.length)) : 0;
  return { slope, at: (d: number) => my + slope * (d - mx), resid, sxx, sw };
}

export function analyze(t: Trial, now = new Date()): Analysis {
  const ing = INGREDIENTS[t.ingredient];
  const start = new Date(t.startedAt);
  const deadline = new Date(start.getTime() + t.windowDays * DAY);
  const day = (now.getTime() - start.getTime()) / DAY;
  const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / DAY);
  const onsetWarning = t.windowDays < ing.onset[0] * 7
    ? `${ing.label} usually takes ${ing.onset[0]}–${ing.onset[1]} weeks to show, but your return window is ${t.windowDays} days. Mirrorproof will judge the trend line, not the finish line.`
    : null;
  const scans = [...t.scans].sort((a, b) => +new Date(a.takenAt) - +new Date(b.takenAt));
  const base = scans[0];
  const comp = scans.map((s) => ({ scanId: s.id, ...(base ? comparability(base, s) : { w: 1, why: null }) }));
  const cadence = Math.max(5, Math.min(7, Math.round(t.windowDays / 4)));
  const lastDay = scans.length ? dayOf(t, scans[scans.length - 1].takenAt) : 0;
  let nextScan: Date | null = daysLeft > 0 ? new Date(start.getTime() + (Math.floor(lastDay / cadence) + 1) * cadence * DAY) : null;
  if (nextScan && nextScan.getTime() > deadline.getTime() - DAY) nextScan = daysLeft > 1 ? new Date(deadline.getTime() - DAY) : null;

  const trends: ConcernTrend[] = t.concerns.map((c) => {
    const points: Point[] = scans.flatMap((s, i) => {
      const r = s.results.find((x) => x.type === c);
      return r ? [{ day: dayOf(t, s.takenAt), raw: r.raw, ui: r.ui, w: comp[i].w, scanId: s.id }] : [];
    });
    if (points.length < 2) {
      const b = points[0]?.raw ?? 0;
      return { type: c, points, baseline: b, latest: b, delta: 0, slope: 0, perWeek: 0, projected: b, z: 0, projZ: 0, status: "early" as const };
    }
    const f = wfit(points);
    const d0 = points[0].day, d1 = points[points.length - 1].day;
    const baseline = f.at(d0), latest = f.at(d1);
    const delta = latest - baseline;
    const sigma = Math.max(NOISE, f.resid);
    const meanW = f.sw / points.length;
    const se = (sigma * Math.SQRT2) / Math.sqrt(meanW) / Math.sqrt(Math.max(1, (points.length - 1) / 1.5));
    const z = delta / se;
    const projected = f.at(t.windowDays);
    const projZ = (projected - baseline) / se;
    const status = z >= 2 ? "improving" : z <= -2 ? "worsening" : "flat";
    return { type: c, points, baseline, latest, delta, slope: f.slope, perWeek: f.slope * 7, projected, z, projZ, status };
  });

  const reasons: string[] = [];
  const live = trends.filter((x) => x.status !== "early");
  const improving = live.filter((x) => x.status === "improving");
  const worsening = live.filter((x) => x.status === "worsening");
  const meanZ = live.length ? live.reduce((a, x) => a + x.z, 0) / live.length : 0;
  const confidence = Math.max(0, Math.min(1, (Math.abs(meanZ) / 3) * (scans.length >= 3 ? 1 : 0.75) * (comp.reduce((a, c) => a + c.w, 0) / Math.max(1, comp.length))));
  const lbl = (x: ConcernTrend) => CONCERNS[x.type].label.toLowerCase();
  const fmt = (x: ConcernTrend) => `${lbl(x)} ${x.delta >= 0 ? "+" : ""}${x.delta.toFixed(1)}`;

  let verdict: VerdictKind; let headline: string;
  if (!scans.length) {
    verdict = "BASELINE"; headline = "Take a baseline scan before your first use.";
    reasons.push("Every later scan is measured against this one, so keep the same spot, light and distance.");
  } else if (!live.length) {
    verdict = "KEEP_TESTING"; headline = "Baseline locked in. Keep using it as directed.";
    reasons.push(`Next check-in around day ${Math.round(lastDay + cadence)}. Same mirror, same light.`);
  } else if (worsening.some((x) => x.type === "redness" || x.type === "acne") && !(ing.purge && day < 28)) {
    verdict = "STOP"; headline = "Your skin is reacting. Stop and consider returning it.";
    worsening.forEach((x) => reasons.push(`${CONCERNS[x.type].label} got worse beyond measurement noise (${x.delta.toFixed(1)} pts, z ${x.z.toFixed(1)}).`));
  } else if (worsening.length && ing.purge && day < 28) {
    verdict = "WATCH"; headline = "Things look worse, which can be purging. Watch it for another week.";
    reasons.push(`${ing.label} often causes a 2–4 week purge. ${worsening.map(fmt).join(", ")}.`);
    reasons.push("If it is still worse at your next scan, Mirrorproof will tell you to stop.");
  } else if (improving.length && meanZ >= 1) {
    verdict = "KEEP"; headline = "It's working. Keep it.";
    improving.forEach((x) => reasons.push(`${CONCERNS[x.type].label} improved ${x.delta.toFixed(1)} pts (${x.perWeek >= 0 ? "+" : ""}${x.perWeek.toFixed(1)}/wk), ${x.z.toFixed(1)}× the noise floor.`));
  } else if (daysLeft <= 3 || (day >= 0.6 * t.windowDays && Math.max(...live.map((x) => x.projZ)) < 1.5)) {
    verdict = "RETURN"; headline = daysLeft <= 0 ? "No measurable change, and the window has closed." : "No measurable change. Return it while you still can.";
    reasons.push(`Nothing has moved beyond the ±${NOISE} pt noise floor: ${live.map(fmt).join(", ")}.`);
    reasons.push(`Even on the current trend, the gain by day ${t.windowDays} would not be measurable.`);
  } else {
    verdict = "KEEP_TESTING"; headline = "Too early to call. Keep going.";
    const best = [...live].sort((a, b) => b.projZ - a.projZ)[0];
    reasons.push(`Best signal so far: ${fmt(best)} pts. At this pace it reaches ${best.projZ.toFixed(1)}× noise by the deadline.`);
  }
  if (comp.some((c) => c.why)) reasons.push(`${comp.filter((c) => c.why).length} scan(s) were down-weighted for capture drift (${comp.find((c) => c.why)!.why}).`);
  return { verdict, headline, reasons, trends, day, deadline, daysLeft, nextScan, onsetWarning, confidence, comparability: comp };
}

export const VERDICT_STYLE: Record<VerdictKind, { word: string; color: string; ink: string }> = {
  BASELINE: { word: "Baseline", color: "#cfc6b8", ink: "#1b1714" },
  KEEP_TESTING: { word: "Keep testing", color: "#ffd98a", ink: "#1b1714" },
  WATCH: { word: "Watch", color: "#ffb26b", ink: "#1b1714" },
  KEEP: { word: "Keep it", color: "#7be0b0", ink: "#0d1f17" },
  RETURN: { word: "Return it", color: "#ff7a6b", ink: "#240c08" },
  STOP: { word: "Stop", color: "#ff4d6d", ink: "#2a0710" },
};
