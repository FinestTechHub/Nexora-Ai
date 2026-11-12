"use client";
import Link from "next/link";
import { fmtPts } from "@/lib/models";
import { usePoints } from "@/lib/points/PointsContext";

export default function PointsInfo({ cost, per }: { cost: number; per?: string }) {
  const { points, known } = usePoints();
  const low = cost > points;
  return (
    <div>
      <div className="flex items-center justify-between rounded-2xl bg-soft px-4 py-3 text-sm">
        <span className="text-muted">Cost{per ? ` ${per}` : ""}</span>
        <span><b>{fmtPts(cost)}</b>{known && <span className="text-muted"> · balance {fmtPts(points)}</span>}</span>
      </div>
      {low && <p role="alert" className="mt-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">Not enough points: this needs {fmtPts(cost)} and you have {fmtPts(points)}. <Link href="/dashboard/pricing" className="font-semibold underline">Top up points</Link></p>}
    </div>
  );
}
