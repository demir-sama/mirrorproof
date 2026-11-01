import "server-only";

const BASE = process.env.YOUCAM_API_BASE || "https://yce-api-01.makeupar.com";
export const hasKey = () => !!process.env.YOUCAM_API_KEY;

async function yc(path: string, init: RequestInit = {}) {
  const r = await fetch(BASE + path, {
    ...init,
    headers: { Authorization: `Bearer ${process.env.YOUCAM_API_KEY}`, "Content-Type": "application/json", ...(init.headers || {}) },
    cache: "no-store",
  });
  const text = await r.text();
  let j: any; try { j = JSON.parse(text); } catch { j = { raw: text }; }
  if (!r.ok || (j.status && j.status !== 200)) {
    throw new YouCamError(j.error || j.message || `YouCam ${r.status}`, j.error_code, r.status);
  }
  return j;
}
export class YouCamError extends Error {
  constructor(msg: string, public code?: string, public http?: number) { super(msg); }
}

const FRIENDLY: Record<string, string> = {
  error_below_min_image_size: "Photo is too small. Use at least 480 px on the short side.",
  error_src_face_too_small: "Your face is too small in the frame. Move closer.",
  error_src_face_out_of_bound: "Part of your face is out of frame. Centre it in the oval.",
  error_lighting_dark: "Too dark for an accurate read. Face a window or a lamp.",
  error_no_face: "No face found. Look straight at the camera.",
  error_face_angle_not_frontal: "Face the camera straight on.",
  InvalidParameters: "YouCam rejected the request parameters.",
  "exceed_max_filesize": "Photo file is too large.",
  "insufficient_units": "The demo's YouCam units are used up.",
};
export const friendly = (e: unknown) => {
  const err = e as YouCamError;
  return (err.code && FRIENDLY[err.code]) || (err.message && FRIENDLY[err.message]) || err.message || "YouCam request failed";
};

/** Upload JPEG bytes through YouCam's File API and start an SD skin-analysis task. */
export async function startSkinAnalysis(bytes: Buffer, actions: string[]) {
  const name = `mirrorproof_${Date.now()}.jpg`;
  const f = await yc("/s2s/v2.0/file", {
    method: "POST",
    body: JSON.stringify({ files: [{ content_type: "image/jpeg", file_name: name, file_size: bytes.length }] }),
  });
  const file = f.data.files[0];
  const req = file.requests[0];
  const put = await fetch(req.url, { method: req.method || "PUT", headers: req.headers, body: new Uint8Array(bytes) });
  if (!put.ok) throw new YouCamError(`Upload failed (${put.status})`);
  const t = await yc("/s2s/v2.0/task/skin-analysis", {
    method: "POST",
    body: JSON.stringify({ src_file_id: file.file_id, dst_actions: actions, miniserver_args: { enable_mask_overlay: false }, format: "json" }),
  });
  return t.data.task_id as string;
}

export type Output = { type: string; ui_score: number; raw_score: number; mask_urls?: string[] };
export async function pollSkinAnalysis(taskId: string) {
  const j = await yc(`/s2s/v2.0/task/skin-analysis/${encodeURIComponent(taskId)}`);
  const d = j.data || {};
  const status: string = d.task_status;
  if (status === "error") throw new YouCamError(d.error || d.error_message || "Analysis failed", d.error);
  if (status !== "success") return { status, outputs: null as Output[] | null };
  const out: Output[] = d.results?.output || d.results || [];
  return { status, outputs: out.filter((o) => o && o.type && o.type !== "all") };
}
