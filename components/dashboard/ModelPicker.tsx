"use client";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { fmtPts, type Model } from "@/lib/models";

export default function ModelPicker({ models, value, onChange, up = false, label = true }: { models: Model[]; value: string; onChange: (id: string) => void; up?: boolean; label?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const cur = models.find((m) => m.id === value) ?? models[0];
  useEffect(() => {
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div ref={ref} className="relative" onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}>
      {label && <p className="mb-2 text-sm font-semibold">Model</p>}
      <button type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 rounded-2xl border border-line bg-card px-4 py-2.5 text-left transition hover:border-brand">
        <span className="min-w-0 flex-1"><b className="block truncate text-sm">{cur.name}</b><span className="text-xs text-muted">{cur.badge}</span></span>
        <span className="shrink-0 rounded-full bg-soft px-2.5 py-1 text-xs font-bold text-brand">{fmtPts(cur.points)}</span>
        <ChevronDown size={16} className={`shrink-0 text-muted transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ul role="listbox" aria-label="Model" className={`absolute z-30 w-full rounded-2xl border border-line bg-card p-1.5 shadow-xl ${up ? "bottom-full mb-2" : "mt-2"}`}>
          {models.map((m) => (
            <li key={m.id} role="option" aria-selected={m.id === cur.id}>
              <button type="button" onClick={() => { onChange(m.id); setOpen(false); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-soft">
                <span className="min-w-0 flex-1"><b className="block truncate text-sm">{m.name}</b><span className="text-xs text-muted">{m.badge}</span></span>
                <span className="shrink-0 text-xs font-bold text-brand">{fmtPts(m.points)}</span>
                {m.id === cur.id && <Check size={15} className="shrink-0 text-brand" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
