"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Image as ImageIcon, MessageSquare, Video } from "lucide-react";
import Dock from "./Dock";
import HeaderSlot from "./HeaderSlot";
import ModelPicker from "./ModelPicker";
import { validateInput } from "@/lib/ai/engine";
import { modelsFor, shortPts } from "@/lib/models";
import { usePoints } from "@/lib/points/PointsContext";

const MODES = [
  { k: "Chat", slug: "chat", Icon: MessageSquare, ph: "Ask Nexora…" },
  { k: "Image", slug: "image", Icon: ImageIcon, ph: "Describe an image…" },
  { k: "Video", slug: "video", Icon: Video, ph: "Describe a video…" },
] as const;
const CHIPS = ["Write a 30-second script", "Describe a thumbnail", "Give me 5 video ideas"];

export default function HomeScreen() {
  const { points: BALANCE } = usePoints();
  const router = useRouter();
  const [mode, setMode] = useState<(typeof MODES)[number]>(MODES[0]);
  const [text, setText] = useState("");
  const [note, setNote] = useState("");
  const [ids, setIds] = useState<Record<string, string>>({});
  const models = modelsFor(mode.slug)!;
  const model = models.find((m) => m.id === ids[mode.slug]) ?? models[0];

  function send() {
    if (!validateInput(mode.slug, text).ok) { setNote("Type something first."); return; }
    if (mode.slug === "chat") { router.push(`/dashboard/chat?q=${encodeURIComponent(text.trim())}`); return; }
    setNote(`${mode.k} generation isn’t connected yet. Nothing was sent.`);
  }
  const menu = (
    <>
      {MODES.map((m) => (
        <button key={m.k} type="button" onClick={() => { setMode(m); setNote(""); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-white/10">
          <m.Icon size={16} />{m.k}{mode.k === m.k && <Check size={14} className="ml-auto text-brand" />}
        </button>
      ))}
      <p className="px-3 py-2 text-xs text-zinc-500">Attachments coming soon</p>
    </>
  );
  return (
    <div className="flex h-full flex-col">
      <HeaderSlot><ModelPicker compact models={models} value={model.id} onChange={(id) => setIds({ ...ids, [mode.slug]: id })} /></HeaderSlot>
      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-10 text-center">
        <div className="relative mb-6">
          <div className="absolute inset-0 -z-10 scale-[2.2] rounded-full bg-brand/40 blur-3xl" />
          <Image src="/logo.png" alt="Nexora AI" width={76} height={62} priority />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">What should we focus on?</h1>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {CHIPS.map((c) => <button key={c} type="button" onClick={() => setText(c)} className="rounded-full border border-white/10 px-3.5 py-1.5 text-sm text-zinc-400 transition hover:border-white/25 hover:text-zinc-200">{c}</button>)}
        </div>
        <p role="status" className="mt-5 min-h-[1.25rem] text-xs text-zinc-500">{note}{note.includes("connected yet") && <> <Link href={`/dashboard/${mode.slug}`} className="text-brand underline">Open {mode.k}</Link></>}</p>
      </div>
      <Dock value={text} onChange={(v) => { setText(v); setNote(""); }} onSend={send} placeholder={mode.ph} cost={shortPts(model.points)} low={model.points > BALANCE} menu={menu} />
    </div>
  );
}
