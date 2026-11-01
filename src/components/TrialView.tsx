"use client";
import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toPng } from "html-to-image";
import { CONCERNS, INGREDIENTS, money } from "@/lib/catalog";
import type { Scan, Trial } from "@/lib/types";
import { analyze, dayOf, VERDICT_STYLE } from "@/lib/verdict";
import TrendChart from "./TrendChart";
import MirrorCompare from "./MirrorCompare";
import { Num, Ring, useBlob } from "./bits";

const fmtDate = (d: Date) => d.toLocaleDateString("en", { month: "short", day: "numeric" });

function Thumb({ s, active, label, onClick, w, why }: { s: Scan; active: boolean; label: string; onClick: () => void; w: number; why: string | null }) {
  const u = useBlob(s.image);
  return (
    <motion.button whileHover={{ y: -3 }} onClick={onClick} className={`relative w-28 shrink-0 overflow-hidden rounded-2xl border text-left ${active ? "border-gold" : "hair"}`}>
      {u && <img src={u} alt="" className="aspect-[3/4] w-full object-cover" />}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-night to-transparent p-2 pt-6">
        <div className="font-mono text-[10px]">{label}</div>
        <div className={`font-mono text-[9px] ${w > 0.85 ? "text-mint" : "text-gold"}`}>{w > 0.85 ? "comparable" : `weight ${w.toFixed(2)}`}</div>
      </div>
      {why && <div className="absolute top-1.5 right-1.5 grid h-5 w-5 place-items-center rounded-full bg-gold text-[10px] text-night" title={why}>!</div>}
    </motion.button>
  );
}

export default function TrialView({ trial, onScan, onBack, onClose, onDelete }: {
  trial: Trial; onScan: () => void; onBack: () => void; onClose: (k: "kept" | "returned") => void; onDelete: () => void;
}) {
  const a = useMemo(() => analyze(trial), [trial]);
  const st = VERDICT_STYLE[a.verdict];
  const ing = INGREDIENTS[trial.ingredient];
  const scans = [...trial.scans].sort((x, y) => +new Date(x.takenAt) - +new Date(y.takenAt));
  const [afterId, setAfterId] = useState<string | null>(null);
  const after = scans.find((s) => s.id === afterId) || scans[scans.length - 1];
  const card = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const dayLabel = (s: Scan) => `Day ${Math.round(dayOf(trial, s.takenAt))}`;
  const windowFrac = Math.min(1, Math.max(0, a.day / trial.windowDays));

  const note = `Hello,\n\nI bought ${trial.brand ? trial.brand + " " : ""}${trial.product} on ${fmtDate(new Date(trial.startedAt))} for ${money(trial.price, trial.currency)}. I used it as directed and tracked my skin with ${scans.length} consistent photo scans over ${Math.round(dayOf(trial, scans[scans.length - 1]?.takenAt || trial.startedAt))} days (YouCam Skin AI). ${a.verdict === "STOP" ? `My skin reacted: ${a.trends.filter((t) => t.status === "worsening").map((t) => CONCERNS[t.type].label.toLowerCase()).join(", ")} got measurably worse.` : `There was no measurable change in ${trial.concerns.map((c) => CONCERNS[c].label.toLowerCase()).join(", ")}.`}\n\nI'd like to return it within your ${trial.windowDays}-day satisfaction window. Please let me know the next steps.\n\nThank you.`;

  const download = async () => {
    if (!card.current) return;
    const url = await toPng(card.current, { pixelRatio: 2, backgroundColor: "#120f0d" });
    const l = document.createElement("a"); l.href = url; l.download = `mirrorproof-${trial.product.replace(/\W+/g, "-").toLowerCase()}.png`; l.click();
  };

  return (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mx-auto max-w-6xl px-6 pb-28">
      <button onClick={onBack} className="label mb-6 hover:text-cream">← All trials</button>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="label">{trial.brand || ing.label} · {money(trial.price, trial.currency)} {trial.sample && <span className="ml-2 rounded-full bg-gold/15 px-2 py-0.5 text-gold">sample trial</span>}</div>
          <h2 className="mt-2 max-w-3xl font-serif text-5xl leading-[1.02] tracking-tight md:text-6xl">{trial.product}</h2>
        </div>
        <div className="flex items-center gap-5">
          <Ring frac={windowFrac} size={112} color={a.daysLeft <= 3 ? "#ff7a6b" : "#e8c48a"}>
            <div><div className="font-serif text-3xl leading-none"><Num value={Math.max(0, a.daysLeft)} /></div><div className="label mt-1 !text-[9px]">days left</div></div>
          </Ring>
          <div className="text-sm text-dim">Return by<br /><span className="font-serif text-2xl text-cream">{fmtDate(a.deadline)}</span></div>
        </div>
      </div>

      <div ref={card} className="mt-10 grid gap-5 lg:grid-cols-[1.25fr_1fr]">
        <motion.div layout className="card relative overflow-hidden rounded-[28px] p-7">
          <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full blur-3xl" style={{ background: st.color, opacity: 0.18 }} />
          <div className="label">Verdict · day {Math.round(a.day)} of {trial.windowDays}</div>
          <div className="mt-4 flex items-center gap-5">
            <AnimatePresence mode="wait">
              <motion.div key={a.verdict} initial={{ scale: 2.4, rotate: -14, opacity: 0 }} animate={{ scale: 1, rotate: -6, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.25 }}
                className="rounded-2xl border-4 px-5 py-2 font-serif text-4xl font-semibold italic md:text-5xl" style={{ borderColor: st.color, color: st.color }}>{st.word}</motion.div>
            </AnimatePresence>
            <div className="hidden text-right sm:block"><div className="label">confidence</div><div className="font-serif text-3xl"><Num value={a.confidence * 100} />%</div></div>
          </div>
          <p className="mt-6 font-serif text-2xl leading-snug">{a.headline}</p>
          <ul className="mt-4 space-y-2 text-[15px] text-cream/80">
            {a.reasons.map((r, i) => (
              <motion.li key={r} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.12 }} className="flex gap-2"><span style={{ color: st.color }}>→</span>{r}</motion.li>
            ))}
          </ul>
          {a.onsetWarning && <div className="mt-5 rounded-2xl border border-gold/25 bg-gold/5 p-3 text-sm text-gold/90">{a.onsetWarning}</div>}
          <div className="mt-6 flex flex-wrap gap-3">
            {a.daysLeft > 0 && !trial.closed && <motion.button whileHover={{ scale: 1.03 }} className="btn btn-gold" onClick={onScan}>{scans.length ? "Add check-in scan" : "Take baseline scan"}</motion.button>}
            {a.nextScan && scans.length > 0 && <div className="self-center text-sm text-dim">Next check-in ≈ {fmtDate(a.nextScan)}</div>}
          </div>
        </motion.div>

        <div className="card rounded-[28px] p-5">
          {scans.length ? <MirrorCompare before={scans[0]} after={after} concerns={trial.concerns} dayLabel={dayLabel} />
            : <div className="grid aspect-[3/4] place-items-center rounded-[22px] border border-dashed hair text-center text-dim"><div><div className="font-serif text-3xl text-cream">No baseline yet</div><p className="mt-2 text-sm">Scan before the first use.</p></div></div>}
        </div>
      </div>

      {scans.length > 0 && (
        <>
          <div className="mt-12 flex items-baseline justify-between"><h3 className="font-serif text-3xl">The evidence</h3><span className="label">YouCam raw scores · higher is healthier</span></div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {a.trends.map((t, i) => (
              <motion.div key={t.type} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
                <TrendChart t={t} windowDays={trial.windowDays} today={a.day} />
              </motion.div>
            ))}
          </div>
          <div className="mt-12 flex items-baseline justify-between"><h3 className="font-serif text-3xl">Scan log</h3><span className="label">tap a scan to compare it with baseline</span></div>
          <div className="mt-5 flex gap-3 overflow-x-auto pb-2">
            {scans.map((s, i) => <Thumb key={s.id} s={s} active={s.id === after.id} label={`${dayLabel(s)} · ${fmtDate(new Date(s.takenAt))}`} onClick={() => setAfterId(s.id)} w={a.comparability[i].w} why={a.comparability[i].why} />)}
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-2">
            <div className="card rounded-[28px] p-6">
              <div className="label">Share the verdict</div>
              <p className="mt-2 text-sm text-dim">A PNG of the verdict and mirror, for your notes or your dermatologist.</p>
              <button className="btn btn-ghost mt-4" onClick={download}>Download verdict card</button>
              <div className="mt-6 flex flex-wrap gap-2">
                {!trial.closed ? (<>
                  <button className="btn btn-ghost !py-2 text-sm" onClick={() => onClose("kept")}>I kept it</button>
                  <button className="btn btn-ghost !py-2 text-sm" onClick={() => onClose("returned")}>I returned it</button>
                </>) : <span className="text-sm text-mint">Closed: you {trial.closed} it.</span>}
                {!trial.sample && <button className="btn !py-2 text-sm text-rose hover:bg-rose/10" onClick={onDelete}>Delete trial</button>}
              </div>
            </div>
            {a.verdict === "RETURN" || a.verdict === "STOP" ? (
              <div className="card rounded-[28px] p-6">
                <div className="flex items-baseline justify-between"><div className="label">Return note, ready to send</div>
                  <button className="text-sm text-gold hover:underline" onClick={() => { navigator.clipboard.writeText(note); setCopied(true); setTimeout(() => setCopied(false), 1600); }}>{copied ? "Copied ✓" : "Copy"}</button></div>
                <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-cream/75">{note}</pre>
              </div>
            ) : (
              <div className="card rounded-[28px] p-6">
                <div className="label">What you are paying for</div>
                {(() => {
                  const gain = a.trends.filter((t) => t.status === "improving").reduce((s, t) => s + t.delta, 0);
                  return gain > 0 ? (<>
                    <div className="mt-3 font-serif text-4xl">{money(trial.price / gain, trial.currency)}<span className="text-base text-dim"> per point gained</span></div>
                    <p className="mt-2 text-sm text-dim">{gain.toFixed(1)} raw points of measured improvement across {a.trends.filter((t) => t.status === "improving").map((t) => CONCERNS[t.type].label.toLowerCase()).join(" and ")}. Use it to compare against the next product you try.</p>
                  </>) : (<>
                    <div className="mt-3 font-serif text-3xl">No measured gain yet</div>
                    <p className="mt-2 text-sm text-dim">If the verdict turns to return, a ready-to-send return note appears here with your evidence.</p>
                  </>);
                })()}
              </div>
            )}
          </div>
        </>
      )}
    </motion.div>
  );
}
