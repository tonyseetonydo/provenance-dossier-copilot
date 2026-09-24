import { z } from "zod";
import { DossierRequestSchema } from "@/lib/schema";
import { retrieveSources, toPublicSources } from "@/lib/exa";
import { buildQueryGroups } from "@/lib/queries";
import {
  assembleDossier,
  heuristicDossier,
  llmExtract,
  validateCitations,
} from "@/lib/extract";
import type { ProgressEvent } from "@/lib/events";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const parsed = DossierRequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({
        error: "Invalid request.",
        details: z.flattenError(parsed.error),
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  if (!process.env.EXA_API_KEY) {
    return new Response(
      JSON.stringify({
        error:
          "EXA_API_KEY is not configured on the server. Set it in .env.local or in your deployment environment variables.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const { artwork, claimedProvenance, riskFocus } = parsed.data;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      const emit = (ev: ProgressEvent) => {
        controller.enqueue(encoder.encode(JSON.stringify(ev) + "\n"));
      };
      const fail = (message: string, statusReason?: string) => {
        emit({ type: "error", message });
        if (statusReason) console.error("dossier route error:", statusReason);
        controller.close();
      };

      try {
        const queries = buildQueryGroups({
          artwork,
          claimedProvenance,
          riskFocus,
        });
        emit({ type: "queries_built", queries });

        const rich = await retrieveSources({
          queries,
          topN: 8,
          onEvent: emit,
        });

        const publicSources = toPublicSources(rich);
        if (publicSources.length === 0) {
          return fail(
            "Exa returned no usable sources for these queries. Try adjusting artwork metadata or risk focus.",
            "no sources"
          );
        }

        const llmOut = await llmExtract({
          artwork,
          claimedProvenance,
          riskFocus,
          sources: rich,
          onEvent: emit,
        });

        let llm;
        if (llmOut) {
          llm = validateCitations(llmOut, publicSources);
        } else {
          emit({
            type: "heuristic_fallback",
            reason: process.env.OPENAI_API_KEY
              ? "LLM call failed; serving heuristic dossier."
              : "OPENAI_API_KEY not set; serving heuristic dossier.",
          });
          llm = heuristicDossier({
            artwork,
            claimedProvenance,
            sources: publicSources,
          });
        }

        const dossier = assembleDossier({
          artwork,
          llm,
          sources: publicSources,
        });

        emit({ type: "dossier", dossier });
        controller.close();
      } catch (e) {
        fail(
          e instanceof Error ? e.message : "Unexpected error.",
          e instanceof Error ? e.stack : String(e)
        );
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
