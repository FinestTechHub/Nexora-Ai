"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Camera, Check, Clapperboard, Film, Image as ImageIcon, MessageSquare, Paperclip, ShoppingBag, Video } from "lucide-react";
import Dock from "./Dock";
import HeaderSlot from "./HeaderSlot";
import ModelPicker from "./ModelPicker";
import { useAttachment } from "@/components/chat/useAttachment";
import { setHandoff, type Handoff } from "@/lib/chat/handoff";
import { validateInput } from "@/lib/ai/engine";
import { modelsFor, shortPts } from "@/lib/models";
import { usePoints } from "@/lib/points/PointsContext";

const MODES = [
  { k: "Chat", slug: "chat", Icon: MessageSquare, ph: "Ask Nexora…" },
  { k: "Image", slug: "image", Icon: ImageIcon, ph: "Describe an image…" },
  { k: "Video", slug: "video", Icon: Video, ph: "Describe a video…" },
] as const;

// Four one-tap starters. Each one opens the right tool with the right model and a ready-to-finish prompt.
const CARDS: { title: string; sub: string; Icon: typeof Camera; href: string; h: Handoff }[] = [
  { title: "Snap & Solve Homework", sub: "Photo in, steps out", Icon: Camera, href: "/dashboard/chat?q=1",
    h: { text: "Solve and explain every step in this photo clearly:", file: null, fill: true, model: "nexora-1.0", picker: "image" } },
  { title: "Viral TikTok / Reels Script", sub: "45-second hook + CTA", Icon: Film, href: "/dashboard/chat?q=1",
    h: { text: "Write a high-retention 45-second TikTok/Reels script with a strong 3-second hook, body points, and CTA about ", file: null, fill: true, model: "nexora-flash" } },
  { title: "YouTube Thumbnail + Selfie", sub: "Your face, big text", Icon: Clapperboard, href: "/dashboard/thumbnails",
    h: { text: "Me looking shocked and excited in the foreground, bold high-contrast background with vivid colours and dramatic rim lighting, about ", file: null, fill: true, highlight: "refs" } },
  { title: "Product Ad Studio", sub: "Studio-quality shots", Icon: ShoppingBag, href: "/dashboard/image",
    h: { text: "A premium commercial studio photo of my product on a clean seamless background, soft diffused lighting, crisp shadows, advertising quality", file: null, fill: true, style: "Product Shot", aspect: "1:1" } },
];

export default function HomeScreen() {
  const { points: BALANCE } = usePoints();
  const router = useRouter();
  const attach = useAttachment();
  const [mode, setMode] = useState<(typeof MODES)[number]>(MODES[0]);
  const [text, setText] = useState("");
  const [note, setNote] = useState("");
  const [ids, setIds] = useState<Record<string, string>>({});
  const models = modelsFor(mode.slug)!;
  const model = models.find((m) => m.id === ids[mode.slug]) ?? models[0];

  function send() {
    if (!(mode.slug === "chat" && attach.file) && !validateInput(mode.slug, text).ok) { setNote("Type something first."); return; }
    if (mode.slug === "chat") { setHandoff({ text: text.trim(), file: attach.file }); attach.clear(); router.push("/dashboard/chat?q=1"); return; }
    if (mode.slug === "image") { setHandoff({ text: text.trim(), file: null }); router.push("/dashboard/image"); return; }
    setNote(`${mode.k} generation isn’t connected yet. Nothing was sent.`);
  }
  const menu = (
    <>
      {MODES.map((m) => (
        <button key={m.k} type="button" onClick={() => { setMode(m); setNote(""); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-white/10">
          <m.Icon size={16} />{m.k}{mode.k === m.k && <Check size={14} className="ml-auto text-brand" />}
        </button>
      ))}
      {mode.slug === "chat" ? <button type="button" onClick={attach.openSheet} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-white/10"><Paperclip size={16} />Attach a file</button> : <p className="px-3 py-2 text-xs text-zinc-500">Attachments are for Chat</p>}
    </>
  );
  return (
    <div className="flex h-full flex-col">
      <HeaderSlot><ModelPicker compact chat={mode.slug === "chat"} models={models} value={model.id} onChange={(id) => setIds({ ...ids, [mode.slug]: id })} /></HeaderSlot>
      <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-5 pb-6 text-center">
        <div className="relative mb-4">
          <div className="absolute inset-0 -z-10 scale-[2.2] rounded-full bg-brand/40 blur-3xl" />
          <Image src="/logo.png" alt="Nexora AI" width={64} height={52} priority />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">What should we focus on?</h1>
        <div className="mt-6 grid w-full max-w-md grid-cols-2 gap-2.5">
          {CARDS.map((c) => (
            <button key={c.title} type="button" onClick={() => { setHandoff(c.h); router.push(c.href); }} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-left transition hover:border-white/25 active:scale-[.98]">
              <span className="mb-2 grid h-8 w-8 place-items-center rounded-xl bg-brand/20 text-brand"><c.Icon size={17} /></span>
              <span className="block text-[13px] font-semibold leading-tight">{c.title}</span>
              <span className="mt-0.5 block text-[11px] text-zinc-500">{c.sub}</span>
            </button>
          ))}
        </div>
        <p role="status" className="mt-4 min-h-[1.25rem] text-xs text-zinc-500">{note}{note.includes("connected yet") && <> <Link href={`/dashboard/${mode.slug}`} className="text-brand underline">Open {mode.k}</Link></>}</p>
      </div>
      <Dock value={text} onChange={(v) => { setText(v); setNote(""); }} onSend={send} placeholder={mode.ph} cost={mode.slug === "chat" && model.freeDaily ? undefined : shortPts(model.points)} low={!(mode.slug === "chat" && model.freeDaily) && model.points > BALANCE} menu={menu} above={mode.slug === "chat" ? attach.chip : null} canSendEmpty={mode.slug === "chat" && Boolean(attach.file)} />
      {attach.ui}
    </div>
  );
}
