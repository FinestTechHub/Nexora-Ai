const steps = [
  { t: "Choose your AI tool", d: "Pick from images, video, voice, scripts, SEO and more." },
  { t: "Enter a prompt or upload", d: "Describe what you want, or upload your own content to start." },
  { t: "Generate, download, share", d: "Get your result in moments, save it and publish anywhere." },
];

export default function HowItWorks() {
  return (
    <section id="how" className="py-20">
      <div className="wrap">
        <div className="mx-auto mb-12 max-w-2xl text-center"><p className="eyebrow">How It Works</p><h2 className="h2">From idea to creation in <span className="grad">three steps</span></h2></div>
        <ol className="grid gap-8 md:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.t} className="text-center">
              <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-brand to-sky text-2xl font-extrabold text-white ring-8 ring-soft">{i + 1}</div>
              <h3 className="mb-2 text-xl font-bold">{s.t}</h3><p className="mx-auto max-w-xs text-muted">{s.d}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
