"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { createPortal } from "react-dom";
import { 
  ChevronDown, 
  Sparkles, 
  Plus, 
  Send, 
  MessageSquare, 
  Image as ImageIcon, 
  Video, 
  FileText, 
  Check 
} from "lucide-react";

const MODES = [
  { 
    id: "chat", 
    label: "Chat", 
    icon: MessageSquare, 
    placeholder: "Ask Nexora or brainstorm an idea…",
    models: [
      { id: "flash", name: "Nexora Flash (Gemini 2.0)", cost: "1 pt", desc: "Fast & responsive" },
      { id: "pro", name: "Nexora Pro (Claude 3.5 Sonnet)", cost: "3 pts", desc: "Complex reasoning" },
    ]
  },
  { 
    id: "image", 
    label: "Image", 
    icon: ImageIcon, 
    placeholder: "Describe the image you want to create…",
    models: [
      { id: "flux-schnell", name: "Flux Schnell", cost: "5 pts", desc: "High quality 4K generations" },
      { id: "sdxl", name: "SDXL Lightning", cost: "3 pts", desc: "Fast photorealism" },
    ]
  },
  { 
    id: "video", 
    label: "Video", 
    icon: Video, 
    placeholder: "Describe the motion scene or video…",
    models: [
      { id: "kling", name: "Kling AI", cost: "20 pts", desc: "Cinematic movement" },
      { id: "luma", name: "Luma Dream Machine", cost: "25 pts", desc: "Smooth camera motion" },
    ]
  },
  { 
    id: "script", 
    label: "Script", 
    icon: FileText, 
    placeholder: "Describe the topic, tone, and duration…",
    models: [
      { id: "script-writer", name: "Nexora Script Pro", cost: "2 pts", desc: "Optimized for YouTube/TikTok" },
    ]
  },
] as const;

const CHIPS = [
  "Write a 30s TikTok hook",
  "Generate 4K cinematic wallpaper",
  "Give me 5 viral video ideas",
  "Explain APIs in simple terms",
];

export default function DashboardOverviewPage() {
  const [activeModeIndex, setActiveModeIndex] = useState(0);
  const [selectedModelId, setSelectedModelId] = useState("flash");
  const [prompt, setPrompt] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [isModeMenuOpen, setIsModeMenuOpen] = useState(false);
  const [portalTarget, setPortalTarget] = useState<Element | null>(null);

  const activeMode = MODES[activeModeIndex];
  const activeModel = activeMode.models.find((m) => m.id === selectedModelId) || activeMode.models[0];

  useEffect(() => {
    const el = document.getElementById("header-slot");
    if (el) setPortalTarget(el);
  }, []);

  function handleSelectMode(idx: number) {
    setActiveModeIndex(idx);
    setSelectedModelId(MODES[idx].models[0].id);
    setIsModeMenuOpen(false);
    setStatusMessage("");
  }

  function handleSend() {
    if (!prompt.trim()) {
      setStatusMessage("Please enter a prompt first.");
      return;
    }
    setStatusMessage(`Selected ${activeModel.name}. AI connection starting next...`);
  }

  const modelPickerDropdown = (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => {
          setIsModelMenuOpen(!isModelMenuOpen);
          setIsModeMenuOpen(false);
        }}
        className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/10 active:scale-95"
      >
        <span className="max-w-[140px] truncate sm:max-w-[200px]">{activeModel.name}</span>
        <ChevronDown size={14} className={`text-zinc-400 transition-transform ${isModelMenuOpen ? "rotate-180" : ""}`} />
      </button>

      {isModelMenuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsModelMenuOpen(false)} />
          <div className="absolute left-0 mt-2 z-50 w-64 rounded-2xl border border-zinc-800 bg-[#121216] p-1.5 shadow-2xl backdrop-blur-xl">
            <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
              {activeMode.label} Models
            </div>
            {activeMode.models.map((m) => {
              const selected = m.id === activeModel.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setSelectedModelId(m.id);
                    setIsModelMenuOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition ${
                    selected ? "bg-blue-600/20 text-blue-400" : "text-zinc-300 hover:bg-white/5"
                  }`}
                >
                  <div>
                    <div className="font-medium text-white">{m.name}</div>
                    <div className="text-[10px] text-zinc-400">{m.desc}</div>
                  </div>
                  <div className="flex items-center gap-1.5 ml-2">
                    <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-zinc-300">{m.cost}</span>
                    {selected && <Check size={14} className="text-blue-400" />}
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="flex h-full w-full flex-col justify-between overflow-hidden bg-transparent text-white antialiased">
      
      {/* Dynamic Header Slot: mounts to top navbar if header-slot exists */}
      {portalTarget ? createPortal(modelPickerDropdown, portalTarget) : (
        <div className="flex items-center px-4 py-2 sm:hidden">
          {modelPickerDropdown}
        </div>
      )}

      {/* Gemini Minimal Center Hero */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        <div className="relative mb-5 flex items-center justify-center">
          <div className="absolute -inset-4 rounded-full bg-blue-500/20 blur-2xl animate-pulse" />
          <Image 
            src="/logo.png" 
            alt="Nexora AI" 
            width={64} 
            height={64} 
            className="relative drop-shadow-[0_0_20px_rgba(59,130,246,0.5)]" 
            priority 
          />
        </div>

        <h1 className="text-2xl font-medium tracking-tight text-zinc-100 sm:text-3xl">
          What should we focus on?
        </h1>

        <div className="mt-5 flex max-w-md flex-wrap justify-center gap-2">
          {CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => {
                setPrompt(chip);
                setStatusMessage("");
              }}
              className="rounded-full border border-white/10 bg-zinc-950/60 px-3.5 py-1.5 text-xs text-zinc-300 transition-all hover:border-blue-500/40 hover:bg-white/5 active:scale-95"
            >
              {chip}
            </button>
          ))}
        </div>

        {statusMessage && (
          <p className="mt-4 text-xs font-medium text-blue-400">
            {statusMessage}
          </p>
        )}
      </div>

      {/* Gemini Floating Bottom Input Dock */}
      <div className="w-full max-w-2xl mx-auto px-4 pb-4 sm:pb-6">
        <div className="relative rounded-3xl border border-zinc-800/80 bg-zinc-900/90 p-2 shadow-2xl backdrop-blur-xl">
          
          <div className="absolute right-4 top-3 z-10 flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-zinc-400">
            <Sparkles size={10} className="text-blue-400" />
            <span>{activeModel.cost}</span>
          </div>

          <textarea
            rows={2}
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
              if (statusMessage) setStatusMessage("");
            }}
            placeholder={activeMode.placeholder}
            className="w-full resize-none bg-transparent px-3.5 pt-2 pb-1 text-sm text-white placeholder-zinc-500 focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />

          <div className="flex items-center justify-between border-t border-zinc-800/50 pt-2 px-1">
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsModeMenuOpen(!isModeMenuOpen);
                  setIsModelMenuOpen(false);
                }}
                className="flex items-center gap-1.5 rounded-full border border-zinc-800 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-white/10 transition"
              >
                <Plus size={14} className={`text-zinc-400 transition-transform ${isModeMenuOpen ? "rotate-45" : ""}`} />
                <span>{activeMode.label}</span>
              </button>

              {isModeMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsModeMenuOpen(false)} />
                  <div className="absolute bottom-11 left-0 z-50 w-44 rounded-2xl border border-zinc-800 bg-[#121216] p-1.5 shadow-2xl">
                    {MODES.map((m, idx) => {
                      const Icon = m.icon;
                      const isCurrent = idx === activeModeIndex;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => handleSelectMode(idx)}
                          className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium transition ${
                            isCurrent ? "bg-blue-600/20 text-blue-400" : "text-zinc-300 hover:bg-white/5"
                          }`}
                        >
                          <Icon size={14} />
                          <span>{m.label}</span>
                          {isCurrent && <Check size={12} className="ml-auto text-blue-400" />}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={handleSend}
              disabled={!prompt.trim()}
              aria-label="Send prompt"
              className={`flex h-9 w-9 items-center justify-center rounded-full transition-all active:scale-90 ${
                prompt.trim()
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30 hover:bg-blue-500"
                  : "bg-white/5 text-zinc-500 cursor-not-allowed"
              }`}
            >
              <Send size={15} />
            </button>
          </div>

        </div>
      </div>

    </div>
  );
                }
                
