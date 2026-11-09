"use client";
import { useState } from "react";
import { Download, Heart, Play, Upload, Video } from "lucide-react";
import { Choice, DemoTag, ToolHeader } from "./tool-ui";
import StandardsPanel from "./StandardsPanel";
import ModelPicker from "./ModelPicker";
import PointsInfo from "./PointsInfo";
import { BALANCE, genLabel, modelsFor } from "@/lib/models";
import ImproveButton from "./ImproveButton";

const durations = ["5s", "10s", "15s"] as const;
const ratios = { "16:9": "aspect-video", "9:16": "aspect-[9/16] max-w-[260px] mx-auto", "1:1": "aspect-square max-w-sm mx-auto" } as const;
const ratioKeys = Object.keys(ratios) as (keyof typeof ratios)[];
const styles = ["Cinematic", "Realistic", "Animated", "Timelapse"] as const;
const motions = ["Static", "Pan", "Zoom in", "Orbit", "Drone"] as const;
const quals = ["720p", "1080p"] as const;
const examples = ["A drone flight over a glowing city at night", "A coffee cup steaming on a rainy window, cinematic", "A robot walking through a neon market"];

export default function VideoStudio() {
  const [prompt, setPrompt] = useState("");
  const [dur, setDur] = useState<(typeof durations)[number]>("5s");
  const [ratio, setRatio] = useState<keyof typeof ratios>("16:9");
  const [style, setStyle] = useState<(typeof styles)[number]>("Cinematic");
  const [motion, setMotion] = useState<(typeof motions)[number]>("Static");
  const [qual, setQual] = useState<(typeof quals)[number]>("720p");
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [shown, setShown] = useState({ r: "16:9" as keyof typeof ratios, d: "5s", s: "", m: "" });
  const [note, setNote] = useState("");
  const models = modelsFor("video")!;
  const [modelId, setModelId] = useState(models[0].id);
  const model = models.find((m) => m.id === modelId) ?? models[0];
  const cost = model.points; // flat points per clip

  function generate() {
    if (!prompt.trim()) { setNote("Please describe your video first."); return; }
    setNote(""); setStatus("loading");
    setTimeout(() => { setShown({ r: ratio, d: dur, s: style, m: motion }); setStatus("done"); }, 1100);
  }
  const soon = (what: string) => setNote(`Demo only: “${what}” will work once AI generation is connected.`);

  return (
    <div className="mx-auto max-w-6xl">
      <ToolHeader Icon={Video} title="AI Video Generator" desc="Create engaging video clips from text, ready for social and YouTube." />
      <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
        <section aria-label="Video settings" className="card space-y-5 !p-5 hover:!translate-y-0">
          <ModelPicker models={models} value={model.id} onChange={setModelId} />
          <div>
            <label htmlFor="vp" className="mb-2 flex justify-between text-sm font-semibold">Prompt <span className="font-normal text-muted">{prompt.length}/500</span></label>
            <div className="relative"><textarea id="vp" rows={4} maxLength={500} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe the video you want…" className="field resize-none pb-10" /><ImproveButton slug="video" text={prompt} setText={setPrompt} values={{ Style: style, "Camera motion": motion }} max={500} /></div>
            <div className="mt-2 flex flex-wrap gap-1.5">{examples.map((x) => <button key={x} type="button" onClick={() => setPrompt(x)} className="rounded-full bg-soft px-3 py-1 text-xs text-muted hover:text-brand">Try: {x.slice(0, 26)}…</button>)}</div>
          </div>
          <button type="button" onClick={() => soon("Reference image upload")} className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-line px-4 py-3 text-left text-sm text-muted hover:border-brand"><Upload size={18} className="text-brand" /><span><b className="text-ink">Start frame (optional)</b><br />Upload coming soon, see Image-to-Video</span></button>
          <Choice label="Duration" options={durations} value={dur} onChange={setDur} />
          <Choice label="Aspect ratio" options={ratioKeys} value={ratio} onChange={setRatio} />
          <Choice label="Style" options={styles} value={style} onChange={setStyle} />
          <Choice label="Camera motion" options={motions} value={motion} onChange={setMotion} />
          <Choice label="Resolution" options={quals} value={qual} onChange={setQual} />
          <PointsInfo cost={cost} />
          <button type="button" onClick={generate} disabled={status === "loading" || cost > BALANCE} className="btn btn-p w-full disabled:opacity-60"><Video size={18} />{status === "loading" ? "Preparing preview…" : genLabel("Generate Video", cost)}</button>
          <p role="status" className="min-h-[1.25rem] text-sm text-muted">{note}</p>
        </section>

        <section aria-label="Result" className="min-w-0">
          {status === "idle" && (
            <div className="grid min-h-[420px] place-items-center rounded-3xl border border-dashed border-line bg-card p-8 text-center">
              <div><div className="icon-box mx-auto"><Video size={24} /></div><h2 className="font-bold">Your video will appear here</h2><p className="mt-1 max-w-xs text-sm text-muted">Describe a scene, choose duration and camera motion, then press Generate.</p></div>
            </div>
          )}
          {status === "loading" && <div className={`animate-pulse rounded-3xl bg-soft ${ratios[ratio]}`} />}
          {status === "done" && (
            <div>
              <div className={`relative grid place-items-center overflow-hidden rounded-3xl bg-gradient-to-br from-navy via-blue-700 to-sky ${ratios[shown.r]}`}>
                <div className="absolute left-4 top-4"><DemoTag /></div>
                <button type="button" aria-label="Play (demo)" onClick={() => soon("Playback")} className="grid h-16 w-16 place-items-center rounded-full bg-white/25 text-white backdrop-blur transition hover:scale-105"><Play size={28} fill="currentColor" /></button>
                <div className="absolute inset-x-4 bottom-4"><div className="h-1.5 rounded-full bg-white/25"><div className="h-full w-1/3 rounded-full bg-white" /></div><div className="mt-1.5 flex justify-between text-xs text-white/80"><span>0:00</span><span>0:{shown.d.replace("s", "").padStart(2, "0")}</span></div></div>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted"><b className="text-ink">Demo preview</b> · {shown.d} · {shown.s} · {shown.m} camera</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => soon("Download")} className="btn btn-g !px-4 !py-2 text-sm"><Download size={16} />Download</button>
                  <button type="button" onClick={() => soon("Save")} className="btn btn-g !px-4 !py-2 text-sm"><Heart size={16} />Save</button>
                </div>
              </div>
            </div>
          )}
          <StandardsPanel slug="video" text={prompt} values={{ Duration: dur, "Aspect ratio": ratio, Style: style, "Camera motion": motion, Resolution: qual, Model: model.id }} />
          <div className="mt-6 rounded-2xl border border-line bg-card p-5 text-sm text-muted"><b className="text-ink">Tips for better videos:</b> describe one clear scene, name the subject and action, then choose a camera motion. Shorter clips usually look more consistent.</div>
        </section>
      </div>
    </div>
  );
}
