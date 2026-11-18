"use client";
import { useEffect, useState } from "react";
import { Download, Share2, X } from "lucide-react";
import { downloadPng, shareImage } from "@/lib/image/client";

// Full-screen image with Download PNG and Share.
export default function ImageViewer({ src, title, id, onClose }: { src: string; title?: string; id: string; onClose: () => void }) {
  const [msg, setMsg] = useState("");
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  async function dl() { setMsg("Preparing…"); try { await downloadPng(src, `nexora-${id.slice(0, 8)}`); setMsg(""); } catch { setMsg("Couldn’t download. Please try again."); } }
  async function sh() { const r = await shareImage(src, title || "Nexora image"); setMsg(r === "downloaded" ? "Sharing isn’t available here, so the image was downloaded." : r === "failed" ? "Couldn’t share. Please try again." : ""); }
  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-black/95" role="dialog" aria-modal="true" aria-label="Image">
      <div className="flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <p className="min-w-0 truncate text-sm text-zinc-300">{title}</p>
        <button type="button" aria-label="Close" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10"><X size={20} /></button>
      </div>
      <div className="grid min-h-0 flex-1 place-items-center p-4" onClick={onClose}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={title || "Generated image"} className="max-h-full max-w-full rounded-xl object-contain" onClick={(e) => e.stopPropagation()} />
      </div>
      <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {msg && <p role="status" className="mb-2 text-center text-xs text-zinc-300">{msg}</p>}
        <div className="mx-auto flex max-w-sm gap-2">
          <button type="button" onClick={dl} className="btn btn-p flex-1 !py-2.5 text-sm"><Download size={16} />Download PNG</button>
          <button type="button" onClick={sh} className="btn btn-g flex-1 !py-2.5 text-sm"><Share2 size={16} />Share</button>
        </div>
      </div>
    </div>
  );
}
