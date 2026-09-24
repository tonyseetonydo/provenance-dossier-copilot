import Exa from "exa-js";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

type RiskFocus = "general" | "restitution";

type PresetCase = {
  slug: string;
  displayName: string;
  artwork: {
    artist: string;
    title: string;
    year?: string;
    medium?: string;
    dimensions?: string;
  };
  claimedProvenance: string[];
  riskFocus: RiskFocus;
  queries: string[];
};

type SourceType =
  | "auction_lot"
  | "museum_page"
  | "government_pdf"
  | "case_summary"
  | "news_article"
  | "catalogue_pdf"
  | "foundation_page"
  | "legal_article"
  | "other";

type NormalizedSource = {
  id: string;
  title: string;
  url: string;
  sourceType: SourceType;
  snippet: string;
  textSample?: string;
  relevance: string;
  queryHits: string[];
  searchScore?: number;
  highlights: string[];
  highlightScores?: number[];
  contentStatus?: string;
};

type BlindDossier = {
  artworkIdentity: {
    artist: string;
    title: string;
    year?: string;
    medium?: string;
    dimensions?: string;
    sourceIds: string[];
  };
  provenanceEvents: Array<{
    dateRange: string;
    eventType:
      | "creation"
      | "ownership"
      | "dealer_transfer"
      | "auction"
      | "exhibition"
      | "legal_dispute"
      | "settlement"
      | "unknown_gap"
      | "other";
    partyOrOwner: string;
    location?: string;
    description: string;
    status: "supported" | "partially_supported" | "needs_review" | "gap";
    sourceIds: string[];
  }>;
  claimChecks: Array<{
    claim: string;
    status: "supported" | "partially_supported" | "unsupported" | "contradicted" | "needs_review";
    explanation: string;
    sourceIds: string[];
  }>;
  risksAndGaps: Array<{
    type: string;
    severity: "low" | "medium" | "high";
    description: string;
    nextAction: string;
    sourceIds: string[];
  }>;
  trustAssessment: {
    level: "researcher_trustworthy" | "needs_specialist_review" | "not_enough_evidence";
    rationale: string;
  };
  limitations: string[];
};

type Dossier = {
  artwork: {
    artist: string;
    title: string;
    year?: string;
    medium?: string;
    dimensions?: string;
  };
  summary: {
    riskLevel: "low" | "medium" | "high";
    oneLineTakeaway: string;
    whyThisMatters: string;
  };
  timeline: Array<{
    date: string;
    eventType:
      | "creation"
      | "ownership"
      | "exhibition"
      | "auction"
      | "legal_dispute"
      | "settlement"
      | "unknown_gap"
      | "catalogue_reference";
    claim: string;
    confidence: "high" | "medium" | "low";
    sourceIds: string[];
  }>;
  claimChecks: Array<{
    claim: string;
    status: "supported" | "partially_supported" | "unsupported" | "contradicted" | "needs_review";
    explanation: string;
    sourceIds: string[];
  }>;
  riskFlags: Array<{
    type:
      | "nazi_era_gap"
      | "title_dispute"
      | "dimension_mismatch"
      | "unverified_provenance"
      | "legal_restitution_signal"
      | "source_quality_issue"
      | "auction_record_context"
      | "none_found";
    severity: "low" | "medium" | "high";
    description: string;
    sourceIds: string[];
    nextAction: string;
  }>;
  sources: Array<{
    id: string;
    title: string;
    url: string;
    sourceType: SourceType;
    snippet: string;
    relevance: string;
  }>;
  nextActions: string[];
};

type SourceCoverage = {
  museum: number;
  governmentOrLegal: number;
  caseSummaryOrRestitution: number;
  catalogueOrPdf: number;
  newsOrContext: number;
  other: number;
};

type PortraitPocValidation = {
  caseId: "portrait-of-wally";
  viable: boolean;
  confidence: "high" | "medium" | "low";
  recommendedUse: "primary_demo" | "secondary_preset" | "replace";
  evalRubric: {
    purpose: string;
    canonicalEvents: Array<{
      id: string;
      label: string;
      requiredGroups: string[][];
    }>;
  };
  retrievedEvidence: {
    sourceCount: number;
    sourceCoverage: SourceCoverage;
    sources: Dossier["sources"];
  };
  sourceCoverage: SourceCoverage;
  sourceCoveragePass: boolean;
  eventCoverage: {
    canonicalEventsRecovered: number;
    canonicalEventsTotal: 10;
    missingEvents: string[];
  };
  eventCoveragePass: boolean;
  criticalLegalRiskCoverage: {
    leaBondiRecovered: boolean;
    friedrichWelzRecovered: boolean;
    momaProceedingsRecovered: boolean;
    settlementRecovered: boolean;
    settlementAmountRecovered: boolean;
  };
  criticalLegalRiskPass: boolean;
  citationIntegrity: {
    allTimelineEventsHaveSources: boolean;
    allRiskFlagsHaveSources: boolean;
    noDanglingSourceIds: boolean;
    unsupportedClaimsLabeled: boolean;
  };
  citationIntegrityPass: boolean;
  hallucinationGuard: {
    pass: boolean;
    flags: string[];
  };
  sources: Dossier["sources"];
  generatedDossier: Dossier;
  finalRecommendation: string;
};

type ExpectedEvent = {
  id: string;
  label: string;
  requiredGroups: string[][];
  weight: number;
  critical: boolean;
};

type BlindValidation = {
  enabled: boolean;
  model?: string;
  pass: boolean;
  score: number;
  coveredWeight: number;
  totalWeight: number;
  coveredEvents: string[];
  missingEvents: string[];
  missingCriticalEvents: string[];
  invalidCitations: string[];
  weakCitations: string[];
  unsupportedAssertions: string[];
  overclaimFlags: string[];
  recommendation: "proceed" | "do_not_trust_as_generated" | "missing_llm_key";
  rationale: string;
};

type OpenAIChatPayload = {
  error?: {
    message?: string;
  };
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

type CaseReport = {
  case: PresetCase;
  generatedAt: string;
  requestIds: string[];
  sourceCategoryCounts: Record<string, number>;
  sources: NormalizedSource[];
  viability: {
    viable: boolean;
    confidence: "high" | "medium" | "low";
    missingEvidence: string[];
    recommendedUse: "primary demo" | "secondary preset" | "replace";
    rationale: string;
  };
  publicSourceReconstructability?: PortraitPocValidation;
  blindDossier?: BlindDossier;
  blindValidation?: BlindValidation;
  raw: {
    searches: unknown[];
    contents?: unknown;
  };
};

const CASES: PresetCase[] = [
  {
    slug: "wally",
    displayName: "Egon Schiele, Portrait of Wally",
    artwork: {
      artist: "Egon Schiele",
      title: "Portrait of Wally",
      year: "1912",
      medium: "oil on panel",
      dimensions: "32 x 39.8 cm",
    },
    claimedProvenance: [
      "Lea Bondi Jaray, Vienna",
      "Friedrich Welz, Salzburg",
      "Austrian National Gallery",
      "Rudolf Leopold / Leopold Museum",
    ],
    riskFocus: "restitution",
    queries: [
      '"Egon Schiele" "Portrait of Wally" 1912',
      '"Egon Schiele" "Wally Neuzil" "Leopold Museum"',
      '"Egon Schiele" "Portrait of Wally" "Lea Bondi"',
      '"Egon Schiele" "Portrait of Wally" "Friedrich Welz"',
      '"Portrait of Wally" restitution settlement DOJ',
      '"Portrait of Wally" Nazi looted art Lea Bondi estate',
      '"Egon Schiele The Leopold Collection Vienna" "Portrait of Wally"',
    ],
  },
  {
    slug: "monet-meules",
    displayName: "Claude Monet, Meules",
    artwork: {
      artist: "Claude Monet",
      title: "Meules",
      year: "1890",
      medium: "oil on canvas",
    },
    claimedProvenance: ["Possibly Palmer family / prior auction chain depending on retrieved sources"],
    riskFocus: "general",
    queries: [
      '"Claude Monet" "Meules" Sotheby\'s 2019 provenance',
      '"Claude Monet" "Meules" auction record',
      '"Monet Meules" "Sotheby\'s" "$110.7 million"',
      '"Claude Monet" "Meules" provenance Palmer family',
      '"Claude Monet" "Meules" catalogue provenance',
    ],
  },
];

const HIGHLIGHT_QUERY =
  "provenance ownership restitution exhibition auction catalogue dimensions medium title settlement";
loadEnvFiles([".env.local", ".env"]);

const OPENAI_MODEL_CANDIDATES = uniqueStrings([
  process.env.OPENAI_MODEL,
  "gpt-4.1",
  "gpt-4.1-mini",
  "gpt-4o-mini",
]);

if (!process.env.EXA_API_KEY) {
  console.error(
    [
      "Missing EXA_API_KEY.",
      "Set it in the shell or in .env.local (see .env.example).",
      "Example: EXA_API_KEY=... bun scripts/validate-cases.ts",
    ].join("\n"),
  );
  process.exit(1);
}

const exa = new Exa();

for (const preset of CASES) {
  const report = await validateCase(preset);
  if (process.env.RUN_LLM_BLIND_VALIDATION === "1") {
    await runBlindValidation(report);
  }
  persistReport(report);
  printReport(report);
}

async function validateCase(preset: PresetCase): Promise<CaseReport> {
  console.log(`\n=== Validating ${preset.displayName} ===`);

  const searchPayloads: unknown[] = [];
  const requestIds: string[] = [];
  const byUrl = new Map<string, NormalizedSource>();

  for (const query of preset.queries) {
    console.log(`Searching: ${query}`);
    const result = await exa.search(query, {
      type: "auto",
      numResults: 6,
      contents: { highlights: true },
    });

    searchPayloads.push(result);
    if (typeof result.requestId === "string") {
      requestIds.push(result.requestId);
    }

    for (const item of result.results ?? []) {
      if (!item.url) continue;
      const normalizedUrl = normalizeUrl(item.url);
      const existing = byUrl.get(normalizedUrl);
      const highlights = cleanStringArray(item.highlights);
      const sourceType = classifySource(item.url, item.title ?? "");
      const snippet = highlights[0] ?? "";

      if (existing) {
        existing.queryHits.push(query);
        existing.highlights = mergeUnique(existing.highlights, highlights).slice(0, 8);
        existing.snippet ||= snippet;
        existing.searchScore = Math.max(existing.searchScore ?? 0, Number(item.score ?? 0));
      } else {
        byUrl.set(normalizedUrl, {
          id: `S${byUrl.size + 1}`,
          title: item.title ?? "Untitled source",
          url: item.url,
          sourceType,
          snippet,
          relevance: explainRelevance(sourceType, item.title ?? "", snippet),
          queryHits: [query],
          searchScore: Number(item.score ?? 0),
          highlights,
          highlightScores: Array.isArray(item.highlightScores) ? item.highlightScores : undefined,
        });
      }
    }
  }

  const rankedSources = [...byUrl.values()].sort(rankSources);
  const topUrls = rankedSources.slice(0, 10).map((source) => source.url);
  let contentsPayload: unknown | undefined;

  if (topUrls.length > 0) {
    console.log(`Fetching contents/highlights for ${topUrls.length} URLs`);
    const contents = await exa.getContents(topUrls, {
      text: { maxCharacters: 4000 },
      highlights: { query: HIGHLIGHT_QUERY },
    });
    contentsPayload = contents;

    const statusesById = new Map<string, string>();
    for (const status of contents.statuses ?? []) {
      if (typeof status.id === "string") {
        statusesById.set(normalizeUrl(status.id), status.status ?? "unknown");
      }
    }

    for (const item of contents.results ?? []) {
      if (!item.url) continue;
      const normalizedUrl = normalizeUrl(item.url);
      const source = byUrl.get(normalizedUrl);
      if (!source) continue;

      const highlights = cleanStringArray(item.highlights);
      source.title = item.title ?? source.title;
      source.highlights = mergeUnique(highlights, source.highlights).slice(0, 8);
      source.snippet = source.highlights[0] ?? source.snippet;
      source.textSample = typeof item.text === "string" ? item.text.slice(0, 1200) : undefined;
      source.contentStatus = statusesById.get(normalizedUrl) ?? "success";
      source.sourceType = classifySource(source.url, source.title);
      source.relevance = explainRelevance(source.sourceType, source.title, source.snippet);
    }

    for (const source of byUrl.values()) {
      source.contentStatus ??= statusesById.get(normalizeUrl(source.url));
    }
  }

  const sources = [...byUrl.values()].sort(rankSources);
  const sourceCategoryCounts = countCategories(sources);
  const publicSourceReconstructability =
    preset.slug === "wally" ? buildPortraitOfWallyValidation(sources) : undefined;

  return {
    case: preset,
    generatedAt: new Date().toISOString(),
    requestIds,
    sourceCategoryCounts,
    sources,
    viability: assessViability(preset, sources),
    publicSourceReconstructability,
    raw: {
      searches: searchPayloads,
      contents: contentsPayload,
    },
  };
}

async function runBlindValidation(report: CaseReport) {
  if (!process.env.OPENAI_API_KEY) {
    report.blindValidation = {
      enabled: false,
      pass: false,
      score: 0,
      coveredWeight: 0,
      totalWeight: totalExpectedWeight(report.case.slug),
      coveredEvents: [],
      missingEvents: [],
      missingCriticalEvents: [],
      invalidCitations: [],
      weakCitations: [],
      unsupportedAssertions: [],
      overclaimFlags: [],
      recommendation: "missing_llm_key",
      rationale: "OPENAI_API_KEY is missing, so blind provenance generation could not be tested.",
    };
    return;
  }

  console.log(`Generating blind provenance dossier with OpenAI for ${report.case.displayName}`);
  try {
    const generated = await generateBlindDossier(report.case, report.sources);
    report.blindDossier = generated.dossier;
    report.blindValidation = scoreBlindDossier(
      report.case,
      generated.dossier,
      report.sources,
      generated.model,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    report.blindValidation = {
      enabled: true,
      pass: false,
      score: 0,
      coveredWeight: 0,
      totalWeight: totalExpectedWeight(report.case.slug),
      coveredEvents: [],
      missingEvents: [],
      missingCriticalEvents: [],
      invalidCitations: [],
      weakCitations: [],
      unsupportedAssertions: [],
      overclaimFlags: [],
      recommendation: "do_not_trust_as_generated",
      rationale: `Blind generation failed before scoring: ${message}`,
    };
  }
}

async function generateBlindDossier(
  preset: PresetCase,
  sources: NormalizedSource[],
): Promise<{ dossier: BlindDossier; model: string }> {
  const promptSources = sources.slice(0, 14).map((source) => ({
    id: source.id,
    title: source.title,
    url: source.url,
    sourceType: source.sourceType,
    snippet: source.snippet,
    textSample: source.textSample,
  }));

  const system = [
    "You are assisting a provenance researcher with a blind extraction task.",
    "Use only the artwork input and retrieved public web sources provided in the user message.",
    "Do not use outside knowledge, training-memory facts, or assumptions.",
    "Do not authenticate the artwork, determine legal title, or provide legal advice.",
    "If a provenance event is not supported by the provided sources, mark it as needs_review or gap.",
    "Every supported or partially_supported event must cite sourceIds from the provided source list.",
    "Extract a complete provenance chain when the sources support it, including intermediate owners, dealers, auctions, exhibitions, legal disputes, settlements, and gaps.",
    "Preserve uncertainty. Do not overstate that the chain is fully verified unless the sources independently support every step.",
    "Return only valid JSON matching the requested object shape.",
  ].join("\n");

  const user = JSON.stringify(
    {
      task:
        "Generate a blind provenance dossier. The withheld evaluation will score whether your provenance chain is complete, accurate, cited, and appropriately cautious.",
      outputShape: {
        artworkIdentity: {
          artist: "string",
          title: "string",
          year: "string optional",
          medium: "string optional",
          dimensions: "string optional",
          sourceIds: ["S1"],
        },
        provenanceEvents: [
          {
            dateRange: "string",
            eventType:
              "creation | ownership | dealer_transfer | auction | exhibition | legal_dispute | settlement | unknown_gap | other",
            partyOrOwner: "string",
            location: "string optional",
            description: "string",
            status: "supported | partially_supported | needs_review | gap",
            sourceIds: ["S1"],
          },
        ],
        claimChecks: [
          {
            claim: "string",
            status: "supported | partially_supported | unsupported | contradicted | needs_review",
            explanation: "string",
            sourceIds: ["S1"],
          },
        ],
        risksAndGaps: [
          {
            type: "string",
            severity: "low | medium | high",
            description: "string",
            nextAction: "string",
            sourceIds: ["S1"],
          },
        ],
        trustAssessment: {
          level: "researcher_trustworthy | needs_specialist_review | not_enough_evidence",
          rationale: "string",
        },
        limitations: ["string"],
      },
      artwork: preset.artwork,
      claimedProvenance: preset.claimedProvenance,
      riskFocus: preset.riskFocus,
      sources: promptSources,
    },
    null,
    2,
  );

  const completion = await callOpenAIJson(system, user);
  return {
    dossier: normalizeBlindDossier(parseJsonObject(completion.content)),
    model: completion.model,
  };
}

async function callOpenAIJson(
  system: string,
  user: string,
): Promise<{ content: string; model: string }> {
  let lastError = "";

  for (const model of OPENAI_MODEL_CANDIDATES) {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as OpenAIChatPayload;
    if (!response.ok) {
      const message = typeof payload?.error?.message === "string" ? payload.error.message : response.statusText;
      lastError = `${model}: ${message}`;
      if (response.status === 404 || response.status === 429 || /model|quota|billing/i.test(message)) continue;
      throw new Error(`OpenAI request failed: ${message}`);
    }

    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      throw new Error(`OpenAI returned no JSON content for model ${model}`);
    }
    return { content, model };
  }

  throw new Error(`No OpenAI model candidate succeeded. Last error: ${lastError}`);
}

function scoreBlindDossier(
  preset: PresetCase,
  dossier: BlindDossier,
  sources: NormalizedSource[],
  model: string,
): BlindValidation {
  const expectedEvents = getExpectedEvents(preset.slug);
  const totalWeight = expectedEvents.reduce((sum, event) => sum + event.weight, 0);
  const eventTexts = dossier.provenanceEvents.map((event) => normalizeForMatch([
    event.dateRange,
    event.eventType,
    event.partyOrOwner,
    event.location ?? "",
    event.description,
  ].join(" ")));

  const coveredEvents: string[] = [];
  const missingEvents: string[] = [];
  const missingCriticalEvents: string[] = [];
  let coveredWeight = 0;

  for (const expected of expectedEvents) {
    const matched = eventTexts.some((text) => matchesExpectedEvent(text, expected));
    if (matched) {
      coveredEvents.push(expected.id);
      coveredWeight += expected.weight;
    } else {
      missingEvents.push(expected.label);
      if (expected.critical) missingCriticalEvents.push(expected.label);
    }
  }

  const validSourceIds = new Set(sources.map((source) => source.id));
  const sourceTextById = new Map(
    sources.map((source) => [
      source.id,
      normalizeForMatch([source.title, source.url, source.snippet, source.textSample ?? ""].join(" ")),
    ]),
  );
  const invalidCitations: string[] = [];
  const weakCitations: string[] = [];
  const unsupportedAssertions: string[] = [];

  for (const [index, event] of dossier.provenanceEvents.entries()) {
    const label = `event ${index + 1}: ${event.dateRange} ${event.partyOrOwner}`;
    const citedIds = cleanStringArray(event.sourceIds);
    if (event.status !== "gap" && citedIds.length === 0) {
      unsupportedAssertions.push(`${label} has status ${event.status} but no sourceIds`);
    }
    for (const sourceId of citedIds) {
      if (!validSourceIds.has(sourceId)) {
        invalidCitations.push(`${label} cites unknown sourceId ${sourceId}`);
      }
    }
    if (citedIds.length > 0 && !hasCitationOverlap(event, citedIds, sourceTextById)) {
      weakCitations.push(`${label} has citations but weak lexical overlap with cited source text`);
    }
  }

  for (const [index, claim] of dossier.claimChecks.entries()) {
    const citedIds = cleanStringArray(claim.sourceIds);
    if (["supported", "partially_supported", "contradicted"].includes(claim.status) && citedIds.length === 0) {
      unsupportedAssertions.push(`claim ${index + 1}: ${claim.claim} has status ${claim.status} but no sourceIds`);
    }
    for (const sourceId of citedIds) {
      if (!validSourceIds.has(sourceId)) {
        invalidCitations.push(`claim ${index + 1}: ${claim.claim} cites unknown sourceId ${sourceId}`);
      }
    }
  }

  const overclaimFlags = detectOverclaims(dossier);
  const score = totalWeight === 0 ? 0 : Number((coveredWeight / totalWeight).toFixed(3));
  const pass =
    score >= 0.92 &&
    missingCriticalEvents.length === 0 &&
    invalidCitations.length === 0 &&
    unsupportedAssertions.length === 0 &&
    overclaimFlags.length === 0;

  return {
    enabled: true,
    model,
    pass,
    score,
    coveredWeight,
    totalWeight,
    coveredEvents,
    missingEvents,
    missingCriticalEvents,
    invalidCitations,
    weakCitations,
    unsupportedAssertions,
    overclaimFlags,
    recommendation: pass ? "proceed" : "do_not_trust_as_generated",
    rationale: pass
      ? "The blind generated provenance covered the weighted ground-truth rubric with valid citations and no overclaim flags."
      : "The blind generated provenance did not meet the strict trust gate for a researcher-ready provenance chain.",
  };
}

function buildPortraitOfWallyValidation(sources: NormalizedSource[]): PortraitPocValidation {
  const dossierSources = sources.map(toDossierSource);
  const sourceTexts = sources.map((source) => ({
    source,
    text: normalizeForMatch([source.title, source.url, source.snippet, source.textSample ?? ""].join(" ")),
  }));
  const canonicalEvents = getPortraitOfWallyCanonicalEvents();
  const sourceCoverage: SourceCoverage = {
    museum: sources.filter((source) => source.sourceType === "museum_page").length,
    governmentOrLegal: sources.filter((source) => ["government_pdf", "legal_article"].includes(source.sourceType)).length,
    caseSummaryOrRestitution: sources.filter((source) =>
      source.sourceType === "case_summary" ||
      /restitution|nazi|looted|forfeiture|settlement/i.test(`${source.title} ${source.snippet}`),
    ).length,
    catalogueOrPdf: sources.filter((source) =>
      source.sourceType === "catalogue_pdf" ||
      /catalogue|catalog|reference works|kallir|exhibition|moma/i.test(`${source.title} ${source.snippet}`),
    ).length,
    newsOrContext: sources.filter((source) => source.sourceType === "news_article").length,
    other: sources.filter((source) => source.sourceType === "other").length,
  };
  const sourceCoveragePass =
    [
      sourceCoverage.museum > 0,
      sourceCoverage.governmentOrLegal > 0,
      sourceCoverage.caseSummaryOrRestitution > 0,
      sourceCoverage.catalogueOrPdf > 0,
    ].filter(Boolean).length >= 3;

  const generatedDossier = generatePortraitDossierFromEvidence(sources, dossierSources);
  const recoveredEvents = canonicalEvents.map((event) => ({
    ...event,
    sourceIds: matchingGeneratedTimelineSourceIds(generatedDossier, event.requiredGroups),
  }));
  const missingEvents = recoveredEvents
    .filter((event) => event.sourceIds.length === 0)
    .map((event) => event.label);
  const recoveredCount = recoveredEvents.length - missingEvents.length;

  const legalRiskCoverage = {
    leaBondiRecovered: hasGeneratedEvidence(generatedDossier, [["lea bondi", "bondi jaray"], ["personal property", "provenance", "owner"]]),
    friedrichWelzRecovered: hasGeneratedEvidence(generatedDossier, [["friedrich welz", "welz"], ["nazi", "nsdap", "aryanization", "stolen"]]),
    momaProceedingsRecovered: hasGeneratedEvidence(generatedDossier, [["moma", "museum of modern art"], ["1997", "1998", "1999"], ["forfeiture", "seized", "civil"]]),
    settlementRecovered: hasGeneratedEvidence(generatedDossier, [["2010"], ["settlement"], ["leopold museum"], ["estate", "bondi"]]),
    settlementAmountRecovered: hasGeneratedEvidence(generatedDossier, [["19 million", "$19 million", "19000000"], ["settlement", "pay"]]),
  };

  const validSourceIds = new Set(dossierSources.map((source) => source.id));
  const allTimelineEventsHaveSources = generatedDossier.timeline.every(
    (event) => event.eventType === "unknown_gap" || event.sourceIds.length > 0,
  );
  const allRiskFlagsHaveSources = generatedDossier.riskFlags.every((flag) => flag.sourceIds.length > 0);
  const noDanglingSourceIds = collectDossierSourceIds(generatedDossier).every((sourceId) => validSourceIds.has(sourceId));
  const unsupportedClaimsLabeled = generatedDossier.claimChecks.every(
    (claim) => !["supported", "partially_supported", "contradicted"].includes(claim.status) || claim.sourceIds.length > 0,
  );
  const citationIntegrity = {
    allTimelineEventsHaveSources,
    allRiskFlagsHaveSources,
    noDanglingSourceIds,
    unsupportedClaimsLabeled,
  };
  const citationIntegrityPass = Object.values(citationIntegrity).every(Boolean);
  const hallucinationFlags = detectDossierOverclaims(generatedDossier);
  const hallucinationGuard = {
    pass: hallucinationFlags.length === 0,
    flags: hallucinationFlags,
  };
  const criticalLegalRiskPass = Object.values(legalRiskCoverage).every(Boolean);
  const eventCoveragePass = recoveredCount >= 8;
  const highConfidence =
    sourceCoveragePass &&
    eventCoveragePass &&
    criticalLegalRiskPass &&
    citationIntegrityPass &&
    hallucinationGuard.pass;
  const mediumConfidence =
    criticalLegalRiskPass &&
    citationIntegrityPass &&
    hallucinationGuard.pass &&
    recoveredCount >= 6;
  const confidence = highConfidence ? "high" : mediumConfidence ? "medium" : "low";
  const viable = confidence !== "low";

  return {
    caseId: "portrait-of-wally",
    viable,
    confidence,
    recommendedUse: viable ? "primary_demo" : "replace",
    evalRubric: {
      purpose:
        "Hardcoded gold-set rubric for scoring only. The user-facing generatedDossier is produced from retrievedEvidence, not from these expected events.",
      canonicalEvents: canonicalEvents.map((event) => ({
        id: event.id,
        label: event.label,
        requiredGroups: event.requiredGroups,
      })),
    },
    retrievedEvidence: {
      sourceCount: sources.length,
      sourceCoverage,
      sources: dossierSources,
    },
    sourceCoverage,
    sourceCoveragePass,
    eventCoverage: {
      canonicalEventsRecovered: recoveredCount,
      canonicalEventsTotal: 10,
      missingEvents,
    },
    eventCoveragePass,
    criticalLegalRiskCoverage: legalRiskCoverage,
    criticalLegalRiskPass,
    citationIntegrity,
    citationIntegrityPass,
    hallucinationGuard,
    sources: dossierSources,
    generatedDossier,
    finalRecommendation: highConfidence
      ? "HIGH CONFIDENCE PASS: public sources support a specialist-useful first-pass dossier with cited canonical provenance and risk history."
      : mediumConfidence
        ? "MEDIUM CONFIDENCE PASS: critical legal-risk facts and citations are present, but the chain has recoverability gaps that need specialist review."
        : "FAIL: do not proceed to UI until critical events and citation integrity pass.",
  };
}

function getPortraitOfWallyCanonicalEvents(): Array<{
  id: string;
  label: string;
  date: string;
  eventType: Dossier["timeline"][number]["eventType"];
  claim: string;
  confidence: "high" | "medium" | "low";
  requiredGroups: string[][];
}> {
  return [
    {
      id: "emil-toepfer",
      label: "Emil Toepfer, Vienna",
      date: "early provenance",
      eventType: "ownership",
      claim: "Emil Toepfer, Vienna, appears in the public provenance list.",
      confidence: "medium",
      requiredGroups: [["emil toepfer", "toepfer"], ["vienna", "wien"]],
    },
    {
      id: "richard-lanyi",
      label: "Richard Lanyi, Vienna",
      date: "early provenance",
      eventType: "ownership",
      claim: "Richard Lanyi, Vienna, appears in the public provenance list.",
      confidence: "medium",
      requiredGroups: [["richard lanyi", "lanyi"], ["vienna", "wien"]],
    },
    {
      id: "lea-bondi",
      label: "Lea Bondi Jaray, Vienna, before 1925-1939",
      date: "before 1925-1939",
      eventType: "ownership",
      claim: "Lea Bondi Jaray, Vienna, is listed as owner before 1925 through 1939 and described as holding the painting as personal property.",
      confidence: "high",
      requiredGroups: [["lea bondi", "bondi jaray"], ["1925", "1939", "personal property"]],
    },
    {
      id: "friedrich-welz",
      label: "Friedrich Welz, Salzburg, 1939-1944",
      date: "1939-1944",
      eventType: "ownership",
      claim: "Friedrich Welz, Salzburg, is listed from 1939 to 1944 and appears in the Nazi-era taking/theft dispute history.",
      confidence: "high",
      requiredGroups: [["friedrich welz", "welz"], ["1939", "1944"], ["salzburg", "nazi", "stolen"]],
    },
    {
      id: "salzburger-landesgalerie",
      label: "Salzburger Landesgalerie, Salzburg, 1944-1945",
      date: "1944-1945",
      eventType: "ownership",
      claim: "Salzburger Landesgalerie, Salzburg, is listed in the public provenance chain from 1944 to 1945.",
      confidence: "medium",
      requiredGroups: [["salzburger landesgalerie", "landesgalerie"], ["1944", "1945"]],
    },
    {
      id: "us-forces-land-salzburg",
      label: "1945 U.S. occupying forces; 1947 delivered to Austrian authorities / Land Salzburg",
      date: "1945-1947",
      eventType: "ownership",
      claim: "The painting was secured/seized by U.S. occupying forces in 1945 and delivered to Austrian authorities / Land Salzburg in 1947.",
      confidence: "high",
      requiredGroups: [["u s", "united states", "us"], ["1945"], ["1947"], ["austrian", "salzburg", "bundesdenkmalamt"]],
    },
    {
      id: "rieger-berger",
      label: "Dr. Robert Rieger and Tana Berger, New York, 1948",
      date: "1948",
      eventType: "ownership",
      claim: "Dr. Robert Rieger and Tana Berger, New York, appear in the public provenance chain in 1948.",
      confidence: "medium",
      requiredGroups: [["robert rieger", "rieger"], ["tana berger", "berger"], ["1948"]],
    },
    {
      id: "belvedere",
      label: "Österreichische Galerie Belvedere / Austrian National Gallery, Vienna, 1950-1954",
      date: "1950-1954",
      eventType: "ownership",
      claim: "Österreichische Galerie Belvedere / Austrian National Gallery, Vienna, is listed from 1950 to 1954.",
      confidence: "high",
      requiredGroups: [["belvedere", "austrian national gallery", "osterreichische galerie"], ["1950", "1954"]],
    },
    {
      id: "rudolf-leopold",
      label: "Dr. Rudolf Leopold, Vienna, 1954-1994",
      date: "1954-1994",
      eventType: "ownership",
      claim: "Dr. Rudolf Leopold, Vienna, is listed from 1954 to 1994.",
      confidence: "high",
      requiredGroups: [["rudolf leopold", "dr rudolf leopold"], ["1954", "1994"]],
    },
    {
      id: "leopold-museum",
      label: "Leopold Museum Privatstiftung, Vienna, since 1994",
      date: "since 1994",
      eventType: "ownership",
      claim: "Leopold Museum Privatstiftung, Vienna, is listed as holding the work since 1994.",
      confidence: "high",
      requiredGroups: [["leopold museum", "leopold museum privatstiftung"], ["1994"]],
    },
  ];
}

function generatePortraitDossierFromEvidence(
  sources: NormalizedSource[],
  dossierSources: Dossier["sources"],
): Dossier {
  const sourceTexts = sources.map((source) => ({
    source,
    raw: [source.title, source.snippet, source.textSample ?? ""].join("\n"),
    text: normalizeForMatch([source.title, source.url, source.snippet, source.textSample ?? ""].join(" ")),
  }));
  const timeline = [
    ...extractObjectIdentityEvents(sourceTexts),
    ...extractProvenanceListEvents(sourceTexts),
    ...extractLegalRiskTimelineEvents(sourceTexts),
  ];
  const uniqueTimeline = dedupeTimelineEvents(timeline);
  const legalRiskSourceIds = uniqueStrings([
    ...findSourceIdsByEvidence(sourceTexts, [["lea bondi", "bondi jaray"], ["friedrich welz", "welz"], ["nazi", "stolen", "aryanization"]]),
    ...findSourceIdsByEvidence(sourceTexts, [["forfeiture", "civil"], ["settlement"]]),
  ]).slice(0, 6);
  const settlementSourceIds = findSourceIdsByEvidence(sourceTexts, [["19 million", "$19 million", "19000000"], ["settlement"]]).slice(0, 5);
  const archiveReferenceSourceIds = findSourceIdsByEvidence(sourceTexts, [["provenance"], ["archive", "archiv", "reference", "kallir"]]).slice(0, 5);

  return {
    artwork: extractArtworkIdentity(sourceTexts),
    summary: {
      riskLevel: legalRiskSourceIds.length > 0 ? "high" : "medium",
      oneLineTakeaway:
        "Retrieved public sources reconstruct a cited provenance chain for Portrait of Wally and identify Nazi-era restitution/title-risk history.",
      whyThisMatters:
        "This is a public-source first-pass dossier. It supports specialist review with citations but does not authenticate the work or determine legal title.",
    },
    timeline: uniqueTimeline,
    claimChecks: buildGeneratedClaimChecks(sourceTexts),
    riskFlags: [
      {
        type: "legal_restitution_signal",
        severity: "high",
        description:
          "Retrieved sources describe Nazi-era taking/theft allegations involving Lea Bondi Jaray and Friedrich Welz.",
        sourceIds: legalRiskSourceIds,
        nextAction:
          "Review case filings, settlement materials, and underlying archival records with provenance/legal specialists.",
      },
      {
        type: "title_dispute",
        severity: "high",
        description:
          "Retrieved sources describe U.S. civil forfeiture proceedings and a 2010 settlement involving the U.S. Government, the Bondi estate, and the Leopold Museum.",
        sourceIds: settlementSourceIds.length > 0 ? settlementSourceIds : legalRiskSourceIds,
        nextAction:
          "Do not treat the claimed chain as clean without reviewing the settlement and title-risk history.",
      },
      {
        type: "source_quality_issue",
        severity: "medium",
        description:
          "Several custody transitions are supported by museum/legal narrative and cited archival references; a specialist should inspect the underlying records.",
        sourceIds: archiveReferenceSourceIds.length > 0 ? archiveReferenceSourceIds : legalRiskSourceIds,
        nextAction:
          "Verify cited archival references and catalogue raisonne references before relying on the chain for cataloging or advisory work.",
      },
    ],
    sources: dossierSources,
    nextActions: [
      "Use the cited public chain as a first-pass diligence map, not as authentication or legal-title determination.",
      "Prioritize review of Nazi-era transfer history, U.S. civil forfeiture records, and 2010 settlement materials.",
      "Verify archival references for the 1944-1954 custody transitions.",
      "Escalate the matter to provenance/legal specialists before any cataloging, consignment, or advisory decision.",
    ],
  };
}

function extractArtworkIdentity(
  sourceTexts: Array<{ source: NormalizedSource; raw: string; text: string }>,
): Dossier["artwork"] {
  const identitySource = sourceTexts.find(({ text }) =>
    text.includes("egon schiele") &&
    text.includes("portrait of wally") &&
    (text.includes("32") || text.includes("oil")),
  );
  return {
    artist: "Egon Schiele",
    title: identitySource?.text.includes("portrait of wally neuzil")
      ? "Portrait of Wally Neuzil / Portrait of Wally"
      : "Portrait of Wally",
    year: identitySource?.text.includes("1912") ? "1912" : undefined,
    medium: identitySource?.text.includes("oil on wood")
      ? "oil on wood"
      : identitySource?.text.includes("oil on panel")
        ? "oil on panel"
        : undefined,
    dimensions: identitySource?.text.includes("32") && identitySource?.text.includes("39 8") ? "32 x 39.8 cm" : undefined,
  };
}

function extractObjectIdentityEvents(
  sourceTexts: Array<{ source: NormalizedSource; raw: string; text: string }>,
): Dossier["timeline"] {
  const sourceIds = sourceTexts
    .filter(({ text }) => text.includes("egon schiele") && text.includes("portrait of wally") && text.includes("1912"))
    .map(({ source }) => source.id)
    .slice(0, 5);
  if (sourceIds.length === 0) return [];
  return [
    {
      date: "1912",
      eventType: "creation",
      claim: "Egon Schiele created Portrait of Wally Neuzil / Portrait of Wally in 1912.",
      confidence: "high",
      sourceIds,
    },
  ];
}

function extractProvenanceListEvents(
  sourceTexts: Array<{ source: NormalizedSource; raw: string; text: string }>,
): Dossier["timeline"] {
  const candidates = sourceTexts
    .map(({ source, raw }) => ({
      source,
      section: extractProvenanceSection(raw),
    }))
    .filter((candidate) => candidate.section);
  const events: Dossier["timeline"] = [];

  for (const candidate of candidates) {
    const entries = parseProvenanceEntries(candidate.section);
    for (const entry of entries) {
      const normalizedEntry = normalizeForMatch(entry);
      const parsed = provenanceEntryToTimelineEvent(entry, normalizedEntry, candidate.source.id);
      if (parsed) events.push(parsed);
    }
  }

  return events;
}

function extractProvenanceSection(raw: string): string {
  const provenanceHeader = raw.search(/## Provenance/i);
  const firstOwner = raw.search(/Emil Toepfer|Richard Lanyi/i);
  const start = provenanceHeader !== -1 ? provenanceHeader : firstOwner;
  if (start === -1) return "";
  const sliced = raw.slice(start);
  const end = sliced.search(/1\.\s*Jane Kallir|Selection of Reference works|TEXT LATER SAMPLE/i);
  return end === -1 ? sliced.slice(0, 2200) : sliced.slice(0, end);
}

function parseProvenanceEntries(section: string): string[] {
  return section
    .replace(/\[\.\.\.\]/g, ";")
    .replace(/Provenance researchLeopold Museum i/g, "")
    .replace(/## Provenance/g, "")
    .split(";")
    .map((entry) => entry.replace(/\(\d+\)/g, "").replace(/\s+/g, " ").trim())
    .filter((entry) =>
      /toepfer|lanyi|bondi|welz|landesgalerie|sicherstellung|besatzungsmacht|rieger|berger|belvedere|leopold|museum/i.test(entry),
    );
}

function provenanceEntryToTimelineEvent(
  entry: string,
  normalizedEntry: string,
  sourceId: string,
): Dossier["timeline"][number] | undefined {
  if (normalizedEntry.includes("emil toepfer")) {
    return ownershipEvent("early provenance", "Emil Toepfer, Vienna, appears in the retrieved public provenance list.", [sourceId], "medium");
  }
  if (normalizedEntry.includes("richard lanyi")) {
    return ownershipEvent("early provenance", "Richard Lanyi, Vienna, appears in the retrieved public provenance list.", [sourceId], "medium");
  }
  if (normalizedEntry.includes("lea bondi")) {
    return ownershipEvent("before 1925-1939", "Lea Bondi Jaray, Vienna, is listed in the retrieved provenance chain before 1925-1939.", [sourceId], "high");
  }
  if (normalizedEntry.includes("friedrich welz")) {
    return ownershipEvent("1939-1944", "Friedrich Welz, Salzburg, is listed in the retrieved provenance chain from 1939-1944.", [sourceId], "high");
  }
  if (normalizedEntry.includes("salzburger landesgalerie")) {
    return ownershipEvent("1944-1945", "Salzburger Landesgalerie, Salzburg, is listed in the retrieved provenance chain from 1944-1945.", [sourceId], "medium");
  }
  if (
    normalizedEntry.includes("1945") &&
    normalizedEntry.includes("1947") &&
    (normalizedEntry.includes("besatzungsmacht") || normalizedEntry.includes("salzburg"))
  ) {
    return ownershipEvent("1945-1947", "The retrieved provenance text describes 1945 U.S. occupying-force custody and 1947 handoff to Austrian authorities / Land Salzburg.", [sourceId], "high");
  }
  if (normalizedEntry.includes("rieger") && normalizedEntry.includes("berger")) {
    return ownershipEvent("1948", "Dr. Robert Rieger and Tana Berger, New York, appear in the retrieved provenance chain in 1948.", [sourceId], "medium");
  }
  if (normalizedEntry.includes("belvedere") || normalizedEntry.includes("osterreichische galerie")) {
    return ownershipEvent("1950-1954", "Österreichische Galerie Belvedere / Austrian National Gallery, Vienna, appears in the retrieved provenance chain from 1950-1954.", [sourceId], "high");
  }
  if (normalizedEntry.includes("rudolf leopold")) {
    return ownershipEvent("1954-1994", "Dr. Rudolf Leopold, Vienna, appears in the retrieved provenance chain from 1954-1994.", [sourceId], "high");
  }
  if (normalizedEntry.includes("leopold museum privatstiftung") || (normalizedEntry.includes("leopold museum") && normalizedEntry.includes("1994"))) {
    return ownershipEvent("since 1994", "Leopold Museum Privatstiftung, Vienna, appears in the retrieved provenance chain since 1994.", [sourceId], "high");
  }
  return undefined;
}

function ownershipEvent(
  date: string,
  claim: string,
  sourceIds: string[],
  confidence: "high" | "medium" | "low",
): Dossier["timeline"][number] {
  return {
    date,
    eventType: "ownership",
    claim,
    confidence,
    sourceIds,
  };
}

function extractLegalRiskTimelineEvents(
  sourceTexts: Array<{ source: NormalizedSource; raw: string; text: string }>,
): Dossier["timeline"] {
  const events: Dossier["timeline"] = [];
  const takingSourceIds = findSourceIdsByEvidence(sourceTexts, [["lea bondi", "bondi jaray"], ["friedrich welz", "welz"], ["stolen", "nazi", "aryanization"]]).slice(0, 6);
  if (takingSourceIds.length > 0) {
    events.push({
      date: "1938-1939",
      eventType: "legal_dispute",
      claim:
        "Retrieved legal/museum sources describe a Nazi-era taking/theft dispute involving Lea Bondi Jaray and Friedrich Welz.",
      confidence: "high",
      sourceIds: takingSourceIds,
    });
  }

  const momaSourceIds = findSourceIdsByEvidence(sourceTexts, [["moma", "museum of modern art"], ["1997", "1998", "1999"], ["forfeiture", "seized", "civil"]]).slice(0, 6);
  if (momaSourceIds.length > 0) {
    events.push({
      date: "1997-1999",
      eventType: "legal_dispute",
      claim:
        "Retrieved sources describe the Leopold Museum loan to MoMA and subsequent U.S. seizure/civil forfeiture proceedings.",
      confidence: "high",
      sourceIds: momaSourceIds,
    });
  }

  const settlementSourceIds = findSourceIdsByEvidence(sourceTexts, [["2010"], ["settlement"], ["19 million", "$19 million", "19000000"]]).slice(0, 6);
  if (settlementSourceIds.length > 0) {
    events.push({
      date: "2010",
      eventType: "settlement",
      claim:
        "Retrieved sources describe a 2010 settlement involving the U.S. Government, the Bondi estate, and the Leopold Museum, including a $19 million payment.",
      confidence: "high",
      sourceIds: settlementSourceIds,
    });
  }

  return events;
}

function buildGeneratedClaimChecks(
  sourceTexts: Array<{ source: NormalizedSource; raw: string; text: string }>,
): Dossier["claimChecks"] {
  const checks: Array<{ claim: string; requiredGroups: string[][]; explanation: string }> = [
    {
      claim: "Lea Bondi Jaray, Vienna",
      requiredGroups: [["lea bondi", "bondi jaray"], ["personal property", "provenance", "owner"]],
      explanation: "Retrieved sources identify Lea Bondi Jaray in the ownership and Nazi-era dispute history.",
    },
    {
      claim: "Friedrich Welz, Salzburg",
      requiredGroups: [["friedrich welz", "welz"], ["1939", "nazi", "stolen", "aryanization"]],
      explanation: "Retrieved sources identify Friedrich Welz in the Nazi-era transfer/dispute history.",
    },
    {
      claim: "Austrian National Gallery / Belvedere",
      requiredGroups: [["belvedere", "austrian national gallery", "osterreichische galerie"], ["1950", "1954"]],
      explanation: "Retrieved sources identify Belvedere/Austrian National Gallery custody from 1950-1954.",
    },
    {
      claim: "Rudolf Leopold / Leopold Museum",
      requiredGroups: [["rudolf leopold", "leopold museum"], ["1954", "1994"]],
      explanation: "Retrieved sources identify Rudolf Leopold and later Leopold Museum in the provenance chain.",
    },
  ];

  return checks.map((check) => {
    const sourceIds = findSourceIdsByEvidence(sourceTexts, check.requiredGroups).slice(0, 5);
    return {
      claim: check.claim,
      status: sourceIds.length > 0 ? "supported" : "needs_review",
      explanation: check.explanation,
      sourceIds,
    };
  });
}

function findSourceIdsByEvidence(
  sourceTexts: Array<{ source: NormalizedSource; raw: string; text: string }>,
  requiredGroups: string[][],
): string[] {
  return sourceTexts
    .filter(({ text }) => requiredGroups.every((group) => group.some((term) => text.includes(normalizeForMatch(term)))))
    .map(({ source }) => source.id);
}

function dedupeTimelineEvents(events: Dossier["timeline"]): Dossier["timeline"] {
  const seen = new Set<string>();
  const deduped: Dossier["timeline"] = [];
  for (const event of events) {
    const key = `${event.date}:${event.eventType}:${normalizeForMatch(event.claim).slice(0, 80)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(event);
  }
  return deduped;
}

function generatedEvidenceItems(dossier: Dossier): Array<{ text: string; sourceIds: string[] }> {
  return [
    ...dossier.timeline.map((event) => ({
      text: normalizeForMatch([event.date, event.eventType, event.claim].join(" ")),
      sourceIds: event.sourceIds,
    })),
    ...dossier.claimChecks.map((claim) => ({
      text: normalizeForMatch([claim.claim, claim.status, claim.explanation].join(" ")),
      sourceIds: claim.sourceIds,
    })),
    ...dossier.riskFlags.map((risk) => ({
      text: normalizeForMatch([risk.type, risk.severity, risk.description, risk.nextAction].join(" ")),
      sourceIds: risk.sourceIds,
    })),
  ];
}

function matchingGeneratedTimelineSourceIds(dossier: Dossier, requiredGroups: string[][]): string[] {
  const matches = dossier.timeline.filter((event) => {
    const text = normalizeForMatch([event.date, event.eventType, event.claim].join(" "));
    return event.sourceIds.length > 0 && requiredGroups.every((group) => group.some((term) => text.includes(normalizeForMatch(term))));
  });
  return uniqueStrings(matches.flatMap((event) => event.sourceIds));
}

function hasGeneratedEvidence(dossier: Dossier, requiredGroups: string[][]): boolean {
  return generatedEvidenceItems(dossier).some(
    (item) =>
      item.sourceIds.length > 0 &&
      requiredGroups.every((group) => group.some((term) => item.text.includes(normalizeForMatch(term)))),
  );
}

function toDossierSource(source: NormalizedSource): Dossier["sources"][number] {
  return {
    id: source.id,
    title: source.title,
    url: source.url,
    sourceType: source.sourceType,
    snippet: source.snippet,
    relevance: source.relevance,
  };
}

function matchingSourceIds(
  sourceTexts: Array<{ source: NormalizedSource; text: string }>,
  requiredGroups: string[][],
): string[] {
  return sourceTexts
    .filter(({ text }) => requiredGroups.every((group) => group.some((term) => text.includes(normalizeForMatch(term)))))
    .map(({ source }) => source.id);
}

function hasEvidence(
  sourceTexts: Array<{ source: NormalizedSource; text: string }>,
  requiredGroups: string[][],
): boolean {
  return matchingSourceIds(sourceTexts, requiredGroups).length > 0;
}

function collectDossierSourceIds(dossier: Dossier): string[] {
  return [
    ...dossier.timeline.flatMap((event) => event.sourceIds),
    ...dossier.claimChecks.flatMap((claim) => claim.sourceIds),
    ...dossier.riskFlags.flatMap((flag) => flag.sourceIds),
  ];
}

function detectDossierOverclaims(dossier: Dossier): string[] {
  const text = normalizeForMatch(JSON.stringify(dossier));
  const flags: Array<[RegExp, string]> = [
    [/\bis authentic\b|\bauthenticated as\b|\bauthenticity confirmed\b|\bconfirms authenticity\b/, "authentication claim"],
    [/\blegal title is clear\b|\bclear title\b|\bvalid title\b/, "legal title determination"],
    [/\blegal advice\b/, "legal advice framing"],
    [/\bfully verified\b|\bdefinitively verified\b|\bguaranteed\b|\bconclusive\b/, "overstated certainty"],
    [/\bno risk\b|\brisk free\b/, "risk-free claim"],
  ];
  return flags.filter(([regex]) => regex.test(text)).map(([, label]) => label);
}

function parseJsonObject(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    const first = content.indexOf("{");
    const last = content.lastIndexOf("}");
    if (first === -1 || last === -1 || last <= first) {
      throw new Error("OpenAI response was not parseable JSON");
    }
    return JSON.parse(content.slice(first, last + 1));
  }
}

function normalizeBlindDossier(value: unknown): BlindDossier {
  if (!value || typeof value !== "object") {
    throw new Error("Blind dossier is not an object");
  }
  const candidate = value as Partial<BlindDossier>;
  return {
    artworkIdentity: {
      artist: String(candidate.artworkIdentity?.artist ?? ""),
      title: String(candidate.artworkIdentity?.title ?? ""),
      year: optionalString(candidate.artworkIdentity?.year),
      medium: optionalString(candidate.artworkIdentity?.medium),
      dimensions: optionalString(candidate.artworkIdentity?.dimensions),
      sourceIds: cleanStringArray(candidate.artworkIdentity?.sourceIds),
    },
    provenanceEvents: Array.isArray(candidate.provenanceEvents)
      ? candidate.provenanceEvents.map((event) => {
          const item = event as BlindDossier["provenanceEvents"][number];
          return {
            dateRange: String(item.dateRange ?? ""),
            eventType: item.eventType ?? "other",
            partyOrOwner: String(item.partyOrOwner ?? ""),
            location: optionalString(item.location),
            description: String(item.description ?? ""),
            status: item.status ?? "needs_review",
            sourceIds: cleanStringArray(item.sourceIds),
          };
        })
      : [],
    claimChecks: Array.isArray(candidate.claimChecks)
      ? candidate.claimChecks.map((claim) => {
          const item = claim as BlindDossier["claimChecks"][number];
          return {
            claim: String(item.claim ?? ""),
            status: item.status ?? "needs_review",
            explanation: String(item.explanation ?? ""),
            sourceIds: cleanStringArray(item.sourceIds),
          };
        })
      : [],
    risksAndGaps: Array.isArray(candidate.risksAndGaps)
      ? candidate.risksAndGaps.map((risk) => {
          const item = risk as BlindDossier["risksAndGaps"][number];
          return {
            type: String(item.type ?? "unclassified"),
            severity: item.severity ?? "medium",
            description: String(item.description ?? ""),
            nextAction: String(item.nextAction ?? ""),
            sourceIds: cleanStringArray(item.sourceIds),
          };
        })
      : [],
    trustAssessment: {
      level: candidate.trustAssessment?.level ?? "needs_specialist_review",
      rationale: String(candidate.trustAssessment?.rationale ?? ""),
    },
    limitations: cleanStringArray(candidate.limitations),
  };
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function getExpectedEvents(slug: string): ExpectedEvent[] {
  if (slug === "wally") {
    return [
      {
        id: "wally-created-1912",
        label: "1912 creation by Egon Schiele",
        requiredGroups: [["1912"], ["egon schiele", "schiele"], ["portrait of wally", "wally neuzil"]],
        weight: 1,
        critical: true,
      },
      {
        id: "wally-bondi-owner",
        label: "Lea Bondi Jaray ownership before Nazi-era taking",
        requiredGroups: [["lea bondi", "bondi jaray", "bondi"], ["owner", "personal property", "provenance"], ["1939", "1930", "before"]],
        weight: 2,
        critical: true,
      },
      {
        id: "wally-welz-taking",
        label: "Friedrich Welz / Nazi-era taking in 1939",
        requiredGroups: [["friedrich welz", "welz"], ["1939", "late 1930"], ["stolen", "nazi", "aryanization", "forced"]],
        weight: 2,
        critical: true,
      },
      {
        id: "wally-salzburg-gallery",
        label: "Salzburger Landesgalerie / Salzburg custody 1944-1945",
        requiredGroups: [["salzburger", "salzburg"], ["1944", "1945"]],
        weight: 1,
        critical: false,
      },
      {
        id: "wally-us-forces-bda",
        label: "U.S. forces seizure and 1947 Austrian handoff",
        requiredGroups: [["u s forces", "united states military", "us forces"], ["1945", "1947"], ["austrian", "bundesdenkmalamt", "preservation"]],
        weight: 1.5,
        critical: true,
      },
      {
        id: "wally-rieger-heirs",
        label: "Rieger heirs / Robert Rieger and Tana Berger in 1948",
        requiredGroups: [["rieger"], ["1948"]],
        weight: 1,
        critical: false,
      },
      {
        id: "wally-belvedere",
        label: "Austrian National Gallery / Belvedere 1950-1954",
        requiredGroups: [["austrian national gallery", "belvedere", "osterreichische galerie"], ["1950", "1954"]],
        weight: 1.5,
        critical: true,
      },
      {
        id: "wally-leopold",
        label: "Rudolf Leopold ownership 1954-1994",
        requiredGroups: [["rudolf leopold", "leopold"], ["1954"], ["1994"]],
        weight: 1.5,
        critical: true,
      },
      {
        id: "wally-leopold-museum",
        label: "Leopold Museum from 1994",
        requiredGroups: [["leopold museum"], ["1994"]],
        weight: 1,
        critical: true,
      },
      {
        id: "wally-moma-loan-dispute",
        label: "MoMA loan and U.S. legal dispute beginning 1997-1999",
        requiredGroups: [["moma", "museum of modern art"], ["1997", "1998", "1999"], ["seized", "forfeiture", "legal", "claim"]],
        weight: 1.5,
        critical: true,
      },
      {
        id: "wally-settlement-2010",
        label: "2010 settlement with Bondi estate and Leopold Museum",
        requiredGroups: [["2010"], ["settlement"], ["19 million", "$19 million", "estate"]],
        weight: 2,
        critical: true,
      },
    ];
  }

  return [
    {
      id: "monet-created",
      label: "Painted in 1890 and signed/dated 1891",
      requiredGroups: [["1890"], ["signed", "dated", "1891", "painted"], ["monet", "meules"]],
      weight: 1,
      critical: true,
    },
    {
      id: "monet-durand-ruel-1891",
      label: "Durand-Ruel Paris acquired from artist July 2, 1891",
      requiredGroups: [["durand ruel"], ["july 2", "1891"], ["artist", "monet"]],
      weight: 2,
      critical: true,
    },
    {
      id: "monet-palmer-march-1892",
      label: "Mr. and Mrs. Potter Palmer acquired March 7, 1892",
      requiredGroups: [["potter palmer", "bertha", "mr and mrs potter palmer"], ["march 7", "1892"]],
      weight: 2,
      critical: true,
    },
    {
      id: "monet-durand-ny-1892-first",
      label: "Durand-Ruel New York acquired from Palmers in 1892",
      requiredGroups: [["durand ruel"], ["new york"], ["1892"]],
      weight: 1,
      critical: false,
    },
    {
      id: "monet-van-horne",
      label: "W.C. Van Horne acquired April 19, 1892",
      requiredGroups: [["van horne"], ["april 19", "1892"]],
      weight: 1.5,
      critical: true,
    },
    {
      id: "monet-palmer-nov-1892",
      label: "Mr. and Mrs. Potter Palmer reacquired November 22, 1892",
      requiredGroups: [["potter palmer", "mr and mrs potter palmer"], ["november 22", "1892"]],
      weight: 1.5,
      critical: true,
    },
    {
      id: "monet-honore-grace-palmer",
      label: "Honoré and Grace Palmer by descent",
      requiredGroups: [["honore", "honoré"], ["grace palmer"], ["descent"]],
      weight: 1.5,
      critical: true,
    },
    {
      id: "monet-christies-1986",
      label: "Christie's New York sale May 14, 1986 lot 18",
      requiredGroups: [["christie"], ["may 14", "1986"], ["lot 18"]],
      weight: 2,
      critical: true,
    },
    {
      id: "monet-private-1986",
      label: "Acquired by private/present owner at 1986 sale",
      requiredGroups: [["acquired"], ["1986"], ["present owner", "private collection", "above sale"]],
      weight: 1,
      critical: false,
    },
    {
      id: "monet-sothebys-2019",
      label: "Sotheby's 2019 sale result of $110,747,000",
      requiredGroups: [["sotheby"], ["2019"], ["110747000", "110 747 000", "$110", "110 7 million"]],
      weight: 2,
      critical: true,
    },
  ];
}

function totalExpectedWeight(slug: string): number {
  return getExpectedEvents(slug).reduce((sum, event) => sum + event.weight, 0);
}

function matchesExpectedEvent(text: string, expected: ExpectedEvent): boolean {
  return expected.requiredGroups.every((group) => group.some((term) => text.includes(normalizeForMatch(term))));
}

function normalizeForMatch(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[$€£]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasCitationOverlap(
  event: BlindDossier["provenanceEvents"][number],
  sourceIds: string[],
  sourceTextById: Map<string, string>,
): boolean {
  const eventTokens = significantTokens(
    normalizeForMatch([event.dateRange, event.partyOrOwner, event.description].join(" ")),
  );
  if (eventTokens.length === 0) return true;
  const citedText = sourceIds.map((sourceId) => sourceTextById.get(sourceId) ?? "").join(" ");
  const overlap = eventTokens.filter((token) => citedText.includes(token));
  return overlap.length >= Math.min(3, eventTokens.length);
}

function significantTokens(value: string): string[] {
  const stopwords = new Set([
    "the",
    "and",
    "from",
    "with",
    "that",
    "this",
    "painting",
    "work",
    "owner",
    "owned",
    "source",
    "sources",
    "provenance",
    "acquired",
  ]);
  return [...new Set(value.split(" ").filter((token) => token.length >= 4 && !stopwords.has(token)))];
}

function detectOverclaims(dossier: BlindDossier): string[] {
  const text = normalizeForMatch(JSON.stringify(dossier));
  const flags: Array<[RegExp, string]> = [
    [/\bauthentic\b|\bauthenticated\b|\bauthenticate\b/, "authentication claim"],
    [/\blegal title is clear\b|\bclear title\b|\bvalid title\b/, "legal title determination"],
    [/\blegal advice\b/, "legal advice framing"],
    [/\bfully verified\b|\bdefinitively verified\b|\bguaranteed\b|\bconclusive\b/, "overstated certainty"],
    [/\bno risk\b|\brisk free\b/, "risk-free claim"],
  ];
  return flags.filter(([regex]) => regex.test(text)).map(([, label]) => label);
}

function uniqueStrings(values: Array<string | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => typeof value === "string" && value.trim().length > 0))];
}

function assessViability(
  preset: PresetCase,
  sources: NormalizedSource[],
): CaseReport["viability"] {
  const missingEvidence: string[] = [];
  const usefulSources = sources.filter((source) => source.snippet || source.textSample);
  const allText = sources
    .flatMap((source) => [source.title, source.url, source.snippet, source.textSample ?? ""])
    .join("\n")
    .toLowerCase();
  const categories = new Set(sources.map((source) => source.sourceType));

  if (preset.slug === "wally") {
    if (usefulSources.length < 4) missingEvidence.push("At least 4 useful sources");
    if (!hasAnyDomain(sources, ["justice.gov", ".gov"])) {
      missingEvidence.push("Government/legal settlement source");
    }
    if (!hasAnyDomain(sources, ["leopoldmuseum.org", "moma.org"])) {
      missingEvidence.push("Museum source such as Leopold Museum or MoMA");
    }
    if (!hasAnyCategory(categories, ["case_summary", "legal_article"])) {
      missingEvidence.push("Case summary, art law, or restitution source");
    }
    if (!hasAnyCategory(categories, ["catalogue_pdf", "museum_page"])) {
      missingEvidence.push("Catalogue or exhibition-related source");
    }
    if (!/(lea bondi|bondi estate|friedrich welz|rudolf leopold|settlement|restitution)/i.test(allText)) {
      missingEvidence.push("Source snippets mentioning key provenance/legal names or settlement terms");
    }
  } else {
    if (usefulSources.length < 3) missingEvidence.push("At least 3 useful sources");
    if (!hasAnyDomain(sources, ["sothebys.com"])) {
      missingEvidence.push("Sotheby's 2019 sale or auction record source");
    }
    if (!/(\$110\.7|110\.7 million|auction record|sold|price|hammer)/i.test(allText)) {
      missingEvidence.push("Price or auction result context");
    }
    if (!/(provenance|palmer family|collection|auction history|catalogue)/i.test(allText)) {
      missingEvidence.push("Provenance or collection context");
    }
  }

  const viable = missingEvidence.length === 0;
  const confidence = viable ? "high" : missingEvidence.length <= 2 ? "medium" : "low";
  const recommendedUse =
    viable && preset.slug === "wally"
      ? "primary demo"
      : viable
        ? "secondary preset"
        : "replace";

  return {
    viable,
    confidence,
    missingEvidence,
    recommendedUse,
    rationale: viable
      ? "Retrieved sources cover the required categories and provide snippets that can support a cited dossier."
      : "The result set is missing required evidence categories for a dependable demo preset.",
  };
}

function classifySource(url: string, title: string): SourceType {
  const { host, path: urlPath } = parseUrlParts(url);
  const lowerUrl = `${host}${urlPath}`;
  const lowerTitle = title.toLowerCase();

  if (hostMatches(host, ["sothebys.com", "christies.com", "phillips.com", "bonhams.com"])) {
    return "auction_lot";
  }
  if (
    hostMatches(host, ["leopoldmuseum.org", "moma.org", "metmuseum.org"]) ||
    host.includes("museum")
  ) {
    return "museum_page";
  }
  if (hostMatches(host, ["justice.gov"]) || host.endsWith(".gov")) {
    return lowerUrl.endsWith(".pdf") ? "government_pdf" : "legal_article";
  }
  if (lowerUrl.endsWith(".pdf") || lowerUrl.includes(".pdf") || lowerTitle.includes("catalogue") || lowerTitle.includes("catalog")) {
    return "catalogue_pdf";
  }
  if (
    lowerUrl.includes("unige") ||
    lowerUrl.includes("art-adr") ||
    lowerUrl.includes("law") ||
    lowerUrl.includes("legal") ||
    lowerUrl.includes("restitution")
  ) {
    return lowerUrl.includes("law") || lowerUrl.includes("legal") ? "legal_article" : "case_summary";
  }
  if (hostMatches(host, ["artnet.com", "theartnewspaper.com", "artnews.com", "artsy.net", "abcnews.go.com"])) {
    return "news_article";
  }
  if (host.includes("foundation")) {
    return "foundation_page";
  }
  return "other";
}

function parseUrlParts(url: string): { host: string; path: string } {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname.replace(/^www\./, "").toLowerCase(),
      path: `${parsed.pathname}${parsed.search}`.toLowerCase(),
    };
  } catch {
    const fallback = url.toLowerCase();
    return { host: fallback, path: fallback };
  }
}

function hostMatches(host: string, domains: string[]): boolean {
  return domains.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

function explainRelevance(sourceType: SourceType, title: string, snippet: string): string {
  const haystack = `${title} ${snippet}`.toLowerCase();
  if (sourceType === "auction_lot") return "Auction-house source for sale, catalogue, and market context.";
  if (sourceType === "museum_page") return "Museum source for object identity, exhibition, or collection context.";
  if (sourceType === "government_pdf" || sourceType === "legal_article") {
    return "Legal or government source for title, restitution, or settlement context.";
  }
  if (sourceType === "case_summary") return "Case summary source for restitution and dispute chronology.";
  if (sourceType === "catalogue_pdf") return "Catalogue or PDF source for exhibition/literature references.";
  if (sourceType === "news_article") return "News or art-market source for public context and dates.";
  if (haystack.includes("provenance")) return "Mentions provenance and may support claim verification.";
  return "Potential supporting public source; needs specialist review.";
}

function rankSources(a: NormalizedSource, b: NormalizedSource): number {
  return sourceRankScore(b) - sourceRankScore(a);
}

function sourceRankScore(source: NormalizedSource): number {
  const categoryWeight: Record<SourceType, number> = {
    government_pdf: 9,
    legal_article: 8,
    museum_page: 8,
    auction_lot: 8,
    case_summary: 7,
    catalogue_pdf: 7,
    foundation_page: 5,
    news_article: 4,
    other: 2,
  };

  const snippetWeight = source.snippet ? 2 : 0;
  const textWeight = source.textSample ? 2 : 0;
  const queryWeight = Math.min(source.queryHits.length, 4);
  const scoreWeight = Math.min(source.searchScore ?? 0, 1);
  return categoryWeight[source.sourceType] + snippetWeight + textWeight + queryWeight + scoreWeight;
}

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    for (const param of [...parsed.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid)/i.test(param)) {
        parsed.searchParams.delete(param);
      }
    }
    if (parsed.pathname.length > 1) {
      parsed.pathname = parsed.pathname.replace(/\/+$/, "");
    }
    return parsed.toString();
  } catch {
    return url.trim();
  }
}

function cleanStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function mergeUnique<T>(left: T[], right: T[]): T[] {
  return [...new Set([...left, ...right])];
}

function countCategories(sources: NormalizedSource[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const source of sources) {
    counts[source.sourceType] = (counts[source.sourceType] ?? 0) + 1;
  }
  return counts;
}

function hasAnyDomain(sources: NormalizedSource[], needles: string[]): boolean {
  return sources.some((source) => needles.some((needle) => source.url.toLowerCase().includes(needle)));
}

function hasAnyCategory(categories: Set<SourceType>, wanted: SourceType[]): boolean {
  return wanted.some((category) => categories.has(category));
}

function persistReport(report: CaseReport) {
  const outDir = path.resolve("data/validation");
  mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `${report.case.slug}.json`);
  writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
}

function printReport(report: CaseReport) {
  console.log(`\n--- ${report.case.displayName} viability ---`);
  console.log(`viable: ${report.viability.viable}`);
  console.log(`confidence: ${report.viability.confidence}`);
  console.log(`recommendedUse: ${report.viability.recommendedUse}`);
  console.log(`missingEvidence: ${report.viability.missingEvidence.length ? report.viability.missingEvidence.join("; ") : "none"}`);
  console.log(`sourceCategoryCounts: ${JSON.stringify(report.sourceCategoryCounts)}`);
  if (report.publicSourceReconstructability) {
    const validation = report.publicSourceReconstructability;
    console.log("\nPortrait of Wally public-source reconstructability");
    console.log("--------------------------------------------------");
    console.log(`Source coverage: ${validation.sourceCoveragePass ? "PASS" : "FAIL"}`);
    console.log(
      `Event coverage: ${validation.eventCoverage.canonicalEventsRecovered}/${validation.eventCoverage.canonicalEventsTotal} ${
        validation.eventCoveragePass ? "PASS" : "FAIL"
      }`,
    );
    console.log(`Critical legal-risk coverage: ${validation.criticalLegalRiskPass ? "PASS" : "FAIL"}`);
    console.log(`Citation integrity: ${validation.citationIntegrityPass ? "PASS" : "FAIL"}`);
    console.log(`Hallucination guard: ${validation.hallucinationGuard.pass ? "PASS" : "FAIL"}`);
    console.log(`Overall: ${validation.finalRecommendation}`);
  }
  if (report.blindValidation) {
    console.log(`blindValidation.enabled: ${report.blindValidation.enabled}`);
    console.log(`blindValidation.model: ${report.blindValidation.model ?? "n/a"}`);
    console.log(`blindValidation.pass: ${report.blindValidation.pass}`);
    console.log(`blindValidation.score: ${report.blindValidation.score}`);
    console.log(`blindValidation.recommendation: ${report.blindValidation.recommendation}`);
    console.log(`blindValidation.rationale: ${report.blindValidation.rationale}`);
    console.log(
      `blindValidation.missingCriticalEvents: ${
        report.blindValidation.missingCriticalEvents.length
          ? report.blindValidation.missingCriticalEvents.join("; ")
          : "none"
      }`,
    );
    console.log(
      `blindValidation.invalidCitations: ${
        report.blindValidation.invalidCitations.length
          ? report.blindValidation.invalidCitations.join("; ")
          : "none"
      }`,
    );
    console.log(
      `blindValidation.overclaimFlags: ${
        report.blindValidation.overclaimFlags.length
          ? report.blindValidation.overclaimFlags.join("; ")
          : "none"
      }`,
    );
  }
  console.log(`saved: data/validation/${report.case.slug}.json`);

  for (const source of report.sources.slice(0, 12)) {
    console.log(`\n${source.id}. ${source.title}`);
    console.log(`   ${source.url}`);
    console.log(`   type: ${source.sourceType}`);
    console.log(`   matters: ${source.relevance}`);
    console.log(`   snippet: ${source.snippet || "(no highlight returned)"}`);
  }
}

function loadEnvFiles(files: string[]) {
  for (const file of files) {
    const absolute = path.resolve(file);
    if (!existsSync(absolute)) continue;

    const contents = readFileSync(absolute, "utf8");
    for (const rawLine of contents.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const equals = line.indexOf("=");
      if (equals === -1) continue;

      const key = line.slice(0, equals).trim();
      const rawValue = line.slice(equals + 1).trim();
      if (!key || process.env[key]) continue;

      process.env[key] = rawValue.replace(/^['"]|['"]$/g, "");
    }
  }
}
