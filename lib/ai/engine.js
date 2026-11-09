// Nexora Ai: AI behaviour standard. Shared by the UI today and by the backend later.
export const WPS = 2.5; // spoken words per second (about 150 words per minute)

export const GLOBAL_RULES = [
  "Follow the exact request: topic, format, tone, language, length and quantity.",
  "Return exactly the quantity requested (5 items means exactly 5).",
  "Answer the actual request and never change its subject.",
  "No unrelated information, unsolicited introductions, conclusions, recommendations or promotional language.",
  "Ask one clarification question only when essential information is missing.",
  "Never invent facts, sources, statistics or claims.",
  "Prefer accuracy, relevance and clarity over length.",
  "Respect the selected platform’s conventions (YouTube, TikTok, Instagram).",
];

export const TOOL_RULES = {
  script: ["Write only the words to be spoken, ready to read aloud.", "Match the duration at about 2.5 spoken words per second.", "Follow the topic exactly and apply the selected audience, tone, content style and language.", "No headings, scene directions, labels or explanations unless the format asks for them."],
  ideas: ["Return exactly the number of ideas requested.", "Every idea must fit the given niche, platform and style.", "Ideas only: no introduction, conclusion or advice.", "Do not claim trends, numbers or results."],
  "youtube-seo": ["Return exactly the number of titles requested, each within 100 characters.", "Keep the main keyword natural and near the start of the title.", "Use only the given topic. No invented statistics or claims.", "The description and tags must relate directly to the topic."],
  voice: ["Speak the text exactly as written. Do not add, remove or rewrite words.", "Apply only the selected voice, language, tone and speed."],
  chat: ["Follow the user’s instructions exactly, including format, length, tone and language.", "Answer the actual question. No irrelevant explanations.", "Use earlier messages in the conversation to answer follow-up questions.", "If essential information is missing, ask one short clarification question.", "Never claim abilities you do not have, and never invent facts or sources."],
  image: ["Follow the prompt’s subject exactly and add no extra subjects.", "Respect the selected style, aspect ratio and number of images.", "Honour the negative prompt."],
  video: ["Follow the prompt’s scene exactly and add nothing unrelated.", "Respect the selected duration, aspect ratio, style and camera motion."],
  "image-to-video": ["Animate the uploaded image only as described. Do not change its subject.", "Respect the selected duration and motion strength."],
  thumbnails: ["Use the given title text exactly, with no extra words.", "Respect the selected style, text position and number of variations."],
};

// Qualitative conventions only. Verify each platform’s current limits before enforcing hard numbers.
export const PLATFORM_GUIDE = {
  YouTube: "Clear and search-friendly. Titles within 100 characters.",
  TikTok: "Vertical short-form. Open with the hook straight away. Conversational.",
  Instagram: "Vertical Reels or posts. Visual-first, with short captions.",
};

const BANNED = /^\s*(sure|certainly|of course|here is|here are|i hope)\b|in conclusion|hope this helps|don.t forget to (like|subscribe)/i;
const ASK = { script: "What should the script be about?", ideas: "Which niche or topic should the ideas cover?", "youtube-seo": "What is the video about?", voice: "What text should be spoken?" };

export function parseDuration(s) {
  const m = /(\d+(?:\.\d+)?)\s*(s|sec|m|min)/i.exec(s || "");
  if (!m) return null;
  return /^m/i.test(m[2]) ? parseFloat(m[1]) * 60 : parseFloat(m[1]);
}
export function countWords(s) { return ((s || "").trim().match(/\S+/g) || []).length; }

// Turns the UI selections into one strict, structured request (ready for a backend).
export function buildRequest(slug, text, v = {}) {
  const c = { options: { ...v } };
  const sec = parseDuration(v.Duration);
  if (sec) { c.durationSeconds = sec; if (slug === "script") c.targetWords = Math.round(sec * WPS); }
  const q = v.Ideas || v.Titles || v.Images || v.Variations;
  if (q) c.quantity = Number(q);
  if (v.Platform && PLATFORM_GUIDE[v.Platform]) c.platformGuide = PLATFORM_GUIDE[v.Platform];
  return { tool: slug, system: [...GLOBAL_RULES, ...(TOOL_RULES[slug] || [])].join("\n"), user: (text || "").trim(), constraints: c };
}

// Ask only when essential information is missing.
export function validateInput(slug, text) {
  if (/[a-z\u00C0-\u024F]/i.test(text || "")) return { ok: true };
  return { ok: false, clarify: ASK[slug] || "What would you like to create?" };
}

function demoScript(t, T, platform) {
  const hook = platform === "TikTok" || platform === "Instagram" ? `Stop scrolling: this is about ${t}.` : `In this video, we’re covering ${t}.`;
  const bank = ["Stay on topic.", "Keep it simple.", "That’s the point.", "Say it clearly and move on.", `Focus on what matters most about ${t}.`, `Everything here is about ${t}.`, "Take it one step at a time."];
  const out = [hook]; let n = countWords(hook), pool = [...bank];
  for (let g = 0; g < 400; g++) {
    const r = T - n; let fit = pool.filter((s) => countWords(s) <= r);
    if (!fit.length && pool.length < bank.length) { pool = [...bank]; fit = pool.filter((s) => countWords(s) <= r); }
    if (!fit.length) break;
    fit.sort((a, b) => countWords(b) - countWords(a));
    out.push(fit[0]); n += countWords(fit[0]); pool = pool.filter((x) => x !== fit[0]);
  }
  return out.join(" ");
}

// Template-based DEMO output. No AI is involved. Returns null for tools with their own preview.
export function demoOutput(slug, text, v = {}) {
  const t = (text || "").trim().slice(0, 60), T = t.replace(/\b\w/g, (c) => c.toUpperCase());
  const note = v.Language && v.Language !== "English" ? `Demo text is in English. The real output will be in ${v.Language}.` : "";
  if (slug === "script") return { kind: "script", note, text: demoScript(t, buildRequest(slug, text, v).constraints.targetWords || 75, v.Platform) };
  if (slug === "ideas") {
    const L = [`5 things every beginner should know about ${t}`, `The biggest mistakes people make with ${t}`, `${T}: what nobody tells you`, `I tried ${t} for 30 days, here’s what happened`, `${T} explained in 60 seconds`, `Top tools for ${t}`, `${T} myths, busted`, `Behind the scenes of my ${t} setup`, `Is ${t} worth it? An honest review`, `Beginner to pro: a ${t} roadmap`];
    return { kind: "list", note, items: L.slice(0, Math.min(Number(v.Ideas || 5), 10)) };
  }
  if (slug === "youtube-seo") {
    const L = [`${T}: The Complete Beginner’s Guide`, `How to Master ${T} (Step by Step)`, `${T} Explained Simply`, `Everything About ${T} in One Video`, `${T}: What You Need to Know`];
    const w = [...new Set(t.toLowerCase().split(/\W+/).filter((x) => x.length > 2))];
    return { kind: "seo", note, titles: L.slice(0, Math.min(Number(v.Titles || 3), 5)), description: `In this video: ${t}.`, tags: w.length ? w : [t.toLowerCase()] };
  }
  return null;
}

// Checks an output against the request. Works on demo output now and on real AI output later.
export function checkOutput(slug, o, req) {
  const k = [], q = req.constraints.quantity, all = [o.text, ...(o.items || []), ...(o.titles || []), o.description].filter(Boolean).join("\n");
  if (o.kind === "script") {
    const w = countWords(o.text), T = req.constraints.targetWords;
    k.push({ ok: Math.abs(w - T) <= T * 0.1, label: `${w} words (target about ${T} for ${req.constraints.options.Duration})` });
    k.push({ ok: !/^\s*(#|\[|\(|[A-Z][A-Z ]{2,}:)/m.test(o.text), label: "No headings or scene directions" });
  }
  if (o.kind === "list") k.push({ ok: o.items.length === q, label: `${o.items.length} of ${q} ideas` });
  if (o.kind === "seo") { k.push({ ok: o.titles.length === q, label: `${o.titles.length} of ${q} titles` }); k.push({ ok: o.titles.every((x) => x.length <= 100), label: "Every title is 100 characters or fewer" }); }
  k.push({ ok: !BANNED.test(all), label: "No unsolicited introduction, conclusion or promotion" });
  return k;
}

export const IMPROVE_RULES = ["Keep the original subject and meaning unchanged.", "Add only clarity, such as style, lighting or camera detail. Never add new subjects or facts.", "Voice text and thumbnail titles are only tidied (spacing and capital letters), never rewritten."];

// Demo "Improve" button: clarity only, no AI. The user’s own wording always comes first.
export function improvePrompt(slug, text, v = {}) {
  let t = (text || "").trim().replace(/\s+/g, " ").replace(/ +([,.!?;:])/g, "$1");
  t = t.charAt(0).toUpperCase() + t.slice(1);
  const lc = (x) => (x || "").toLowerCase(), add = [];
  if (slug === "image") { if (v.Style) add.push(`${lc(v.Style)} style`); add.push("detailed", "balanced composition", "soft natural lighting"); }
  else if (slug === "video") { if (v.Style) add.push(`${lc(v.Style)} style`); add.push(v["Camera motion"] && v["Camera motion"] !== "Static" ? `${lc(v["Camera motion"])} camera movement` : "steady camera", "consistent lighting"); }
  else if (slug === "image-to-video") add.push(`${lc(v["Motion style"] || "gentle")} motion`, "keep the original subject unchanged");
  else if (slug === "script" && v.Audience) add.push(`for ${lc(v.Audience)}`);
  else if (slug === "ideas" && v.Platform) add.push(`for ${v.Platform}`);
  if (!add.length) return t;
  return `${/[.!?]$/.test(t) ? t.slice(0, -1) : t}, ${add.join(", ")}`;
}
