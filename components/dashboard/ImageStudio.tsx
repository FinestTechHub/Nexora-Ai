"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Clapperboard, Clock, Download, Image as ImageIcon, Pencil, Plus, RefreshCw, Share2, X } from "lucide-react";
import { Choice } from "./tool-ui";
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
import { compressReference, downloadPng, groupSessions, loadCreations, loadSessionThread, shareImage, type Creation, type Session } from "@/lib/image/client";

const ASPECTS = ["1:1", "16:9", "9:16", "4:5"] as const;
const STYLES = ["Photorealistic", "3D Render", "Anime", "Digital Art", "Product Shot", "Minimalist"] as const;
const IDEAS = { image: ["A friendly robot reading a book, 3D render", "Minimal product photo of a blue sneaker on white", "A futuristic city at sunrise"], thumbnail: ["I tried the world’s cheapest drone", "5 AI tools that changed my work", "iPhone vs Android: the truth"] };
const IDLE_MS = 30 * 60 * 1000; // away longer than this = a brand-new session
const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`.padEnd(36, "0").slice(0, 36));

type Job = { prompt: string; text: string; style: string; aspect: string; modelId: string; files: File[]; edit: boolean; sessionId: string; sessionTitle: string };
type Turn = { id: string; prompt: string; aspect: string; thumbs: string[]; status: "loading" | "done" | "error"; creation?: Creation; error?: string; job?: Job };
const rowToTurn = (r: Creation): Turn => ({ id: r.id, prompt: r.prompt ?? "", aspect: r.aspect_ratio ?? "1:1", thumbs: [], status: "done", creation: r });

// One studio for both tools: mode "image" = Image Studio, mode "thumbnail" = Thumbnail Maker.
// Works like a chat: every request adds a prompt bubble and a result to the thread, and you can keep typing while it works.
export default function ImageStudio({ mode = "image" }: { mode?: "image" | "thumbnail" }) {
  const thumb = mode === "thumbnail";
  const KEY = `nexora-img-session-${mode}`;
  const { points: BALANCE, refresh } = usePoints();
  const models = modelsFor(thumb ? "thumbnails" : "image")!;
  const [modelId, setModelId] = useState(thumb ? "image-pro" : "image-fast"); // Thumbnail Maker starts on Pro, Image Studio on Fast
  const model = models.find((m) => m.id === modelId) ?? models[0];
  const [prompt, setPrompt] = useState("");
  const [text, setText] = useState("");
  const [style, setStyle] = useState<(typeof STYLES)[number]>("Photorealistic");
  const [aspect, setAspect] = useState<(typeof ASPECTS)[number]>(thumb ? "16:9" : "1:1");
  const [refs, setRefs] = useState<File[]>([]);
  const [editFile, setEditFile] = useState<File | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [sessionId, setSessionId] = useState(uid);
  const [sessionTitle, setSessionTitle] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [hist, setHist] = useState(false);
  const [view, setView] = useState<Creation | null>(null);
  const [note, setNote] = useState("");
  const inflight = useRef(0);
  const endRef = useRef<HTMLDivElement>(null);
  const cost = model.points;
  const editThumb = useMemo(() => (editFile ? URL.createObjectURL(editFile) : null), [editFile]);
  useEffect(() => () => { if (editThumb) URL.revokeObjectURL(editThumb); }, [editThumb]);

  const touch = (id: string) => { try { sessionStorage.setItem(KEY, JSON.stringify({ id, at: Date.now() })); } catch { /* ignore */ } };
  function openThread(id: string, rows: Creation[]) { setSessionId(id); setSessionTitle(rows[0]?.session_title ?? rows[0]?.title ?? null); setTurns(rows.map(rowToTurn)); setRefs([]); setEditFile(null); touch(id); }

  // On opening: a session from the Library (?s=...), or the one you were just in (under 30 minutes ago). Otherwise a fresh blank session.
  useEffect(() => {
    const h = takeHandoff(); if (h?.text) setPrompt(h.text);
    const q = new URLSearchParams(location.search).get("s");
    let id: string | null = q;
    if (q) history.replaceState(history.state, "", location.pathname);
    else { try { const s = JSON.parse(sessionStorage.getItem(KEY) || "null"); if (s?.id && Date.now() - s.at < IDLE_MS) id = s.id; } catch { /* ignore */ } }
    if (id) loadSessionThread(id).then((rows) => { if (rows.length) openThread(id!, rows); }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { // away for a long time, then back: a fresh session
    const f = () => { try { const s = JSON.parse(sessionStorage.getItem(KEY) || "null"); if (document.visibilityState === "visible" && s && Date.now() - s.at > IDLE_MS) newSession(); } catch { /* ignore */ } };
    document.addEventListener("visibilitychange", f);
    return () => document.removeEventListener("visibilitychange", f);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [turns.length, turns.map((t) => t.status).join()]);

  function newSession() {
    const id = uid();
    setSessionId(id); setSessionTitle(null); setTurns([]); setPrompt(""); setText(""); setRefs([]); setEditFile(null); setNote(""); setHist(false);
    try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
  }
  function openHistory() {
    setHist(true); setSessions(null);
    loadCreations({ limit: 200, toolType: mode }).then((r) => setSessions(groupSessions(r))).catch(() => setSessions([]));
  }

  async function runJob(turnId: string, job: Job) {
    setTurns((ts) => ts.map((t) => (t.id === turnId ? { ...t, status: "loading", error: undefined } : t)));
    inflight.current++;
    try {
      const fd = new FormData();
      fd.append("payload", JSON.stringify({ mode, prompt: job.prompt, style: job.style, aspect: job.aspect, text: job.text, modelId: job.modelId, sessionId: job.sessionId, sessionTitle: job.sessionTitle, edit: job.edit }));
      job.files.forEach((f, i) => fd.append(`ref${i}`, f)); // photos travel as raw bytes
      const res = await fetch("/api/ai/image", { method: "POST", body: fd });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setTurns((ts) => ts.map((t) => (t.id === turnId ? { ...t, status: "error", error: d.message ?? "Something went wrong. You weren’t charged." } : t))); return; }
      setTurns((ts) => ts.map((t) => (t.id === turnId ? { ...t, status: "done", creation: d.creation as Creation } : t)));
      refresh(); // update the points in the header right away
    } catch { setTurns((ts) => ts.map((t) => (t.id === turnId ? { ...t, status: "error", error: "Couldn’t reach the server. You weren’t charged." } : t))); }
    finally { inflight.current--; touch(job.sessionId); }
  }
  function submit() {
    if (!prompt.trim()) { setNote(thumb && text.trim() ? "Add a scene, or tap Improve to create one from your text." : thumb ? "Describe the thumbnail scene or topic first." : "Describe your image first."); return; }
    if (cost > BALANCE) return;
    if (inflight.current >= 3) { setNote("Please wait for one of your images to finish first."); return; }
    const title = sessionTitle ?? prompt.trim().slice(0, 80); // a session is named after its first prompt
    if (!sessionTitle) setSessionTitle(title);
    const files = [...(editFile ? [editFile] : []), ...refs];
    const job: Job = { prompt: prompt.trim(), text: thumb ? text.trim() : "", style, aspect, modelId: model.id, files, edit: Boolean(editFile), sessionId, sessionTitle: title };
    const turn: Turn = { id: uid(), prompt: job.prompt, aspect, thumbs: files.map((f) => URL.createObjectURL(f)), status: "loading", job };
    setTurns((ts) => [...ts, turn]);
    setPrompt(""); setNote(""); if (editFile) { setEditFile(null); setText(""); }
    touch(sessionId);
    runJob(turn.id, job);
  }
  async function startEdit(t: Turn) { // attach the picture, then describe what to change
    if (!t.creation?.url) return;
    try {
      const blob = await (await fetch(t.creation.url)).blob();
      setEditFile(await compressReference(new File([blob], "edit.png", { type: blob.type || "image/png" })));
      setNote(""); document.getElementById("dock-input")?.focus();
    } catch { setNote("Couldn’t load that image to edit. Please try again."); }
  }

  const ratio = (a: string) => a.replace(":", " / ");
  const canvas = (
    <>
      <div className="sticky top-0 z-10 -mt-1 mb-3 flex justify-end gap-1.5">
        <button type="button" onClick={openHistory} className="flex items-center gap-1.5 rounded-full border border-line bg-bg/90 px-3 py-1.5 text-xs font-medium backdrop-blur hover:border-brand"><Clock size={13} />History</button>
        <button type="button" onClick={newSession} className="flex items-center gap-1.5 rounded-full border border-line bg-bg/90 px-3 py-1.5 text-xs font-medium backdrop-blur hover:border-brand"><Plus size={13} />New</button>
      </div>
      {turns.length === 0 ? (
        <StudioHero Icon={thumb ? Clapperboard : ImageIcon} title={thumb ? "What should your thumbnail show?" : "What image should we create?"} chips={IDEAS[mode]} onChip={setPrompt} />
      ) : (
        <div className="space-y-6">
          {turns.map((t) => (
            <div key={t.id} className="space-y-3">
              <div className="flex flex-col items-end gap-1.5">
                {t.thumbs.length > 0 && <div className="flex gap-1.5">{t.thumbs.map((u) => /* eslint-disable-next-line @next/next/no-img-element */ <img key={u} src={u} alt="" className="h-12 w-12 rounded-xl object-cover" />)}</div>}
                <div className="max-w-[88%] whitespace-pre-wrap break-words rounded-3xl rounded-br-lg bg-brand px-4 py-2.5 text-white">{t.prompt}</div>
              </div>
              {t.status === "loading" && (
                <div role="status" aria-label="Creating your image" className="relative max-w-sm overflow-hidden rounded-2xl border border-line bg-white/5" style={{ aspectRatio: ratio(t.aspect) }}>
                  <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-white/5 via-white/10 to-white/5" />
                  <p className="absolute inset-0 grid place-items-center text-sm text-muted">Creating your image…</p>
                </div>
              )}
              {t.status === "error" && (
                <div role="alert" className="max-w-sm rounded-2xl border border-dashed border-red-400/40 p-4 text-sm text-muted">
                  <b className="mb-1 block text-xs uppercase tracking-wider text-red-400">Couldn’t create it</b>{t.error}
                  {t.job && <div className="mt-3"><button type="button" onClick={() => runJob(t.id, t.job!)} className="btn btn-p !px-4 !py-1.5 text-sm"><RefreshCw size={14} />Retry</button></div>}
                </div>
              )}
              {t.status === "done" && t.creation?.url && (
                <div className="max-w-sm">
                  <button type="button" onClick={() => setView(t.creation!)} aria-label="View full screen" className="block overflow-hidden rounded-2xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={t.creation.url} alt={t.creation.title ?? "Generated image"} className="max-w-full rounded-2xl object-contain" />
                  </button>
                  <p className="mt-1.5 text-[11px] text-muted">{t.creation.model_label}</p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <button type="button" onClick={() => startEdit(t)} className="btn btn-p !px-3.5 !py-1.5 text-xs"><Pencil size={14} />Edit</button>
                    <button type="button" onClick={() => downloadPng(t.creation!.url!, `nexora-${t.creation!.id.slice(0, 8)}`)} className="btn btn-g !px-3.5 !py-1.5 text-xs"><Download size={14} />Download PNG</button>
                    <button type="button" onClick={() => shareImage(t.creation!.url!, t.creation!.title ?? "Nexora image")} className="btn btn-g !px-3.5 !py-1.5 text-xs"><Share2 size={14} />Share</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <div ref={endRef} />
      {view?.url && <ImageViewer src={view.url} title={view.title ?? undefined} id={view.id} onClose={() => setView(null)} />}
      {hist && (
        <div className="fixed inset-0 z-[55] flex justify-end bg-black/60" onClick={() => setHist(false)}>
          <aside aria-label="Sessions" onClick={(e) => e.stopPropagation()} className="page-in flex h-full w-80 max-w-[88%] flex-col border-l border-line bg-[#0d0d10]">
            <div className="flex items-center justify-between p-3 pt-[max(0.75rem,env(safe-area-inset-top))]"><b className="px-1">{thumb ? "Thumbnail sessions" : "Image sessions"}</b><button type="button" aria-label="Close" onClick={() => setHist(false)} className="p-1.5"><X size={18} /></button></div>
            <div className="px-3 pb-2"><button type="button" onClick={newSession} className="btn btn-p w-full !py-2.5 text-sm"><Plus size={16} />New session</button></div>
            <div className="flex-1 space-y-1 overflow-y-auto px-2 pb-3">
              {sessions === null ? <p className="px-3 py-4 text-sm text-muted">Loading…</p> : sessions.length === 0 ? <p className="px-3 py-4 text-sm text-muted">No sessions yet.</p> : sessions.map((s) => (
                <button key={s.id} type="button" onClick={async () => { const rows = await loadSessionThread(s.id); if (rows.length) openThread(s.id, rows); setHist(false); }} className={`flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-white/5 ${s.id === sessionId ? "bg-white/10" : ""}`}>
                  {s.cover ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={s.cover} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" /> : <span className="h-12 w-12 shrink-0 rounded-lg bg-white/5" />}
                  <span className="min-w-0"><span className="block truncate text-sm font-medium">{s.title}</span><span className="text-xs text-muted">{s.count} {s.count === 1 ? "image" : "images"} · {new Date(s.at).toLocaleDateString()}</span></span>
                </button>
              ))}
            </div>
          </aside>
        </div>
      )}
    </>
  );
  const options = (close: () => void) => (
    <>
      <Choice label="Aspect ratio" options={ASPECTS} value={aspect} onChange={setAspect} />
      {!thumb && <Choice label="Style" options={STYLES} value={style} onChange={setStyle} />}
      <PointsInfo cost={cost} />
      <button type="button" onClick={() => { close(); submit(); }} disabled={cost > BALANCE} className="btn btn-p w-full disabled:opacity-60">Generate ({cost} pts)</button>
    </>
  );
  const above = (
    <div className="space-y-2">
      {editFile && (
        <div className="inline-flex items-center gap-2 rounded-2xl border border-brand/40 bg-zinc-900/90 py-1 pl-1 pr-2 text-xs">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {editThumb && <img src={editThumb} alt="" className="h-9 w-9 rounded-lg object-cover" />}
          <span>Editing this image… describe the change</span>
          <button type="button" aria-label="Stop editing" onClick={() => setEditFile(null)} className="grid h-6 w-6 place-items-center rounded-full hover:bg-white/10"><X size={12} /></button>
        </div>
      )}
      {thumb && <input value={text} onChange={(e) => setText(e.target.value.slice(0, 60))} placeholder="Exact text on thumbnail (optional)" aria-label="Exact text on thumbnail" className="field !rounded-2xl !py-2 text-base" />}
      <ReferenceTray files={refs} onChange={setRefs} max={editFile ? 2 : 3} />
    </div>
  );
  return (
    <>
      <HeaderSlot><ModelPicker compact models={models} value={model.id} onChange={setModelId} /></HeaderSlot>
      <StudioShell Icon={thumb ? Clapperboard : ImageIcon} title={thumb ? "Thumbnail Maker" : "Image Studio"} canvas={canvas} options={options} note={note}
        dock={{ value: prompt, onChange: setPrompt, onSend: submit, placeholder: editFile ? "Describe the change… e.g. make the background night" : thumb ? "Scene or topic of your thumbnail…" : "Describe an image…", cost: shortPts(cost), low: cost > BALANCE, above,
          top: <ImproveButton inline slug={thumb ? "thumbnails" : "image"} text={prompt} setText={setPrompt} extra={text} values={{ Style: style, Aspect: aspect }} max={600} /> }} />
    </>
  );
}
