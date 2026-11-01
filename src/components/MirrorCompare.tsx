"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { CONCERNS, type ConcernId } from "@/lib/catalog";
import type { Scan } from "@/lib/types";
import { useBlob } from "./bits";

function Layer({ scan, on }: { scan: Scan; on: ConcernId[] }) {
  const img = useBlob(scan.image);
  return (
    <div className="absolute inset-0">
      {img && <img src={img} alt="" className="h-full w-full object-cover" draggable={false} />}
      {scan.results.filter((r) => on.includes(r.type) && r.mask).map((r) => <MaskTint key={r.type} k={r.mask!} color={CONCERNS[r.type].hue} />)}
    </div>
  );
}
function MaskTint({ k, color }: { k: string; color: string }) {
  const u = useBlob(k);
  if (!u) return null;
  return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.85 }} className="maskfill absolute inset-0" style={{ background: color, WebkitMaskImage: `url(${u})`, maskImage: `url(${u})` }} />;
}

export default function MirrorCompare({ before, after, concerns, dayLabel }: { before: Scan; after: Scan; concerns: ConcernId[]; dayLabel: (s: Scan) => string }) {
  const [pos, setPos] = useState(50);
  const [on, setOn] = useState<ConcernId[]>([]);
  const hasMasks = after.results.some((r) => r.mask) || before.results.some((r) => r.mask);
  return (
    <div>
      <div className="relative aspect-[3/4] w-full select-none overflow-hidden rounded-[28px] border hair bg-night2"
        onPointerMove={(e) => { if (e.buttons !== 1) return; const r = e.currentTarget.getBoundingClientRect(); setPos(Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100))); }}
        onPointerDown={(e) => { const r = e.currentTarget.getBoundingClientRect(); setPos(Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100))); }}>
        <Layer scan={after} on={on} />
        <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}><Layer scan={before} on={on} /></div>
        <div className="absolute inset-y-0 w-[2px] bg-gold shadow-[0_0_20px_rgba(232,196,138,.8)]" style={{ left: `${pos}%` }}>
          <div className="absolute top-1/2 left-1/2 grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-gold text-night">⟷</div>
        </div>
        <span className="label absolute top-4 left-4 rounded-full bg-night/70 px-3 py-1 !text-cream">{dayLabel(before)}</span>
        <span className="label absolute top-4 right-4 rounded-full bg-night/70 px-3 py-1 !text-cream">{dayLabel(after)}</span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="label mr-1">YouCam masks</span>
        {concerns.map((c) => (
          <button key={c} disabled={!hasMasks} onClick={() => setOn((o) => (o.includes(c) ? o.filter((x) => x !== c) : [...o, c]))}
            className={`rounded-full border px-3 py-1 text-xs transition ${on.includes(c) ? "text-night" : "hair text-cream/75"} ${hasMasks ? "" : "opacity-40"}`}
            style={on.includes(c) ? { background: CONCERNS[c].hue, borderColor: CONCERNS[c].hue } : undefined}>{CONCERNS[c].label}</button>
        ))}
        {!hasMasks && <span className="text-xs text-dim">(masks appear on live YouCam scans)</span>}
      </div>
    </div>
  );
}
