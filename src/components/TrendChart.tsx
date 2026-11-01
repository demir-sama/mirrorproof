"use client";
import { motion } from "framer-motion";
import { CONCERNS } from "@/lib/catalog";
import { NOISE, type ConcernTrend } from "@/lib/verdict";

/** Raw-score trend per concern with the noise band around baseline and a projection to the return deadline. */
export default function TrendChart({ t, windowDays, today }: { t: ConcernTrend; windowDays: number; today: number }) {
  const W = 300, H = 130, P = { l: 8, r: 8, t: 14, b: 20 };
  const c = CONCERNS[t.type];
  const vals = t.points.map((p) => p.raw).concat([t.baseline + NOISE * 2, t.baseline - NOISE * 2, t.projected]);
  const lo = Math.floor(Math.min(...vals) - 3), hi = Math.ceil(Math.max(...vals) + 3);
  const x = (d: number) => P.l + (d / windowDays) * (W - P.l - P.r);
  const y = (v: number) => P.t + (1 - (v - lo) / Math.max(1, hi - lo)) * (H - P.t - P.b);
  const path = t.points.map((p, i) => `${i ? "L" : "M"}${x(p.day).toFixed(1)},${y(p.raw).toFixed(1)}`).join(" ");
  const last = t.points[t.points.length - 1];
  const tone = t.status === "improving" ? "#7be0b0" : t.status === "worsening" ? "#ff7a6b" : "#a99d8f";
  return (
    <div className="card rounded-2xl p-4">
      <div className="mb-1 flex items-baseline justify-between">
        <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: c.hue }} /><span className="font-semibold">{c.label}</span></div>
        <span className="label" style={{ color: tone }}>{t.status === "early" ? "baseline only" : t.status}</span>
      </div>
      <div className="flex items-end gap-3">
        <div className="font-serif text-4xl leading-none">{last ? last.ui : "--"}<span className="ml-1 text-sm text-dim">/100</span></div>
        {t.status !== "early" && <div className="pb-1 font-mono text-sm" style={{ color: tone }}>{t.delta >= 0 ? "▲" : "▼"} {Math.abs(t.delta).toFixed(1)} raw · {t.z.toFixed(1)}σ</div>}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full overflow-visible">
        {t.points.length > 0 && <rect x={P.l} width={W - P.l - P.r} y={y(t.baseline + NOISE * 2)} height={Math.max(1, y(t.baseline - NOISE * 2) - y(t.baseline + NOISE * 2))} fill="rgba(243,235,223,.06)" rx="4" />}
        <line x1={x(Math.min(today, windowDays))} x2={x(Math.min(today, windowDays))} y1={P.t - 6} y2={H - P.b} stroke="rgba(232,196,138,.45)" strokeDasharray="2 3" />
        <line x1={x(windowDays)} x2={x(windowDays)} y1={P.t - 6} y2={H - P.b} stroke="rgba(255,122,107,.6)" />
        <text x={x(windowDays) - 3} y={H - 6} textAnchor="end" className="fill-rose font-mono" fontSize="9">RETURN BY</text>
        <text x={P.l} y={H - 6} className="fill-dim font-mono" fontSize="9">DAY 0</text>
        {last && t.points.length > 1 && <motion.line x1={x(last.day)} y1={y(last.raw)} x2={x(windowDays)} y2={y(t.projected)} stroke={tone} strokeOpacity={0.5} strokeDasharray="4 4" strokeWidth="1.5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} />}
        <motion.path d={path} fill="none" stroke={c.hue} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, ease: "easeInOut" }} />
        {t.points.map((p, i) => (
          <motion.circle key={p.scanId} cx={x(p.day)} cy={y(p.raw)} r={4.5} fill="#120f0d" stroke={c.hue} strokeWidth="2" strokeOpacity={p.w}
            initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3 + i * 0.25, type: "spring" }} />
        ))}
      </svg>
      <div className="mt-1 flex justify-between font-mono text-[10px] text-dim">
        <span>band ±2σ</span>
        {t.status !== "early" && <span>{t.perWeek >= 0 ? "+" : ""}{t.perWeek.toFixed(1)}/wk → {t.projected.toFixed(0)} @ d{windowDays}</span>}
      </div>
    </div>
  );
}
