"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { FileText, Image as ImageIcon, Video, X } from "lucide-react";
import { ACCEPT, FREE, UPGRADED, kindOf, limitMessage, limitsFor, mb, mimeOf, type Kind, type Quota } from "@/lib/uploads/limits";

const OPTIONS: { k: Kind; label: string; hint: string; Icon: typeof ImageIcon }[] = [
  { k: "image", label: "Image", hint: "Photos and screenshots", Icon: ImageIcon },
  { k: "video", label: "Video", hint: "Short clips", Icon: Video },
  { k: "document", label: "Document", hint: "PDF, TXT, MD or CSV", Icon: FileText },
];

function FileChip({ file, onRemove }: { file: File; onRemove: () => void }) {
  const kind = kindOf(mimeOf(file.name, file.type));
  const url = useMemo(() => (kind === "image" ? URL.createObjectURL(file) : null), [file, kind]);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  const Icon = kind === "video" ? Video : FileText;
  return (
    <div className="inline-flex max-w-full items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/90 py-1.5 pl-1.5 pr-2 text-sm">
      {url ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={url} alt="" className="h-9 w-9 rounded-lg object-cover" /> : <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/5"><Icon size={18} className="text-brand" /></span>}
      <span className="min-w-0"><span className="block max-w-[46vw] truncate text-[13px] font-medium">{file.name}</span><span className="text-[11px] text-muted">{(file.size / 1_000_000).toFixed(1)} MB</span></span>
      <button type="button" aria-label="Remove attachment" onClick={onRemove} className="grid h-7 w-7 place-items-center rounded-full hover:bg-white/10"><X size={14} /></button>
    </div>
  );
}

function UpgradeCard({ upgraded, onClose }: { upgraded: boolean; onClose: () => void }) {
  return (
    <div role="alert" className="relative rounded-2xl border border-brand/40 bg-zinc-900 p-4 pr-10 text-sm">
      <button type="button" aria-label="Dismiss" onClick={onClose} className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full hover:bg-white/10"><X size={14} /></button>
      <p>{limitMessage(upgraded)}</p>
      {!upgraded && <Link href="/dashboard/pricing" className="btn btn-p mt-3 !py-2 text-sm">Upgrade</Link>}
    </div>
  );
}

/** One attachment per message. Files stay in memory only. Returns the pieces ChatApp and HomeScreen plug in. */
export function useAttachment() {
  const [file, setFile] = useState<File | null>(null);
  const [sheet, setSheet] = useState(false);
  const [quota, setQuota] = useState<Quota | null>(null);
  const [limit, setLimit] = useState<{ upgraded: boolean } | null>(null);
  const [err, setErr] = useState("");
  const refs = { image: useRef<HTMLInputElement>(null), video: useRef<HTMLInputElement>(null), document: useRef<HTMLInputElement>(null) };

  function openSheet() {
    setSheet(true); setErr("");
    fetch("/api/uploads/quota").then((r) => (r.ok ? r.json() : null)).then((q) => { if (q) setQuota(q as Quota); }).catch(() => {});
  }
  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = ""; setSheet(false);
    if (!f) return;
    if (!kindOf(mimeOf(f.name, f.type))) { setErr("That file type isn’t supported. Use an image, a short video, or a PDF, TXT, MD or CSV document."); return; }
    if (quota) { const lim = limitsFor(quota.upgraded); if (f.size > lim.maxFile || quota.used + f.size > lim.daily) { setLimit({ upgraded: quota.upgraded }); return; } }
    else if (f.size > UPGRADED.maxFile) { setLimit({ upgraded: false }); return; }
    setErr(""); setLimit(null); setFile(f);
  }
  const lim = quota ? limitsFor(quota.upgraded) : FREE;

  const ui = (
    <>
      {OPTIONS.map((o) => <input key={o.k} ref={refs[o.k]} type="file" hidden accept={ACCEPT[o.k]} onChange={onPick} />)}
      {sheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={() => setSheet(false)}>
          <div role="dialog" aria-modal="true" aria-label="Attach a file" onClick={(e) => e.stopPropagation()} className="page-in w-full max-w-lg rounded-t-3xl border-t border-zinc-800 bg-[#111114] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-zinc-700" />
            <h2 className="mb-3 text-lg font-semibold">Attach</h2>
            <div className="space-y-2">
              {OPTIONS.map(({ k, label, hint, Icon }) => (
                <button key={k} type="button" onClick={() => refs[k].current?.click()} className="flex w-full items-center gap-3 rounded-2xl border border-line bg-card px-4 py-3 text-left transition active:scale-[.98]">
                  <span className="icon-box !mb-0 !h-10 !w-10 !rounded-xl"><Icon size={18} /></span>
                  <span><b className="block text-[15px]">{label}</b><span className="text-xs text-muted">{hint}</span></span>
                </button>
              ))}
            </div>
            <p className="mt-3 text-center text-xs text-muted">Up to {mb(lim.maxFile)} per file · {mb(lim.daily)} per 24 hours. Files aren’t stored.</p>
          </div>
        </div>
      )}
    </>
  );
  const chip = limit ? <UpgradeCard upgraded={limit.upgraded} onClose={() => setLimit(null)} />
    : err ? <p role="alert" className="rounded-xl bg-zinc-900 px-3 py-2 text-xs text-red-400">{err}</p>
    : file ? <FileChip file={file} onRemove={() => setFile(null)} /> : null;
  return { file, clear: () => { setFile(null); setLimit(null); setErr(""); }, openSheet, ui, chip, showLimit: (upgraded: boolean) => { setFile(null); setLimit({ upgraded }); } };
}
