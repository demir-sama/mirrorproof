import type { ConcernId, IngredientId } from "./catalog";

export type Quality = { brightness: number; sharpness: number; warmth: number; width: number; height: number; score: number; notes: string[] };
export type ConcernResult = { type: ConcernId; ui: number; raw: number; mask?: string /* idb key */ };
export type Scan = {
  id: string; takenAt: string; image: string /* idb key */;
  quality: Quality; results: ConcernResult[]; source: "youcam" | "sample"; taskId?: string;
};
export type Trial = {
  id: string; product: string; brand: string; ingredient: IngredientId;
  price: number; currency: string; startedAt: string; windowDays: number;
  concerns: ConcernId[]; scans: Scan[]; sample?: boolean; closed?: "kept" | "returned";
};
