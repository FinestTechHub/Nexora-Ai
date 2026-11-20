import { NextResponse } from "next/server";
import { generateText, type ChainName, type FilePart, type Turn } from "@/lib/ai/gemini";
import { chatSystem } from "@/lib/ai/prompts";
import { fail, handle, requireUser } from "@/lib/ai/route-helpers";
import { modelsFor } from "@/lib/models";
import { admin, InsufficientPointsError, runPaidGeneration } from "@/lib/points/server";
import { kindOf, limitMessage, limitsFor, mimeOf } from "@/lib/uploads/limits";

export const runtime = "nodejs";
export const maxDuration = 60;

type Body = { messages?: { role?: string; content?: unknown }[]; model?: string };

// Nexora 1.0 keeps every request small so the free messages stay very cheap.
const NEXORA1 = { messages: 6, chars: 4000, maxOutputTokens: 1024 };
function capTurns(turns: Turn[]): Turn[] {
  const picked: Turn[] = [];
  let total = 0;
  for (let i = turns.length - 1; i >= 0 && picked.length < NEXORA1.messages; i--) { // newest first, last 6 messages, about 4,000 characters
    const len = turns[i].content.length;
    if (picked.length && total + len > NEXORA1.chars) break;
    picked.unshift(turns[i]); total += len;
  }
  return picked;
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  let body: Body, file: File | null = null;
  try {
    if ((req.headers.get("content-type") ?? "").includes("multipart/form-data")) {
      const fd = await req.formData();
      body = JSON.parse(String(fd.get("payload") ?? "{}"));
      const f = fd.get("file");
      if (f instanceof File) file = f;
    } else body = await req.json();
  } catch { return fail(400, "bad_request", "Invalid request."); }

  const turns: Turn[] = (body.messages ?? [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && (m.content as string).trim())
    .slice(-20).map((m) => ({ role: m.role as Turn["role"], content: (m.content as string).slice(0, 4000) }));
  const last = turns[turns.length - 1];
  if (!last || last.role !== "user") return fail(400, "bad_request", "Type a message first.");

  const models = modelsFor("chat")!;
  const model = models.find((m) => m.id === body.model) ?? models[0];
  if (model.available === false) return fail(400, "model_unavailable", `${model.name} isn’t available yet. Please choose another model.`);
  const chain = (model.chain ?? "text") as ChainName;
  const isN1 = model.id === "nexora-1.0";

  // Attachment: checked against the user's plan and rolling 24-hour quota, read into memory, sent to Gemini, then discarded.
  let upload: { bytes: number; name: string; mime: string } | null = null;
  if (file) {
    const mime = mimeOf(file.name, file.type);
    if (!kindOf(mime)) return fail(415, "unsupported_file", "That file type isn’t supported. Use an image, a short video, or a PDF, TXT, MD or CSV document.");
    const { data: st, error } = await admin().rpc("upload_status", { p_user_id: auth.userId });
    if (error) return fail(500, "server_error", "Upload limits aren’t set up yet. Please try again later.");
    const upgraded = Boolean(st?.upgraded), lim = limitsFor(upgraded), used = Number(st?.used_24h ?? 0);
    if (file.size > lim.maxFile || used + file.size > lim.daily) return NextResponse.json({ error: "upload_limit", message: limitMessage(upgraded), quota: { upgraded } }, { status: 413 });
    const files: FilePart[] = [{ mimeType: mime, data: Buffer.from(await file.arrayBuffer()).toString("base64") }];
    last.files = files;
    upload = { bytes: file.size, name: file.name, mime };
  }
  const logUpload = async () => { if (upload) { try { await admin().from("user_uploads").insert({ user_id: auth.userId, bytes: upload.bytes, file_name: upload.name, mime_type: upload.mime }); } catch { /* quota log is best effort */ } } };
  const prompt = `${upload ? `[Attachment: ${upload.name}] ` : ""}${last.content}`.slice(0, 500);

  try {
    if (isN1) {
      // Nexora 1.0: 12 free messages per 24 hours, then 1 point each. Nothing is counted or charged unless the answer is valid.
      const limit = model.freeDaily ?? 12;
      const { data: u } = await admin().from("nexora1_usage").select("count, window_start").eq("user_id", auth.userId).maybeSingle();
      const fresh = !u || Date.parse(u.window_start) <= Date.now() - 24 * 3600 * 1000;
      if (limit - (fresh ? 0 : Number(u.count)) <= 0) { // free messages used up: check the balance BEFORE spending anything on the AI
        const { data: p } = await admin().from("profiles").select("points").eq("id", auth.userId).single();
        if (!p || p.points < model.points) throw new InsufficientPointsError("Not enough points.");
      }
      const text = await generateText({ system: chatSystem(auth), turns: capTurns(turns), chain, maxOutputTokens: NEXORA1.maxOutputTokens });
      const { data, error } = await admin().rpc("complete_nexora1", { p_user_id: auth.userId, p_prompt: prompt, p_result: { text }, p_limit: limit });
      if (error) throw error;
      if (data.status === "unpaid") return fail(402, "insufficient_points", "Your points ran out while this was generating. The answer was saved to your Library as unpaid.");
      await logUpload();
      return NextResponse.json({ text, balance: data.balance, freeLeft: Math.max(0, limit - Number(data.used_today)), limitReached: Boolean(data.free) && Number(data.used_today) === limit });
    }

    let text = "";
    const paid = await runPaidGeneration({
      userId: auth.userId, tool: "chat", model: model.id, prompt, cost: model.points,
      produce: async () => { text = await generateText({ system: chatSystem(auth), turns, chain }); return { text }; },
      isValid: (r) => r.text.length > 0,
    });
    if (paid.status === "unpaid") return fail(402, "insufficient_points", "Your points ran out while this was generating. The answer was saved to your Library as unpaid.");
    await logUpload();
    return NextResponse.json({ text, balance: paid.balance });
  } catch (e) { return handle(e); }
}
