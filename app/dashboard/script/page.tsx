import type { Metadata } from "next";
import ToolStudio from "@/components/dashboard/ToolStudio";

export const metadata: Metadata = { title: "AI Script Writer" };
export default function Page() { return <ToolStudio slug="script" />; }
