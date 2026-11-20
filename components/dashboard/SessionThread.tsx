"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Download, Pencil, Share2, X } from "lucide-react";
import ImageViewer from "./ImageViewer";
import { downloadPng, loadSessionThread, shareImage, type Creation, type Session } from "@/lib/image/client";

// Full-screen view of one image session: every prompt and image in order.
export default function SessionThread({ session, onClose }: { session: Session; onClose: () => void }) {
  const [rows, setRows] = useState<Creation[] | null>(null);
  const [view, setView] = useState<Creation | null>(null);
  useEffect(() => { loadSessionThread(session.id).then(setRows).catch(() => setRows([])); }, [session.id]);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape" && !view) onClose(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose, view]);
  const studio = session.tool_type === "thumbnail" ? "thumbnails" : "image";
  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#0a0a0c]" role="dialog" aria-modal="true" aria-label="Session">
      <div className="flex items-center gap-3 border-b border-line px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="min-w-0 flex-1"><h2 className="truncate font-semibold">{session.title}</h2><p className="text-xs text-muted">{session.tool_type === "thumbnail" ? "Thumbnail Maker" : "Image Studio"} · {session.count} {session.count === 1 ? "image" : "images"}</p></div>
        <Link href={`/dashboard/${studio}?s=${session.id}`} className="btn btn-p !px-3 !py-1.5 text-xs"><Pencil size={13} />Continue</Link>
        <button type="button" aria-label="Close" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10"><X size={20} /></button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
        {rows === null ? <p className="text-center text-muted">Loading…</p> : (
          <div className="mx-auto max-w-lg space-y-6">
            {rows.map((r) => (
              <div key={r.id} className="space-y-3">
                <div className="flex justify-end"><div className="max-w-[88%] whitespace-pre-wrap break-words rounded-3xl rounded-br-lg bg-brand px-4 py-2.5 text-white">{r.prompt}</div></div>
                {r.url && (
                  <div>
                    <button type="button" onClick={() => setView(r)} aria-label="View full screen" className="block overflow-hidden rounded-2xl">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={r.url} alt={r.title ?? ""} className="max-w-full rounded-2xl object-contain" />
                    </button>
                    <div className="mt-2 flex gap-2">
                      <button type="button" onClick={() => downloadPng(r.url!, `nexora-${r.id.slice(0, 8)}`)} className="btn btn-g !px-3 !py-1.5 text-xs"><Download size={14} />Download PNG</button>
                      <button type="button" onClick={() => shareImage(r.url!, r.title ?? "Nexora image")} className="btn btn-g !px-3 !py-1.5 text-xs"><Share2 size={14} />Share</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {view?.url && <ImageViewer src={view.url} title={view.title ?? undefined} id={view.id} onClose={() => setView(null)} />}
    </div>
  );
}
