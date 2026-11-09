import type { Metadata } from "next";
import ToolStudio from "@/components/dashboard/ToolStudio";

export const metadata: Metadata = { title: "AI Voice Generator" };
export default function Page() { return <ToolStudio slug="voice" />; }
