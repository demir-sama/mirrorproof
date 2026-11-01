"use client";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CONCERNS, money } from "@/lib/catalog";
import type { Scan, Trial } from "@/lib/types";
import { loadTrials, saveTrials, dropTrialBlobs } from "@/lib/store";
import { analyze, VERDICT_STYLE } from "@/lib/verdict";
import { buildSample, sampleRecorded } from "@/lib/sample";
import NewTrial from "./NewTrial";
import TrialView from "./TrialView";
import Capture from "./Capture";
import { Logo, useBlob } from "./bits";

type View = { k: "home" } | { k: "new" } | { k: "trial"; id: string };
const FACES = ["/samples/ava-d0.jpg", "/samples/ava-d14.jpg", "/samples/ava-d28.jpg"];

function HeroMirror() {
  const [i, setI] = useState(0);
  useEffect(() => { const t = setInterval(() => setI((x) => (x + 1) % FACES.length), 2600); return () => clearInterval(t); }, []);
  const chips = [
    { c: "acne", v: [38, 50, 64], x: "-12%", y: "22%" },
    { c: "redness", v: [35, 45, 59], x: "78%", y: "38%" },
    { c: "pore", v: [55, 56, 57], x: "-6%", y: "66%" },
  ] as const;
  return (
    <div className="relative mx-auto w-[300px] md:w-[360px]">
      <div className="spin-slow absolute -inset-8 rounded-[50%] border border-dashed border-gold/25" />
      <div className="spin-rev absolute -inset-16 rounded-[50%] border border-cream/5" />
      <div className="relative aspect-[3/4] overflow-hidden rounded-[50%] border-2 border-gold/60 shadow-[0_0_80px_-10px_rgba(232,196,138,.45)]">
        <AnimatePresence mode="popLayout">
          <motion.img key={i} src={FACES[i]} alt="" initial={{ opacity: 0, scale: 1.06 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1 }} className="absolute inset-0 h-full w-full object-cover" />
        </AnimatePresence>
        <div className="sweep absolute inset-x-0 h-1/3 bg-gradient-to-b from-transparent via-gold/10 to-gold/40 mix-blend-screen" />
      </div>
      <motion.div key={"d" + i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="absolute -bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-gold px-4 py-1.5 font-mono text-xs text-night">DAY {i * 14}</motion.div>
      {chips.map((ch, k) => (
        <motion.div key={ch.c} className="card absolute rounded-2xl px-3 py-2" style={{ left: ch.x, top: ch.y }} animate={{ y: [0, -6, 0] }} transition={{ duration: 4 + k, repeat: Infinity }}>
          <div className="flex items-center gap-1.5 text-[11px] text-dim"><span className="h-1.5 w-1.5 rounded-full" style={{ background: CONCERNS[ch.c].hue }} />{CONCERNS[ch.c].label}</div>
          <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-serif text-2xl">{ch.v[i]}</motion.div>
        </motion.div>
      ))}
    </div>
  );
}

function ShelfCard({ t, onOpen }: { t: Trial; onOpen: () => void }) {
  const a = analyze(t); const st = VERDICT_STYLE[a.verdict];
  const last = [...t.scans].sort((x, y) => +new Date(y.takenAt) - +new Date(x.takenAt))[0];
  const img = useBlob(last?.image);
  return (
    <motion.button layout whileHover={{ y: -4 }} onClick={onOpen} className="card group flex gap-4 overflow-hidden rounded-3xl p-4 text-left">
      <div className="h-28 w-20 shrink-0 overflow-hidden rounded-[40%] border hair bg-night">{img && <img src={img} alt="" className="h-full w-full object-cover transition group-hover:scale-105" />}</div>
      <div className="min-w-0 flex-1">
        <div className="label truncate">{t.brand || "Trial"} · {money(t.price, t.currency)}</div>
        <div className="mt-1 line-clamp-2 font-serif text-xl leading-tight">{t.product}</div>
        <div className="mt-3 flex items-center gap-2">
          <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: st.color, color: st.ink }}>{t.closed ? (t.closed === "kept" ? "Kept" : "Returned") : st.word}</span>
          <span className="font-mono text-[11px] text-dim">{t.scans.length} scans · {Math.max(0, a.daysLeft)}d left</span>
        </div>
      </div>
    </motion.button>
  );
}

export default function App() {
  const [trials, setTrials] = useState<Trial[]>([]);
  const [view, setView] = useState<View>({ k: "home" });
  const [capture, setCapture] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setTrials(loadTrials());
    fetch("/api/caps").then((r) => r.json()).then((j) => setLive(!!j.live)).catch(() => {});
  }, []);
  const persist = (t: Trial[]) => { setTrials(t); saveTrials(t); };
  const trial = view.k === "trial" ? trials.find((t) => t.id === view.id) : undefined;
  const capTrial = trials.find((t) => t.id === capture);
  const go = (v: View) => { setView(v); window.scrollTo({ top: 0, behavior: "smooth" }); };

  const openSample = async () => {
    const existing = trials.find((t) => t.id === "sample-ava");
    const s = await buildSample();
    persist(existing ? trials.map((t) => (t.id === s.id ? { ...s, closed: t.closed } : t)) : [s, ...trials]);
    go({ k: "trial", id: s.id });
  };
  const addScan = (id: string, s: Scan) => {
    persist(trials.map((t) => (t.id === id ? { ...t, scans: [...t.scans, s] } : t)));
    setCapture(null); setToast("Scan saved. Verdict updated."); setTimeout(() => setToast(null), 2600);
  };
  const others = useMemo(() => trials.filter((t) => !t.sample), [trials]);

  return (
    <div className="grain glow min-h-screen">
      <header className="sticky top-0 z-40 border-b hair bg-night/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <button onClick={() => go({ k: "home" })} className="flex items-center gap-2.5"><Logo /><span className="font-serif text-2xl tracking-tight">Mirrorproof</span></button>
          <div className="flex items-center gap-3">
            <span className={`hidden items-center gap-2 font-mono text-[11px] sm:flex ${live ? "text-mint" : "text-dim"}`}><span className={`h-2 w-2 rounded-full ${live ? "bg-mint shadow-[0_0_10px_#7be0b0]" : "bg-dim"}`} />YouCam Skin AI {live ? "live" : "offline"}</span>
            <button className="btn btn-gold !py-2 text-sm" onClick={() => go({ k: "new" })}>New trial</button>
          </div>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {view.k === "home" && (
          <motion.main key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <section className="mx-auto grid max-w-6xl items-center gap-16 px-6 pt-16 pb-24 md:grid-cols-[1.15fr_1fr] md:pt-24">
              <div>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="label">A clinical trial for one · powered by YouCam Skin AI</motion.div>
                <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mt-5 font-serif text-[54px] leading-[0.98] tracking-tight md:text-[78px]">
                  Is it working, <br /><em className="text-gold">or just expensive?</em>
                </motion.h1>
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-6 max-w-xl text-lg text-cream/70">
                  New serum, 30-day return window, and no idea if it's doing anything. Mirrorproof scans your skin before the first use and at every check-in, separates real change from photo noise, and tells you to <b className="text-mint">keep it</b> or <b className="text-rose">return it</b> while you still can.
                </motion.p>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="mt-9 flex flex-wrap gap-3">
                  <button className="btn btn-gold text-base" onClick={() => go({ k: "new" })}>Start a trial →</button>
                  <button className="btn btn-ghost text-base" onClick={openSample}>Open the 28-day sample</button>
                </motion.div>
                <div className="mt-10 grid max-w-lg grid-cols-3 gap-6 border-t hair pt-6">
                  {[["12", "skin concerns via YouCam"], ["±2σ", "noise floor, never hype"], ["0", "accounts: data stays on device"]].map(([n, l]) => (
                    <div key={l}><div className="font-serif text-3xl">{n}</div><div className="mt-1 text-xs text-dim">{l}</div></div>
                  ))}
                </div>
              </div>
              <HeroMirror />
            </section>

            {others.length > 0 && (
              <section className="mx-auto max-w-6xl px-6 pb-16">
                <div className="mb-5 flex items-baseline justify-between"><h2 className="font-serif text-3xl">Your trials</h2><span className="label">{others.length} on the shelf</span></div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{others.map((t) => <ShelfCard key={t.id} t={t} onOpen={() => go({ k: "trial", id: t.id })} />)}</div>
              </section>
            )}

            <section className="mx-auto max-w-6xl px-6 pb-28">
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  ["01", "Baseline before the first drop", "A guided selfie with a lighting and sharpness check. YouCam Skin AI scores up to four concerns you pick, with detection masks."],
                  ["02", "Check-ins that are actually comparable", "A ghost of your baseline lines you up. Scans with drifting light are down-weighted instead of fooling you."],
                  ["03", "A verdict with error bars", "Weighted trend lines against a noise floor, ingredient onset times and purge awareness give you keep, watch, stop or return, plus a ready-made return note."],
                ].map(([n, h, p], i) => (
                  <motion.div key={n} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="card rounded-3xl p-6">
                    <div className="font-mono text-sm text-gold">{n}</div><div className="mt-3 font-serif text-2xl leading-tight">{h}</div><p className="mt-3 text-sm text-dim">{p}</p>
                  </motion.div>
                ))}
              </div>
              <p className="mt-10 text-center text-xs text-dim">Mirrorproof gives cosmetic guidance, not medical advice. {sampleRecorded ? "The sample trial uses YouCam results recorded on synthetic portraits." : "The sample trial uses illustrative scores on synthetic portraits."}</p>
            </section>
          </motion.main>
        )}
        {view.k === "new" && (
          <motion.main key="new" className="pt-14">
            <NewTrial onCancel={() => go({ k: "home" })} onCreate={(t) => { persist([t, ...trials]); go({ k: "trial", id: t.id }); setCapture(t.id); }} />
          </motion.main>
        )}
        {view.k === "trial" && trial && (
          <motion.main key={"t" + trial.id} className="pt-12">
            <TrialView trial={trial} onBack={() => go({ k: "home" })} onScan={() => setCapture(trial.id)}
              onClose={(k) => persist(trials.map((t) => (t.id === trial.id ? { ...t, closed: k } : t)))}
              onDelete={async () => { await dropTrialBlobs(trial); persist(trials.filter((t) => t.id !== trial.id)); go({ k: "home" }); }} />
          </motion.main>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {capTrial && (
          <Capture key="cap" live={live} concerns={capTrial.concerns} title={capTrial.product}
            baseline={[...capTrial.scans].sort((x, y) => +new Date(x.takenAt) - +new Date(y.takenAt))[0]}
            onClose={() => setCapture(null)} onDone={(s) => addScan(capTrial.id, s)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {toast && <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-mint px-5 py-2.5 text-sm font-semibold text-night shadow-xl">{toast}</motion.div>}
      </AnimatePresence>
    </div>
  );
}
