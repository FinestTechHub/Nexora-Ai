import { NextResponse } from "next/server";
import { generateText } from "@/lib/ai/gemini";
import { fail, handle, requireUser } from "@/lib/ai/route-helpers";
import { admin } from "@/lib/points/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const RULES = "Return ONLY the rewritten prompt, as one paragraph of at most 55 words. No quotes, labels, lists, markdown or explanation. Keep the user's subject and idea exactly; only add vivid, useful detail.";
const SYSTEM = {
  image: `You are an expert prompt engineer for an AI image generator. Rewrite the user's rough idea into one vivid image prompt covering subject, setting, lighting, composition and mood (match the style hint if given). ${RULES}`,
  thumbnail: `You are an expert prompt engineer for YouTube and TikTok thumbnails. Rewrite the user's rough idea into one vivid, high-contrast thumbnail scene: expressive subject framing, bold saturated colours, strong contrast, one clear focal point, uncluttered background. The thumbnail's words are added separately, so do NOT put any words, letters or captions in the scene description. If the user only gave thumbnail text, invent a fitting scene around it. ${RULES}`,
};

// Free for the user (0 points) but limited per day by plan. A day resets at midnight UTC.
const LIMITS: Record<string, number | null> = { free: 3, creator: 15, pro: null }; // null = unlimited
const KIND = "improve-prompt";

async function status(userId: string) {
  const db = admin();
  const { data: plan } = await db.rpc("user_plan", { p_user_id: userId });
  const p = typeof plan === "string" && plan in LIMITS ? plan : "free";
  const limit = LIMITS[p];
  const day = new Date().toISOString().slice(0, 10);
  const { data: u } = await db.from("daily_usage").select("count").eq("user_id", userId).eq("day", day).eq("kind", KIND).maybeSingle();
  const used = Number(u?.count ?? 0);
  return { plan: p, limit, used, remaining: limit === null ? null : Math.max(0, limit - used) };
}

// The button asks this when it appears, so it can show "Improve (2/3)".
export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;
  const s = await status(auth.userId);
  return NextResponse.json({ plan: s.plan, limit: s.limit, remaining: s.remaining });
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;
  let b: { mode?: string; prompt?: string; text?: string; style?: string; aspect?: string };
  try { b = await req.json(); } catch { return fail(400, "bad_request", "Invalid request."); }
  const mode = b.mode === "thumbnail" ? "thumbnail" : "image";
  const prompt = (b.prompt ?? "").trim().slice(0, 600), text = (b.text ?? "").trim().slice(0, 60);
  if (!prompt && !text) return fail(400, "bad_request", "Type something first.");

  try {
    const s = await status(auth.userId);
    if (s.limit !== null && s.used >= s.limit) {
      const message = s.plan === "free" ? `You’ve used all ${s.limit} free Improves for today. Upgrade for more: Creator gets 15 a day and Pro is unlimited.` : `You’ve used all ${s.limit} Improves for today. Upgrade to Pro for unlimited.`;
      return NextResponse.json({ error: "limit", message, plan: s.plan, limit: s.limit, remaining: 0 }, { status: 429 });
    }
    const lines = [prompt ? `Rough idea: ${prompt}` : "", mode === "thumbnail" && text ? `Thumbnail text (added separately): ${text}` : "", mode === "image" && b.style ? `Style hint: ${String(b.style).slice(0, 30)}` : "", b.aspect ? `Frame: ${String(b.aspect).slice(0, 8)}` : ""].filter(Boolean);
    const raw = await generateText({ system: SYSTEM[mode], turns: [{ role: "user", content: lines.join("\n") }], chain: "nexora1", maxOutputTokens: 260 });
    const out = raw.replace(/^```[a-z]*\n?|\n?```$/gi, "").replace(/^(improved )?prompt:\s*/i, "").replace(/^["“]|["”]$/g, "").trim().split(/\s+/).slice(0, 60).join(" ");
    if (!out) return fail(502, "empty", "The AI returned an empty answer.");
    let remaining: number | null = null;
    if (s.limit !== null) { // counted only after a successful answer
      const { data: count } = await admin().rpc("bump_daily_usage", { p_user_id: auth.userId, p_kind: KIND });
      remaining = Math.max(0, s.limit - Number(count ?? s.used + 1));
    }
    return NextResponse.json({ text: out, plan: s.plan, limit: s.limit, remaining });
  } catch (e) { return handle(e); }
}
