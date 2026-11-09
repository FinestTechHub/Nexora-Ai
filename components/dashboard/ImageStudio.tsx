"use client";
import { useState } from "react";
import { Download, Heart, Image as ImageIcon, RefreshCw, Sparkles } from "lucide-react";
import { Choice, DemoTag, GRADS, ToolHeader } from "./tool-ui";
import StandardsPanel from "./StandardsPanel";
import ModelPicker from "./ModelPicker";
import PointsInfo from "./PointsInfo";
import { BALANCE, genLabel, modelsFor } from "@/lib/models";
import ImproveButton from "./ImproveButton";

const styles = ["Realistic", "Cinematic", "Anime", "3D Render", "Illustration", "Minimal"] as const;
const ratios = { "1:1": "aspect-square", "16:9": "aspect-video", "9:16": "aspect-[9/16]", "4:3": "aspect-[4/3]" } as const;
const ratioKeys = Object.keys(ratios) as (keyof typeof ratios)[];
const counts = ["1", "2", "4"] as const;
const qualities = ["Standard", "HD"] as const;
const examples = ["A futuristic city at sunrise, cinematic lighting", "Minimal product photo of a blue sneaker on white", "A friendly robot reading a book, 3D render"];

export default function ImageStudio() {
  const [prompt, setPrompt] = useState("");
  const [neg, setNeg] = useState("");
  const [style, setStyle] = useState<(typeof styles)[number]>("Cinematic");
  const [ratio, setRatio] = useState<keyof typeof ratios>("1:1");
  const [count, setCount] = useState<(typeof counts)[number]>("2");
  const [quality, setQuality] = useState<(typeof qualities)[number]>("Standard");
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [shown, setShown] = useState({ n: 2, r: "1:1" as keyof typeof ratios, s: "", seed: 0 });
  const [note, setNote] = useState("");
  const models = modelsFor("image")!;
  const [modelId, setModelId] = useState(models[0].id);
  const model = models.find((m) => m.id === modelId) ?? models[0];
  const cost = model.points * Number(count); // points per image × number of images

  function generate() {
    if (!prompt.trim()) { setNote("Please describe your image first."); return; }
    setNote(""); setStatus("loading");
    setTimeout(() => { setShown({ n: Number(count), r: ratio, s: style, seed: prompt.length }); setStatus("done"); }, 900);
  }
  const soon = (what: string) => setNote(`Demo only: “${what}” will work once AI generation is connected.`);

  return (
    <div className="mx-auto max-w-6xl">
      <ToolHeader Icon={ImageIcon} title="AI Image Generator" desc="Turn a simple prompt into detailed, high-quality images in any style." />
      <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
        <section aria-label="Image settings" className="card space-y-5 !p-5 hover:!translate-y-0">
          <ModelPicker models={models} value={model.id} onChange={setModelId} />
          <div>
            <label htmlFor="p" className="mb-2 flex justify-between text-sm font-semibold">Prompt <span className="font-normal text-muted">{prompt.length}/500</span></label>
            <div className="relative"><textarea id="p" rows={4} maxLength={500} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe the image you want…" className="field resize-none pb-10" /><ImproveButton slug="image" text={prompt} setText={setPrompt} values={{ Style: style }} max={500} /></div>
            <div className="mt-2 flex flex-wrap gap-1.5">{examples.map((x) => <button key={x} type="button" onClick={() => setPrompt(x)} className="rounded-full bg-soft px-3 py-1 text-xs text-muted hover:text-brand">Try: {x.slice(0, 26)}…</button>)}</div>
          </div>
          <div><label htmlFor="n" className="mb-2 block text-sm font-semibold">Negative prompt <span className="font-normal text-muted">(optional)</span></label><input id="n" value={neg} onChange={(e) => setNeg(e.target.value)} placeholder="Things to avoid, e.g. blurry, text" className="field" /></div>
          <Choice label="Style" options={styles} value={style} onChange={setStyle} />
          <Choice label="Aspect ratio" options={ratioKeys} value={ratio} onChange={setRatio} />
          <div className="grid grid-cols-2 gap-4"><Choice label="Images" options={counts} value={count} onChange={setCount} /><Choice label="Quality" options={qualities} value={quality} onChange={setQuality} /></div>
          <PointsInfo cost={cost} />
          <button type="button" onClick={generate} disabled={status === "loading" || cost > BALANCE} className="btn btn-p w-full disabled:opacity-60"><Sparkles size={18} />{status === "loading" ? "Preparing preview…" : genLabel("Generate Images", cost)}</button>
          <p role="status" className="min-h-[1.25rem] text-sm text-muted">{note}</p>
        </section>

        <section aria-label="Results" className="min-w-0">
          {status === "idle" && (
            <div className="grid min-h-[420px] place-items-center rounded-3xl border border-dashed border-line bg-card p-8 text-center">
              <div><div className="icon-box mx-auto"><ImageIcon size={24} /></div><h2 className="font-bold">Your images will appear here</h2><p className="mt-1 max-w-xs text-sm text-muted">Write a prompt, pick a style and press Generate to see a demo preview.</p></div>
            </div>
          )}
          {status === "loading" && <div className="grid grid-cols-2 gap-4">{Array.from({ length: Number(count) }).map((_, i) => <div key={i} className={`animate-pulse rounded-2xl bg-soft ${ratios[ratio]}`} />)}</div>}
          {status === "done" && (
            <div>
              <div className="mb-3 flex items-center justify-between text-sm"><b>{shown.n} demo {shown.n > 1 ? "previews" : "preview"} · {shown.s}</b><button type="button" onClick={generate} className="flex items-center gap-1.5 font-semibold text-brand"><RefreshCw size={15} />Regenerate</button></div>
              <div className={`grid gap-4 ${shown.n === 1 ? "mx-auto max-w-md" : "grid-cols-2"}`}>
                {Array.from({ length: shown.n }).map((_, i) => (
                  <figure key={i} className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${GRADS[(i + shown.seed) % GRADS.length]} ${ratios[shown.r]}`}>
                    <div className="absolute left-3 top-3"><DemoTag /></div>
                    <figcaption className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/60 to-transparent p-3 text-white">
                      <span className="text-xs">Variation {i + 1}</span>
                      <span className="flex gap-1.5">
                        <button type="button" aria-label="Download (demo)" onClick={() => soon("Download")} className="grid h-8 w-8 place-items-center rounded-full bg-white/20 hover:bg-white/35"><Download size={15} /></button>
                        <button type="button" aria-label="Save to My Creations (demo)" onClick={() => soon("Save")} className="grid h-8 w-8 place-items-center rounded-full bg-white/20 hover:bg-white/35"><Heart size={15} /></button>
                      </span>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>
          )}
          <StandardsPanel slug="image" text={prompt} values={{ Style: style, "Aspect ratio": ratio, Images: count, Quality: quality, Model: model.id }} />
          <div className="mt-6 rounded-2xl border border-line bg-card p-5 text-sm text-muted"><b className="text-ink">Tips for better images:</b> mention the subject, setting, lighting and mood. Add a style word like “cinematic” or “3D render”, and use the negative prompt to avoid things you don’t want.</div>
        </section>
      </div>
    </div>
  );
}
