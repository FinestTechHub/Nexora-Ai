import Link from "next/link";
import { Mic, Sparkles, Zap } from "lucide-react";

export default function Hero() {
  return (
    <section id="home" className="overflow-hidden bg-[radial-gradient(900px_500px_at_80%_-10%,rgba(56,189,248,.25),transparent_60%),radial-gradient(700px_400px_at_0%_20%,rgba(37,99,235,.16),transparent_60%)] pb-16 pt-32">
      <div className="wrap grid items-center gap-14 lg:grid-cols-[1.05fr_.95fr]">
        <div>
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-soft px-3.5 py-1 text-sm font-semibold text-brand"><i className="h-2 w-2 rounded-full bg-brand" />New: AI tools for every creator</span>
          <h1 className="text-[clamp(2.3rem,7.2vw,4.1rem)] font-extrabold leading-[1.1] tracking-tight">Your Creativity. <span className="grad">Unlimited Possibilities.</span> Powered by AI.</h1>
          <p className="my-6 max-w-xl text-lg text-muted">Create stunning images, generate incredible videos, produce realistic AI voices and optimize your content. Everything you need to create better content, all in one place.</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/#download" className="btn btn-p">Download App</Link>
            <Link href="/#features" className="btn btn-g">Explore Features</Link>
          </div>
        </div>
        <div aria-hidden className="relative mx-auto w-full max-w-[520px] animate-float">
          <div className="rounded-[26px] border border-line bg-card p-4 shadow-[0_40px_80px_-30px_rgba(37,99,235,.45)]">
            <div className="flex items-center gap-3 rounded-2xl bg-soft px-3.5 py-3 text-sm text-muted"><Sparkles size={18} className="text-brand" />A neon city at dawn, cinematic…<span className="ml-auto rounded-lg bg-brand px-3 py-1 text-xs font-semibold text-white">Generate</span></div>
            <div className="mt-3 grid grid-cols-[1.3fr_1fr] gap-2.5">
              <div className="row-span-2 min-h-[210px] rounded-2xl bg-gradient-to-br from-navy via-blue-700 to-sky" />
              <div className="min-h-24 rounded-2xl bg-gradient-to-br from-sky to-brand" />
              <div className="min-h-24 rounded-2xl bg-gradient-to-br from-blue-900 to-indigo-500" />
            </div>
          </div>
          <div className="absolute -left-4 top-1/3 flex items-center gap-2 rounded-2xl border border-line bg-card px-3.5 py-2.5 text-xs font-semibold shadow-xl"><Mic size={16} className="text-brand" />Voice ready</div>
          <div className="absolute -bottom-3 -right-3 flex items-center gap-2 rounded-2xl border border-line bg-card px-3.5 py-2.5 text-xs font-semibold shadow-xl"><Zap size={16} className="text-brand" />Generated in seconds</div>
        </div>
      </div>
    </section>
  );
}
