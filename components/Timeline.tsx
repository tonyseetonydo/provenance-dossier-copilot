import type { TimelineEvent } from "@/lib/schema";
import { ConfidenceBadge, EventTypeBadge } from "./StatusBadge";
import { SourcePills } from "./SourcePill";

export function Timeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No timeline events extracted from retrieved sources.
      </p>
    );
  }
  return (
    <div>
      <p className="mb-3 text-[11px] uppercase tracking-wide text-slate-400">
        Each row shows{" "}
        <span className="font-semibold text-slate-500">date</span> ·{" "}
        <span className="font-semibold text-slate-500">event type</span> ·{" "}
        <span className="font-semibold text-slate-500">
          extraction confidence
        </span>
        . Source pills link to the underlying evidence.
      </p>
      <ol className="relative space-y-4 border-l border-slate-200 pl-5">
        {events.map((ev, i) => (
          <li key={i} className="relative">
            <span className="absolute -left-[26px] top-1.5 inline-block size-2.5 rounded-full bg-slate-900 ring-4 ring-canvas" />
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-serif text-sm font-semibold text-ink">
                {ev.date || "—"}
              </span>
              <EventTypeBadge type={ev.eventType} />
              <ConfidenceBadge confidence={ev.confidence} />
            </div>
            <p className="mt-1 text-sm leading-relaxed text-slate-700">
              {ev.claim}
            </p>
            <div className="mt-1.5">
              <SourcePills ids={ev.sourceIds} />
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
