import type { SourceEvidence } from "@/lib/schema";
import { SourceTypeBadge } from "./StatusBadge";

export function SourceTable({ sources }: { sources: SourceEvidence[] }) {
  if (sources.length === 0) {
    return (
      <p className="text-sm text-slate-500">No sources retrieved.</p>
    );
  }
  return (
    <ol className="space-y-3">
      {sources.map((s) => (
        <li
          key={s.id}
          id={`source-${s.id}`}
          className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-shadow scroll-mt-24"
        >
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="rounded bg-slate-900 px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wide text-slate-50">
              {s.id}
            </span>
            <SourceTypeBadge type={s.sourceType} />
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto truncate font-mono text-[11px] text-slate-500 hover:text-amber-700"
              title={s.url}
            >
              {new URL(s.url).hostname}
            </a>
          </div>
          <h3 className="mt-1.5 font-serif text-base font-semibold text-ink">
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              {s.title}
            </a>
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
            <span className="text-slate-400">“</span>
            {s.snippet}
            <span className="text-slate-400">”</span>
          </p>
          <p className="mt-1.5 text-xs text-slate-500">{s.relevance}</p>
        </li>
      ))}
    </ol>
  );
}
