import type { ReactNode } from "react";

// A small Markdown renderer (no extra packages): headings, **bold**, *italic*, `code`, code blocks, bullet and numbered lists, quotes and links.
const INLINE = String.raw`(\*\*[^*]+?\*\*|\*[^*\s](?:[^*]*?[^*\s])?\*|` + "`[^`]+`" + String.raw`|\[[^\]]+\]\(https?:\/\/[^)\s]+\))`;

function inline(s: string): ReactNode[] {
  const out: ReactNode[] = [], re = new RegExp(INLINE, "g");
  let last = 0, k = 0, m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push(s.slice(last, m.index));
    const t = m[0];
    if (t.startsWith("**")) out.push(<strong key={k++} className="font-semibold">{inline(t.slice(2, -2))}</strong>);
    else if (t.startsWith("`")) out.push(<code key={k++} className="rounded bg-white/10 px-1 py-0.5 text-[0.9em]">{t.slice(1, -1)}</code>);
    else if (t.startsWith("[")) { const l = /^\[([^\]]+)\]\((.+)\)$/.exec(t)!; out.push(<a key={k++} href={l[2]} target="_blank" rel="noopener noreferrer" className="text-brand underline">{l[1]}</a>); }
    else out.push(<em key={k++}>{inline(t.slice(1, -1))}</em>);
    last = m.index + t.length;
  }
  if (last < s.length) out.push(s.slice(last));
  return out;
}

const LIST = /^(\s*)([*+-]|\d+[.)])\s+(.*)$/;
const SPECIAL = (l: string) => /^```/.test(l.trim()) || /^#{1,6}\s/.test(l) || LIST.test(l) || /^>\s?/.test(l);

export function Markdown({ text, className = "" }: { text: string; className?: string }) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0, k = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (/^```/.test(line.trim())) {
      const code: string[] = []; i++;
      while (i < lines.length && !/^```/.test(lines[i].trim())) code.push(lines[i++]);
      i++;
      blocks.push(<pre key={k++} className="overflow-x-auto rounded-xl bg-black/40 p-3 text-[13px] leading-snug"><code>{code.join("\n")}</code></pre>);
      continue;
    }
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) { blocks.push(<p key={k++} className={`font-semibold ${h[1].length <= 2 ? "text-lg" : "text-base"}`}>{inline(h[2])}</p>); i++; continue; }
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) { blocks.push(<hr key={k++} className="border-white/10" />); i++; continue; }
    if (/^>\s?/.test(line)) {
      const q: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) q.push(lines[i++].replace(/^>\s?/, ""));
      blocks.push(<blockquote key={k++} className="border-l-2 border-brand/60 pl-3 text-muted">{inline(q.join(" "))}</blockquote>);
      continue;
    }
    if (LIST.test(line)) {
      const items: { level: number; text: string }[] = [], ordered = /^\d/.test(LIST.exec(line)![2]);
      while (i < lines.length) {
        const m = LIST.exec(lines[i]);
        if (m) items.push({ level: Math.min(3, Math.floor(m[1].length / 2)), text: m[3] });
        else if (lines[i].trim() && /^\s{2,}\S/.test(lines[i]) && items.length) items[items.length - 1].text += " " + lines[i].trim();
        else break;
        i++;
      }
      const Tag = ordered ? "ol" : "ul";
      blocks.push(<Tag key={k++} className={`space-y-1 pl-5 ${ordered ? "list-decimal" : "list-disc"}`}>{items.map((it, j) => <li key={j} style={{ marginLeft: it.level * 14 }}>{inline(it.text)}</li>)}</Tag>);
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !(para.length && SPECIAL(lines[i]))) para.push(lines[i++]);
    blocks.push(<p key={k++} className="whitespace-pre-line">{inline(para.join("\n"))}</p>);
  }
  return <div className={`space-y-2.5 break-words ${className}`}>{blocks}</div>;
}

/** Plain text version (no ** or * symbols) used for Copy, Share and card previews. */
export function stripMarkdown(t: string) {
  return t.replace(/```[a-z]*\n?/gi, "").replace(/^#{1,6}\s+/gm, "").replace(/^\s*[*+-]\s+/gm, "• ")
    .replace(/\*\*([^*]+?)\*\*/g, "$1").replace(/(^|[^*])\*([^*\s](?:[^*]*?[^*\s])?)\*/g, "$1$2")
    .replace(/`([^`]+)`/g, "$1").replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, "$1 ($2)").replace(/^>\s?/gm, "").trim();
}
