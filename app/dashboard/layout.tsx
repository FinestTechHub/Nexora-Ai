import type { Metadata, Viewport } from "next";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { PointsProvider } from "@/lib/points/PointsContext";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false } };
export const viewport: Viewport = { themeColor: "#0a0a0c", viewportFit: "cover" };
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <PointsProvider><DashboardShell>{children}</DashboardShell></PointsProvider>;
}
