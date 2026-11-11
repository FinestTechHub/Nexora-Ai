"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, Plus, SlidersHorizontal } from "lucide-react";

type Props = { value: string; onChange: (v: string) => void; onSend: () => void; placeholder?: string; cost?: string; low?: boolean; disabled?: boolean; menu?: React.ReactNode; onOptions?: () => void; top?: React.ReactNode };

// Floating Gemini-style input dock: "+" menu, text field, point-cost badge, round send button.
export default function Dock({ value, onChange, onSend, placeholder = "Ask Nexora…", cost, low, disabled, menu, onOptions, top }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const ta = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  useEffect(() => { const t = ta.current; if (t) { t.style.height = "auto"; t.style.height = `${Math.min(t.scrollHeight, 160)}px`; } }, [value]);
  const blocked = !value.trim() || !!disabled || !!low;
  const defaultMenu = (
    <>{[["Chat", "/dashboard/chat"], ["Image generator", "/dashboard/image"], ["Video generator", "/dashboard/video"], ["All tools", "/dashboard/tools"]].map(([t, h]) => <Link key={h} href={h} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-white/10">{t}</Link>)}</>
  );
  function key(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const touch = /Mobi|Android|iPhone/i.test(navigator.userAgent);
    if (e.key === "Enter" && !e.shiftKey && !touch) { e.preventDefault(); if (!blocked) onSend(); }
  }
  return (
    <div ref={ref} className="relative mx-auto w-full max-w-2xl px-3 pb-3 lg:pb-4">
      {low && <p role="alert" className="mb-2 text-center text-xs text-amber-400">Not enough points. <Link href="/dashboard/pricing" className="underline">Top up</Link></p>}
      {open && <div onClick={() => setOpen(false)} className="absolute bottom-full left-3 z-30 mb-2 w-60 rounded-2xl border border-zinc-800 bg-zinc-900 p-1.5 shadow-2xl">{menu ?? defaultMenu}</div>}
      <div className="relative flex items-end gap-2 rounded-[28px] border border-zinc-800 bg-zinc-900/80 p-2 backdrop-blur-md focus-within:border-zinc-600">
        {top && <div className="absolute -top-3 left-4 z-10">{top}</div>}
        {cost && <span className={`absolute -top-2.5 right-14 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${low ? "border-amber-500/40 bg-zinc-900 text-amber-400" : "border-zinc-700 bg-zinc-900 text-zinc-300"}`}>{cost}</span>}
        <button type="button" aria-label="More options" aria-expanded={open} onClick={() => setOpen(!open)} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/5 text-zinc-300 transition hover:bg-white/10"><Plus size={20} className={`transition ${open ? "rotate-45" : ""}`} /></button>
        {onOptions && <button type="button" aria-label="Options" onClick={onOptions} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/5 text-zinc-300 transition hover:bg-white/10"><SlidersHorizontal size={18} /></button>}
        <label htmlFor="dock-input" className="sr-only">Message</label>
        <textarea id="dock-input" ref={ta} rows={1} value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={key} placeholder={placeholder} className="max-h-40 min-w-0 flex-1 resize-none bg-transparent px-1 py-2.5 text-base text-zinc-100 outline-none placeholder:text-zinc-500" />
        <button type="button" onClick={onSend} disabled={blocked} aria-label="Send" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand text-white transition hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"><ArrowUp size={19} /></button>
      </div>
    </div>
  );
}
