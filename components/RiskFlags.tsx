import type { RiskFlag } from "@/lib/schema";
import { SeverityBadge } from "./StatusBadge";
import { SourcePills } from "./SourcePill";

const TYPE_LABELS: Record<RiskFlag["type"], string> = {
  nazi_era_gap: "Nazi-era gap",
  title_dispute: "Title dispute",
  dimension_mismatch: "Dimension mismatch",
  unverified_provenance: "Unverified provenance",
  legal_restitution_signal: "Legal / restitution signal",
  source_quality_issue: "Source quality issue",
  auction_record_context: "Auction record context",
  none_found: "No flags found",
};

export function RiskFlags({ flags }: { flags: RiskFlag[] }) {
  if (flags.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No risk flags identified in retrieved sources.
      </p>
    );
  }

  const realFlags = flags.filter((f) => f.type !== "none_found");
  const cleared = flags.filter((f) => f.type === "none_found");

  return (
    <div>
      {realFlags.length > 0 ? (
        <ul className="space-y-3">
          {realFlags.map((f, i) => (
            <li
              key={i}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-serif text-sm font-semibold text-ink">
                  {TYPE_LABELS[f.type] || f.type}
                </span>
                <SeverityBadge severity={f.severity} />
                <div className="ml-auto">
                  <SourcePills ids={f.sourceIds} />
                </div>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
                {f.description}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">
                <span className="font-semibold uppercase tracking-wide text-[11px] text-slate-500">
                  Next action ·{" "}
                </span>
                {f.nextAction}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500">
          No risk flags identified in retrieved sources.
        </p>
      )}
      {cleared.length > 0 && (
        <p className="mt-3 text-[11px] leading-snug text-slate-400">
          Also checked for {cleared.length} other risk{" "}
          {cleared.length === 1 ? "category" : "categories"} — none found in
          retrieved sources.
        </p>
      )}
    </div>
  );
}
