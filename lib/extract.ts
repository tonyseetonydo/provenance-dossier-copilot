import OpenAI from "openai";
import {
  type Artwork,
  type ClaimCheck,
  type Dossier,
  DossierSchema,
  type LlmDossier,
  LlmDossierSchema,
  type RiskFlag,
  type RiskFocus,
  type SourceEvidence,
  type TimelineEvent,
} from "./schema";
import type { SourceWithText } from "./exa";
import type { EventSink } from "./events";

// Enum allow-lists and safe fallbacks. If the LLM hallucinates a value
// outside these sets, coerce to the fallback rather than reject the whole
// dossier — a single bad enum should not blow up the response.
const RISK_LEVELS = ["low", "medium", "high"] as const;
const EVENT_TYPES = [
  "creation",
  "ownership",
  "exhibition",
  "auction",
  "legal_dispute",
  "settlement",
  "unknown_gap",
  "catalogue_reference",
] as const;
const CONFIDENCES = ["high", "medium", "low"] as const;
const CLAIM_STATUSES = [
  "supported",
  "partially_supported",
  "unsupported",
  "contradicted",
  "needs_review",
] as const;
const RISK_TYPES = [
  "nazi_era_gap",
  "title_dispute",
  "dimension_mismatch",
  "unverified_provenance",
  "legal_restitution_signal",
  "source_quality_issue",
  "auction_record_context",
  "none_found",
] as const;
const SEVERITIES = ["low", "medium", "high"] as const;

function coerce<T extends readonly string[]>(
  value: unknown,
  allowed: T,
  fallback: T[number]
): T[number] {
  if (typeof value === "string" && (allowed as readonly string[]).includes(value)) {
    return value as T[number];
  }
  return fallback;
}

function sanitizeLlmOutput(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const obj = raw as Record<string, unknown>;

  const summary = (obj.summary || {}) as Record<string, unknown>;
  obj.summary = {
    riskLevel: coerce(summary.riskLevel, RISK_LEVELS, "medium"),
    oneLineTakeaway: String(summary.oneLineTakeaway ?? ""),
    whyThisMatters: String(summary.whyThisMatters ?? ""),
  };

  obj.timeline = Array.isArray(obj.timeline)
    ? obj.timeline.map((evRaw) => {
        const ev = (evRaw || {}) as Record<string, unknown>;
        return {
          date: String(ev.date ?? "—"),
          eventType: coerce(ev.eventType, EVENT_TYPES, "ownership"),
          claim: String(ev.claim ?? ""),
          confidence: coerce(ev.confidence, CONFIDENCES, "low"),
          sourceIds: Array.isArray(ev.sourceIds)
            ? ev.sourceIds.filter((x): x is string => typeof x === "string")
            : [],
        };
      })
    : [];

  obj.claimChecks = Array.isArray(obj.claimChecks)
    ? obj.claimChecks.map((cRaw) => {
        const c = (cRaw || {}) as Record<string, unknown>;
        return {
          claim: String(c.claim ?? ""),
          status: coerce(c.status, CLAIM_STATUSES, "needs_review"),
          explanation: String(c.explanation ?? ""),
          sourceIds: Array.isArray(c.sourceIds)
            ? c.sourceIds.filter((x): x is string => typeof x === "string")
            : [],
        };
      })
    : [];

  obj.riskFlags = Array.isArray(obj.riskFlags)
    ? obj.riskFlags.map((fRaw) => {
        const f = (fRaw || {}) as Record<string, unknown>;
        return {
          type: coerce(f.type, RISK_TYPES, "unverified_provenance"),
          severity: coerce(f.severity, SEVERITIES, "medium"),
          description: String(f.description ?? ""),
          sourceIds: Array.isArray(f.sourceIds)
            ? f.sourceIds.filter((x): x is string => typeof x === "string")
            : [],
          nextAction: String(f.nextAction ?? ""),
        };
      })
    : [];

  obj.nextActions = Array.isArray(obj.nextActions)
    ? obj.nextActions
        .filter((x): x is string => typeof x === "string")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  return obj;
}

const SYSTEM_PROMPT = `You are assisting an auction-house provenance researcher.

Given artwork metadata, seller-provided claimed provenance, and retrieved web sources, produce a structured provenance diligence dossier.

Trust boundary:
- Do not authenticate the artwork.
- Do not determine legal title.
- Do not provide legal advice.
- Do not invent dates, owners, exhibitions, prices, or legal outcomes.

Evidence discipline:
- Every timeline event, claim check, and risk flag must cite at least one source ID from the provided sources list, unless it is explicitly marked as a gap.
- sourceIds MUST be strings like "S1", "S2", drawn ONLY from the provided sources list. Do not invent source IDs.
- If a seller claim is not supported by retrieved sources, mark it as "unsupported" or "needs_review".
- Preserve uncertainty. Use "needs_review" generously when evidence is thin.
- Prefer near-quotation from the source snippet over paraphrase.
- Highlight gaps, contradictions, title/medium/dimension mismatches, Nazi-era restitution signals, legal dispute signals, auction/comparable-sale context, and source-quality issues.

Output format:
- Output strictly valid JSON matching the schema given in the user message. No prose outside JSON.
- All enum-valued fields MUST be EXACTLY one of the listed values, with no additions, no synonyms, no plural forms, no extra adjectives. Do not invent new enum values.

Allowed enum values (use these strings verbatim):
- summary.riskLevel: "low" | "medium" | "high"
- timeline[].eventType: "creation" | "ownership" | "exhibition" | "auction" | "legal_dispute" | "settlement" | "unknown_gap" | "catalogue_reference"
- timeline[].confidence: "high" | "medium" | "low"
- claimChecks[].status: "supported" | "partially_supported" | "unsupported" | "contradicted" | "needs_review"
- riskFlags[].type: "nazi_era_gap" | "title_dispute" | "dimension_mismatch" | "unverified_provenance" | "legal_restitution_signal" | "source_quality_issue" | "auction_record_context" | "none_found"
- riskFlags[].severity: "low" | "medium" | "high"

Scoring guidance:
- riskLevel: "high" if Nazi-era / restitution / disputed-title signals present; "medium" if material gaps or weak sourcing; otherwise "low".
- For unknown_gap timeline events, sourceIds MAY be empty; for every other eventType, sourceIds MUST be non-empty.

Voice and framing:
- The dossier is a summary of what RETRIEVED SOURCES SAY, not what the app independently asserts.
- summary.oneLineTakeaway SHOULD begin with phrasings like "Retrieved sources indicate…", "Public-source evidence suggests…", "Auction and museum records describe…" — never with a bare assertion of fact.
- summary.whyThisMatters SHOULD frame the stakes in terms of what a specialist would do next, not in terms of historical narrative.
- Timeline event "claim" fields SHOULD read as near-quotations of source language wherever possible.`;

function buildUserPrompt({
  artwork,
  claimedProvenance,
  riskFocus,
  sources,
}: {
  artwork: Artwork;
  claimedProvenance: string;
  riskFocus: RiskFocus;
  sources: SourceWithText[];
}): string {
  const sourcesBlock = sources
    .map((s) => {
      const highlights = (s.highlights || []).slice(0, 4).join("\n  - ");
      const text = (s.textSample || "").slice(0, 1500);
      return `[${s.id}] (${s.sourceType}) ${s.title}
URL: ${s.url}
Highlights:
  - ${highlights || "(none)"}
Text excerpt:
${text}`;
    })
    .join("\n\n---\n\n");

  const schemaHint = `Return JSON with this exact shape:
{
  "summary": {
    "riskLevel": "low" | "medium" | "high",
    "oneLineTakeaway": string,
    "whyThisMatters": string
  },
  "timeline": [
    { "date": string, "eventType": "creation"|"ownership"|"exhibition"|"auction"|"legal_dispute"|"settlement"|"unknown_gap"|"catalogue_reference", "claim": string, "confidence": "high"|"medium"|"low", "sourceIds": string[] }
  ],
  "claimChecks": [
    { "claim": string, "status": "supported"|"partially_supported"|"unsupported"|"contradicted"|"needs_review", "explanation": string, "sourceIds": string[] }
  ],
  "riskFlags": [
    { "type": "nazi_era_gap"|"title_dispute"|"dimension_mismatch"|"unverified_provenance"|"legal_restitution_signal"|"source_quality_issue"|"auction_record_context"|"none_found", "severity": "low"|"medium"|"high", "description": string, "sourceIds": string[], "nextAction": string }
  ],
  "nextActions": string[]
}`;

  return `ARTWORK
artist: ${artwork.artist}
title: ${artwork.title}
year: ${artwork.year || "(not provided)"}
medium: ${artwork.medium || "(not provided)"}
dimensions: ${artwork.dimensions || "(not provided)"}

SELLER-CLAIMED PROVENANCE
${claimedProvenance || "(none provided)"}

RISK FOCUS: ${riskFocus}

RETRIEVED SOURCES
${sourcesBlock}

${schemaHint}

Produce the JSON dossier now.`;
}

export async function llmExtract({
  artwork,
  claimedProvenance,
  riskFocus,
  sources,
  onEvent,
}: {
  artwork: Artwork;
  claimedProvenance: string;
  riskFocus: RiskFocus;
  sources: SourceWithText[];
  onEvent?: EventSink;
}): Promise<LlmDossier | null> {
  if (!process.env.OPENAI_API_KEY) return null;
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.OPENAI_MODEL || "gpt-5.4-nano-2026-03-17";

  onEvent?.({
    type: "llm_started",
    sourceCount: sources.length,
    model,
  });

  try {
    const resp = await client.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      temperature: 0.2,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: buildUserPrompt({
            artwork,
            claimedProvenance,
            riskFocus,
            sources,
          }),
        },
      ],
    });
    const content = resp.choices[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content);
    const sanitized = sanitizeLlmOutput(parsed);
    const result = LlmDossierSchema.safeParse(sanitized);
    if (!result.success) {
      console.error(
        "LLM output failed schema validation:",
        JSON.stringify(result.error.issues, null, 2)
      );
      return null;
    }
    onEvent?.({ type: "llm_done" });
    return result.data;
  } catch (e) {
    console.error("LLM extraction failed:", e);
    return null;
  }
}

export function validateCitations(
  llm: LlmDossier,
  sources: SourceEvidence[]
): LlmDossier {
  const valid = new Set(sources.map((s) => s.id));

  const cleanIds = (ids: string[]) => ids.filter((id) => valid.has(id));

  const timeline: TimelineEvent[] = llm.timeline
    .map((ev) => ({ ...ev, sourceIds: cleanIds(ev.sourceIds) }))
    .filter((ev) => ev.eventType === "unknown_gap" || ev.sourceIds.length > 0);

  const claimChecks: ClaimCheck[] = llm.claimChecks.map((c) => {
    const cleaned = cleanIds(c.sourceIds);
    if (
      cleaned.length === 0 &&
      (c.status === "supported" ||
        c.status === "partially_supported" ||
        c.status === "contradicted")
    ) {
      return { ...c, sourceIds: cleaned, status: "needs_review" as const };
    }
    return { ...c, sourceIds: cleaned };
  });

  const riskFlags: RiskFlag[] = llm.riskFlags
    .map((f) => ({ ...f, sourceIds: cleanIds(f.sourceIds) }))
    .filter((f) => f.type === "none_found" || f.sourceIds.length > 0);

  return {
    ...llm,
    timeline,
    claimChecks,
    riskFlags,
  };
}

export function heuristicDossier({
  artwork,
  claimedProvenance,
  sources,
}: {
  artwork: Artwork;
  claimedProvenance: string;
  sources: SourceEvidence[];
}): LlmDossier {
  const claimedLines = claimedProvenance
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  return {
    summary: {
      riskLevel: "medium",
      oneLineTakeaway: `Retrieved ${sources.length} public source${
        sources.length === 1 ? "" : "s"
      } for ${artwork.artist}, ${artwork.title}. LLM extraction unavailable — see source table.`,
      whyThisMatters:
        "Without LLM extraction the app cannot synthesize a cited timeline from the retrieved sources. The source table below is real Exa retrieval; a specialist should review each source manually to verify claimed provenance.",
    },
    timeline: [
      {
        date: "—",
        eventType: "unknown_gap" as const,
        claim:
          "Automated timeline extraction unavailable in this run. See source snippets in the table below.",
        confidence: "low" as const,
        sourceIds: [],
      },
    ],
    claimChecks: claimedLines.map((claim) => ({
      claim,
      status: "needs_review" as const,
      explanation:
        "Heuristic mode: no LLM-based verification. Specialist should compare this claim against the source snippets below.",
      sourceIds: [],
    })),
    riskFlags: [
      {
        type: "source_quality_issue" as const,
        severity: "medium" as const,
        description:
          "Dossier produced without LLM extraction; cross-source synthesis was not performed.",
        sourceIds: sources.slice(0, 3).map((s) => s.id),
        nextAction:
          "Configure OPENAI_API_KEY for full structured extraction, or review the source table manually.",
      },
    ],
    nextActions: [
      "Review each retrieved source manually against the claimed provenance.",
      "Escalate any unverified ownership transfer to a provenance specialist.",
      "If the artwork's history spans 1933–1945 in Europe, consult restitution databases.",
    ],
  };
}

export function assembleDossier({
  artwork,
  llm,
  sources,
}: {
  artwork: Artwork;
  llm: LlmDossier;
  sources: SourceEvidence[];
}): Dossier {
  const dossier: Dossier = {
    artwork,
    summary: llm.summary,
    timeline: llm.timeline,
    claimChecks: llm.claimChecks,
    riskFlags: llm.riskFlags,
    nextActions: llm.nextActions,
    sources,
  };
  return DossierSchema.parse(dossier);
}
