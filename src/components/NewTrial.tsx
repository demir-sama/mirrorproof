"use client";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CONCERNS, CURRENCIES, INGREDIENTS, MAX_CONCERNS, UNITS_PER_SCAN, type ConcernId, type IngredientId } from "@/lib/catalog";
import type { Trial } from "@/lib/types";
import { uid } from "@/lib/store";
import { Chip } from "./bits";

export function OnsetTimeline({ ingredient, windowDays }: { ingredient: IngredientId; windowDays: number }) {
  const ing = INGREDIENTS[ingredient];
  const span = Math.max(windowDays, ing.onset[1] * 7) + 7;
  const pct = (d: number) => `${(d / span) * 100}%`;
  const short = windowDays < ing.onset[0] * 7;
  return (
    <div className="card rounded-2xl p-5">
      <div className="label mb-4">Return window vs. when {ing.label.toLowerCase()} usually shows results</div>
      <div className="relative h-20">
        <div className="absolute inset-x-0 top-[34px] h-[2px] bg-white/10" />
        <div className="absolute top-0 whitespace-nowrap font-mono text-[10px] text-mint/80" style={{ left: pct(ing.onset[0] * 7) }}>VISIBLE {ing.onset[0]}–{ing.onset[1]} WK</div>
        <motion.div layout className="absolute top-[18px] h-[10px] rounded-full bg-mint/40 ring-1 ring-mint/60" style={{ left: pct(ing.onset[0] * 7), width: pct((ing.onset[1] - ing.onset[0]) * 7) }} />
        <motion.div layout className="absolute top-[32px] h-[6px] rounded-full bg-gold/80" style={{ left: 0, width: pct(windowDays) }} transition={{ type: "spring", stiffness: 140, damping: 20 }} />
        <motion.div layout className="absolute top-[14px] -translate-x-1/2 text-center" style={{ left: pct(windowDays) }}>
          <div className="mx-auto h-[34px] w-[2px] bg-rose" />
          <div className="mt-1 whitespace-nowrap font-mono text-[10px] text-rose">RETURN BY DAY {windowDays}</div>
        </motion.div>
      </div>
      <AnimatePresence mode="wait">
        <motion.p key={short ? "s" : "ok"} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`mt-4 text-sm ${short ? "text-gold" : "text-dim"}`}>
          {short
            ? `Heads up: your window closes before this ingredient typically shows. Mirrorproof will judge the trend line at every scan, so you can decide in time.`
            : `Your window covers the typical onset, so a clear signal should appear before you have to decide.`}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

export default function NewTrial({ onCreate, onCancel }: { onCreate: (t: Trial) => void; onCancel: () => void }) {
  const [product, setProduct] = useState("");
  const [brand, setBrand] = useState("");
  const [ingredient, setIngredient] = useState<IngredientId>("niacinamide");
  const [price, setPrice] = useState("28");
  const [currency, setCurrency] = useState("USD");
  const [windowDays, setWindow] = useState(30);
  const [concerns, setConcerns] = useState<ConcernId[]>(INGREDIENTS.niacinamide.concerns.slice(0, MAX_CONCERNS));
  const ing = INGREDIENTS[ingredient];
  const scans = useMemo(() => Math.max(3, Math.floor(windowDays / Math.max(5, Math.min(7, Math.round(windowDays / 4)))) + 1), [windowDays]);

  const pickIng = (k: IngredientId) => { setIngredient(k); setConcerns(INGREDIENTS[k].concerns.slice(0, MAX_CONCERNS)); };
  const toggle = (c: ConcernId) => setConcerns((cs) => (cs.includes(c) ? cs.filter((x) => x !== c) : cs.length < MAX_CONCERNS ? [...cs, c] : cs));
  const ok = product.trim() && concerns.length;

  return (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="mx-auto max-w-5xl px-6 pb-24">
      <div className="label mb-2">New trial</div>
      <h2 className="font-serif text-5xl tracking-tight md:text-6xl">What are you <em className="text-gold">testing?</em></h2>
      <div className="mt-10 grid gap-8 md:grid-cols-[1.2fr_1fr]">
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3">
            <label className="col-span-2"><span className="label">Product</span><input className="field mt-1.5 text-lg" placeholder="e.g. 10% Niacinamide Serum" value={product} onChange={(e) => setProduct(e.target.value)} /></label>
            <label><span className="label">Brand</span><input className="field mt-1.5" placeholder="optional" value={brand} onChange={(e) => setBrand(e.target.value)} /></label>
            <div className="flex gap-2">
              <label className="flex-1"><span className="label">Price</span><input className="field mt-1.5" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ""))} /></label>
              <label><span className="label">&nbsp;</span><select className="field mt-1.5" value={currency} onChange={(e) => setCurrency(e.target.value)}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></label>
            </div>
          </div>
          <div>
            <span className="label">Hero ingredient</span>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {(Object.keys(INGREDIENTS) as IngredientId[]).map((k) => (
                <motion.button key={k} whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} onClick={() => pickIng(k)}
                  className={`relative rounded-2xl border p-3 text-left transition ${ingredient === k ? "border-gold bg-gold/10" : "hair hover:bg-white/5"}`}>
                  {ingredient === k && <motion.span layoutId="ing" className="absolute inset-0 rounded-2xl ring-1 ring-gold" />}
                  <div className="text-sm font-semibold">{INGREDIENTS[k].label}</div>
                  <div className="mt-0.5 line-clamp-1 text-[11px] text-dim">{INGREDIENTS[k].example}</div>
                </motion.button>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-baseline justify-between"><span className="label">Track up to {MAX_CONCERNS} concerns</span><span className="font-mono text-[11px] text-dim">{UNITS_PER_SCAN} YouCam units / scan</span></div>
            <div className="mt-2 flex flex-wrap gap-2">
              {(Object.keys(CONCERNS) as ConcernId[]).map((c) => (
                <Chip key={c} on={concerns.includes(c)} color={CONCERNS[c].hue} onClick={() => toggle(c)} disabled={!concerns.includes(c) && concerns.length >= MAX_CONCERNS}>{CONCERNS[c].label}</Chip>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-5">
          <div className="card rounded-2xl p-5">
            <div className="flex items-baseline justify-between"><span className="label">Return window</span><span className="font-serif text-3xl">{windowDays}<span className="text-base text-dim"> days</span></span></div>
            <input type="range" min={7} max={90} value={windowDays} onChange={(e) => setWindow(+e.target.value)} className="mt-3 w-full" />
            <div className="mt-1 flex justify-between font-mono text-[10px] text-dim"><span>7</span><span>30</span><span>60</span><span>90</span></div>
          </div>
          <OnsetTimeline ingredient={ingredient} windowDays={windowDays} />
          <div className="card rounded-2xl p-5 text-sm text-dim">
            <div className="label mb-2">The protocol</div>
            <ol className="space-y-1.5">
              <li><b className="text-cream">1.</b> Baseline scan <i>before</i> the first use.</li>
              <li><b className="text-cream">2.</b> About {scans - 1} check-in scans, same light and same spot.</li>
              <li><b className="text-cream">3.</b> A verdict after every scan: keep, keep testing, watch, stop or return.</li>
            </ol>
            <div className="mt-3 font-mono text-[11px]">≈ {scans * UNITS_PER_SCAN} YouCam units for the whole trial. {ing.purge ? "Purge-aware: an early flare is not called a failure." : ""}</div>
          </div>
        </div>
      </div>
      <div className="mt-10 flex items-center justify-between">
        <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <motion.button whileHover={{ scale: ok ? 1.03 : 1 }} disabled={!ok} className={`btn btn-gold ${ok ? "" : "opacity-40"}`}
          onClick={() => onCreate({ id: uid(), product: product.trim(), brand: brand.trim(), ingredient, price: Number(price) || 0, currency, startedAt: new Date().toISOString(), windowDays, concerns, scans: [] })}>
          Start trial and take baseline →
        </motion.button>
      </div>
    </motion.div>
  );
}
