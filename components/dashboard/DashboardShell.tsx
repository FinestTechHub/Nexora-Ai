"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, FolderOpen, Home, Menu, MessageSquare, Search, Sparkles, X } from "lucide-react";
import { createClient, isConfigured } from "@/lib/supabase/client";
import Logo from "../Logo";
import account from "@/lib/account.json";
import { modelsFor } from "@/lib/models";
import { ACCOUNT, CHAT, OVERVIEW, PAGES, TOOLS, href, type DashItem } from "@/lib/dashboard";

const demoNotes = ["Welcome to Nexora Ai (demo notification)", "Your demo points are ready (demo)", "New tools are coming soon (demo)"];

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  useEffect(() => {
    if (!isConfigured) return;
    createClient().auth.getUser().then(({ data }) => { const u = data.user; if (u) setUser({ name: u.user_metadata?.full_name ?? u.email ?? "Account", email: u.email ?? "" }); });
  }, []);
  const initials = (user?.name ?? "Demo User").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  async function logout() { if (isConfigured) await createClient().auth.signOut(); router.push("/login"); router.refresh(); }

  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState<"" | "bell" | "user">("");
  const [q, setQ] = useState("");
  const hits = q.trim() ? PAGES.filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase())) : [];
  const slug = path.split("/")[2] ?? "";
  const hasSlot = path === "/dashboard" || Boolean(modelsFor(slug));
  const title = slug === "tools" ? "Create" : (PAGES.find((p) => p.slug === slug)?.name ?? "Nexora AI");
  const FULL = ["", "chat", "image", "video", "image-to-video", "voice", "script", "youtube-seo", "thumbnails", "ideas"];
  const full = FULL.includes(slug);
  const tabs = [
    { n: "Home", h: "/dashboard", I: Home, on: path === "/dashboard" },
    { n: "Chat", h: "/dashboard/chat", I: MessageSquare, on: path === "/dashboard/chat" },
    { n: "Create", h: "/dashboard/tools", I: Sparkles, on: slug === "tools" || TOOLS.some((t) => t.slug === slug) },
    { n: "Library", h: "/dashboard/creations", I: FolderOpen, on: slug === "creations" },
  ];

  const NavLink = ({ i }: { i: DashItem }) => {
    const on = path === href(i);
    return (
      <Link href={href(i)} onClick={() => setOpen(false)} aria-current={on ? "page" : undefined}
        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${on ? "bg-brand/20 text-white" : "text-muted hover:bg-white/5 hover:text-ink"}`}>
        <i.Icon size={18} />{i.name}
      </Link>
    );
  };
  const Group = ({ title: t, items }: { title?: string; items: DashItem[] }) => (
    <div className="mb-4">{t && <p className="mb-1.5 px-3 text-[11px] font-bold uppercase tracking-widest text-muted">{t}</p>}<div className="space-y-0.5">{items.map((i) => <NavLink key={i.slug} i={i} />)}</div></div>
  );

  return (
    <div className="dash-dark relative flex h-dvh flex-col overflow-hidden bg-bg text-ink lg:pl-64">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-72 bg-[radial-gradient(60%_100%_at_50%_100%,rgba(37,99,235,.35),transparent)]" />
      {open && <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setOpen(false)} />}
      <aside aria-label="Dashboard navigation" className={`fixed inset-y-0 left-0 z-40 w-72 overflow-y-auto border-r border-line bg-[#0d0d10] p-4 transition-transform lg:w-64 lg:translate-x-0 ${open ? "" : "-translate-x-full"}`}>
        <div className="mb-5 flex items-center justify-between"><Logo className="!text-lg" /><button className="p-1 lg:hidden" aria-label="Close menu" onClick={() => setOpen(false)}><X size={20} /></button></div>
        <Group items={[OVERVIEW, CHAT]} /><Group title="AI Tools" items={TOOLS} /><Group title="Account" items={ACCOUNT} />
      </aside>

      <header className="relative z-20 shrink-0 pt-[env(safe-area-inset-top)]"><div className="flex h-14 items-center gap-1 px-2 lg:px-6">
        <button className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10 lg:hidden" aria-label="Open menu" onClick={() => setOpen(true)}><Menu size={22} /></button>
        {hasSlot ? <div id="header-slot" className="min-w-0" /> : <span className="truncate px-2 text-[17px] font-semibold">{title}</span>}
        <div className="relative mx-3 hidden max-w-sm flex-1 lg:block">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search tools and pages" placeholder="Search tools and pages…" className="field !rounded-full !py-2 pl-10 text-sm" />
          {q.trim() && (
            <div className="absolute inset-x-0 top-12 z-50 rounded-2xl border border-zinc-800 bg-zinc-900 p-1.5 shadow-xl">
              {hits.length ? hits.map((p) => <Link key={p.slug} href={href(p)} onClick={() => setQ("")} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-white/10"><p.Icon size={16} className="text-brand" />{p.name}</Link>) : <p className="px-3 py-2 text-sm text-muted">No results</p>}
            </div>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/dashboard/pricing" title="Demo points balance" className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold hover:border-brand/60">{account.balance.points} pts</Link>
          <div className="relative hidden sm:block">
            <button aria-label="Notifications (demo)" aria-expanded={menu === "bell"} onClick={() => setMenu(menu === "bell" ? "" : "bell")} className="relative grid h-9 w-9 place-items-center rounded-full hover:bg-white/10"><Bell size={18} /><i className="absolute right-2 top-2 h-2 w-2 rounded-full bg-brand" /></button>
            {menu === "bell" && <div className="absolute right-0 top-11 z-50 w-72 rounded-2xl border border-zinc-800 bg-zinc-900 p-2 shadow-xl">{demoNotes.map((n) => <p key={n} className="rounded-xl px-3 py-2 text-sm hover:bg-white/10">{n}</p>)}</div>}
          </div>
          <div className="relative">
            <button aria-label="Profile menu" aria-expanded={menu === "user"} onClick={() => setMenu(menu === "user" ? "" : "user")} className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-brand to-sky text-xs font-bold text-white">{initials}</button>
            {menu === "user" && (
              <div className="absolute right-0 top-11 z-50 w-56 rounded-2xl border border-zinc-800 bg-zinc-900 p-2 text-sm shadow-xl">
                <p className="px-3 py-2 text-muted">{user?.name ?? "Demo User"}<br /><span className="text-xs">{user?.email ?? "demo@nexora.example"}</span></p>
                <Link href="/dashboard/settings" onClick={() => setMenu("")} className="block rounded-xl px-3 py-2 hover:bg-white/10">Settings</Link>
                <button type="button" onClick={logout} className="block w-full rounded-xl px-3 py-2 text-left hover:bg-white/10">Log out</button>
              </div>
            )}
          </div>
        </div>
      </div></header>
      {full ? <div className="relative z-10 min-h-0 flex-1"><div key={path} className="page-in h-full">{children}</div></div> : <div className="relative z-10 min-h-0 flex-1 overflow-y-auto px-4 py-4 lg:px-8"><div key={path} className="page-in">{children}</div></div>}
      <nav aria-label="Main" className="relative z-20 flex shrink-0 border-t border-white/10 bg-[#0d0d10]/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
        {tabs.map((t) => <Link key={t.n} href={t.h} aria-current={t.on ? "page" : undefined} className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition active:scale-95 ${t.on ? "text-brand" : "text-muted"}`}><t.I size={22} />{t.n}</Link>)}
      </nav>
    </div>
  );
}
