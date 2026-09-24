import { z } from "zod";

export const RiskFocusSchema = z.enum([
  "general",
  "restitution",
  "comparables",
  "exhibition",
]);
export type RiskFocus = z.infer<typeof RiskFocusSchema>;

export const ArtworkSchema = z.object({
  artist: z.string().min(1),
  title: z.string().min(1),
  year: z.string().optional(),
  medium: z.string().optional(),
  dimensions: z.string().optional(),
});
export type Artwork = z.infer<typeof ArtworkSchema>;

export const DossierRequestSchema = z.object({
  artwork: ArtworkSchema,
  claimedProvenance: z.string().default(""),
  riskFocus: RiskFocusSchema.default("general"),
});
export type DossierRequest = z.infer<typeof DossierRequestSchema>;

export const SourceTypeSchema = z.enum([
  "auction_lot",
  "museum_page",
  "government_pdf",
  "case_summary",
  "news_article",
  "catalogue_pdf",
  "foundation_page",
  "legal_article",
  "other",
]);
export type SourceType = z.infer<typeof SourceTypeSchema>;

export const SourceEvidenceSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string(),
  sourceType: SourceTypeSchema,
  snippet: z.string(),
  relevance: z.string(),
});
export type SourceEvidence = z.infer<typeof SourceEvidenceSchema>;

export const TimelineEventSchema = z.object({
  date: z.string(),
  eventType: z.enum([
    "creation",
    "ownership",
    "exhibition",
    "auction",
    "legal_dispute",
    "settlement",
    "unknown_gap",
    "catalogue_reference",
  ]),
  claim: z.string(),
  confidence: z.enum(["high", "medium", "low"]),
  sourceIds: z.array(z.string()),
});
export type TimelineEvent = z.infer<typeof TimelineEventSchema>;

export const ClaimCheckSchema = z.object({
  claim: z.string(),
  status: z.enum([
    "supported",
    "partially_supported",
    "unsupported",
    "contradicted",
    "needs_review",
  ]),
  explanation: z.string(),
  sourceIds: z.array(z.string()),
});
export type ClaimCheck = z.infer<typeof ClaimCheckSchema>;

export const RiskFlagSchema = z.object({
  type: z.enum([
    "nazi_era_gap",
    "title_dispute",
    "dimension_mismatch",
    "unverified_provenance",
    "legal_restitution_signal",
    "source_quality_issue",
    "auction_record_context",
    "none_found",
  ]),
  severity: z.enum(["low", "medium", "high"]),
  description: z.string(),
  sourceIds: z.array(z.string()),
  nextAction: z.string(),
});
export type RiskFlag = z.infer<typeof RiskFlagSchema>;

export const DossierSchema = z.object({
  artwork: ArtworkSchema,
  summary: z.object({
    riskLevel: z.enum(["low", "medium", "high"]),
    oneLineTakeaway: z.string(),
    whyThisMatters: z.string(),
  }),
  timeline: z.array(TimelineEventSchema),
  claimChecks: z.array(ClaimCheckSchema),
  riskFlags: z.array(RiskFlagSchema),
  sources: z.array(SourceEvidenceSchema),
  nextActions: z.array(z.string()),
});
export type Dossier = z.infer<typeof DossierSchema>;

// LLM output: same shape minus sources (server-controlled)
export const LlmDossierSchema = DossierSchema.omit({
  sources: true,
  artwork: true,
});
export type LlmDossier = z.infer<typeof LlmDossierSchema>;
