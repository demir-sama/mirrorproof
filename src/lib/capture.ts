"use client";
import type { Quality } from "./types";

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => { const i = new Image(); i.crossOrigin = "anonymous"; i.onload = () => res(i); i.onerror = rej; i.src = src; });
}
export const fileToDataUrl = (f: Blob) => new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(f); });

/** Normalise to a JPEG YouCam accepts (short side ≥ 480, long side ≤ 2048). */
export async function normalise(src: string | HTMLImageElement | HTMLVideoElement, mirror = false) {
  const el = typeof src === "string" ? await loadImage(src) : src;
  const w0 = "videoWidth" in el ? el.videoWidth : el.naturalWidth;
  const h0 = "videoHeight" in el ? el.videoHeight : el.naturalHeight;
  const s = Math.min(1, 2048 / Math.max(w0, h0));
  const w = Math.round(w0 * s), h = Math.round(h0 * s);
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d")!;
  if (mirror) { g.translate(w, 0); g.scale(-1, 1); }
  g.drawImage(el, 0, 0, w, h);
  return { dataUrl: c.toDataURL("image/jpeg", 0.92), quality: measure(g, w, h), width: w, height: h };
}

/** Capture-consistency metrics measured on the central face region. */
export function measure(g: CanvasRenderingContext2D, w: number, h: number): Quality {
  const x = Math.round(w * 0.25), y = Math.round(h * 0.18), cw = Math.round(w * 0.5), ch = Math.round(h * 0.5);
  const step = Math.max(1, Math.round(Math.max(cw, ch) / 220));
  const d = g.getImageData(x, y, cw, ch).data;
  let sum = 0, rs = 0, bs = 0, n = 0;
  const lum: number[] = []; const cols = Math.floor(cw / step);
  for (let j = 0; j < ch; j += step) for (let i = 0; i < cw; i += step) {
    const o = (j * cw + i) * 4; const r = d[o], gg = d[o + 1], b = d[o + 2];
    const l = 0.2126 * r + 0.7152 * gg + 0.0722 * b; lum.push(l); sum += l; rs += r; bs += b; n++;
  }
  const brightness = (sum / n / 255) * 100;
  const warmth = ((rs - bs) / n / 255) * 100;
  let lap = 0, ln = 0;
  for (let k = cols + 1; k < lum.length - cols - 1; k++) {
    const v = 4 * lum[k] - lum[k - 1] - lum[k + 1] - lum[k - cols] - lum[k + cols]; lap += v * v; ln++;
  }
  const sharpness = Math.sqrt(lap / Math.max(1, ln));
  const notes: string[] = [];
  if (brightness < 35) notes.push("A bit dark: face a window or lamp");
  if (brightness > 82) notes.push("Overexposed: step back from the light");
  if (sharpness < 4) notes.push("Soft focus: hold still");
  if (Math.min(w, h) < 480) notes.push("Resolution under 480 px");
  const score = Math.max(0, Math.min(100, 100 - Math.abs(brightness - 58) * 1.4 - Math.max(0, 6 - sharpness) * 8 - (Math.min(w, h) < 480 ? 40 : 0)));
  return { brightness, warmth, sharpness, width: w, height: h, score, notes };
}
