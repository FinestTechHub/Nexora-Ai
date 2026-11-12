import studios from "@/lib/studios.json";

export type Model = { id: string; name: string; badge: string; points: number };

/** Models for a tool, or null if the tool has no model catalog. Data lives in lib/studios.json. */
export function modelsFor(slug: string): Model[] | null {
  const group = (studios.toolModels as Record<string, string>)[slug];
  return group ? (studios.models as Record<string, Model[]>)[group] : null;
}
export const fmtPts = (n: number) => `${n} ${n === 1 ? "Point" : "Points"}`;
export const genLabel = (base: string, cost: number) => `${base} • ${fmtPts(cost)}`;
export const shortPts = (n: number) => `${n} pt${n === 1 ? "" : "s"}`;
