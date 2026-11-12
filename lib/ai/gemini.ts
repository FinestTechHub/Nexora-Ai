import { GoogleGenAI } from "@google/genai";

// SERVER ONLY. Model names live here so they are easy to change (or override in Vercel with GEMINI_TEXT_MODEL / GEMINI_FAST_MODEL).
export const MODELS = {
  text: process.env.GEMINI_TEXT_MODEL || "gemini-3.8-flash", // Nexora Flash Chat and all text studios
  fast: process.env.GEMINI_FAST_MODEL || "gemini-3.5-flash-lite", // Prompt Improver
};

export class AIError extends Error {
  constructor(public code: string, message: string, public status = 502) { super(message); }
}
export type Turn = { role: "user" | "assistant"; content: string };

let client: GoogleGenAI | null = null;
function ai() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new AIError("not_configured", "The AI service isn’t set up yet.", 500);
  return (client ??= new GoogleGenAI({ apiKey }));
}

// Gemini wants strictly alternating turns that start and end with the user, so neighbouring turns are merged.
function normalize(turns: Turn[]): Turn[] {
  const out: Turn[] = [];
  for (const t of turns) {
    const last = out[out.length - 1];
    if (last && last.role === t.role) last.content += `\n\n${t.content}`;
    else out.push({ ...t });
  }
  while (out.length && out[0].role !== "user") out.shift();
  return out;
}

/** Returns the model's text, or throws AIError. An empty answer counts as a failure (so no points are charged). */
export async function generateText(o: { model: string; system: string; turns: Turn[]; maxOutputTokens?: number }): Promise<string> {
  try {
    const res = await ai().models.generateContent({
      model: o.model,
      contents: normalize(o.turns).map((t) => ({ role: t.role === "assistant" ? "model" : "user", parts: [{ text: t.content }] })),
      config: { systemInstruction: o.system, maxOutputTokens: o.maxOutputTokens ?? 4096 },
    });
    const text = (res.text ?? "").trim();
    if (!text) throw new AIError("empty", "The AI returned an empty answer.");
    return text;
  } catch (e) {
    if (e instanceof AIError) throw e;
    console.error("Gemini error:", e);
    throw new AIError("upstream", "The AI service had a problem.");
  }
}
