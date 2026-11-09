"use client";
import { useState } from "react";
import { RotateCcw, Sparkles } from "lucide-react";
import { improvePrompt, validateInput } from "@/lib/ai/engine";

// Small "Improve" button that sits inside a prompt box. Demo: template-based, no AI yet.
export default function ImproveButton({ slug, text, setText, values = {}, max }: { slug: string; text: string; setText: (v: string) => void; values?: Record<string, string>; max?: number }) {
  const [prev, setPrev] = useState<{ before: string; after: string } | null>(null);
  const [msg, setMsg] = useState("");
  const undo = prev !== null && prev.after === text;

  function click() {
    if (prev && undo) { setText(prev.before); setPrev(null); setMsg(""); return; }
    if (!validateInput(slug, text).ok) { setMsg("Type something first."); return; }
    const r = improvePrompt(slug, text, values);
    if (r === text.trim()) { setMsg("Already clear."); return; }
    const out = max ? r.slice(0, max) : r;
    setPrev({ before: text, after: out }); setText(out); setMsg("");
  }
  return (
    <div className="absolute bottom-2 right-2 flex items-center gap-2">
      {msg && <span role="status" className="text-xs text-muted">{msg}</span>}
      <button type="button" onClick={click} title="Demo: adds clarity without changing your meaning" className="flex items-center gap-1 rounded-full bg-soft px-3 py-1 text-xs font-semibold text-brand transition hover:bg-brand hover:text-white">
        {undo ? <RotateCcw size={12} /> : <Sparkles size={12} />}{undo ? "Undo" : "Improve"}
      </button>
    </div>
  );
}
