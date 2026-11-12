import { NextResponse } from "next/server";
import { generateText, MODELS } from "@/lib/ai/gemini";
import { IMPROVE_COST } from "@/lib/ai/cost";
import { IMPROVE_SYSTEM } from "@/lib/ai/prompts";
import { fail, handle, requireUser } from "@/lib/ai/route-helpers";
import { runPaidGeneration } from "@/lib/points/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const FOR: Record<string, string> = { image: "an AI image generator", video: "an AI video generator", "image-to-video": "an image-to-video tool (describe only the motion)", script: "an AI script writer (this is the video topic)", ideas: "a content-ideas tool (this is the niche or topic)", "youtube-seo": "a YouTube SEO tool (this is the video topic)", chat: "an AI chat assistant" };

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;
  let body: { slug?: string; text?: string; values?: Record<string, unknown> };
  try { body = await req.json(); } catch { return fail(400, "bad_request", "Invalid request."); }
  const text = (body.text ?? "").trim().slice(0, 1500);
  const target = body.slug && FOR[body.slug];
  if (!text) return fail(400, "bad_request", "Type something first.");
  if (!target) return fail(400, "bad_request", "This tool can’t be improved with AI.");

  const opts = Object.entries(body.values ?? {}).filter(([, v]) => typeof v === "string").map(([k, v]) => `${k}: ${String(v).slice(0, 40)}`).join(", ");
  const turns = [{ role: "user" as const, content: `This prompt is for ${target}.${opts ? ` Selected options: ${opts}.` : ""}\n\nPrompt to improve:\n${text}` }];
  const clean = (s: string) => s.replace(/^```[a-z]*\n?|\n?```$/gi, "").replace(/^["“]|["”]$/g, "").trim();

  try {
    if (IMPROVE_COST <= 0) { // free: no points involved
      const out = clean(await generateText({ model: MODELS.fast, system: IMPROVE_SYSTEM, turns, maxOutputTokens: 1024 }));
      if (!out) return fail(502, "empty", "The AI returned an empty answer. You weren’t charged.");
      return NextResponse.json({ text: out });
    }
    let out = "";
    const paid = await runPaidGeneration({
      userId: auth.userId, tool: "improve", model: MODELS.fast, prompt: text.slice(0, 500), cost: IMPROVE_COST,
      produce: async () => { out = clean(await generateText({ model: MODELS.fast, system: IMPROVE_SYSTEM, turns, maxOutputTokens: 1024 })); return { text: out }; },
      isValid: (r) => r.text.length > 0,
    });
    if (paid.status === "unpaid") return fail(402, "insufficient_points", "You don’t have enough points.");
    return NextResponse.json({ text: out, balance: paid.balance });
  } catch (e) { return handle(e); }
}
