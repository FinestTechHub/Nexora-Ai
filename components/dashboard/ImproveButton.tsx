"use client";
import { useState } from "react";
import { Loader2, RotateCcw, Sparkles } from "lucide-react";
import { improvePrompt, validateInput } from "@/lib/ai/engine";
import { usePoints } from "@/lib/points/PointsContext";

// Voice text must stay exactly as written, so it is only tidied locally (no AI).
const LOCAL = ["voice"];

export default function ImproveButton({ slug, text, setText, values = {}, max, inline, extra }: { slug: string; text: string; setText: (v: string) => void; values?: Record<string, string>; max?: number; inline?: boolean; extra?: string }) {
  const { refresh } = usePoints();
  const [prev, setPrev] = useState<{ before: string; after: string } | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const undo = prev !== null && prev.after === text;
  const img = slug === "image" || slug === "thumbnails"; // Image Studio and Thumbnail Maker use the free image-prompt improver

  async function click() {
    if (prev && undo) { setText(prev.before); setPrev(null); setMsg(""); return; }
    if (img ? !text.trim() && !(extra ?? "").trim() : !validateInput(slug, text).ok) { setMsg("Type something first."); return; }
    let r = "";
    if (LOCAL.includes(slug)) r = improvePrompt(slug, text, values);
    else {
      setBusy(true); setMsg("");
      try {
        const res = await fetch(img ? "/api/ai/improve-prompt" : "/api/ai/improve", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(img ? { mode: slug === "thumbnails" ? "thumbnail" : "image", prompt: text, text: extra ?? "", style: values.Style, aspect: values.Aspect } : { slug, text, values }) });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) { setMsg(d.message ?? "Couldn’t improve right now."); setBusy(false); return; }
        r = d.text as string;
        if (!img) refresh();
      } catch { setMsg("Couldn’t reach the server."); setBusy(false); return; }
      setBusy(false);
    }
    if (r.trim() === text.trim()) { setMsg("Already clear."); return; }
    const out = max ? r.slice(0, max) : r;
    setPrev({ before: text, after: out }); setText(out); setMsg("");
  }
  return (
    <div className={inline ? "flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-900 px-1 py-0.5" : "absolute bottom-2 right-2 flex items-center gap-2"}>
      {msg && <span role="status" className="max-w-[40vw] truncate text-xs text-muted">{msg}</span>}
      <button type="button" onClick={click} disabled={busy} title="Adds clarity without changing your meaning" className="flex items-center gap-1 rounded-full bg-soft px-3 py-1 text-xs font-semibold text-brand transition hover:bg-brand hover:text-white disabled:opacity-70">
        {busy ? <Loader2 size={12} className="animate-spin" /> : undo ? <RotateCcw size={12} /> : <Sparkles size={12} />}{busy ? "Improving…" : undo ? "Undo" : "Improve"}
      </button>
    </div>
  );
}
