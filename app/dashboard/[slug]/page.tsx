import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ChatApp from "@/components/chat/ChatApp";

// Safety net: every dashboard page now has its own folder. This catch-all only makes sure
// /dashboard/chat always opens the real chat, even if app/dashboard/chat/page.tsx is ever missing.
type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;
export function generateStaticParams() { return [{ slug: "chat" }]; }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: (await params).slug === "chat" ? "Nexora AI Chat" : "Dashboard" };
}
export default async function Page({ params }: Props) {
  if ((await params).slug === "chat") return <ChatApp />;
  notFound();
}
