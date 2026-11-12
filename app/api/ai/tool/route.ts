import { NextResponse } from "next/server";
import { cleanValues, LIVE_TOOLS, toolCost } from "@/lib/ai/cost";
import { validateInput } from "@/lib/ai/engine";
import { fail, handle, requireUser } from "@/lib/ai/route-helpers";
import { runTool, type Output } from "@/lib/ai/tools";
import { modelsFor } from "@/lib/models";
import { runPaidGeneration } from "@/lib/points/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;
  let body: { slug?: string; text?: string; values?: unknown; modelId?: string };
  try { body = await req.json(); } catch { return fail(400, "bad_request", "Invalid request."); }
  const slug = body.slug ?? "";
  if (!LIVE_TOOLS.includes(slug)) return fail(400, "bad_request", "This tool isn’t available yet.");
  const text = (body.text ?? "").trim().slice(0, 1500);
  const v = validateInput(slug, text);
  if (!v.ok) return fail(400, "bad_request", v.clarify ?? "Please add some details first.");

  const models = modelsFor(slug);
  const model = models ? (models.find((m) => m.id === body.modelId) ?? models[0]) : null;
  if (model && model.available === false) return fail(400, "model_unavailable", `${model.name.split(" (")[0]} isn’t available yet. Please choose Nexora Flash.`);

  const values = cleanValues(slug, body.values);
  const cost = toolCost(slug, values, text, model?.id); // the server decides the price, never the browser

  try {
    let output: Output | null = null;
    const paid = await runPaidGeneration({
      userId: auth.userId, tool: slug, model: model?.id ?? "gemini-text", prompt: text.slice(0, 500), cost,
      produce: async () => { output = await runTool(slug, text, values); return output; },
      isValid: (r) => Boolean(r),
    });
    if (paid.status === "unpaid") return fail(402, "insufficient_points", "Your points ran out while this was generating. The result was saved to your Library as unpaid.");
    return NextResponse.json({ output, balance: paid.balance });
  } catch (e) { return handle(e); }
}
