"use client";
import { useState } from "react";
import { Download, Heart, Image as ImageIcon, RefreshCw } from "lucide-react";
import { Choice, DemoTag, GRADS } from "./tool-ui";
import StudioShell, { StudioHero } from "./StudioShell";
import StandardsPanel from "./StandardsPanel";
import ModelPicker from "./ModelPicker";
import HeaderSlot from "./HeaderSlot";
import PointsInfo from "./PointsInfo";
import ImproveButton from "./ImproveButton";
import { BALANCE, genLabel, modelsFor, shortPts } from "@/lib/models";

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

  const canvas = (
    <>
      {status === "idle" && <StudioHero Icon={ImageIcon} title="What image should we create?" chips={examples} onChip={setPrompt} />}
      {status === "loading" && <div className="grid grid-cols-2 gap-3">{Array.from({ length: Number(count) }).map((_, i) => <div key={i} className={`animate-pulse rounded-2xl bg-white/5 ${ratios[ratio]}`} />)}</div>}
      {status === "done" && (
        <div>
          <div className="mb-3 flex items-center justify-between text-sm"><b>{shown.n} demo {shown.n > 1 ? "previews" : "preview"} · {shown.s}</b><button type="button" onClick={generate} className="flex items-center gap-1.5 font-semibold text-brand"><RefreshCw size={15} />Regenerate</button></div>
          <div className={`grid gap-3 ${shown.n === 1 ? "mx-auto max-w-md" : "grid-cols-2"}`}>
            {Array.from({ length: shown.n }).map((_, i) => (
              <figure key={i} className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${GRADS[(i + shown.seed) % GRADS.length]} ${ratios[shown.r]}`}>
                <div className="absolute left-3 top-3"><DemoTag /></div>
                <figcaption className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/60 to-transparent p-3 text-white">
                  <span className="text-xs">Variation {i + 1}</span>
                  <span className="flex gap-1.5">
                    <button type="button" aria-label="Download (demo)" onClick={() => soon("Download")} className="grid h-9 w-9 place-items-center rounded-full bg-white/20"><Download size={15} /></button>
                    <button type="button" aria-label="Save (demo)" onClick={() => soon("Save")} className="grid h-9 w-9 place-items-center rounded-full bg-white/20"><Heart size={15} /></button>
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      )}
    </>
  );
  const options = (close: () => void) => (
    <>
      <div><label htmlFor="neg" className="mb-2 block text-sm font-semibold">Negative prompt <span className="font-normal text-muted">(optional)</span></label><input id="neg" value={neg} onChange={(e) => setNeg(e.target.value)} placeholder="Things to avoid, e.g. blurry, text" className="field" /></div>
      <Choice label="Style" options={styles} value={style} onChange={setStyle} />
      <Choice label="Aspect ratio" options={ratioKeys} value={ratio} onChange={setRatio} />
      <div className="grid grid-cols-2 gap-4"><Choice label="Images" options={counts} value={count} onChange={setCount} /><Choice label="Quality" options={qualities} value={quality} onChange={setQuality} /></div>
      <PointsInfo cost={cost} />
      <button type="button" onClick={() => { close(); generate(); }} disabled={status === "loading" || cost > BALANCE} className="btn btn-p w-full disabled:opacity-60">{genLabel("Generate Images", cost)}</button>
      <StandardsPanel slug="image" text={prompt} values={{ Style: style, "Aspect ratio": ratio, Images: count, Quality: quality, Model: model.id }} />
    </>
  );
  return (
    <>
      <HeaderSlot><ModelPicker compact models={models} value={model.id} onChange={setModelId} /></HeaderSlot>
      <StudioShell Icon={ImageIcon} title="AI Image Generator" canvas={canvas} options={options} note={note}
        dock={{ value: prompt, onChange: setPrompt, onSend: generate, placeholder: "Describe an image…", cost: shortPts(cost), low: cost > BALANCE, disabled: status === "loading", top: <ImproveButton inline slug="image" text={prompt} setText={setPrompt} values={{ Style: style }} max={500} /> }} />
    </>
  );
}
