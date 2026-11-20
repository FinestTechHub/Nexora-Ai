import type { Metadata } from "next";
import Receipt from "@/components/dashboard/Receipt";

export const metadata: Metadata = { title: "Receipt", robots: { index: false } };

export default async function Page({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  return <Receipt reference={decodeURIComponent(reference)} />;
}
