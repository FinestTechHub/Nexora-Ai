import Link from "next/link";
import { Instagram, Linkedin, Twitter, Youtube } from "lucide-react";
import Logo from "./Logo";

const social = [{ I: Twitter, l: "X" }, { I: Instagram, l: "Instagram" }, { I: Youtube, l: "YouTube" }, { I: Linkedin, l: "LinkedIn" }];
const cols = [
  { h: "Company", links: [["About", "/#about"], ["Features", "/#features"], ["Contact", "mailto:hello@example.com"]] },
  { h: "Product", links: [["How It Works", "/#how"], ["Download App", "/#download"], ["Log in", "/login"]] },
  { h: "Legal", links: [["Privacy Policy", "/privacy"], ["Terms of Service", "/terms"]] },
];

export default function Footer() {
  return (
    <footer className="border-t border-line pb-8 pt-14">
      <div className="wrap grid gap-8 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-muted">AI tools for modern creators. Images, video, voice and growth, all in one app.</p>
          <div className="mt-5 flex gap-2.5">
            {/* TODO: replace "#" with your real social profile links */}
            {social.map(({ I, l }) => (
              <a key={l} href="#" aria-label={`${l} (placeholder)`} className="grid h-10 w-10 place-items-center rounded-xl border border-line transition hover:border-brand hover:bg-brand hover:text-white"><I size={18} /></a>
            ))}
          </div>
        </div>
        {cols.map((c) => (
          <div key={c.h}>
            <h4 className="mb-3.5 text-sm font-semibold uppercase tracking-wider text-muted">{c.h}</h4>
            <ul className="space-y-2">{c.links.map(([t, h]) => <li key={t}><Link href={h} className="hover:text-brand">{t}</Link></li>)}</ul>
          </div>
        ))}
      </div>
      <div className="wrap mt-10 flex flex-wrap justify-between gap-2 border-t border-line pt-5 text-sm text-muted">
        <span>© 2026 Nexora Ai. All rights reserved.</span><span>Brand name is a placeholder.</span>
      </div>
    </footer>
  );
}
