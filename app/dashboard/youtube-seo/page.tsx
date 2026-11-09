import type { Metadata } from "next";
import ToolStudio from "@/components/dashboard/ToolStudio";

export const metadata: Metadata = { title: "YouTube SEO" };
export default function Page() { return <ToolStudio slug="youtube-seo" />; }
