"use client";
import { useEffect, useState } from "react";
import { Clapperboard, Download, Image as ImageIcon, Share2 } from "lucide-react";
import { Choice, Working } from "./tool-ui";
import StudioShell, { StudioHero } from "./StudioShell";
import ModelPicker from "./ModelPicker";
import HeaderSlot from "./HeaderSlot";
import PointsInfo from "./PointsInfo";
import ImproveButton from "./ImproveButton";
import ReferenceTray from "./ReferenceTray";
import ImageViewer from "./ImageViewer";
import { modelsFor, shortPts } from "@/lib/models";
import { usePoints } from "@/lib/points/PointsContext";
import { takeHandoff } from "@/lib/chat/handoff";
import { downloadPng, loadCreations, shareImage, type Creation } from "@/lib/image/client";

const ASPECTS = ["1:1", "16:9", "9:16", "4:5"] as const;
const STYLES = ["Photorealistic", "3D Render", "Anime", "Digital Art", "Product Shot", "Minimalist"] as const;
const IDEAS = { image: ["A friendly robot reading a book, 3D render", "Minimal product photo of a blue sneaker on white", "A futuristic city at sunrise"], thumbnail: ["I tried the world’s cheapest drone", "5 AI tools that changed my work", "iPhone vs Android: the truth"] };

// One studio for both tools: mode "image" = Image Studio, mode "thumbnail" = Thumbnail Maker.
export default function ImageStudio({ mode = "image" }: { mode?: "image" | "thumbnail" }) {
  const thumb = mode === "thumbnail";
  const { points: BALANCE, refresh } = usePoints();
  const models = modelsFor(thumb ? "thumbnails" : "image")!;
  const [modelId, setModelId] = useState(thumb ? "image-pro" : "image-fast"); // Thumbnail Maker starts on Pro, Image Studio on Fast
  const model = models.find((m) => m.id === modelId) ?? models[0];
  const [prompt, setPrompt] = useState("");
  const [text, setText] = useState("");
  const [style, setStyle] = useState<(typeof STYLES)[number]>("Photorealistic");
  const [aspect, setAspect] = useState<(typeof ASPECTS)[number]>(thumb ? "16:9" : "1:1");
  const [refs, setRefs] = useState<File[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [result, setResult] = useState<Creation | null>(null);
  const [recent, setRecent] = useState<Creation[]>([]);
  const [view, setView] = useState<Creation | null>(null);
  const [note, setNote] = useState("");
  const [progress, setProgress] = useState(0);
  const cost = model.points;

  useEffect(() => { const h = takeHandoff(); if (h?.text) setPrompt(h.text); }, []); // a prompt typed on the Home screen
  useEffect(() => { loadCreations({ limit: 8, toolType: mode }).then(setRecent).catch(() => {}); }, [mode]);
  useEffect(() => {
    if (status !== "loading") return;
    setProgress(6);
    const t = setInterval(() => setProgress((p) => Math.min(92, p + 3)), 800);
    return () => clearInterval(t);
  }, [status]);

  async function generate() {
    if (!prompt.trim()) { setNote(thumb ? "Describe the thumbnail scene or topic first." : "Describe your image first."); return; }
    if (cost > BALANCE) return;
    setNote(""); setStatus("loading"); setResult(null);
    const fd = new FormData();
    fd.append("payload", JSON.stringify({ mode, prompt, style, aspect, text: thumb ? text : "", modelId: model.id }));
    refs.forEach((f, i) => fd.append(`ref${i}`, f)); // photos travel as raw bytes
    try {
      const res = await fetch("/api/ai/image", { method: "POST", body: fd });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setStatus("idle"); setNote(d.message ?? "Something went wrong. You weren’t charged."); return; }
      const c = d.creation as Creation;
      setResult(c); setRecent((r) => [c, ...r].slice(0, 8)); setStatus("done");
      refresh(); // update the points in the header right away
    } catch { setStatus("idle"); setNote("Couldn’t reach the server. You weren’t charged."); }
  }

  const canvas = (
    <>
      {status === "idle" && <StudioHero Icon={thumb ? Clapperboard : ImageIcon} title={thumb ? "What should your thumbnail show?" : "What image should we create?"} chips={IDEAS[mode]} onChip={setPrompt} />}
      {status === "loading" && (
        <div>
          <Working label="Generating image…" />
          <div className="mx-auto -mt-6 h-1.5 w-52 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-brand transition-all duration-700" style={{ width: `${progress}%` }} /></div>
        </div>
      )}
      {status === "done" && result?.url && (
        <div>
          <button type="button" onClick={() => setView(result)} aria-label="View full screen" className="mx-auto block overflow-hidden rounded-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={result.url} alt={result.title ?? "Generated image"} className="max-h-[56dvh] max-w-full rounded-2xl object-contain" />
          </button>
          <p className="mt-2 text-center text-xs text-muted">{result.model_label} · saved to your Library</p>
          <div className="mt-3 flex justify-center gap-2">
            <button type="button" onClick={() => downloadPng(result.url!, `nexora-${result.id.slice(0, 8)}`)} className="btn btn-g !px-4 !py-2 text-sm"><Download size={16} />Download PNG</button>
            <button type="button" onClick={() => shareImage(result.url!, result.title ?? "Nexora image")} className="btn btn-g !px-4 !py-2 text-sm"><Share2 size={16} />Share</button>
          </div>
        </div>
      )}
      {recent.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Recent generations</p>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {recent.map((c) => c.url && (
              <button key={c.id} type="button" onClick={() => setView(c)} aria-label={c.title ?? "Open creation"} className="h-20 shrink-0 overflow-hidden rounded-xl border border-line">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.url} alt="" className="h-full w-auto object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
      {view?.url && <ImageViewer src={view.url} title={view.title ?? undefined} id={view.id} onClose={() => setView(null)} />}
    </>
  );
  const options = (close: () => void) => (
    <>
      <Choice label="Aspect ratio" options={ASPECTS} value={aspect} onChange={setAspect} />
      {!thumb && <Choice label="Style" options={STYLES} value={style} onChange={setStyle} />}
      <PointsInfo cost={cost} />
      <button type="button" onClick={() => { close(); generate(); }} disabled={status === "loading" || cost > BALANCE} className="btn btn-p w-full disabled:opacity-60">Generate ({cost} pts)</button>
    </>
  );
  const above = (
    <div className="space-y-2">
      {thumb && <input value={text} onChange={(e) => setText(e.target.value.slice(0, 60))} placeholder="Exact text on thumbnail (optional)" aria-label="Exact text on thumbnail" className="field !rounded-2xl !py-2 text-base" />}
      <ReferenceTray files={refs} onChange={setRefs} />
    </div>
  );
  return (
    <>
      <HeaderSlot><ModelPicker compact models={models} value={model.id} onChange={setModelId} /></HeaderSlot>
      <StudioShell Icon={thumb ? Clapperboard : ImageIcon} title={thumb ? "Thumbnail Maker" : "Image Studio"} canvas={canvas} options={options} note={note}
        dock={{ value: prompt, onChange: setPrompt, onSend: generate, placeholder: thumb ? "Scene or topic of your thumbnail…" : "Describe an image…", cost: shortPts(cost), low: cost > BALANCE, disabled: status === "loading", above,
          top: <ImproveButton inline slug={thumb ? "thumbnails" : "image"} text={prompt} setText={setPrompt} values={{ Style: style }} max={600} /> }} />
    </>
  );
}
