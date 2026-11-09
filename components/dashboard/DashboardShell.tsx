"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient, isConfigured } from "@/lib/supabase/client";
import { Bell, Coins, Menu, Search, X } from "lucide-react";
import Logo from "../Logo";
import account from "@/lib/account.json";
import { ACCOUNT, CHAT, OVERVIEW, PAGES, TOOLS, href, type DashItem } from "@/lib/dashboard";

const demoNotes = ["Welcome to Nexora Ai (demo notification)", "Your free demo points are ready (demo)", "New tools are coming soon (demo)"];

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

  const NavLink = ({ i }: { i: DashItem }) => {
    const on = path === href(i);
    return (
      <Link href={href(i)} onClick={() => setOpen(false)} aria-current={on ? "page" : undefined}
        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${on ? "bg-brand text-white shadow-[0_8px_20px_-8px_rgba(37,99,235,.7)]" : "text-muted hover:bg-soft hover:text-brand"}`}>
        <i.Icon size={18} />{i.name}
      </Link>
    );
  };
  const Group = ({ title, items }: { title?: string; items: DashItem[] }) => (
    <div className="mb-4">{title && <p className="mb-1.5 px-3 text-[11px] font-bold uppercase tracking-widest text-muted">{title}</p>}<div className="space-y-0.5">{items.map((i) => <NavLink key={i.slug} i={i} />)}</div></div>
  );

  return (
    <div className="min-h-screen bg-soft/40 lg:pl-64">
      {open && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setOpen(false)} />}
      <aside aria-label="Dashboard navigation" className={`fixed inset-y-0 left-0 z-40 w-64 overflow-y-auto border-r border-line bg-card p-4 transition-transform lg:translate-x-0 ${open ? "" : "-translate-x-full"}`}>
        <div className="mb-5 flex items-center justify-between"><Logo className="!text-lg" /><button className="p-1 lg:hidden" aria-label="Close menu" onClick={() => setOpen(false)}><X size={20} /></button></div>
        <Group items={[OVERVIEW, CHAT]} /><Group title="AI Tools" items={TOOLS} /><Group title="Account" items={ACCOUNT} />
      </aside>

      <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-bg/80 px-4 backdrop-blur-xl lg:px-8">
        <button className="p-2 lg:hidden" aria-label="Open menu" onClick={() => setOpen(true)}><Menu size={22} /></button>
        <div className="relative max-w-md flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search tools and pages" placeholder="Search tools and pages…" className="field !rounded-full !py-2 pl-10 text-sm" />
          {q.trim() && (
            <div className="absolute inset-x-0 top-12 rounded-2xl border border-line bg-card p-1.5 shadow-xl">
              {hits.length ? hits.map((p) => <Link key={p.slug} href={href(p)} onClick={() => setQ("")} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-soft"><p.Icon size={16} className="text-brand" />{p.name}</Link>) : <p className="px-3 py-2 text-sm text-muted">No results</p>}
            </div>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/dashboard/pricing" title="Demo points balance" className="flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 text-sm font-semibold hover:border-brand"><Coins size={16} className="text-brand" />{account.balance.points}<span className="hidden sm:inline text-muted font-medium">points</span></Link>
          <div className="relative">
            <button aria-label="Notifications (demo)" aria-expanded={menu === "bell"} onClick={() => setMenu(menu === "bell" ? "" : "bell")} className="relative grid h-10 w-10 place-items-center rounded-full border border-line bg-card hover:border-brand"><Bell size={18} /><i className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-brand" /></button>
            {menu === "bell" && <div className="absolute right-0 top-12 w-72 rounded-2xl border border-line bg-card p-2 shadow-xl">{demoNotes.map((n) => <p key={n} className="rounded-xl px-3 py-2 text-sm hover:bg-soft">{n}</p>)}</div>}
          </div>
          <div className="relative">
            <button aria-label="Profile menu" aria-expanded={menu === "user"} onClick={() => setMenu(menu === "user" ? "" : "user")} className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-brand to-sky text-sm font-bold text-white">{initials}</button>
            {menu === "user" && (
              <div className="absolute right-0 top-12 w-52 rounded-2xl border border-line bg-card p-2 text-sm shadow-xl">
                <p className="px-3 py-2 text-muted">{user?.name ?? "Demo User"}<br /><span className="text-xs">{user?.email ?? "demo@nexora.example"}</span></p>
                <Link href="/dashboard/settings" onClick={() => setMenu("")} className="block rounded-xl px-3 py-2 hover:bg-soft">Settings</Link>
                <button type="button" onClick={logout} className="block w-full rounded-xl px-3 py-2 text-left hover:bg-soft">Log out</button>
              </div>
            )}
          </div>
        </div>
      </header>
      <div className="px-4 py-6 lg:px-8">{children}</div>
    </div>
  );
}
