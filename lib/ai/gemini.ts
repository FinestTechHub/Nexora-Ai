import { GoogleGenAI, type GenerateContentConfig } from "@google/genai";

// SERVER ONLY. Model names live here (override in Vercel with GEMINI_TEXT_MODEL / GEMINI_FAST_MODEL).
export const MODELS = {
  text: process.env.GEMINI_TEXT_MODEL || "gemini-3.8-flash", // Nexora Flash Chat and all text studios
  fast: process.env.GEMINI_FAST_MODEL || "gemini-3.5-flash-lite", // Prompt Improver
};

// Fallback chains: if a model is overloaded (503/429), too slow, or missing, the next one answers instantly.
// "think" keeps thinking short so answers come back in a couple of seconds. (3.8 Flash can't be set to MINIMAL, so it uses LOW.)
type Step = { model: string; think?: string };
const CHAINS: Record<"text" | "fast", Step[]> = {
  text: [{ model: MODELS.text, think: "LOW" }, { model: "gemini-3.6-flash", think: "MINIMAL" }, { model: "gemini-3.5-flash-lite" }],
  fast: [{ model: MODELS.fast }, { model: "gemini-3.6-flash", think: "MINIMAL" }],
};
const PER_ATTEMPT_MS = [12000, 12000, 18000]; // per model
const BUDGET_MS = 54000; // total, safely under the 60 second function limit

export class AIError extends Error {
  constructor(public code: string, message: string, public status = 502) { super(message); }
}
class TimeoutError extends Error {}
export type FilePart = { mimeType: string; data: string }; // data = base64, kept in memory only
export type Turn = { role: "user" | "assistant"; content: string; files?: FilePart[] };

let client: GoogleGenAI | null = null;
function ai() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new AIError("not_configured", "The AI service isn’t set up yet.", 500);
  return (client ??= new GoogleGenAI({ apiKey }));
}

// Gemini wants strictly alternating turns that start with the user, so neighbouring turns are merged.
function normalize(turns: Turn[]): Turn[] {
  const out: Turn[] = [];
  for (const t of turns) {
    const last = out[out.length - 1];
    if (last && last.role === t.role) { last.content += `\n\n${t.content}`; last.files = [...(last.files ?? []), ...(t.files ?? [])]; }
    else out.push({ ...t });
  }
  while (out.length && out[0].role !== "user") out.shift();
  return out;
}

const statusOf = (e: unknown): number | undefined => {
  const s = (e as { status?: number; code?: number })?.status ?? (e as { code?: number })?.code;
  if (typeof s === "number") return s;
  const m = /"code"\s*:\s*(\d{3})/.exec(e instanceof Error ? e.message : "");
  return m ? Number(m[1]) : undefined;
};
const shouldFallback = (e: unknown) => {
  if (e instanceof TimeoutError || (e instanceof AIError && e.code === "empty")) return true;
  const s = statusOf(e);
  if (s && [404, 408, 429, 500, 502, 503, 504].includes(s)) return true;
  return /overload|unavailable|high demand|deadline|timeout|timed out|fetch failed|ECONN|ENOTFOUND/i.test(e instanceof Error ? e.message : String(e));
};
const withTimeout = <T,>(p: Promise<T>, ms: number) =>
  new Promise<T>((resolve, reject) => { const t = setTimeout(() => reject(new TimeoutError("timeout")), ms); p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); }); });

async function callOnce(step: Step, o: { system: string; turns: Turn[]; maxOutputTokens?: number }, ms: number): Promise<string> {
  const contents = normalize(o.turns).map((t) => ({
    role: t.role === "assistant" ? "model" : "user",
    parts: [{ text: t.content }, ...(t.files ?? []).map((f) => ({ inlineData: { mimeType: f.mimeType, data: f.data } }))],
  }));
  const run = (think?: string) => withTimeout(ai().models.generateContent({
    model: step.model, contents,
    config: { systemInstruction: o.system, maxOutputTokens: o.maxOutputTokens ?? 4096, ...(think ? { thinkingConfig: { thinkingLevel: think } } : {}) } as unknown as GenerateContentConfig,
  }), ms);
  let res;
  try { res = await run(step.think); }
  catch (e) { if (statusOf(e) === 400 && step.think) res = await run(undefined); else throw e; } // this model rejected the thinking setting: retry without it
  const text = (res.text ?? "").trim();
  if (!text) throw new AIError("empty", "The AI returned an empty answer.");
  return text;
}

/** Returns the model's text, or throws AIError. An empty answer is a failure (so no points are charged). */
export async function generateText(o: { system: string; turns: Turn[]; maxOutputTokens?: number; chain?: "text" | "fast" }): Promise<string> {
  const steps = CHAINS[o.chain ?? "text"], start = Date.now();
  let last: unknown;
  for (let i = 0; i < steps.length; i++) {
    const left = BUDGET_MS - (Date.now() - start);
    if (left < 3000) break;
    try { return await callOnce(steps[i], o, Math.min(PER_ATTEMPT_MS[i] ?? 15000, left)); }
    catch (e) {
      last = e;
      console.warn(`Gemini ${steps[i].model} failed (${statusOf(e) ?? (e instanceof Error ? e.message : "unknown")}).${shouldFallback(e) && i < steps.length - 1 ? " Trying the next model." : ""}`);
      if (e instanceof AIError && e.code === "not_configured") throw e;
      if (!shouldFallback(e)) break;
    }
  }
  console.error("All Gemini models failed:", last);
  if (last instanceof AIError && last.code !== "empty") throw last;
  throw new AIError("busy", "Nexora AI is very busy right now. Please try again in a moment.", 503);
}
