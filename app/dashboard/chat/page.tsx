import type { Metadata } from "next";
import ChatApp from "@/components/chat/ChatApp";

export const metadata: Metadata = { title: "Nexora AI Chat" };
export default function Page() { return <ChatApp />; }
