// Shared by the browser and the server. Sizes are decimal megabytes.
export const FREE = { maxFile: 2_000_000, daily: 5_000_000 };
export const UPGRADED = { maxFile: 4_000_000, daily: 25_000_000 }; // 4 MB keeps the request under Vercel's 4.5 MB body limit
export const limitsFor = (upgraded: boolean) => (upgraded ? UPGRADED : FREE);
export const mb = (n: number) => `${n / 1_000_000} MB`;

export type Kind = "image" | "video" | "document";
export type Quota = { upgraded: boolean; maxFile: number; daily: number; used: number; resetsAt: string | null };

const MIME: Record<Kind, string[]> = {
  image: ["image/png", "image/jpeg", "image/webp", "image/heic", "image/heif"],
  video: ["video/mp4", "video/webm", "video/quicktime", "video/mpeg", "video/x-msvideo", "video/3gpp"],
  document: ["application/pdf", "text/plain", "text/markdown", "text/csv"],
};
export const ACCEPT: Record<Kind, string> = {
  image: "image/png,image/jpeg,image/webp,image/heic",
  video: "video/mp4,video/webm,video/quicktime",
  document: ".pdf,.txt,.md,.csv,application/pdf,text/plain,text/markdown,text/csv",
};
const EXT: Record<string, string> = { pdf: "application/pdf", txt: "text/plain", md: "text/markdown", csv: "text/csv", mov: "video/quicktime", mp4: "video/mp4", webm: "video/webm" };
export function mimeOf(name: string, type: string) { return type || EXT[name.split(".").pop()?.toLowerCase() ?? ""] || ""; }
export function kindOf(mime: string): Kind | null { for (const k of Object.keys(MIME) as Kind[]) if (MIME[k].includes(mime)) return k; return null; }
export function limitMessage(upgraded: boolean) {
  return upgraded
    ? `You’ve reached your daily upload limit (${mb(UPGRADED.daily)} / 24h) or ${mb(UPGRADED.maxFile)} file size limit. Please try again after your 24-hour reset.`
    : `You’ve reached your daily upload limit (${mb(FREE.daily)} / 24h) or ${mb(FREE.maxFile)} file size limit on the Free plan. Upgrade for larger files and higher daily limits, or try again after your 24-hour reset.`;
}
