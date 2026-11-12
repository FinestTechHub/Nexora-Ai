"use client";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { fmtPts, type Model } from "@/lib/models";

type Props = { models: Model[]; value: string; onChange: (id: string) => void; up?: boolean; label?: boolean; compact?: boolean };

export default function ModelPicker({ models, value, onChange, up = false, label = true, compact = false }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const cur = models.find((m) => m.id === value) ?? models[0];
  useEffect(() => {
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const list = (
    <ul role="listbox" aria-label="Model" className={`absolute z-50 rounded-2xl border border-zinc-800 bg-zinc-900 p-1.5 shadow-2xl ${compact ? "left-0 top-full mt-1 w-[min(20rem,86vw)]" : `w-full ${up ? "bottom-full mb-2" : "mt-2"}`}`}>
      {models.map((m) => (
        <li key={m.id} role="option" aria-selected={m.id === cur.id}>
          <button type="button" disabled={m.available === false} onClick={() => { onChange(m.id); setOpen(false); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-white/10 disabled:opacity-50 disabled:hover:bg-transparent">
            <span className="min-w-0 flex-1"><b className="block truncate text-sm">{m.name}</b><span className="text-xs text-muted">{m.badge}</span></span>
            <span className="shrink-0 text-xs font-bold text-brand">{m.available === false ? "Soon" : fmtPts(m.points)}</span>
            {m.id === cur.id && <Check size={15} className="shrink-0 text-brand" />}
          </button>
        </li>
      ))}
    </ul>
  );
  return (
    <div ref={ref} className="relative" onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}>
      {!compact && label && <p className="mb-2 text-sm font-semibold">Model</p>}
      {compact ? (
        <button type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(!open)} className="flex items-center gap-1 rounded-full px-3 py-2 text-[17px] font-semibold hover:bg-white/10">
          <span className="max-w-[48vw] truncate">{cur.name.split(" (")[0]}</span><ChevronDown size={16} className={`shrink-0 text-muted transition ${open ? "rotate-180" : ""}`} />
        </button>
      ) : (
        <button type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 rounded-2xl border border-line bg-card px-4 py-2.5 text-left transition hover:border-brand">
          <span className="min-w-0 flex-1"><b className="block truncate text-sm">{cur.name}</b><span className="text-xs text-muted">{cur.badge}</span></span>
          <span className="shrink-0 rounded-full bg-soft px-2.5 py-1 text-xs font-bold text-brand">{fmtPts(cur.points)}</span>
          <ChevronDown size={16} className={`shrink-0 text-muted transition ${open ? "rotate-180" : ""}`} />
        </button>
      )}
      {open && list}
    </div>
  );
}
