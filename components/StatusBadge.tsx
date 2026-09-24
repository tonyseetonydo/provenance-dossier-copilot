import type { ClaimCheck, RiskFlag, TimelineEvent } from "@/lib/schema";

const CLAIM_COLORS: Record<ClaimCheck["status"], string> = {
  supported: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  partially_supported: "bg-amber-50 text-amber-900 ring-amber-200",
  needs_review: "bg-slate-100 text-slate-700 ring-slate-300",
  unsupported: "bg-rose-50 text-rose-800 ring-rose-200",
  contradicted: "bg-rose-100 text-rose-900 ring-rose-300",
};

const CLAIM_LABELS: Record<ClaimCheck["status"], string> = {
  supported: "Supported",
  partially_supported: "Partially supported",
  needs_review: "Needs review",
  unsupported: "Unsupported",
  contradicted: "Contradicted",
};

const SEVERITY_COLORS: Record<RiskFlag["severity"], string> = {
  high: "bg-rose-50 text-rose-800 ring-rose-200",
  medium: "bg-amber-50 text-amber-900 ring-amber-200",
  low: "bg-slate-50 text-slate-700 ring-slate-200",
};

const RISK_LEVEL_COLORS = {
  high: "bg-rose-50 text-rose-800 ring-rose-200",
  medium: "bg-amber-50 text-amber-900 ring-amber-200",
  low: "bg-emerald-50 text-emerald-800 ring-emerald-200",
} as const;

const CONFIDENCE_COLORS: Record<TimelineEvent["confidence"], string> = {
  high: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  medium: "bg-amber-50 text-amber-900 ring-amber-200",
  low: "bg-slate-100 text-slate-700 ring-slate-300",
};

function Pill({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ring-1 ring-inset ${className}`}
    >
      {children}
    </span>
  );
}

export function ClaimStatusBadge({ status }: { status: ClaimCheck["status"] }) {
  return <Pill className={CLAIM_COLORS[status]}>{CLAIM_LABELS[status]}</Pill>;
}

export function SeverityBadge({ severity }: { severity: RiskFlag["severity"] }) {
  return <Pill className={SEVERITY_COLORS[severity]}>{severity} severity</Pill>;
}

export function RiskLevelBadge({ level }: { level: "low" | "medium" | "high" }) {
  return <Pill className={RISK_LEVEL_COLORS[level]}>{level} risk</Pill>;
}

export function ConfidenceBadge({ confidence }: { confidence: TimelineEvent["confidence"] }) {
  return (
    <Pill className={CONFIDENCE_COLORS[confidence]}>
      <span className="opacity-60">extraction&nbsp;·&nbsp;</span>
      {confidence}
    </Pill>
  );
}

const SOURCE_TYPE_LABELS = {
  auction_lot: "Auction lot",
  museum_page: "Museum",
  government_pdf: "Gov / PDF",
  case_summary: "Case summary",
  news_article: "News",
  catalogue_pdf: "Catalogue",
  foundation_page: "Foundation",
  legal_article: "Legal",
  other: "Other",
} as const;

export function SourceTypeBadge({ type }: { type: keyof typeof SOURCE_TYPE_LABELS }) {
  return (
    <Pill className="bg-slate-100 text-slate-700 ring-slate-200">
      {SOURCE_TYPE_LABELS[type] || type}
    </Pill>
  );
}

const EVENT_TYPE_LABELS = {
  creation: "Creation",
  ownership: "Ownership",
  exhibition: "Exhibition",
  auction: "Auction",
  legal_dispute: "Legal dispute",
  settlement: "Settlement",
  unknown_gap: "Gap",
  catalogue_reference: "Catalogue",
} as const;

export function EventTypeBadge({ type }: { type: keyof typeof EVENT_TYPE_LABELS }) {
  const isGap = type === "unknown_gap";
  return (
    <Pill
      className={
        isGap
          ? "bg-slate-100 text-slate-600 ring-slate-300"
          : "bg-indigo-50 text-indigo-800 ring-indigo-200"
      }
    >
      {EVENT_TYPE_LABELS[type] || type}
    </Pill>
  );
}
