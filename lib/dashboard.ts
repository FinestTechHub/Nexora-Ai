import { Clapperboard, CreditCard, Film, FolderOpen, Image as ImageIcon, LayoutDashboard, Lightbulb, LifeBuoy, MessageSquare, Mic, PenLine, SearchCheck, Settings, ShieldCheck, Video, type LucideIcon } from "lucide-react";

export type DashItem = { slug: string; name: string; desc: string; Icon: LucideIcon };
export const href = (i: DashItem) => (i.slug ? `/dashboard/${i.slug}` : "/dashboard");

export const OVERVIEW: DashItem = { slug: "", name: "Overview", desc: "Your creative command centre.", Icon: LayoutDashboard };
export const CHAT: DashItem = { slug: "chat", name: "Nexora AI Chat", desc: "Chat with Nexora AI and keep the context of your conversation.", Icon: MessageSquare };
export const TOOLS: DashItem[] = [
  { slug: "image", name: "AI Image Generator", desc: "Turn prompts into stunning, high-quality images.", Icon: ImageIcon },
  { slug: "video", name: "AI Video Generator", desc: "Create engaging video clips from text.", Icon: Video },
  { slug: "image-to-video", name: "Image-to-Video", desc: "Bring still images to life with motion.", Icon: Film },
  { slug: "voice", name: "AI Voice Generator", desc: "Produce realistic, expressive voiceovers.", Icon: Mic },
  { slug: "script", name: "AI Script Writer", desc: "Write structured, engaging video scripts.", Icon: PenLine },
  { slug: "youtube-seo", name: "YouTube SEO", desc: "Optimized titles, descriptions and tags.", Icon: SearchCheck },
  { slug: "thumbnails", name: "Thumbnail Generator", desc: "Design eye-catching, click-worthy thumbnails.", Icon: Clapperboard },
  { slug: "ideas", name: "Content Ideas", desc: "Fresh, trend-aware ideas for your channel.", Icon: Lightbulb },
];
export const ACCOUNT: DashItem[] = [
  { slug: "creations", name: "My Creations", desc: "All your generated images, videos and voices.", Icon: FolderOpen },
  { slug: "pricing", name: "Pricing & Points", desc: "Plans, point top-ups and billing.", Icon: CreditCard },
  { slug: "settings", name: "Settings", desc: "Profile, preferences and security.", Icon: Settings },
  { slug: "help", name: "Help & Support", desc: "Guides, FAQs and contacting our team.", Icon: LifeBuoy },
];
export const ADMIN: DashItem = { slug: "admin", name: "Admin", desc: "Users, usage and point controls.", Icon: ShieldCheck };
export const PAGES = [OVERVIEW, CHAT, ...TOOLS, ...ACCOUNT];
