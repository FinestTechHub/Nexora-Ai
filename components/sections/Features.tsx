import { Clapperboard, Film, Image as ImageIcon, Lightbulb, Mic, PenLine, SearchCheck, Video } from "lucide-react";

const features = [
  { Icon: ImageIcon, t: "AI Image Generation", d: "Turn a simple prompt into detailed, high-quality images in any style." },
  { Icon: Video, t: "AI Video Generation", d: "Create engaging video clips from text, ready for social and YouTube." },
  { Icon: Film, t: "Image-to-Video", d: "Bring still images to life with smooth, natural motion." },
  { Icon: Mic, t: "AI Voice Generation", d: "Produce realistic voiceovers in natural, expressive AI voices." },
  { Icon: PenLine, t: "AI Script Writer", d: "Write structured, engaging scripts for videos in minutes." },
  { Icon: SearchCheck, t: "YouTube SEO Optimization", d: "Get optimized titles, descriptions and tags to help videos get found." },
  { Icon: Clapperboard, t: "AI Thumbnail Generator", d: "Design eye-catching thumbnails that earn more clicks." },
  { Icon: Lightbulb, t: "AI Content Ideas", d: "Never run out of ideas with fresh, trend-aware content suggestions." },
];

export default function Features() {
  return (
    <section id="features" className="bg-soft py-20">
      <div className="wrap">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <p className="eyebrow">AI Features</p>
          <h2 className="h2">Every creator tool. <span className="grad">One platform.</span></h2>
          <p className="mt-4 text-muted">From the first idea to the final upload, Nexora Ai covers your whole creative workflow.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ Icon, t, d }) => (
            <article key={t} className="card"><div className="icon-box"><Icon size={24} /></div><h3 className="mb-2 text-lg font-bold">{t}</h3><p className="text-[15px] text-muted">{d}</p></article>
          ))}
        </div>
      </div>
    </section>
  );
}
