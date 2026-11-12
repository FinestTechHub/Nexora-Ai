"use client";
import { useState } from "react";
import { X, type LucideIcon } from "lucide-react";
import Dock from "./Dock";

type DockProps = Omit<React.ComponentProps<typeof Dock>, "onOptions">;

// App-style create screen: result canvas on top, floating dock at the bottom, settings in a bottom sheet.
export default function StudioShell({ Icon, title, canvas, options, dock, note }: { Icon: LucideIcon; title: string; canvas: React.ReactNode; options: (close: () => void) => React.ReactNode; dock: DockProps; note?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-2">
        <div className="mx-auto max-w-3xl">
          <div className="mb-4 flex items-center gap-2 text-muted"><Icon size={16} /><span className="text-sm font-medium text-ink">{title}</span></div>
          {canvas}
        </div>
      </div>
      {note && <p role="status" className="px-6 pb-2 text-center text-xs text-zinc-400">{note}</p>}
      <Dock {...dock} onOptions={() => setOpen(true)} />
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={() => setOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label={`${title} options`} onClick={(e) => e.stopPropagation()} className="page-in max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border-t border-zinc-800 bg-[#111114] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-zinc-700" />
            <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">Options</h2><button type="button" aria-label="Close" onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/10"><X size={18} /></button></div>
            <div className="space-y-5">{options(() => setOpen(false))}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export function StudioHero({ Icon, title, chips, onChip }: { Icon: LucideIcon; title: string; chips: string[]; onChip: (v: string) => void }) {
  return (
    <div className="flex min-h-[46dvh] flex-col items-center justify-center text-center">
      <div className="relative mb-5"><div className="absolute inset-0 -z-10 scale-[2] rounded-full bg-brand/40 blur-2xl" /><div className="icon-box !mb-0 !h-16 !w-16 !rounded-3xl"><Icon size={30} /></div></div>
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {chips.map((c) => <button key={c} type="button" onClick={() => onChip(c)} className="rounded-full border border-white/10 px-3.5 py-1.5 text-sm text-zinc-400 transition hover:border-white/25 hover:text-zinc-200">{c.length > 32 ? `${c.slice(0, 30)}…` : c}</button>)}
      </div>
    </div>
  );
}
