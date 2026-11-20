import { NextResponse } from "next/server";
import { generateText } from "@/lib/ai/gemini";
import { fail, handle, requireUser } from "@/lib/ai/route-helpers";

export const runtime = "nodejs";
export const maxDuration = 60;

const RULES = "Return ONLY the rewritten prompt, as one paragraph of at most 55 words. No quotes, labels, lists, markdown or explanation. Keep the user's subject and idea exactly; only add vivid, useful detail.";
const SYSTEM = {
  image: `You are an expert prompt engineer for an AI image generator. Rewrite the user's rough idea into one vivid image prompt covering subject, setting, lighting, composition and mood (match the style hint if given). ${RULES}`,
  thumbnail: `You are an expert prompt engineer for YouTube and TikTok thumbnails. Rewrite the user's rough idea into one vivid, high-contrast thumbnail scene: expressive subject framing, bold saturated colours, strong contrast, one clear focal point, uncluttered background. The thumbnail's words are added separately, so do NOT put any words, letters or captions in the scene description. If the user only gave thumbnail text, invent a fitting scene around it. ${RULES}`,
};

// Free for the user (0 points). Uses the cheapest text model: gemini-3.1-flash-lite, then gemini-3.5-flash-lite.
export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;
  let b: { mode?: string; prompt?: string; text?: string; style?: string; aspect?: string };
  try { b = await req.json(); } catch { return fail(400, "bad_request", "Invalid request."); }
  const mode = b.mode === "thumbnail" ? "thumbnail" : "image";
  const prompt = (b.prompt ?? "").trim().slice(0, 600), text = (b.text ?? "").trim().slice(0, 60);
  if (!prompt && !text) return fail(400, "bad_request", "Type something first.");

  const lines = [prompt ? `Rough idea: ${prompt}` : "", mode === "thumbnail" && text ? `Thumbnail text (added separately): ${text}` : "", mode === "image" && b.style ? `Style hint: ${String(b.style).slice(0, 30)}` : "", b.aspect ? `Frame: ${String(b.aspect).slice(0, 8)}` : ""].filter(Boolean);
  try {
    const raw = await generateText({ system: SYSTEM[mode], turns: [{ role: "user", content: lines.join("\n") }], chain: "nexora1", maxOutputTokens: 260 });
    const out = raw.replace(/^```[a-z]*\n?|\n?```$/gi, "").replace(/^(improved )?prompt:\s*/i, "").replace(/^["“]|["”]$/g, "").trim().split(/\s+/).slice(0, 60).join(" ");
    if (!out) return fail(502, "empty", "The AI returned an empty answer.");
    return NextResponse.json({ text: out });
  } catch (e) { return handle(e); }
}
