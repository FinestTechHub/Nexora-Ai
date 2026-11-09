import { Clock, Cpu, Layers, Smile, Sparkles, Tag } from "lucide-react";

const items = [
  { Icon: Layers, t: "Multiple AI tools in one platform", d: "Stop juggling apps. Everything lives in one place." },
  { Icon: Smile, t: "Beginner-friendly interface", d: "Clean and intuitive, so you can start creating on day one." },
  { Icon: Sparkles, t: "Advanced tools for professionals", d: "Deeper controls for creators who want full command." },
  { Icon: Tag, t: "Affordable plans", d: "Flexible pricing that grows with your channel or business." },
  { Icon: Cpu, t: "Powerful AI models", d: "Modern models tuned for quality, speed and realism." },
  { Icon: Clock, t: "Time-saving creator workflows", d: "Go from concept to publish-ready content in a fraction of the time." },
];

export default function Why() {
  return (
    <section id="why" className="relative overflow-hidden bg-navy py-20 text-slate-200">
      <div className="wrap relative">
        <div className="mx-auto mb-12 max-w-2xl text-center"><p className="eyebrow">Why Choose Us</p><h2 className="h2 text-white">Built for creators who <span className="grad">move fast</span></h2></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(({ Icon, t, d }) => (
            <article key={t} className="card !border-white/10 !bg-white/5"><div className="icon-box"><Icon size={24} /></div><h3 className="mb-2 text-lg font-bold text-white">{t}</h3><p className="text-[15px] text-slate-400">{d}</p></article>
          ))}
        </div>
        <p id="about" className="mx-auto mt-12 max-w-2xl text-center text-slate-400"><b className="text-white">About Us.</b> We’re building an international AI technology company focused on one goal: giving every creator the tools once reserved for big studios. Nexora Ai brings image, video, voice and growth tools together so you can focus on your ideas.</p>
      </div>
    </section>
  );
}
