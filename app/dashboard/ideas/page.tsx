import type { Metadata } from "next";
import ToolStudio from "@/components/dashboard/ToolStudio";

export const metadata: Metadata = { title: "Content Ideas" };
export default function Page() { return <ToolStudio slug="ideas" />; }
