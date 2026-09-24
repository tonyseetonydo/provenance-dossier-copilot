"use client";

import { useState } from "react";
import type { Dossier, DossierRequest } from "@/lib/schema";
import type { ProgressEvent } from "@/lib/events";
import { PRESETS, type Preset } from "@/lib/presets";
import { ArtworkForm } from "./ArtworkForm";
import { DossierView } from "./DossierView";
import { ActivityFeed } from "./ActivityFeed";

const DEFAULT_PRESET: Preset["id"] = "wally";

export function Workbench() {
  const initial = PRESETS.find((p) => p.id === DEFAULT_PRESET)!;
  const [presetId, setPresetId] = useState<Preset["id"]>(DEFAULT_PRESET);
  const [request, setRequest] = useState<DossierRequest>(initial.request);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<ProgressEvent[]>([]);
  const [dossier, setDossier] = useState<Dossier | null>(null);

  const handlePresetChange = (id: Preset["id"]) => {
    setPresetId(id);
    const p = PRESETS.find((x) => x.id === id);
    if (p) setRequest(p.request);
  };

  const handleRequestChange = (v: DossierRequest) => {
    setRequest(v);
    setPresetId("custom");
  };

  const run = async () => {
    setLoading(true);
    setError(null);
    setEvents([]);
    setDossier(null);

    try {
      const res = await fetch("/api/dossier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      // Non-streaming errors (4xx/5xx with JSON body) come back as plain JSON.
      if (!res.ok && !res.headers.get("content-type")?.includes("ndjson")) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || `Request failed with status ${res.status}.`);
        setLoading(false);
        return;
      }

      if (!res.body) {
        setError("No response body.");
        setLoading(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let nl: number;
        // eslint-disable-next-line no-cond-assign
        while ((nl = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (!line) continue;
          try {
            const ev = JSON.parse(line) as ProgressEvent;
            setEvents((prev) => [...prev, ev]);
            if (ev.type === "dossier") {
              setDossier(ev.dossier);
            }
            if (ev.type === "error") {
              setError(ev.message);
            }
          } catch (e) {
            console.warn("Failed to parse stream line:", line, e);
          }
        }
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Network error. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const showingFeed = loading || (events.length > 0 && !dossier);

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <header className="mb-8 border-b border-slate-200 pb-6">
        <p className="font-mono text-[11px] uppercase tracking-widest text-amber-800">
          Provenance Dossier Copilot
        </p>
        <h1 className="mt-1 font-serif text-3xl font-semibold text-ink">
          Trace the story. Inspect the evidence.
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
          A provenance research workbench for auction specialists and art
          advisors. Enter an artwork and its claimed history to gather public
          records, inspect a cited timeline, and identify questions for further
          research.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[360px_1fr]">
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <ArtworkForm
            value={request}
            presetId={presetId}
            onChange={handleRequestChange}
            onPresetChange={handlePresetChange}
            onSubmit={run}
            loading={loading}
          />
        </aside>

        <section className="space-y-6">
          {!loading && !dossier && !error && events.length === 0 && <EmptyState />}
          {showingFeed && <ActivityFeed events={events} done={!loading} />}
          {dossier && !loading && (
            <>
              <details className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm">
                <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-widest text-slate-500">
                  Run log · {events.length} events
                </summary>
                <div className="mt-3">
                  <ActivityFeed events={events} done={true} />
                </div>
              </details>
              <DossierView dossier={dossier} />
            </>
          )}
          {error && !loading && events.length === 0 && (
            <ErrorBox message={error} />
          )}
        </section>
      </div>

      <footer className="mt-16 border-t border-slate-200 pt-6 text-xs text-slate-500">
        Research support for human specialists. Check the original sources
        before relying on a dossier. This tool does not authenticate artworks,
        determine legal title, or provide legal advice.
      </footer>
    </main>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white/50 p-10 text-center">
      <p className="font-serif text-base text-ink">
        Choose a preset or enter artwork metadata to begin.
      </p>
      <p className="mt-2 text-sm text-slate-500">
        The app will search public sources, extract evidence, build a timeline,
        and flag gaps.
      </p>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 p-5 text-sm text-rose-900">
      <p className="font-semibold">Could not run dossier.</p>
      <p className="mt-1 leading-relaxed">{message}</p>
    </div>
  );
}
