import type { Dossier } from "./schema";

export type ProgressEvent =
  | { type: "queries_built"; queries: string[] }
  | { type: "query_result"; query: string; resultCount: number }
  | { type: "dedup_done"; totalResults: number; uniqueUrls: number }
  | { type: "content_fetching"; urls: string[] }
  | { type: "content_done"; sourcesLoaded: number }
  | { type: "llm_started"; sourceCount: number; model: string }
  | { type: "llm_done" }
  | { type: "heuristic_fallback"; reason: string }
  | { type: "dossier"; dossier: Dossier }
  | { type: "error"; message: string };

export type EventSink = (event: ProgressEvent) => void;
