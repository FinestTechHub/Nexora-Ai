"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { compressReference } from "@/lib/image/client";

// Up to 3 reference photos, shrunk in the browser. Shown right above the prompt box, like Chat's attachment strip.
export default function ReferenceTray({ files, onChange }: { files: File[]; onChange: (f: File[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState("");
  const urls = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u)), [urls]);

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const list = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!list.length) return;
    const ok = list.filter((f) => /^image\/(jpeg|png|webp)$/.test(f.type)).slice(0, 3 - files.length);
    setMsg(ok.length < list.length ? "Only JPEG, PNG or WebP photos, up to 3 in total." : "");
    if (ok.length) onChange([...files, ...(await Promise.all(ok.map(compressReference)))]);
  }
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-2">
        {files.map((f, i) => (
          <div key={urls[i]} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={urls[i]} alt={f.name} className="h-12 w-12 rounded-xl border border-zinc-800 object-cover" />
            <button type="button" aria-label="Remove reference image" onClick={() => onChange(files.filter((_, j) => j !== i))} className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-zinc-900 ring-1 ring-zinc-700"><X size={11} /></button>
          </div>
        ))}
        {files.length < 3 && <button type="button" onClick={() => input.current?.click()} className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900/90 px-3 py-1.5 text-xs font-medium hover:border-brand"><Plus size={13} className="text-brand" />{files.length ? `Add more (${files.length}/3)` : "Add reference images (up to 3)"}</button>}
      </div>
      <p className="text-[11px] leading-snug text-zinc-500">Optional: attach up to 3 photos (your face, a product, or style reference) to blend into the result.</p>
      {msg && <p role="alert" className="text-xs text-amber-400">{msg}</p>}
      <input ref={input} type="file" hidden multiple accept="image/jpeg,image/png,image/webp" onChange={pick} />
    </div>
  );
}
