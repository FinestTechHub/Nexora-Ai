import Link from "next/link";
import { CHAT, TOOLS, href } from "@/lib/dashboard";

export const metadata = { title: "Create" };

export default function ToolsHub() {
  const items = [CHAT, ...TOOLS];
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-semibold tracking-tight">What do you want to create?</h1>
      <p className="mb-5 mt-1 text-sm text-muted">Pick a tool to get started.</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((i) => (
          <Link key={i.slug} href={href(i)} className="rounded-3xl border border-line bg-card p-4 transition active:scale-[.97]">
            <div className="icon-box"><i.Icon size={22} /></div>
            <h2 className="text-[15px] font-semibold leading-tight">{i.name}</h2>
            <p className="mt-1 text-xs text-muted">{i.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
