"use client";
import { useState } from "react";
import { Clapperboard, Download, Film, Heart, Lightbulb, Mic, PenLine, Play, SearchCheck, Sparkles, Upload, type LucideIcon } from "lucide-react";
import cfgs from "@/lib/studios.json";
import { buildRequest, checkOutput, demoOutput, validateInput } from "@/lib/ai/engine";
import StandardsPanel from "./StandardsPanel";
import ModelPicker from "./ModelPicker";
import PointsInfo from "./PointsInfo";
import { BALANCE, genLabel, modelsFor } from "@/lib/models";
import ImproveButton from "./ImproveButton";
import { Choice, DemoTag, GRADS, ToolHeader } from "./tool-ui";

type Cfg = { icon: string; title: string; desc: string; lab: string; max: number; ph: string; ex: string[]; what: string; upload?: string; btn: string; empty: string; tip: string; out: "video" | "audio" | "text" | "seo" | "thumb" | "ideas" | "prompt"; base?: number; per100?: number; ch: { l: string; o: string[]; d?: number; m?: Record<string, number> }[] };
const ICONS: Record<string, LucideIcon> = { film: Film, mic: Mic, pen: PenLine, seo: SearchCheck, thumb: Clapperboard, bulb: Lightbulb, spark: Sparkles };
type Out = { kind: string; note?: string; text?: string; items?: string[]; titles?: string[]; description?: string; tags?: string[] };

export default function ToolStudio({ slug }: { slug: string }) {
  const c = (cfgs.tools as unknown as Record<string, Cfg>)[slug];
  const Icon = ICONS[c.icon];
  const [text, setText] = useState("");
  const [vals, setVals] = useState(c.ch.map((g) => g.o[g.d ?? 0]));
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [shown, setShown] = useState({ p: "", v: [] as string[] });
  const [note, setNote] = useState("");

  let cost = c.per100 ? Math.max(1, Math.ceil(text.length / 100)) * c.per100 : c.base ?? 1;
  c.ch.forEach((g, i) => { cost *= g.m?.[vals[i]] ?? 1; });
  cost = Math.max(1, Math.round(cost));
  const models = modelsFor(slug);
  const [modelId, setModelId] = useState(models?.[0].id ?? "");
  const model = models ? (models.find((m) => m.id === modelId) ?? models[0]) : null;
  const vi = c.ch.findIndex((g) => g.l === "Variations");
  if (model) cost = model.points * (vi >= 0 ? Number(vals[vi]) : 1); // points per output × variations

  function run() {
    const vi = validateInput(slug, text);
    if (!vi.ok) { setNote(vi.clarify ?? ""); return; }
    setNote(""); setStatus("loading");
    setTimeout(() => { setShown({ p: text, v: vals }); setStatus("done"); }, 1000);
  }
  const soon = (w: string) => setNote(`Demo only: “${w}” will work once AI generation is connected.`);

  const values: Record<string, string> = { ...Object.fromEntries(c.ch.map((g, i) => [g.l, vals[i]])), ...(model ? { Model: model.id } : {}) };
  const sv = Object.fromEntries(c.ch.map((g, i) => [g.l, shown.v[i]]));
  const eng = (status === "done" ? demoOutput(slug, shown.p, sv) : null) as unknown as Out | null;

  return (
    <div className="mx-auto max-w-6xl">
      <ToolHeader Icon={Icon} title={c.title} desc={c.desc} />
      <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
        <section aria-label={`${c.title} settings`} className="card space-y-5 !p-5 hover:!translate-y-0">
          {models && model && <ModelPicker models={models} value={model.id} onChange={setModelId} />}
          <div>
            <label htmlFor="t" className="mb-2 flex justify-between text-sm font-semibold">{c.lab}<span className="font-normal text-muted">{text.length}/{c.max}</span></label>
            <div className="relative"><textarea id="t" rows={4} maxLength={c.max} value={text} onChange={(e) => setText(e.target.value)} placeholder={c.ph} className="field resize-none pb-10" /><ImproveButton slug={slug} text={text} setText={setText} values={values} max={c.max} /></div>
            <div className="mt-2 flex flex-wrap gap-1.5">{c.ex.map((x) => <button key={x} type="button" onClick={() => setText(x)} className="rounded-full bg-soft px-3 py-1 text-xs text-muted hover:text-brand">Try: {x.slice(0, 24)}…</button>)}</div>
          </div>
          {c.upload && <button type="button" onClick={() => soon("Upload")} className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-line px-4 py-3 text-left text-sm text-muted hover:border-brand"><Upload size={18} className="text-brand" /><span><b className="text-ink">{c.upload}</b><br />Upload coming soon</span></button>}
          {c.ch.map((g, i) => <Choice key={g.l} label={g.l} options={g.o} value={vals[i]} onChange={(v) => setVals(vals.map((x, j) => (j === i ? v : x)))} />)}
          <PointsInfo cost={cost} />
          <button type="button" onClick={run} disabled={status === "loading" || cost > BALANCE} className="btn btn-p w-full disabled:opacity-60"><Icon size={18} />{status === "loading" ? "Preparing preview…" : genLabel(c.btn, cost)}</button>
          <p role="status" className="min-h-[1.25rem] text-sm text-muted">{note}</p>
        </section>

        <section aria-label="Result" className="min-w-0">
          {status === "idle" && <div className="grid min-h-[420px] place-items-center rounded-3xl border border-dashed border-line bg-card p-8 text-center"><div><div className="icon-box mx-auto"><Icon size={24} /></div><h2 className="font-bold">{c.empty}</h2><p className="mt-1 max-w-xs text-sm text-muted">Enter your details, choose your options and press the button to see a demo preview.</p></div></div>}
          {status === "loading" && <div className="h-64 animate-pulse rounded-3xl bg-soft" />}
          {status === "done" && c.out === "video" && (
            <div>
              <div className="relative grid aspect-video place-items-center rounded-3xl bg-gradient-to-br from-navy via-blue-700 to-sky"><div className="absolute left-4 top-4"><DemoTag /></div><button type="button" aria-label="Play (demo)" onClick={() => soon("Playback")} className="grid h-16 w-16 place-items-center rounded-full bg-white/25 text-white backdrop-blur hover:scale-105"><Play size={28} fill="currentColor" /></button></div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted"><b className="text-ink">Demo preview</b> · {shown.v.join(" · ")}</p><div className="flex gap-2"><button type="button" onClick={() => soon("Download")} className="btn btn-g !px-4 !py-2 text-sm"><Download size={16} />Download</button><button type="button" onClick={() => soon("Save")} className="btn btn-g !px-4 !py-2 text-sm"><Heart size={16} />Save</button></div></div>
            </div>
          )}
          {status === "done" && c.out === "audio" && (
            <div className="card relative !pt-10 hover:!translate-y-0">
              <div className="absolute left-4 top-4"><DemoTag /></div>
              <div className="flex items-center gap-4"><button type="button" aria-label="Play (demo)" onClick={() => soon("Playback")} className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-brand text-white"><Play size={24} fill="currentColor" /></button>
                <div aria-hidden className="flex h-16 flex-1 items-center gap-[3px]">{Array.from({ length: 36 }).map((_, i) => <i key={i} className="flex-1 rounded-[3px] bg-brand" style={{ height: `${20 + ((i * 37 + shown.p.length * 13) % 70)}%` }} />)}</div></div>
              <p className="mt-3 text-sm text-muted"><b className="text-ink">Demo preview</b> · {shown.v.join(" · ")} · no audio is produced</p>
              <div className="mt-3 flex gap-2"><button type="button" onClick={() => soon("Download")} className="btn btn-g !px-4 !py-2 text-sm"><Download size={16} />Download</button></div>
            </div>
          )}
          {status === "done" && c.out === "thumb" && (
            <div>
              <p className="mb-3 text-sm text-muted"><b className="text-ink">Demo layout mockups</b> using your title text. No AI image is generated.</p>
              <div className="grid gap-4 sm:grid-cols-2">
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
              <p className="mb-3 text-sm text-muted"><b className="text-ink">Demo output.</b> Placeholder text, not written by AI.{eng.note ? ` ${eng.note}` : ""}</p>
              {(eng.kind === "script" || eng.kind === "prompt") && <div className="card whitespace-pre-line !p-5 hover:!translate-y-0">{eng.text}</div>}
              {eng.kind === "list" && <ol className="card list-decimal space-y-2 !p-5 !pl-9 hover:!translate-y-0">{eng.items?.map((x) => <li key={x}>{x}</li>)}</ol>}
              {eng.kind === "seo" && (
                <div className="card space-y-3 !p-5 hover:!translate-y-0">
                  <div><b>Titles</b><ol className="mt-1 list-decimal space-y-1 pl-5 text-muted">{eng.titles?.map((x) => <li key={x}>{x}</li>)}</ol></div>
                  <div><b>Description</b><p className="text-muted">{eng.description}</p></div>
                  <div><b>Tags</b><div className="mt-1 flex flex-wrap gap-1.5">{eng.tags?.map((x) => <span key={x} className="rounded-full bg-soft px-3 py-1 text-sm text-brand">{x}</span>)}</div></div>
                </div>
              )}
              <ul className="mt-4 space-y-1 text-sm">{checkOutput(slug, eng, buildRequest(slug, shown.p, sv)).map((k: { ok: boolean; label: string }) => <li key={k.label} className={k.ok ? "text-green-600" : "text-red-500"}>{k.ok ? "✓" : "✗"} {k.label}</li>)}</ul>
            </div>
          )}
          <StandardsPanel slug={slug} text={text} values={values} />
          <div className="mt-6 rounded-2xl border border-line bg-card p-5 text-sm text-muted"><b className="text-ink">Tip:</b> {c.tip}</div>
        </section>
      </div>
    </div>
  );
}
