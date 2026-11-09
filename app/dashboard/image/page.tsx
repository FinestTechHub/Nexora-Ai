import type { Metadata } from "next";
import ImageStudio from "@/components/dashboard/ImageStudio";

export const metadata: Metadata = { title: "AI Image Generator" };
export default function Page() { return <ImageStudio />; }
