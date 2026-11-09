"use client";
import { useState } from "react";
import { Apple, Play } from "lucide-react";
import { ANDROID_URL, IOS_URL } from "@/lib/config";

export default function StoreButtons() {
  const [note, setNote] = useState("");
  const items = [
    { Icon: Play, small: "GET IT ON", name: "Google Play", url: ANDROID_URL },
    { Icon: Apple, small: "DOWNLOAD ON THE", name: "App Store", url: IOS_URL },
  ];
  return (
    <>
      <div className="flex flex-wrap justify-center gap-3.5">
        {items.map(({ Icon, small, name, url }) => {
          const placeholder = url.startsWith("PASTE_");
          return (
            <a key={name} href={placeholder ? "#" : url} {...(!placeholder && { target: "_blank", rel: "noopener noreferrer" })}
              onClick={placeholder ? (e) => { e.preventDefault(); setNote("Placeholder link: add the real store URL in lib/config.ts"); } : undefined}
              className="flex min-w-[190px] items-center gap-3 rounded-2xl border border-white/25 bg-navy px-6 py-3 text-left text-white transition hover:-translate-y-0.5">
              <Icon size={28} fill="currentColor" />
              <span><small className="block text-[11px] leading-none opacity-75">{small}</small><b className="text-lg leading-tight">{name}</b></span>
            </a>
          );
        })}
      </div>
      <p role="status" className="mt-5 text-xs text-blue-100">{note || "Store links are placeholders until the app is published."}</p>
    </>
  );
}
