import { createClient } from "@/lib/supabase/client";

export type Creation = {
  id: string; tool_type: "image" | "thumbnail"; title: string | null; prompt: string | null; image_path: string;
  aspect_ratio: string | null; model_label: string | null; points_charged: number; status: string; created_at: string; url?: string;
};
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

/** The user's saved images (newest first) with fresh viewing links. */
export async function loadCreations(o: { limit?: number; toolType?: "image" | "thumbnail" } = {}): Promise<Creation[]> {
  const sb = createClient();
  let q = sb.from("creations").select("id, tool_type, title, prompt, image_path, aspect_ratio, model_label, points_charged, status, created_at").order("created_at", { ascending: false }).limit(o.limit ?? 60);
  if (o.toolType) q = q.eq("tool_type", o.toolType);
  const { data } = await q;
  const rows = (data ?? []) as Creation[];
  if (!rows.length) return rows;
  const { data: signed } = await sb.storage.from(BUCKET).createSignedUrls(rows.map((r) => r.image_path), 3600);
  return rows.map((r, i) => ({ ...r, url: signed?.[i]?.signedUrl ?? undefined }));
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
