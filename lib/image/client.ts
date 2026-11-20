import { createClient } from "@/lib/supabase/client";

export type Creation = {
  id: string; tool_type: "image" | "thumbnail"; title: string | null; prompt: string | null; image_path: string;
  aspect_ratio: string | null; model_label: string | null; points_charged: number; status: string; created_at: string; url?: string;
  session_id?: string | null; session_title?: string | null;
};
export type Session = { id: string; tool_type: "image" | "thumbnail"; title: string; count: number; at: string; cover?: string };
const COLS = "id, tool_type, title, prompt, image_path, aspect_ratio, model_label, points_charged, status, created_at, session_id, session_title";
const BUCKET = "generated-creations";

/** Shrinks a reference photo to at most 1024 px wide (JPEG) before it is sent. Falls back to the original. */
export async function compressReference(file: File): Promise<File> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1024 / bmp.width);
    const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h); ctx.drawImage(bmp, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.8));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch { return file; }
}

async function withUrls(rows: Creation[]): Promise<Creation[]> {
  if (!rows.length) return rows;
  const { data: signed } = await createClient().storage.from(BUCKET).createSignedUrls(rows.map((r) => r.image_path), 3600);
  return rows.map((r, i) => ({ ...r, url: signed?.[i]?.signedUrl ?? undefined }));
}

/** The user's saved images (newest first) with fresh viewing links. */
export async function loadCreations(o: { limit?: number; toolType?: "image" | "thumbnail" } = {}): Promise<Creation[]> {
  let q = createClient().from("creations").select(COLS).order("created_at", { ascending: false }).limit(o.limit ?? 60);
  if (o.toolType) q = q.eq("tool_type", o.toolType);
  const { data } = await q;
  return withUrls((data ?? []) as Creation[]);
}

/** Every image of one session, oldest first (older images made before sessions existed count as a session of one). */
export async function loadSessionThread(id: string): Promise<Creation[]> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return [];
  const { data } = await createClient().from("creations").select(COLS).or(`session_id.eq.${id},id.eq.${id}`).order("created_at", { ascending: true }).limit(100);
  return withUrls((data ?? []) as Creation[]);
}

/** Groups newest-first images into sessions, each named after its first prompt. */
export function groupSessions(rows: Creation[]): Session[] {
  const m = new Map<string, Session>();
  for (const r of rows) {
    const key = r.session_id ?? r.id, s = m.get(key);
    if (!s) m.set(key, { id: key, tool_type: r.tool_type, title: r.session_title || r.title || "Untitled", count: 1, at: r.created_at, cover: r.url });
    else s.count++;
  }
  return [...m.values()];
}

async function toPngBlob(url: string): Promise<Blob> {
  const src = await (await fetch(url)).blob();
  const bmp = await createImageBitmap(src);
  const canvas = document.createElement("canvas");
  canvas.width = bmp.width; canvas.height = bmp.height;
  canvas.getContext("2d")!.drawImage(bmp, 0, 0);
  return await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("png"))), "image/png"));
}
export async function downloadPng(url: string, name: string) {
  const blob = await toPngBlob(url);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = `${name}.png`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
/** Native share sheet with the image file when the phone supports it, otherwise the image is downloaded. */
export async function shareImage(url: string, title: string): Promise<"shared" | "downloaded" | "failed"> {
  try {
    const blob = await toPngBlob(url);
    const file = new File([blob], "nexora.png", { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title }); return "shared"; }
    await downloadPng(url, "nexora");
    return "downloaded";
  } catch (e) { return e instanceof DOMException && e.name === "AbortError" ? "shared" : "failed"; }
}
