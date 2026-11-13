"use client";
import { useState } from "react";
import { Check, Clapperboard, Copy, Download, Film, Heart, Lightbulb, Mic, PenLine, Play, SearchCheck, Sparkles, Upload, type LucideIcon } from "lucide-react";
import cfgs from "@/lib/studios.json";
import { buildRequest, checkOutput, demoOutput, validateInput } from "@/lib/ai/engine";
import { LIVE_TOOLS, toolCost } from "@/lib/ai/cost";
import StandardsPanel from "./StandardsPanel";
import ImproveButton from "./ImproveButton";
import ModelPicker from "./ModelPicker";
import HeaderSlot from "./HeaderSlot";
import PointsInfo from "./PointsInfo";
import StudioShell, { StudioHero } from "./StudioShell";
import { genLabel, modelsFor, shortPts } from "@/lib/models";
import { usePoints } from "@/lib/points/PointsContext";
import Link from "next/link";
import { Choice, DemoTag, GRADS, Working } from "./tool-ui";

const HINTS: Record<string, string> = { script: "Script Writer: enter a video topic, not a question. For general questions, use Nexora Chat.", ideas: "Content Ideas: enter a niche or topic, not a question. For general questions, use Nexora Chat.", "youtube-seo": "YouTube SEO: enter your video topic, not a question. For general questions, use Nexora Chat." };

type Cfg = { icon: string; title: string; desc: string; lab: string; max: number; ph: string; ex: string[]; what: string; upload?: string; btn: string; empty: string; tip: string; out: "video" | "audio" | "text" | "seo" | "thumb" | "ideas" | "prompt"; base?: number; per100?: number; ch: { l: string; o: string[]; d?: number; m?: Record<string, number> }[] };
const ICONS: Record<string, LucideIcon> = { film: Film, mic: Mic, pen: PenLine, seo: SearchCheck, thumb: Clapperboard, bulb: Lightbulb, spark: Sparkles };
type Out = { kind: string; note?: string; text?: string; items?: string[]; titles?: string[]; description?: string; tags?: string[] };

const asText = (o: Out) => o.kind === "script" ? (o.text ?? "") : o.kind === "list" ? (o.items ?? []).map((x, i) => `${i + 1}. ${x}`).join("\n") : `Titles:\n${(o.titles ?? []).map((x, i) => `${i + 1}. ${x}`).join("\n")}\n\nDescription:\n${o.description ?? ""}\n\nTags: ${(o.tags ?? []).join(", ")}`;

export default function ToolStudio({ slug }: { slug: string }) {
  const { points: BALANCE, refresh } = usePoints();
  const c = (cfgs.tools as unknown as Record<string, Cfg>)[slug];
  const Icon = ICONS[c.icon];
  const live = LIVE_TOOLS.includes(slug); // real AI for text tools; the others still show placeholder results
  const [text, setText] = useState("");
  const [vals, setVals] = useState(c.ch.map((g) => g.o[g.d ?? 0]));
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [shown, setShown] = useState({ p: "", v: [] as string[] });
  const [result, setResult] = useState<Out | null>(null);
  const [copied, setCopied] = useState(false);
  const [note, setNote] = useState("");
  const [notice, setNotice] = useState("");

  const values: Record<string, string> = Object.fromEntries(c.ch.map((g, i) => [g.l, vals[i]]));
  const models = modelsFor(slug);
  const [modelId, setModelId] = useState(models?.[0].id ?? "");
  const model = models ? (models.find((m) => m.id === modelId) ?? models[0]) : null;
  const cost = toolCost(slug, values, text, model?.id);
  const withModel: Record<string, string> = { ...values, ...(model ? { Model: model.id } : {}) };

  async function run() {
    const v = validateInput(slug, text);
    if (!v.ok) { setNote(v.clarify ?? ""); return; }
    setNote(""); setNotice(""); setStatus("loading"); setResult(null);
    if (!live) { setTimeout(() => { setShown({ p: text, v: vals }); setStatus("done"); }, 1000); return; }
    try {
      const res = await fetch("/api/ai/tool", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, text, values, modelId: model?.id }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setStatus("idle"); if (data.error === "off_topic") setNotice(data.message); else setNote(data.message ?? "Something went wrong. You weren’t charged."); return; }
      setResult(data.output as Out); setShown({ p: text, v: vals }); setStatus("done");
      refresh(); // update the points in the header right away
    } catch { setStatus("idle"); setNote("Couldn’t reach the server. You weren’t charged."); }
  }
  const soon = (w: string) => setNote(`“${w}” will work once AI generation is connected.`);
  async function copy(o: Out) { try { await navigator.clipboard.writeText(asText(o)); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ } }

  const sv = Object.fromEntries(c.ch.map((g, i) => [g.l, shown.v[i]]));
  const eng = (live ? result : status === "done" ? demoOutput(slug, shown.p, sv) : null) as unknown as Out | null;

  const canvas = (
    <>
      {status === "idle" && notice && <div className="mt-6 rounded-3xl border border-brand/30 bg-soft p-5 text-sm"><p>{notice}</p><Link href="/dashboard/chat" className="btn btn-p mt-4 !py-2 text-sm">Open Nexora Chat</Link></div>}
      {status === "idle" && !notice && <StudioHero Icon={Icon} title={c.empty} chips={c.ex} onChip={setText} />}
      {status === "loading" && <Working label={c.out === "video" ? "Generating video…" : c.out === "audio" ? "Generating audio…" : c.out === "thumb" ? "Generating image…" : "Writing…"} />}
      {status === "done" && c.out === "video" && (
        <div>
          <div className="relative grid aspect-video place-items-center rounded-3xl bg-gradient-to-br from-navy via-blue-700 to-sky"><div className="absolute left-4 top-4"><DemoTag /></div><button type="button" aria-label="Play" onClick={() => soon("Playback")} className="grid h-16 w-16 place-items-center rounded-full bg-white/25 text-white backdrop-blur"><Play size={28} fill="currentColor" /></button></div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted"><b className="text-ink">Demo preview</b> · {shown.v.join(" · ")}</p><div className="flex gap-2"><button type="button" onClick={() => soon("Download")} className="btn btn-g !px-4 !py-2 text-sm"><Download size={16} />Download</button><button type="button" onClick={() => soon("Save")} className="btn btn-g !px-4 !py-2 text-sm"><Heart size={16} />Save</button></div></div>
        </div>
      )}
      {status === "done" && c.out === "audio" && (
        <div className="card relative !pt-10 hover:!translate-y-0">
          <div className="absolute left-4 top-4"><DemoTag /></div>
          <div className="flex items-center gap-4"><button type="button" aria-label="Play" onClick={() => soon("Playback")} className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-brand text-white"><Play size={24} fill="currentColor" /></button>
            <div aria-hidden className="flex h-16 flex-1 items-center gap-[3px]">{Array.from({ length: 36 }).map((_, i) => <i key={i} className="flex-1 rounded-[3px] bg-brand" style={{ height: `${20 + ((i * 37 + shown.p.length * 13) % 70)}%` }} />)}</div></div>
          <p className="mt-3 text-sm text-muted"><b className="text-ink">Demo preview</b> · {shown.v.join(" · ")} · no audio is produced</p>
          <div className="mt-3 flex gap-2"><button type="button" onClick={() => soon("Download")} className="btn btn-g !px-4 !py-2 text-sm"><Download size={16} />Download</button></div>
        </div>
      )}
      {status === "done" && c.out === "thumb" && (
        <div>
          <p className="mb-3 text-sm text-muted"><b className="text-ink">Demo layout mockups</b> using your title text. No AI image is generated.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: Number(shown.v[2]) }).map((_, i) => (
              <figure key={i} className={`relative flex aspect-video overflow-hidden rounded-2xl bg-gradient-to-br p-4 text-white ${GRADS[(i + shown.p.length) % GRADS.length]} ${shown.v[1] === "Center" ? "items-center justify-center text-center" : shown.v[1] === "Bottom" ? "items-end" : "items-center"}`}>
                <div className="absolute left-3 top-3"><DemoTag /></div>
                <span className="max-w-[80%] text-xl font-extrabold uppercase leading-tight drop-shadow sm:text-2xl">{shown.p.slice(0, 40)}</span>
              </figure>
            ))}
          </div>
        </div>
      )}
      {status === "done" && eng && (
        <div>
          {live ? (
            <div className="mb-3 flex items-center justify-between"><span className="text-sm font-semibold">{c.title}</span><button type="button" onClick={() => copy(eng)} className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-muted hover:border-brand hover:text-brand">{copied ? <Check size={13} /> : <Copy size={13} />}{copied ? "Copied" : "Copy"}</button></div>
          ) : (
            <p className="mb-3 text-sm text-muted"><b className="text-ink">Demo output.</b> Placeholder text, not written by AI.{eng.note ? ` ${eng.note}` : ""}</p>
          )}
          {(eng.kind === "script" || eng.kind === "prompt") && <div className="card whitespace-pre-line !p-5 hover:!translate-y-0">{eng.text}</div>}
          {eng.kind === "list" && <ol className="card list-decimal space-y-2 !p-5 !pl-9 hover:!translate-y-0">{eng.items?.map((x) => <li key={x}>{x}</li>)}</ol>}
          {eng.kind === "seo" && (
            <div className="card space-y-3 !p-5 hover:!translate-y-0">
              <div><b>Titles</b><ol className="mt-1 list-decimal space-y-1 pl-5 text-muted">{eng.titles?.map((x) => <li key={x}>{x}</li>)}</ol></div>
              <div><b>Description</b><p className="text-muted">{eng.description}</p></div>
              <div><b>Tags</b><div className="mt-1 flex flex-wrap gap-1.5">{eng.tags?.map((x) => <span key={x} className="rounded-full bg-soft px-3 py-1 text-sm text-brand">{x}</span>)}</div></div>
            </div>
          )}
          {!live && <ul className="mt-4 space-y-1 text-sm">{checkOutput(slug, eng, buildRequest(slug, shown.p, sv)).map((k: { ok: boolean; label: string }) => <li key={k.label} className={k.ok ? "text-green-500" : "text-red-400"}>{k.ok ? "✓" : "✗"} {k.label}</li>)}</ul>}
        </div>
      )}
      {status === "done" && <p className="mt-6 text-xs text-muted">Tip: {c.tip}</p>}
    </>
  );
  const options = (close: () => void) => (
    <>
      {c.upload && <button type="button" disabled className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-line px-4 py-3 text-left text-sm text-muted"><Upload size={18} className="text-brand" /><span><b className="text-ink">{c.upload}</b><br />Upload coming soon</span></button>}
      {c.ch.map((g, i) => <Choice key={g.l} label={g.l} options={g.o} value={vals[i]} onChange={(v) => setVals(vals.map((x, j) => (j === i ? v : x)))} />)}
      <PointsInfo cost={cost} />
      <button type="button" onClick={() => { close(); run(); }} disabled={status === "loading" || cost > BALANCE} className="btn btn-p w-full disabled:opacity-60"><Icon size={18} />{genLabel(c.btn, cost)}</button>
      <StandardsPanel slug={slug} text={text} values={withModel} />
    </>
  );
  return (
    <>
      {models && model && <HeaderSlot><ModelPicker compact models={models} value={model.id} onChange={setModelId} /></HeaderSlot>}
      <StudioShell Icon={Icon} title={c.title} canvas={canvas} options={options} note={note} hint={live ? HINTS[slug] : undefined}
        dock={{ value: text, onChange: setText, onSend: run, placeholder: c.lab + "…", cost: shortPts(cost), low: cost > BALANCE, disabled: status === "loading", top: <ImproveButton inline slug={slug} text={text} setText={setText} values={withModel} max={c.max} /> }} />
    </>
  );
}
