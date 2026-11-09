import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PAGES } from "@/lib/dashboard";

const find = (slug: string) => PAGES.find((p) => p.slug && p.slug === slug);
type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;
export function generateStaticParams() { return PAGES.filter((p) => p.slug).map((p) => ({ slug: p.slug })); }
export async function generateMetadata({ params }: Props): Promise<Metadata> { const p = find((await params).slug); return { title: p?.name ?? "Dashboard" }; }

export default async function DashboardPage({ params }: Props) {
  const page = find((await params).slug);
  if (!page) notFound();
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/dashboard" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-brand"><ArrowLeft size={16} />Back to Overview</Link>
      <div className="card !p-8 hover:!translate-y-0">
        <div className="icon-box"><page.Icon size={24} /></div>
        <h1 className="text-3xl font-extrabold tracking-tight">{page.name}</h1>
        <p className="mt-2 text-muted">{page.desc}</p>
        <div className="mt-6 rounded-2xl border border-dashed border-brand/40 bg-soft p-5 text-sm">
          <b className="text-brand">Placeholder page.</b> This screen will be built in a later step, once the backend and AI services are connected. Nothing here generates content or takes payments yet.
        </div>
        <Link href="/dashboard" className="btn btn-p mt-6">Back to Overview</Link>
      </div>
    </div>
  );
}
