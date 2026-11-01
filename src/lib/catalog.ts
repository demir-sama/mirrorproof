export type ConcernId =
  | "acne" | "redness" | "oiliness" | "pore" | "texture" | "moisture"
  | "radiance" | "age_spot" | "wrinkle" | "dark_circle_v2" | "eye_bag" | "firmness";

export const CONCERNS: Record<ConcernId, { label: string; short: string; hue: string; blurb: string }> = {
  acne: { label: "Acne", short: "ACN", hue: "#ff5d73", blurb: "Active breakouts and blemishes" },
  redness: { label: "Redness", short: "RED", hue: "#ff8a5b", blurb: "Flushing, irritation, inflammation" },
  oiliness: { label: "Oiliness", short: "OIL", hue: "#f5c451", blurb: "Shine and sebum, mostly T-zone" },
  pore: { label: "Pores", short: "POR", hue: "#c49bff", blurb: "How visible pores are" },
  texture: { label: "Texture", short: "TEX", hue: "#7cc7ff", blurb: "Smoothness and roughness" },
  moisture: { label: "Moisture", short: "HYD", hue: "#58d6c9", blurb: "Hydration of the skin surface" },
  radiance: { label: "Radiance", short: "RAD", hue: "#ffd98a", blurb: "Glow and brightness" },
  age_spot: { label: "Spots", short: "SPT", hue: "#d9a37a", blurb: "Pigmentation and dark spots" },
  wrinkle: { label: "Wrinkles", short: "WRK", hue: "#a8b4ff", blurb: "Fine lines and wrinkles" },
  dark_circle_v2: { label: "Dark circles", short: "DKC", hue: "#8c90c8", blurb: "Under-eye darkness" },
  eye_bag: { label: "Eye bags", short: "BAG", hue: "#9fb1c9", blurb: "Under-eye puffiness" },
  firmness: { label: "Firmness", short: "FRM", hue: "#e7a6c8", blurb: "Elasticity and sagging" },
};

export type IngredientId =
  | "acne" | "retinoid" | "vitc" | "niacinamide" | "azelaic" | "aha" | "barrier" | "eye" | "other";

/** Typical time-to-visible-effect ranges (weeks), from common dermatology guidance. */
export const INGREDIENTS: Record<IngredientId, {
  label: string; example: string; onset: [number, number]; concerns: ConcernId[]; purge: boolean;
}> = {
  acne: { label: "Acne treatment", example: "benzoyl peroxide, salicylic acid, adapalene", onset: [4, 8], concerns: ["acne", "redness", "oiliness", "pore"], purge: true },
  retinoid: { label: "Retinol / retinoid", example: "retinol, retinal, tretinoin", onset: [8, 12], concerns: ["wrinkle", "texture", "pore", "age_spot"], purge: true },
  vitc: { label: "Vitamin C", example: "ascorbic acid, THD ascorbate", onset: [4, 8], concerns: ["radiance", "age_spot", "texture"], purge: false },
  niacinamide: { label: "Niacinamide", example: "niacinamide 5–10%", onset: [4, 8], concerns: ["pore", "oiliness", "redness", "texture"], purge: false },
  azelaic: { label: "Azelaic acid", example: "azelaic acid 10–20%", onset: [4, 8], concerns: ["redness", "acne", "age_spot"], purge: false },
  aha: { label: "Exfoliant (AHA/BHA)", example: "glycolic, lactic, mandelic", onset: [2, 6], concerns: ["texture", "radiance", "pore"], purge: true },
  barrier: { label: "Moisturiser / barrier", example: "ceramides, panthenol", onset: [1, 3], concerns: ["moisture", "texture", "redness"], purge: false },
  eye: { label: "Eye cream", example: "caffeine, peptides", onset: [6, 12], concerns: ["dark_circle_v2", "eye_bag", "wrinkle"], purge: false },
  other: { label: "Something else", example: "any serum, mask or device", onset: [4, 8], concerns: ["texture", "radiance"], purge: false },
};

export const MAX_CONCERNS = 4; // 1–4 SD concerns = 9 YouCam units per scan
export const UNITS_PER_SCAN = 9;

export const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "KRW", "INR", "BRL", "CAD", "AUD", "MXN"] as const;
export type Currency = (typeof CURRENCIES)[number];
export const money = (n: number, c: string) =>
  new Intl.NumberFormat("en", { style: "currency", currency: c, maximumFractionDigits: c === "JPY" || c === "KRW" ? 0 : 2 }).format(n);
