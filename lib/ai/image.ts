import type { GenerateContentConfig } from "@google/genai";
import { AIError, ai, shouldFallback, statusOf, withTimeout } from "./gemini";

// SERVER ONLY. Uses the same GEMINI_API_KEY and Google client as chat (no new keys).
export type Aspect = "1:1" | "16:9" | "9:16" | "4:5";
export const ASPECTS: Aspect[] = ["1:1", "16:9", "9:16", "4:5"];
export const STYLES: Record<string, string> = {
  Photorealistic: "ultra-realistic photograph, natural lighting, sharp detail",
  "3D Render": "high-quality 3D render, soft studio lighting, clean materials",
  Anime: "anime illustration, clean line art, vibrant colours",
  "Digital Art": "polished digital art illustration, rich colour, detailed",
  "Product Shot": "professional studio product photography on a clean background",
  Minimalist: "minimalist design, simple shapes, plenty of negative space",
};
export type Ref = { mimeType: string; data: string }; // base64, kept in memory only

// Clean brand tiers -> real model IDs. IDs can be overridden in Vercel (GEMINI_IMAGE_FAST_MODEL / GEMINI_IMAGE_PRO_MODEL).
const CHAINS: Record<"fast" | "pro", string[]> = {
  fast: [process.env.GEMINI_IMAGE_FAST_MODEL || "gemini-3.1-flash-lite-image", "gemini-3.1-flash-image"],
  pro: [process.env.GEMINI_IMAGE_PRO_MODEL || "gemini-3.1-flash-image", "gemini-3-pro-image"],
};
const PER_ATTEMPT_MS = 26000, BUDGET_MS = 54000;

export function buildImagePrompt(o: { mode: "image" | "thumbnail"; prompt: string; style: string; aspect: Aspect; text: string; refs: number }) {
  const refs = o.refs ? (o.mode === "thumbnail"
    ? `\nThe ${o.refs} attached photo(s) show the person or product to feature. Place them prominently and blend them seamlessly into the scene, keeping faces recognisable.`
    : `\nUse the ${o.refs} attached reference photo(s) as the visual reference (subject, product or style) and blend them naturally into the result.`) : "";
  if (o.mode === "thumbnail")
    return `Design a high-contrast YouTube / TikTok thumbnail in a ${o.aspect} frame.\nScene or topic: ${o.prompt}\n` +
      (o.text ? `Show exactly this text, spelled correctly, in huge bold readable typography with strong contrast and a thick outline or shadow: "${o.text}". Do not add any other words.` : "Do not add any text.") +
      `\nExpressive, eye-catching subject framing, bright saturated colours, one clear focal point, uncluttered background.${refs}`;
  return `Create an image: ${o.prompt}\nStyle: ${STYLES[o.style] ?? STYLES.Photorealistic}.\nCompose it for a ${o.aspect} frame. Do not add watermarks or captions unless asked.${refs}`;
}

async function once(model: string, prompt: string, aspect: Aspect, refs: Ref[], ms: number) {
  const contents = [{ role: "user", parts: [{ text: prompt }, ...refs.map((r) => ({ inlineData: { mimeType: r.mimeType, data: r.data } }))] }];
  const run = (withAspect: boolean) => withTimeout(ai().models.generateContent({
    model, contents,
    config: { responseModalities: ["IMAGE"], ...(withAspect ? { imageConfig: { aspectRatio: aspect } } : {}) } as unknown as GenerateContentConfig,
  }), ms);
  let res;
  try { res = await run(true); } catch (e) { if (statusOf(e) === 400) res = await run(false); else throw e; } // this model rejected the aspect setting: the prompt still asks for the frame
  const img = (res.candidates?.[0]?.content?.parts ?? []).find((p) => p.inlineData?.data);
  if (!img?.inlineData?.data) {
    if (res.promptFeedback?.blockReason) throw new AIError("blocked", "That request was blocked by the AI’s safety filters. Try different wording.", 422);
    throw new AIError("empty", "The AI didn’t return an image. Try rewording your prompt.");
  }
  const data = Buffer.from(img.inlineData.data, "base64");
  if (data.length < 1000) throw new AIError("empty", "The AI returned an empty image.");
  return { mimeType: img.inlineData.mimeType || "image/png", data };
}

/** Returns a valid image or throws. Falls back to the next model on overload, timeouts or a missing model. */
export async function generateImage(o: { tier: "fast" | "pro"; prompt: string; aspect: Aspect; refs: Ref[] }) {
  const models = CHAINS[o.tier], start = Date.now();
  let last: unknown;
  for (let i = 0; i < models.length; i++) {
    const left = BUDGET_MS - (Date.now() - start);
    if (left < 4000) break;
    try { return await once(models[i], o.prompt, o.aspect, o.refs, Math.min(PER_ATTEMPT_MS, left)); }
    catch (e) {
      last = e;
      console.warn(`Image model ${models[i]} failed (${statusOf(e) ?? (e instanceof Error ? e.message : "unknown")}).`);
      if (e instanceof AIError && e.code === "not_configured") throw e;
      if (!shouldFallback(e)) break;
    }
  }
  console.error("All image models failed:", last);
  if (last instanceof AIError && last.code !== "empty") throw last;
  throw new AIError("busy", "Nexora Image is very busy right now. Please try again in a moment.", 503);
}
