import studios from "@/lib/studios.json";
import { modelsFor } from "@/lib/models";

type ToolCfg = { base?: number; per100?: number; ch: { l: string; o: string[]; d?: number; m?: Record<string, number> }[] };
const tools = studios.tools as unknown as Record<string, ToolCfg>;

/** Tools that now run on real AI. The rest still show placeholder results. */
export const LIVE_TOOLS = ["script", "ideas", "youtube-seo"];
/** Points charged by the Prompt Improver button. 0 = free. Set to 1 to charge one point per improvement. */
export const IMPROVE_COST = 0;

/** Only accept choices that really exist, and fall back to each tool's default. */
export function cleanValues(slug: string, raw: unknown): Record<string, string> {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const g of tools[slug].ch) { const v = r[g.l]; out[g.l] = typeof v === "string" && g.o.includes(v) ? v : g.o[g.d ?? 0]; }
  return out;
}

/** The ONE place a tool's price is calculated. The screen and the server both use it. */
export function toolCost(slug: string, values: Record<string, string>, text: string, modelId?: string): number {
  const c = tools[slug];
  let cost = c.per100 ? Math.max(1, Math.ceil(text.length / 100)) * c.per100 : c.base ?? 1;
  c.ch.forEach((g) => { cost *= g.m?.[values[g.l] ?? g.o[g.d ?? 0]] ?? 1; });
  cost = Math.max(1, Math.round(cost));
  const models = modelsFor(slug);
  if (models) { const m = models.find((x) => x.id === modelId) ?? models[0]; cost = m.points * Number(values["Variations"] ?? 1); }
  return cost;
}
