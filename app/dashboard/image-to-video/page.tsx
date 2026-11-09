import type { Metadata } from "next";
import ToolStudio from "@/components/dashboard/ToolStudio";

export const metadata: Metadata = { title: "Image-to-Video" };
export default function Page() { return <ToolStudio slug="image-to-video" />; }
