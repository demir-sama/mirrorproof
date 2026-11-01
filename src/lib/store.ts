"use client";
import { get, set, del } from "idb-keyval";
import type { Trial } from "./types";

const KEY = "mirrorproof.trials.v1";
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export function loadTrials(): Trial[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
export function saveTrials(t: Trial[]) { localStorage.setItem(KEY, JSON.stringify(t)); }

/** Images and masks live in IndexedDB (data URLs); sample assets resolve to /public paths. */
export async function putBlob(dataUrl: string) { const k = "img:" + uid(); await set(k, dataUrl); return k; }
export async function getBlob(k?: string): Promise<string | undefined> {
  if (!k) return undefined;
  if (k.startsWith("/")) return k;
  return (await get(k)) as string | undefined;
}
export async function dropTrialBlobs(t: Trial) {
  for (const s of t.scans) { if (!s.image.startsWith("/")) await del(s.image); for (const r of s.results) if (r.mask && !r.mask.startsWith("/")) await del(r.mask); }
}
