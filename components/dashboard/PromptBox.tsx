"use client";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import ImproveButton from "./ImproveButton";

const modes = ["Image", "Video", "Voice", "Script"];

export default function PromptBox() {
  const [mode, setMode] = useState("Image");
  const [text, setText] = useState("");
  const [note, setNote] = useState("");
  return (
    <div className="rounded-3xl border border-line bg-card p-4 shadow-[0_30px_60px_-35px_rgba(37,99,235,.5)] sm:p-5">
      <label htmlFor="prompt" className="sr-only">Describe what you want to create</label>
      <div className="relative">
        <textarea id="prompt" value={text} onChange={(e) => { setText(e.target.value); setNote(""); }} rows={4} placeholder="Describe what you want to create… e.g. “A futuristic city at sunrise, cinematic lighting”" className="field resize-none !border-0 !bg-soft pb-10" />
        <ImproveButton slug={mode.toLowerCase()} text={text} setText={(v) => { setText(v); setNote(""); }} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {modes.map((m) => <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)} className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${mode === m ? "border-brand bg-brand text-white" : "border-line text-muted hover:border-brand"}`}>{m}</button>)}
        <button type="button" onClick={() => setNote(text.trim() ? `Demo only: ${mode} generation isn’t connected yet. Your prompt wasn’t sent anywhere.` : "Please type a prompt first.")} className="btn btn-p ml-auto !py-2.5 text-sm"><Sparkles size={16} />Generate</button>
      </div>
      <p role="status" className="mt-3 min-h-[1.25rem] text-sm text-muted">{note}</p>
    </div>
  );
}
