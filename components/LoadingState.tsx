"use client";

import { useEffect, useState } from "react";

const PHASES = [
  "Building query plan…",
  "Searching auction archives and museum pages…",
  "Pulling text and highlights from top sources…",
  "Checking restitution / title-risk signals…",
  "Verifying citations and assembling dossier…",
];

export function LoadingState() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % PHASES.length), 2200);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="relative inline-flex size-2.5">
          <span className="absolute inline-flex size-2.5 animate-ping rounded-full bg-amber-500 opacity-75" />
          <span className="relative inline-flex size-2.5 rounded-full bg-amber-600" />
        </span>
        <span className="font-serif text-base text-ink">{PHASES[i]}</span>
      </div>
      <ul className="mt-4 space-y-1 text-xs text-slate-500">
        {PHASES.map((p, idx) => (
          <li
            key={p}
            className={
              idx < i
                ? "text-slate-400 line-through"
                : idx === i
                ? "text-ink"
                : "text-slate-300"
            }
          >
            {p}
          </li>
        ))}
      </ul>
    </div>
  );
}
