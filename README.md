# Mirrorproof

**Is your skincare working, or is it just expensive?** Mirrorproof runs a small clinical-style trial on any skincare product using **YouCam Skin AI**. It tells you to keep the product or return it *before the return window closes*.

Live: https://mirrorproof-sama-5806.vercel.app

## The problem
People buy a $30–$90 serum, get a 30-day satisfaction window, and then decide by feel. Bathroom lighting, mood and memory are terrible instruments. So most people keep products that do nothing, or bin ones that were working but too slowly to notice.

## How it works
1. **Start a trial.** Enter the product, price, hero ingredient and return window. Mirrorproof compares the window with the ingredient's typical onset time, for example retinoids at 8–12 weeks, and warns you when the window closes first.
2. **Baseline scan before the first use.** A guided selfie runs a live check of light, sharpness and resolution. The photo goes to the **YouCam AI Skin Analysis API**, which scores up to 4 chosen concerns from acne, redness, oiliness, pores, texture, moisture, radiance, spots, wrinkles, dark circles, eye bags and firmness, and returns detection masks.
3. **Check-in scans.** A translucent "ghost" of your baseline helps you line up the same framing. Each scan's lighting and colour drift against the baseline lowers its statistical weight, so a brighter bathroom can't fake an improvement.
4. **A verdict with error bars.** Mirrorproof fits a weighted trend for each concern on YouCam's `raw_score` and compares the change with a noise floor (±2σ), then projects it to the return deadline. The verdict is one of:
   - **Keep it**: the change is real.
   - **Keep testing**: too early to call.
   - **Watch**: a possible purge, for acids and retinoids in weeks 0–4.
   - **Stop**: redness or acne got worse.
   - **Return it**: nothing measurable, even on the projected trend.
5. **Act on it.** A before/after mirror slider shows YouCam mask overlays. You can export a verdict card. For a return, Mirrorproof writes a ready-to-send return note with your evidence. For a keep, it shows the cost per point of measured improvement.

All trial data stays on the device (localStorage + IndexedDB). There are no accounts.

## YouCam API usage
- `POST /s2s/v2.0/file`, then a PUT to the pre-signed URL: uploads the normalised JPEG (short side ≥ 480 px, long side ≤ 2048 px).
- `POST /s2s/v2.0/task/skin-analysis`: SD `dst_actions`, at most 4 concerns, so a scan costs 9 units. Masks are returned as raw PNGs with `enable_mask_overlay: false`, so the app can tint each concern in its own colour.
- `GET /s2s/v2.0/task/skin-analysis/{task_id}`: polled until it succeeds. Masks are proxied same-origin and stored on the device, because YouCam URLs expire after 24 h.
- YouCam errors such as face too small, too dark or not frontal are mapped to plain guidance.

## Run locally
```bash
npm install
echo "YOUCAM_API_KEY=your_key" > .env.local
npm run dev
```
`scripts/record-sample.mjs` re-records the bundled 28-day sample trial against the live API (about 27 units).
Without a key the app still runs: the sample trial works, and live scanning shows as offline.

The sample portraits ("Ava") are synthetic, AI-generated test images, not real people.
Mirrorproof gives cosmetic guidance, not medical advice.

MIT licensed.
