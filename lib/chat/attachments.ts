import { createClient } from "@/lib/supabase/client";

const BUCKET = "chat-attachments";
export const isExpired = (iso?: string | null) => !!iso && Date.parse(iso) < Date.now();

/** Shrinks a photo to at most 1200 px wide at about 0.75 JPEG quality (roughly 150-250 KB). If the browser can't read it, the original is used. */
export async function compressImage(file: File): Promise<File> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1200 / bmp.width);
    const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h); ctx.drawImage(bmp, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.75));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch { return file; }
}

export type SavedImage = { path: string; expiresAt: string | null };

/** Saves a compressed image to the private bucket. The database decides the expiry (14 days free, never for upgraded users). Returns null if it couldn't be saved. */
export async function saveChatImage(userId: string, file: File): Promise<SavedImage | null> {
  if (file.type !== "image/jpeg") return null;
  try {
    const sb = createClient();
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const up = await sb.storage.from(BUCKET).upload(path, file, { contentType: "image/jpeg", upsert: false });
    if (up.error) return null;
    const { data, error } = await sb.from("chat_attachments").insert({ user_id: userId, path, file_name: file.name, mime_type: file.type, bytes: file.size }).select("expires_at").single();
    if (error) { await sb.storage.from(BUCKET).remove([path]); return null; }
    return { path, expiresAt: (data?.expires_at as string | null) ?? null };
  } catch { return null; }
}

export async function signedUrl(path: string): Promise<string | null> {
  const { data } = await createClient().storage.from(BUCKET).createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

/** Deletes this user's expired images from the bucket and the metadata table. Runs whenever the chat opens. */
export async function purgeExpired() {
  try {
    const sb = createClient();
    const { data } = await sb.from("chat_attachments").select("id, path").lt("expires_at", new Date().toISOString());
    if (!data?.length) return;
    await sb.storage.from(BUCKET).remove(data.map((d) => d.path as string));
    await sb.from("chat_attachments").delete().in("id", data.map((d) => d.id as string));
  } catch { /* try again next time */ }
}
