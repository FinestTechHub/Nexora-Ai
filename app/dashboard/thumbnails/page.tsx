import type { Metadata } from "next";
import ImageStudio from "@/components/dashboard/ImageStudio";

export const metadata: Metadata = { title: "Thumbnail Maker" };
export default function Page() { return <ImageStudio mode="thumbnail" />; }
