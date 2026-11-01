"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CONCERNS, type ConcernId } from "@/lib/catalog";
import type { Quality, Scan } from "@/lib/types";
import { fileToDataUrl, measure, normalise } from "@/lib/capture";
import { putBlob, uid } from "@/lib/store";
import { runScan } from "@/lib/scan";
import { useBlob } from "./bits";

type Shot = { dataUrl: string; quality: Quality };
const PRACTICE = ["/samples/ava-d0.jpg", "/samples/ava-d14.jpg", "/samples/ava-d28.jpg"];

function Meter({ label, v, good, unit = "" }: { label: string; v: number; good: boolean; unit?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="text-dim">{label}</span>
      <span className={`font-mono ${good ? "text-mint" : "text-gold"}`}>{v.toFixed(0)}{unit} {good ? "✓" : "•"}</span>
    </div>
  );
}

export default function Capture({ concerns, baseline, live, onDone, onClose, title }: {
  concerns: ConcernId[]; baseline?: Scan; live: boolean; onDone: (s: Scan) => void; onClose: () => void; title: string;
}) {
  const [tab, setTab] = useState<"camera" | "upload" | "practice">(live ? "camera" : "practice");
  const [shot, setShot] = useState<Shot | null>(null);
  const [stage, setStage] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [liveQ, setLiveQ] = useState<Quality | null>(null);
  const [camErr, setCamErr] = useState<string | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const ghost = useBlob(baseline?.image);

  useEffect(() => {
    if (tab !== "camera" || shot) return;
    let stream: MediaStream | null = null; let timer: ReturnType<typeof setInterval>;
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: "user", width: { ideal: 1920 }, height: { ideal: 1440 } } })
      .then((s) => {
        stream = s; if (video.current) { video.current.srcObject = s; video.current.play(); }
        const c = document.createElement("canvas"); c.width = 240; c.height = 320; const g = c.getContext("2d", { willReadFrequently: true })!;
        timer = setInterval(() => {
          const v = video.current; if (!v || !v.videoWidth) return;
          const vr = v.videoWidth / v.videoHeight, cr = 240 / 320;
          const sw = vr > cr ? v.videoHeight * cr : v.videoWidth, sh = vr > cr ? v.videoHeight : v.videoWidth / cr;
          g.drawImage(v, (v.videoWidth - sw) / 2, (v.videoHeight - sh) / 2, sw, sh, 0, 0, 240, 320);
          const q = measure(g, 240, 320); q.width = v.videoWidth; q.height = v.videoHeight; setLiveQ(q);
        }, 400);
      })
      .catch(() => setCamErr("Camera unavailable. Upload a photo instead."));
    return () => { clearInterval(timer); stream?.getTracks().forEach((t) => t.stop()); };
  }, [tab, shot]);

  const snap = async () => {
    const v = video.current; if (!v) return;
    const c = document.createElement("canvas"); const vr = v.videoWidth / v.videoHeight, target = 3 / 4;
    const sw = vr > target ? v.videoHeight * target : v.videoWidth, sh = vr > target ? v.videoHeight : v.videoWidth / target;
    c.width = Math.round(sw); c.height = Math.round(sh); const g = c.getContext("2d")!;
    g.translate(c.width, 0); g.scale(-1, 1); g.drawImage(v, (v.videoWidth - sw) / 2, (v.videoHeight - sh) / 2, sw, sh, 0, 0, sw, sh);
    const n = await normalise(c.toDataURL("image/jpeg", 0.95)); setShot({ dataUrl: n.dataUrl, quality: n.quality });
  };
  const fromSrc = async (src: string) => { const n = await normalise(src); setShot({ dataUrl: n.dataUrl, quality: n.quality }); };

  const analyse = async () => {
    if (!shot) return; setErr(null);
    try {
      const { results, taskId } = await runScan(shot.dataUrl, concerns, setStage);
      const image = await putBlob(shot.dataUrl);
      onDone({ id: uid(), takenAt: new Date().toISOString(), image, quality: shot.quality, results, source: "youcam", taskId });
    } catch (e) { setErr((e as Error).message); setStage(null); }
  };

  const dB = baseline && shot ? shot.quality.brightness - baseline.quality.brightness : null;
  const q = shot?.quality || liveQ;

  return (
    <motion.div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div initial={{ y: 30, scale: 0.97 }} animate={{ y: 0, scale: 1 }} exit={{ y: 20, opacity: 0 }} transition={{ type: "spring", damping: 24 }}
        className="card grid max-h-[94vh] w-full max-w-5xl overflow-auto rounded-[32px] md:grid-cols-[1.1fr_1fr]">
        <div className="relative aspect-[3/4] overflow-hidden bg-night md:aspect-auto md:min-h-[620px]">
          {!shot && tab === "camera" && (camErr ? <div className="grid h-full place-items-center p-8 text-center text-dim">{camErr}</div> :
            <video ref={video} playsInline muted className="h-full w-full -scale-x-100 object-cover" />)}
          {!shot && tab !== "camera" && <div className="grid h-full place-items-center p-8 text-center text-dim">{tab === "upload" ? "Choose a front-facing photo: even light, no makeup, face filling the oval." : "Pick a practice photo →"}</div>}
          {shot && <img src={shot.dataUrl} alt="captured" className="h-full w-full object-cover" />}
          {ghost && !shot && tab === "camera" && <img src={ghost} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-25 mix-blend-screen" />}
          <svg viewBox="0 0 300 400" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full">
            <defs><mask id="o"><rect width="300" height="400" fill="white" /><ellipse cx="150" cy="175" rx="88" ry="118" fill="black" /></mask></defs>
            {!shot && <rect width="300" height="400" fill="rgba(18,15,13,.45)" mask="url(#o)" />}
            <ellipse cx="150" cy="175" rx="88" ry="118" fill="none" stroke={q && q.score > 70 ? "#7be0b0" : "#e8c48a"} strokeWidth="1.5" strokeDasharray={shot ? "0" : "5 6"} vectorEffect="non-scaling-stroke" />
          </svg>
          <AnimatePresence>
            {stage && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 overflow-hidden">
                <div className="sweep absolute inset-x-0 h-1/3 bg-gradient-to-b from-transparent via-gold/30 to-gold/70 mix-blend-screen" />
                <div className="absolute inset-0 grid place-items-center">
                  <div className="relative grid h-40 w-40 place-items-center">
                    <div className="spin-slow absolute inset-0 rounded-full border border-dashed border-gold/60" />
                    <div className="spin-rev absolute inset-4 rounded-full border border-mint/40" />
                    <div className="label !text-cream">{stage}</div>
                  </div>
                </div>
                <div className="absolute bottom-5 left-5 flex flex-wrap gap-1.5">
                  {concerns.map((c, i) => (
                    <motion.span key={c} initial={{ opacity: 0, y: 6 }} animate={{ opacity: [0.3, 1, 0.3], y: 0 }} transition={{ delay: i * 0.2, duration: 1.6, repeat: Infinity }}
                      className="rounded-full px-2.5 py-1 font-mono text-[10px] text-night" style={{ background: CONCERNS[c].hue }}>{CONCERNS[c].short}</motion.span>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="flex flex-col p-7">
          <div className="flex items-start justify-between">
            <div><div className="label">{baseline ? "Check-in scan" : "Baseline scan"}</div><h3 className="mt-1 font-serif text-3xl">{title}</h3></div>
            <button onClick={onClose} className="rounded-full p-2 text-dim hover:bg-white/5" aria-label="close">✕</button>
          </div>
          <div className="mt-5 flex gap-1 rounded-full border hair p-1 text-sm">
            {(["camera", "upload", "practice"] as const).map((t) => (
              <button key={t} onClick={() => { setTab(t); setShot(null); setErr(null); }} className="relative flex-1 rounded-full py-1.5 capitalize">
                {tab === t && <motion.span layoutId="tab" className="absolute inset-0 rounded-full bg-cream/10" />}<span className="relative">{t === "practice" ? "Practice photos" : t}</span>
              </button>
            ))}
          </div>
          <div className="mt-5 flex-1 space-y-4">
            {tab === "upload" && !shot && (
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed hair p-8 text-center hover:bg-white/5">
                <span className="text-3xl">⇪</span><span className="mt-2 text-sm">Drop or choose a selfie</span>
                <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) fromSrc(await fileToDataUrl(f)); }} />
              </label>
            )}
            {tab === "practice" && !shot && (
              <div>
                <div className="grid grid-cols-3 gap-2">
                  {PRACTICE.map((p, i) => (
                    <button key={p} onClick={() => fromSrc(p)} className="group overflow-hidden rounded-xl border hair">
                      <img src={p} alt="" className="aspect-[3/4] w-full object-cover transition group-hover:scale-105" />
                      <div className="py-1 font-mono text-[10px] text-dim">Ava · wk {i * 2}</div>
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-xs text-dim">Synthetic test portraits for trying the flow without a camera. They still get a live YouCam analysis.</p>
              </div>
            )}
            {q && (
              <div className="card space-y-2 rounded-2xl p-4">
                <div className="flex items-baseline justify-between"><span className="label">Capture check</span><span className="font-serif text-2xl">{q.score.toFixed(0)}</span></div>
                <Meter label="Light" v={q.brightness} good={q.brightness > 35 && q.brightness < 82} />
                <Meter label="Sharpness" v={q.sharpness} good={q.sharpness >= 4} />
                <Meter label="Resolution (short side)" v={Math.min(q.width, q.height)} good={Math.min(q.width, q.height) >= 480} unit="px" />
                {dB !== null && <Meter label="Light vs. baseline" v={dB} good={Math.abs(dB) <= 10} />}
                {q.notes.map((n) => <div key={n} className="text-xs text-gold">• {n}</div>)}
                {baseline && !shot && tab === "camera" && <div className="text-xs text-dim">Line yourself up with the baseline ghost so the scans are comparable.</div>}
              </div>
            )}
            {err && <div className="rounded-2xl border border-rose/40 bg-rose/10 p-3 text-sm text-rose">{err}</div>}
            {!live && <div className="rounded-2xl border border-gold/30 bg-gold/10 p-3 text-sm text-gold">Live YouCam scanning is offline on this deployment (no API key set). Open the sample trial to see recorded results.</div>}
          </div>
          <div className="mt-6 flex gap-3">
            {shot ? (<>
              <button className="btn btn-ghost" onClick={() => setShot(null)} disabled={!!stage}>Retake</button>
              <button className={`btn btn-gold flex-1 justify-center ${!live || stage ? "opacity-50" : ""}`} disabled={!live || !!stage} onClick={analyse}>{stage ? "Analysing…" : "Analyse with YouCam Skin AI"}</button>
            </>) : tab === "camera" && !camErr ? (
              <button className="btn btn-gold flex-1 justify-center" onClick={snap}>Capture</button>
            ) : null}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
