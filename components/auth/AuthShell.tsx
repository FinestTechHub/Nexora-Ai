import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import Logo from "../Logo";

export default function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <aside aria-hidden className="hidden flex-col justify-between bg-[radial-gradient(600px_400px_at_90%_0%,rgba(56,189,248,.45),transparent_60%),linear-gradient(150deg,#0F172A,#1D4ED8_70%,#2563EB)] p-12 text-white lg:flex">
        <Logo />
        <div>
          <h2 className="mb-4 text-5xl font-extrabold leading-tight tracking-tight">Create without limits. Powered by AI.</h2>
          <p className="mb-7 max-w-md text-blue-200">One account for every tool: images, video, voice, scripts and YouTube SEO, all in one place.</p>
          <ul className="grid max-w-md gap-3.5">
            {["8 AI creator tools in one app", "Beginner-friendly, pro-ready", "Sync your work across devices"].map((p) => (
              <li key={p} className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3"><Check size={20} className="text-sky" />{p}</li>
            ))}
          </ul>
        </div>
        <small className="text-blue-300">© 2026 Nexora Ai</small>
      </aside>
      <main className="flex flex-col px-5 pb-8 pt-5 lg:px-12 lg:py-8">
        <div className="flex items-center justify-between"><Logo className="lg:invisible" /><Link href="/" className="flex items-center gap-1 text-sm font-medium text-muted hover:text-brand"><ArrowLeft size={16} />Back to home</Link></div>
        <div className="m-auto w-full max-w-[430px] py-3">{children}</div>
      </main>
    </div>
  );
}
