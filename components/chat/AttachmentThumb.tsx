"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FileText, Image as ImageIcon, Video, X } from "lucide-react";
import { isExpired, signedUrl } from "@/lib/chat/attachments";
import type { ChatMessage } from "@/lib/chat/api";

type Att = NonNullable<ChatMessage["attachment"]>;
const badge = "mb-2 flex items-center gap-1.5 rounded-xl bg-black/25 px-2.5 py-1.5 text-xs text-white/90";

// Shows a sent attachment inside a message: tap an image to view it full screen. Videos and documents are only a file badge (they are never stored).
export default function AttachmentThumb({ att, file }: { att: Att; file?: File }) {
  const [url, setUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(false);
  const [gone, setGone] = useState(false);
  const expired = isExpired(att.expiresAt);
  const local = useMemo(() => (file && att.kind === "image" ? URL.createObjectURL(file) : null), [file, att.kind]);
  useEffect(() => () => { if (local) URL.revokeObjectURL(local); }, [local]);
  useEffect(() => {
    if (att.kind !== "image" || local || expired || !att.path) return;
    let live = true;
    signedUrl(att.path).then((u) => { if (!live) return; if (u) setUrl(u); else setGone(true); });
    return () => { live = false; };
  }, [att.path, att.kind, local, expired]);
  useEffect(() => { if (!zoom) return; const f = (e: KeyboardEvent) => { if (e.key === "Escape") setZoom(false); }; window.addEventListener("keydown", f); return () => window.removeEventListener("keydown", f); }, [zoom]);

  if (att.kind !== "image") { const Icon = att.kind === "video" ? Video : FileText; return <span className={badge}><Icon size={13} />{att.name}</span>; }
  if (expired) return <div className={`${badge} flex-col items-start`}><span className="flex items-center gap-1.5"><ImageIcon size={13} />Attachment expired after 14 days</span><Link href="/dashboard/pricing" className="underline">Upgrade to keep files permanently</Link></div>;
  const src = local ?? url;
  if (gone || (!src && !att.path)) return <span className={badge}><ImageIcon size={13} />{att.name || "Image"}</span>;
  if (!src) return <div className="mb-2 h-28 w-28 animate-pulse rounded-2xl bg-white/20" />;
  return (
    <>
      <button type="button" onClick={() => setZoom(true)} aria-label="View image full screen" className="mb-2 block overflow-hidden rounded-2xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={att.name} className="max-h-48 max-w-full rounded-2xl object-cover" />
      </button>
      {zoom && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/90 p-4" onClick={() => setZoom(false)}>
          <button type="button" aria-label="Close" onClick={() => setZoom(false)} className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] grid h-10 w-10 place-items-center rounded-full bg-white/10"><X size={20} /></button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={att.name} className="max-h-[90dvh] max-w-full rounded-xl object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </>
  );
}
