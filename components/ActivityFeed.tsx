"use client";

import { useEffect, useRef } from "react";
import type { ProgressEvent } from "@/lib/events";

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function ActivityFeed({
  events,
  done,
}: {
  events: ProgressEvent[];
  done: boolean;
}) {
  const queriesBuilt = events.find((e) => e.type === "queries_built") as
    | (ProgressEvent & { type: "queries_built" })
    | undefined;
  const queryResults = events.filter((e) => e.type === "query_result") as Array<
    ProgressEvent & { type: "query_result" }
  >;
  const dedup = events.find((e) => e.type === "dedup_done") as
    | (ProgressEvent & { type: "dedup_done" })
    | undefined;
  const contentFetching = events.find((e) => e.type === "content_fetching") as
    | (ProgressEvent & { type: "content_fetching" })
    | undefined;
  const contentDone = events.find((e) => e.type === "content_done") as
    | (ProgressEvent & { type: "content_done" })
    | undefined;
  const llmStarted = events.find((e) => e.type === "llm_started") as
    | (ProgressEvent & { type: "llm_started" })
    | undefined;
  const llmDone = events.some((e) => e.type === "llm_done");
  const heuristic = events.find((e) => e.type === "heuristic_fallback") as
    | (ProgressEvent & { type: "heuristic_fallback" })
    | undefined;
  const errorEvent = events.find((e) => e.type === "error") as
    | (ProgressEvent & { type: "error" })
    | undefined;

  // Auto-scroll to bottom as new events arrive
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" });
  }, [events.length]);

  const queriesCompleted = queryResults.length;
  const queriesTotal = queriesBuilt?.queries.length ?? 0;

  return (
    <div
      ref={ref}
      className="max-h-[70vh] overflow-y-auto rounded-lg border border-slate-200 bg-white p-5 font-mono text-xs leading-relaxed text-slate-700 shadow-sm"
    >
      <Header done={done} hasError={!!errorEvent} />

      {errorEvent && (
        <Section state="error" label="Error">
          <p className="text-rose-700">{errorEvent.message}</p>
        </Section>
      )}

      <Section
        state={
          queriesBuilt
            ? queriesCompleted === queriesTotal
              ? "done"
              : "running"
            : "pending"
        }
        label="Build query plan"
      >
        {queriesBuilt ? (
          <ul className="space-y-0.5">
            {queriesBuilt.queries.map((q) => {
              const hit = queryResults.find((r) => r.query === q);
              return (
                <li key={q} className="flex items-baseline gap-2">
                  <span className="text-slate-400">{hit ? "✓" : "…"}</span>
                  <span className="flex-1 truncate text-slate-700">{q}</span>
                  <span className="shrink-0 text-slate-400">
                    {hit ? `${hit.resultCount} results` : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : null}
      </Section>

      <Section
        state={dedup ? "done" : queriesBuilt ? "running" : "pending"}
        label="Dedupe by URL"
      >
        {dedup && (
          <p>
            <Num>{dedup.totalResults}</Num> raw results →{" "}
            <Num>{dedup.uniqueUrls}</Num> unique URLs
          </p>
        )}
      </Section>

      <Section
        state={
          contentDone
            ? "done"
            : contentFetching
            ? "running"
            : "pending"
        }
        label="Pull text + highlights from top sources"
      >
        {contentFetching && (
          <ul className="space-y-0.5">
            {contentFetching.urls.map((u) => (
              <li key={u} className="flex items-baseline gap-2">
                <span className="text-slate-400">
                  {contentDone ? "✓" : "→"}
                </span>
                <span className="truncate text-slate-700">{hostOf(u)}</span>
              </li>
            ))}
          </ul>
        )}
        {contentDone && (
          <p className="mt-1 text-slate-500">
            <Num>{contentDone.sourcesLoaded}</Num> sources fully loaded
          </p>
        )}
      </Section>

      <Section
        state={
          llmDone ? "done" : llmStarted ? "running" : "pending"
        }
        label="Structure evidence into dossier"
      >
        {llmStarted && (
          <p>
            Sending <Num>{llmStarted.sourceCount}</Num> sources to{" "}
            <code className="rounded bg-slate-100 px-1">
              {llmStarted.model}
            </code>{" "}
            for structured extraction…
          </p>
        )}
        {heuristic && (
          <p className="mt-1 text-amber-800">
            {heuristic.reason} Source table will still render.
          </p>
        )}
      </Section>
    </div>
  );
}

function Header({ done, hasError }: { done: boolean; hasError: boolean }) {
  return (
    <div className="mb-3 flex items-center gap-2 border-b border-slate-100 pb-2">
      {hasError ? (
        <span className="inline-block size-2 rounded-full bg-rose-500" />
      ) : done ? (
        <span className="inline-block size-2 rounded-full bg-emerald-500" />
      ) : (
        <span className="relative inline-flex size-2">
          <span className="absolute inline-flex size-2 animate-ping rounded-full bg-amber-500 opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-amber-600" />
        </span>
      )}
      <span className="font-sans text-[11px] font-semibold uppercase tracking-widest text-slate-600">
        {hasError ? "Run failed" : done ? "Run complete" : "Running"}
      </span>
    </div>
  );
}

function Section({
  state,
  label,
  children,
}: {
  state: "pending" | "running" | "done" | "error";
  label: string;
  children?: React.ReactNode;
}) {
  const marker =
    state === "done" ? "✓" : state === "running" ? "▸" : state === "error" ? "✗" : "·";
  const labelColor =
    state === "pending"
      ? "text-slate-400"
      : state === "error"
      ? "text-rose-700"
      : "text-slate-800";
  return (
    <div className="mb-3">
      <div className={`flex items-center gap-2 ${labelColor}`}>
        <span className="font-mono text-sm">{marker}</span>
        <span className="font-sans text-[12px] font-semibold uppercase tracking-wide">
          {label}
        </span>
      </div>
      {children && <div className="ml-5 mt-1">{children}</div>}
    </div>
  );
}

function Num({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono font-semibold text-ink">{children}</span>
  );
}
