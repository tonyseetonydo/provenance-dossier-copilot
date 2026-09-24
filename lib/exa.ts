import Exa from "exa-js";
import type { SourceEvidence } from "./schema";
import { classifySource } from "./classify";
import type { EventSink } from "./events";

export const HIGHLIGHT_QUERY =
  "provenance ownership restitution exhibition auction catalogue dimensions medium title settlement";

let _client: Exa | null = null;
export function getExa(): Exa {
  if (!_client) {
    if (!process.env.EXA_API_KEY) {
      throw new Error("EXA_API_KEY is not set");
    }
    _client = new Exa(process.env.EXA_API_KEY);
  }
  return _client;
}

function normalizeUrl(u: string): string {
  try {
    const url = new URL(u);
    url.hash = "";
    [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_content",
      "utm_term",
      "fbclid",
      "gclid",
      "_amp",
    ].forEach((p) => url.searchParams.delete(p));
    let s = url.toString();
    if (s.endsWith("/")) s = s.slice(0, -1);
    return s;
  } catch {
    return u;
  }
}

type RawSearchResult = {
  title?: string | null;
  url: string;
  text?: string | null;
  highlights?: string[] | null;
  highlightScores?: number[] | null;
  score?: number | null;
};

type Accumulated = {
  url: string;
  title: string;
  highlights: string[];
  textSample: string;
  queryHits: string[];
  bestScore: number;
};

export type SourceWithText = SourceEvidence & {
  highlights: string[];
  textSample: string;
  queryHits: string[];
};

export async function retrieveSources({
  queries,
  topN = 8,
  onEvent,
}: {
  queries: string[];
  topN?: number;
  onEvent?: EventSink;
}): Promise<SourceWithText[]> {
  const exa = getExa();
  const byUrl = new Map<string, Accumulated>();
  let totalResultsSeen = 0;

  await Promise.all(
    queries.map(async (q) => {
      try {
        const res = await exa.search(q, {
          type: "auto",
          numResults: 6,
          contents: { highlights: true },
        });
        const results = (res.results || []) as RawSearchResult[];
        for (const r of results) {
          const url = normalizeUrl(r.url);
          if (!url) continue;
          const existing = byUrl.get(url);
          const highlights = (r.highlights || []).filter(Boolean) as string[];
          const score = typeof r.score === "number" ? r.score : 0;
          if (existing) {
            existing.queryHits.push(q);
            existing.highlights.push(...highlights);
            existing.bestScore = Math.max(existing.bestScore, score);
          } else {
            byUrl.set(url, {
              url,
              title: r.title || url,
              highlights,
              textSample: "",
              queryHits: [q],
              bestScore: score,
            });
          }
        }
        totalResultsSeen += results.length;
        onEvent?.({
          type: "query_result",
          query: q,
          resultCount: results.length,
        });
      } catch (e) {
        console.error(`Exa search failed for query: ${q}`, e);
        onEvent?.({ type: "query_result", query: q, resultCount: 0 });
      }
    })
  );

  onEvent?.({
    type: "dedup_done",
    totalResults: totalResultsSeen,
    uniqueUrls: byUrl.size,
  });

  const candidates = Array.from(byUrl.values())
    .map((c) => ({
      ...c,
      rank:
        c.queryHits.length * 2 +
        Math.min(c.highlights.length, 5) +
        c.bestScore,
    }))
    .sort((a, b) => b.rank - a.rank);

  const top = candidates.slice(0, topN);

  if (top.length > 0) {
    onEvent?.({ type: "content_fetching", urls: top.map((c) => c.url) });
  }

  try {
    if (top.length > 0) {
      const contentsRes = await exa.getContents(
        top.map((c) => c.url),
        {
          text: { maxCharacters: 4000 },
          highlights: { query: HIGHLIGHT_QUERY },
        }
      );
      const byUrlContents = new Map<string, RawSearchResult>();
      for (const r of (contentsRes.results || []) as RawSearchResult[]) {
        byUrlContents.set(normalizeUrl(r.url), r);
      }
      for (const c of top) {
        const got = byUrlContents.get(c.url);
        if (!got) continue;
        if (got.title) c.title = got.title;
        if (got.text) c.textSample = got.text;
        if (got.highlights && got.highlights.length > 0) {
          c.highlights = [...new Set([...c.highlights, ...got.highlights])];
        }
      }
    }
  } catch (e) {
    console.error("Exa getContents failed", e);
  }

  onEvent?.({ type: "content_done", sourcesLoaded: top.length });

  return top.map((c, i): SourceWithText => {
    const id = `S${i + 1}`;
    const sourceType = classifySource(c.url, c.title);
    const snippet =
      (c.highlights[0] ||
        c.textSample.slice(0, 400) ||
        "(no snippet available)")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 600);
    return {
      id,
      title: c.title,
      url: c.url,
      sourceType,
      snippet,
      relevance: `Matched ${c.queryHits.length} ${
        c.queryHits.length === 1 ? "query" : "queries"
      }; ${c.highlights.length} highlight${
        c.highlights.length === 1 ? "" : "s"
      }.`,
      highlights: c.highlights.slice(0, 8),
      textSample: c.textSample.slice(0, 4000),
      queryHits: c.queryHits,
    };
  });
}

export function toPublicSources(sources: SourceWithText[]): SourceEvidence[] {
  return sources.map(({ id, title, url, sourceType, snippet, relevance }) => ({
    id,
    title,
    url,
    sourceType,
    snippet,
    relevance,
  }));
}
