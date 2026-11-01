// Records real YouCam Skin AI results for the bundled sample trial.
// Usage: YOUCAM_API_KEY=... node scripts/record-sample.mjs   (uses ~27 units)
import fs from "node:fs";
const KEY = process.env.YOUCAM_API_KEY; if (!KEY) throw new Error("YOUCAM_API_KEY missing");
const BASE = "https://yce-api-01.makeupar.com";
const H = { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
const j = async (r) => { const t = await r.json(); if (t.status !== 200) throw new Error(JSON.stringify(t)); return t.data; };
const file = "public/samples/sample.json";
const data = JSON.parse(fs.readFileSync(file, "utf8"));
fs.mkdirSync("public/samples/masks", { recursive: true });
for (const s of data.scans) {
  const bytes = fs.readFileSync("public" + s.image);
  const f = (await j(await fetch(BASE + "/s2s/v2.0/file", { method: "POST", headers: H, body: JSON.stringify({ files: [{ content_type: "image/jpeg", file_name: s.image.split("/").pop(), file_size: bytes.length }] }) }))).files[0];
  const put = await fetch(f.requests[0].url, { method: "PUT", headers: f.requests[0].headers, body: bytes }); if (!put.ok) throw new Error("upload " + put.status);
  const { task_id } = await j(await fetch(BASE + "/s2s/v2.0/task/skin-analysis", { method: "POST", headers: H, body: JSON.stringify({ src_file_id: f.file_id, dst_actions: data.concerns, miniserver_args: { enable_mask_overlay: false }, format: "json" }) }));
  let d; for (;;) { await new Promise((r) => setTimeout(r, 2500)); d = await j(await fetch(`${BASE}/s2s/v2.0/task/skin-analysis/${encodeURIComponent(task_id)}`, { headers: H })); if (d.task_status === "success") break; if (d.task_status === "error") throw new Error(JSON.stringify(d)); }
  fs.writeFileSync(`public/samples/raw-d${s.day}.json`, JSON.stringify(d, null, 2));
  const out = (d.results?.output || d.results || []).filter((o) => o.type && o.type !== "all");
  s.taskId = task_id;
  s.results = [];
  for (const o of out) {
    let mask = "";
    if (o.mask_urls?.[0]) { const m = await fetch(o.mask_urls[0]); const ext = (m.headers.get("content-type") || "").includes("jpeg") ? "jpg" : "png"; mask = `/samples/masks/d${s.day}-${o.type}.${ext}`; fs.writeFileSync("public" + mask, Buffer.from(await m.arrayBuffer())); }
    s.results.push({ type: o.type, ui: o.ui_score, raw: o.raw_score, mask });
  }
  console.log("day", s.day, s.results.map((r) => `${r.type}:${r.ui}/${r.raw}`).join(" "));
}
data.recorded = true;
fs.writeFileSync(file, JSON.stringify(data, null, 2));
