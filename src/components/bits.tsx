"use client";
import { useEffect, useState } from "react";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { getBlob } from "@/lib/store";

export function useBlob(k?: string) {
  const [u, setU] = useState<string | undefined>(k?.startsWith("/") ? k : undefined);
  useEffect(() => { let on = true; getBlob(k).then((v) => on && setU(v)); return () => { on = false; }; }, [k]);
  return u;
}

export function Num({ value, digits = 0, prefix = "", className = "" }: { value: number; digits?: number; prefix?: string; className?: string }) {
  const mv = useMotionValue(0);
  const txt = useTransform(mv, (v) => prefix + v.toFixed(digits));
  useEffect(() => { const c = animate(mv, value, { duration: 1.1, ease: [0.2, 0.8, 0.2, 1] }); return c.stop; }, [value, mv]);
  return <motion.span className={className}>{txt}</motion.span>;
}

export function Ring({ frac, size = 120, stroke = 8, color = "#e8c48a", children }: { frac: number; size?: number; stroke?: number; color?: string; children?: React.ReactNode }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(243,235,223,.08)" strokeWidth={stroke} fill="none" />
        <motion.circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - Math.max(0, Math.min(1, frac))) }}
          transition={{ duration: 1.4, ease: [0.2, 0.8, 0.2, 1] }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

export function Chip({ on, color, children, onClick, disabled }: { on: boolean; color: string; children: React.ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <motion.button type="button" whileTap={{ scale: 0.94 }} onClick={onClick} disabled={disabled}
      className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition ${on ? "text-night" : "hair text-cream/80 hover:bg-white/5"} ${disabled && !on ? "opacity-35" : ""}`}
      style={on ? { background: color, borderColor: color } : undefined}>
      <span className="h-2 w-2 rounded-full" style={{ background: on ? "#1b1714" : color }} />{children}
    </motion.button>
  );
}

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <ellipse cx="32" cy="32" rx="17" ry="22" fill="none" stroke="#e8c48a" strokeWidth="4" />
      <path d="M24 33l6 6 11-13" fill="none" stroke="#7be0b0" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
