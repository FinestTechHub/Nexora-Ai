"use client";
import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import Logo from "./Logo";
import { NAV } from "@/lib/config";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-line bg-bg/80 backdrop-blur-xl">
      <div className="wrap flex h-[68px] items-center justify-between">
        <Logo />
        <nav aria-label="Primary" className="hidden gap-8 font-medium text-muted md:flex">
          {NAV.map((n) => <Link key={n.label} href={n.href} className="hover:text-brand">{n.label}</Link>)}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login" className="hidden px-3 font-semibold hover:text-brand md:block">Log in</Link>
          <Link href="/#download" className="btn btn-p hidden !py-2.5 text-sm md:inline-flex">Download App</Link>
          <button className="p-2 md:hidden" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen(!open)}>
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
      {open && (
        <nav aria-label="Mobile" className="wrap flex flex-col border-t border-line pb-5 md:hidden">
          {NAV.map((n) => <Link key={n.label} href={n.href} onClick={() => setOpen(false)} className="border-b border-line py-3 font-medium">{n.label}</Link>)}
          <Link href="/login" onClick={() => setOpen(false)} className="border-b border-line py-3 font-medium">Log in</Link>
          <Link href="/#download" onClick={() => setOpen(false)} className="btn btn-p mt-4">Download App</Link>
        </nav>
      )}
    </header>
  );
}
