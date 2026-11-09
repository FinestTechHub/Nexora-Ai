import type { Metadata } from "next";
import ToolStudio from "@/components/dashboard/ToolStudio";

export const metadata: Metadata = { title: "Thumbnail Generator" };
export default function Page() { return <ToolStudio slug="thumbnails" />; }
