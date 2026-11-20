import { NextResponse } from "next/server";
import { AIError } from "@/lib/ai/gemini";
import { ASPECTS, STYLES, buildImagePrompt, generateImage, type Aspect, type Ref } from "@/lib/ai/image";
import { fail, handle, requireUser } from "@/lib/ai/route-helpers";
import { modelsFor } from "@/lib/models";
import { admin, InsufficientPointsError } from "@/lib/points/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const BUCKET = "generated-creations";
const REF_TYPES = ["image/jpeg", "image/png", "image/webp"];
const EXT: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  let p: { mode?: string; prompt?: string; style?: string; aspect?: string; text?: string; modelId?: string; sessionId?: string; sessionTitle?: string; edit?: boolean };
  const refs: Ref[] = [];
  try {
    const fd = await req.formData();
    p = JSON.parse(String(fd.get("payload") ?? "{}"));
    for (let i = 0; i < 3; i++) { // up to 3 reference photos, already shrunk in the browser
      const f = fd.get(`ref${i}`);
      if (!(f instanceof File)) continue;
      if (!REF_TYPES.includes(f.type) || f.size > 2_000_000) return fail(400, "bad_reference", "Reference images must be JPEG, PNG or WebP and under 2 MB.");
      refs.push({ mimeType: f.type, data: Buffer.from(await f.arrayBuffer()).toString("base64") });
    }
  } catch { return fail(400, "bad_request", "Invalid request."); }

  const mode = p.mode === "thumbnail" ? "thumbnail" : "image";
  const prompt = (p.prompt ?? "").trim().slice(0, 600);
  if (!prompt) return fail(400, "bad_request", mode === "thumbnail" ? "Describe the thumbnail scene or topic first." : "Describe your image first.");
  const style = p.style && STYLES[p.style] ? p.style : "Photorealistic";
  const aspect = (ASPECTS.includes(p.aspect as Aspect) ? p.aspect : mode === "thumbnail" ? "16:9" : "1:1") as Aspect;
  const text = mode === "thumbnail" ? (p.text ?? "").trim().slice(0, 60) : "";

  const models = modelsFor(mode === "thumbnail" ? "thumbnails" : "image")!;
  const model = models.find((m) => m.id === p.modelId) ?? models.find((m) => m.id === (mode === "thumbnail" ? "image-pro" : "image-fast")) ?? models[0];
  const cost = model.points; // 5 / 10 / 20, decided here, never by the browser
  const tier = model.id === "image-ultra" ? "ultra" : model.id === "image-pro" ? "pro" : "fast";
  const sessionId = typeof p.sessionId === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(p.sessionId) ? p.sessionId : crypto.randomUUID();
  const sessionTitle = (p.sessionTitle ?? "").trim().slice(0, 120) || prompt.slice(0, 80);
  const db = admin();

  try {
    const { data: prof } = await db.from("profiles").select("points").eq("id", auth.userId).single();
    if (!prof || prof.points < cost) throw new InsufficientPointsError("Not enough points."); // checked BEFORE spending anything on the AI

    const img = await generateImage({ tier, aspect, refs, prompt: buildImagePrompt({ mode, prompt, style, aspect, text, refs: refs.length, edit: Boolean(p.edit) && refs.length > 0 }) });

    // Save permanently FIRST. Only a saved image can be charged.
    const path = `${auth.userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${EXT[img.mimeType] ?? "png"}`;
    const up = await db.storage.from(BUCKET).upload(path, img.data, { contentType: img.mimeType, upsert: false });
    if (up.error) { console.error("image upload failed:", up.error.message); throw new AIError("save_failed", "We couldn’t save your image.", 500); }

    const title = (mode === "thumbnail" ? text || prompt : prompt).slice(0, 80);
    const { data, error } = await db.rpc("complete_image_creation", { p_user_id: auth.userId, p_tool_type: mode, p_title: title, p_prompt: prompt, p_image_path: path, p_aspect: aspect, p_model_label: model.name, p_amount: cost, p_session_id: sessionId, p_session_title: sessionTitle });
    if (error) { await db.storage.from(BUCKET).remove([path]); throw error; }
    if (data.status === "unpaid") return fail(402, "insufficient_points", "Your points ran out while this was generating. The image was saved to your Library as unpaid.");

    const { data: s } = await db.storage.from(BUCKET).createSignedUrl(path, 3600);
    return NextResponse.json({
      balance: data.balance,
      creation: { id: data.creation_id, tool_type: mode, title, prompt, image_path: path, aspect_ratio: aspect, model_label: model.name, points_charged: data.points_charged, status: "succeeded", session_id: sessionId, session_title: sessionTitle, created_at: new Date().toISOString(), url: s?.signedUrl },
    });
  } catch (e) { return handle(e); }
}
