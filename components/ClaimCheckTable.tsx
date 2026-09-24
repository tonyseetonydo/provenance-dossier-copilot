import type { ClaimCheck } from "@/lib/schema";
import { ClaimStatusBadge } from "./StatusBadge";
import { SourcePills } from "./SourcePill";

export function ClaimCheckTable({ checks }: { checks: ClaimCheck[] }) {
  if (checks.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No seller claims provided, or none could be verified against retrieved sources.
      </p>
    );
  }
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-3 py-2 font-medium">Seller claim</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Explanation</th>
            <th className="px-3 py-2 font-medium">Sources</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {checks.map((c, i) => (
            <tr key={i} className="align-top">
              <td className="px-3 py-2.5 font-medium text-ink">{c.claim}</td>
              <td className="px-3 py-2.5 whitespace-nowrap">
                <ClaimStatusBadge status={c.status} />
              </td>
              <td className="px-3 py-2.5 text-slate-700">{c.explanation}</td>
              <td className="px-3 py-2.5">
                <SourcePills ids={c.sourceIds} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
