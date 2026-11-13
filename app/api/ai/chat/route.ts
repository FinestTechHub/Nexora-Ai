import { NextResponse } from "next/server";
import { generateText, type FilePart, type Turn } from "@/lib/ai/gemini";
import { CHAT_SYSTEM } from "@/lib/ai/prompts";
import { fail, handle, requireUser } from "@/lib/ai/route-helpers";
import { modelsFor } from "@/lib/models";
import { admin, runPaidGeneration } from "@/lib/points/server";
import { kindOf, limitMessage, limitsFor, mimeOf } from "@/lib/uploads/limits";

export const runtime = "nodejs";
export const maxDuration = 60;

type Body = { messages?: { role?: string; content?: unknown }[]; model?: string };

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  let body: Body, file: File | null = null;
  try {
    if ((req.headers.get("content-type") ?? "").includes("multipart/form-data")) { // a message with an attachment
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
  if (model.available === false) return fail(400, "model_unavailable", `${model.name.split(" (")[0]} isn’t available yet. Please choose Nexora Flash.`);

  // Attachment: checked against the user's plan and rolling 24-hour quota. The file is read into memory, sent to Gemini and discarded.
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

  try {
    let text = "";
    const paid = await runPaidGeneration({
      userId: auth.userId, tool: "chat", model: model.id, prompt: `${upload ? `[Attachment: ${upload.name}] ` : ""}${last.content}`.slice(0, 500), cost: model.points,
      produce: async () => { text = await generateText({ system: CHAT_SYSTEM, turns, chain: "text" }); return { text }; },
      isValid: (r) => r.text.length > 0,
    });
    if (paid.status === "unpaid") return fail(402, "insufficient_points", "Your points ran out while this was generating. The answer was saved to your Library as unpaid.");
    if (upload) { try { await admin().from("user_uploads").insert({ user_id: auth.userId, bytes: upload.bytes, file_name: upload.name, mime_type: upload.mime }); } catch { /* quota log is best effort */ } }
    return NextResponse.json({ text, balance: paid.balance });
  } catch (e) { return handle(e); }
}
