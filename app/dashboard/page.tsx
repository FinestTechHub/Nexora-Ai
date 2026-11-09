import Link from "next/link";
import { ArrowRight, Image as ImageIcon, Lightbulb, Mic, PenLine, Video } from "lucide-react";
import account from "@/lib/account.json";
import PromptBox from "@/components/dashboard/PromptBox";
import { TOOLS, href } from "@/lib/dashboard";

const quick = [{ n: "Generate Image", s: "image", I: ImageIcon }, { n: "Generate Video", s: "video", I: Video }, { n: "Create Voice", s: "voice", I: Mic }, { n: "Write Script", s: "script", I: PenLine }, { n: "Get Ideas", s: "ideas", I: Lightbulb }];
const demos = [
  { t: "Neon City at Dawn", k: "Image", g: "from-navy via-blue-700 to-sky" },
  { t: "Product Teaser", k: "Video", g: "from-sky to-brand" },
  { t: "Ocean Waves Loop", k: "Image-to-Video", g: "from-blue-900 to-indigo-500" },
  { t: "Channel Intro Voice", k: "Voice", g: "from-brand to-cyan-300" },
];
const usage = [["Images", 42], ["Videos", 18], ["Voice", 12], ["Scripts", 8]] as const;

export default function Overview() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <p className="rounded-xl border border-brand/30 bg-soft px-4 py-2 text-sm text-muted"><b className="text-brand">Demo mode:</b> all numbers and creations below are sample data. AI generation and payments aren’t connected yet.</p>
      <section>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Welcome back, <span className="grad">Creator</span></h1>
        <p className="mb-5 mt-2 max-w-2xl text-muted">Everything you need to create images, videos, voices and better content is right here. Describe an idea to get started.</p>
        <PromptBox />
        <div className="mt-4 flex flex-wrap gap-2">
          {quick.map(({ n, s, I }) => <Link key={s} href={`/dashboard/${s}`} className="flex items-center gap-2 rounded-full border border-line bg-card px-4 py-2 text-sm font-semibold transition hover:-translate-y-0.5 hover:border-brand hover:text-brand"><I size={16} />{n}</Link>)}
        </div>
      </section>

      <section aria-labelledby="tools-h">
        <h2 id="tools-h" className="mb-4 text-xl font-bold">AI Tools</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {TOOLS.map((t) => (
            <article key={t.slug} className="card flex flex-col">
              <div className="icon-box"><t.Icon size={22} /></div>
              <h3 className="font-bold">{t.name}</h3><p className="mb-4 mt-1 flex-1 text-sm text-muted">{t.desc}</p>
              <Link href={href(t)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand">Open Tool <ArrowRight size={16} /></Link>
            </article>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <section aria-labelledby="rec-h">
          <div className="mb-4 flex items-center justify-between"><h2 id="rec-h" className="text-xl font-bold">Recent Creations</h2><Link href="/dashboard/creations" className="text-sm font-semibold text-brand">View all</Link></div>
          <div className="grid gap-4 sm:grid-cols-2">
            {demos.map((d) => (
              <article key={d.t} className="overflow-hidden rounded-2xl border border-line bg-card">
                <div className={`relative h-36 bg-gradient-to-br ${d.g}`}><span className="absolute left-3 top-3 rounded-full bg-black/45 px-2.5 py-0.5 text-[11px] font-bold tracking-wider text-white">DEMO</span></div>
                <div className="p-4"><h3 className="font-semibold">{d.t}</h3><p className="text-sm text-muted">{d.k} · sample content</p></div>
              </article>
            ))}
          </div>
        </section>
        <section aria-labelledby="cr-h" className="card h-fit !p-6 hover:!translate-y-0">
          <h2 id="cr-h" className="text-xl font-bold">Points Summary</h2><p className="text-xs text-muted">Demo data</p>
          <p className="mt-4 text-4xl font-extrabold">{account.balance.points} <span className="text-base font-medium text-muted">/ {account.balance.monthly}</span></p>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-soft"><div className="h-full rounded-full bg-gradient-to-r from-brand to-sky" style={{ width: `${Math.round((account.balance.points / account.balance.monthly) * 100)}%` }} /></div>
          <p className="mb-4 mt-1.5 text-sm text-muted">{account.balance.monthly - account.balance.points} points used this month</p>
          <ul className="space-y-2 text-sm">{usage.map(([n, v]) => <li key={n} className="flex justify-between"><span className="text-muted">{n}</span><b>{v}</b></li>)}</ul>
          <Link href="/dashboard/pricing" className="btn btn-p mt-5 w-full !py-2.5 text-sm">Get More Points</Link>
        </section>
      </div>
    </div>
  );
}
