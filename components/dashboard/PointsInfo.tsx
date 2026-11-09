import Link from "next/link";
import { BALANCE, fmtPts } from "@/lib/models";

export default function PointsInfo({ cost, per }: { cost: number; per?: string }) {
  const low = cost > BALANCE;
  return (
    <div>
      <div className="flex items-center justify-between rounded-2xl bg-soft px-4 py-3 text-sm">
        <span className="text-muted">Cost{per ? ` ${per}` : ""}</span>
        <span><b>{fmtPts(cost)}</b><span className="text-muted"> · balance {fmtPts(BALANCE)}</span></span>
      </div>
      {low && <p role="alert" className="mt-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">Not enough points: this needs {fmtPts(cost)} and you have {fmtPts(BALANCE)}. <Link href="/dashboard/pricing" className="font-semibold underline">Top up points</Link></p>}
    </div>
  );
}
