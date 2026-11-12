import Link from "next/link";
import { ArrowLeft, type LucideIcon } from "lucide-react";

export const GRADS = [
  "from-navy via-blue-700 to-sky", "from-sky to-brand", "from-blue-900 to-indigo-500", "from-brand to-cyan-300",
  "from-indigo-600 to-sky", "from-slate-900 to-blue-600",
];

export function ToolHeader({ Icon, title, desc, note }: { Icon: LucideIcon; title: string; desc: string; note?: string }) {
  return (
    <div className="mb-6">
      <Link href="/dashboard" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-brand"><ArrowLeft size={16} />Overview</Link>
      <div className="flex items-start gap-4">
        <div className="icon-box !mb-0 shrink-0"><Icon size={24} /></div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
          <p className="mt-1 text-muted">{desc}</p>
        </div>
      </div>
      {note && <p className="mt-3 text-xs text-muted">{note}</p>}
    </div>
  );
}

export function Choice<T extends string>({ label, options, value, onChange }: { label: string; options: readonly T[]; value: T; onChange: (v: T) => void }) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold">{label}</p>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button key={o} type="button" role="radio" aria-checked={value === o} onClick={() => onChange(o)}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${value === o ? "border-brand bg-brand text-white" : "border-line bg-card text-muted hover:border-brand hover:text-brand"}`}>{o}</button>
        ))}
      </div>
    </div>
  );
}

export const DemoTag = () => <span className="rounded-full bg-black/50 px-2.5 py-0.5 text-[11px] font-bold tracking-wider text-white">DEMO PREVIEW</span>;
