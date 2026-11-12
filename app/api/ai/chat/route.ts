import { NextResponse } from "next/server";
import { generateText, MODELS, type Turn } from "@/lib/ai/gemini";
import { CHAT_SYSTEM } from "@/lib/ai/prompts";
import { fail, handle, requireUser } from "@/lib/ai/route-helpers";
import { modelsFor } from "@/lib/models";
import { runPaidGeneration } from "@/lib/points/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;
  let body: { messages?: { role?: string; content?: unknown }[]; model?: string };
  try { body = await req.json(); } catch { return fail(400, "bad_request", "Invalid request."); }

  const turns: Turn[] = (body.messages ?? [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && (m.content as string).trim())
    .slice(-20).map((m) => ({ role: m.role as Turn["role"], content: (m.content as string).slice(0, 4000) }));
  const last = turns[turns.length - 1];
  if (!last || last.role !== "user") return fail(400, "bad_request", "Type a message first.");

  const models = modelsFor("chat")!;
  const model = models.find((m) => m.id === body.model) ?? models[0];
  if (model.available === false) return fail(400, "model_unavailable", `${model.name.split(" (")[0]} isn’t available yet. Please choose Nexora Flash.`);

  try {
    let text = "";
    const paid = await runPaidGeneration({
      userId: auth.userId, tool: "chat", model: model.id, prompt: last.content.slice(0, 500), cost: model.points,
      produce: async () => { text = await generateText({ model: MODELS.text, system: CHAT_SYSTEM, turns }); return { text }; },
      isValid: (r) => r.text.length > 0,
    });
    if (paid.status === "unpaid") return fail(402, "insufficient_points", "Your points ran out while this was generating. The answer was saved to your Library as unpaid.");
    return NextResponse.json({ text, balance: paid.balance });
  } catch (e) { return handle(e); }
}
