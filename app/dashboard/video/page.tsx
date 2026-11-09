import type { Metadata } from "next";
import VideoStudio from "@/components/dashboard/VideoStudio";

export const metadata: Metadata = { title: "AI Video Generator" };
export default function Page() { return <VideoStudio />; }
