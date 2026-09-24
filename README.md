# Provenance Dossier Copilot

**Turn an artwork's claimed history into a research brief you can inspect.**

Provenance Dossier Copilot is a research workbench for auction specialists and art advisors. Enter artwork metadata and an ownership history; it searches public records, organizes the evidence into a timeline, and flags claims that need closer review.

The aim is to shorten the distance between a seller's story and the sources a specialist needs to assess it.

[Try the app](https://provenance-dossier-copilot.vercel.app) · [Product thesis](docs/product.md) · [Architecture](docs/architecture.md)

## Why it exists

An artwork's history can be scattered across auction archives, museum records, exhibition catalogues, legal filings, and news coverage. A short provenance supplied by a seller gives a researcher a starting point, but leaves the work of finding and reconciling those records.

This project explores a focused workflow: assemble a first-pass evidence packet, make its sources easy to inspect, and keep unanswered questions visible. Specialists retain responsibility for interpreting the evidence and deciding what to investigate next.

## The workbench

1. **Describe the work.** Enter artist, title, date, medium, dimensions, and claimed provenance.
2. **Choose a focus.** General diligence, restitution, comparable sales, or exhibition history.
3. **Follow the research.** A live activity feed shows queries, retrieved sources, and extraction progress.
4. **Review the dossier.** Inspect the summary, cited timeline, claim checks, risk flags, source excerpts, and suggested next steps.
5. **Open the evidence.** Citation pills jump to source records; source links lead to the original pages.

Two editable examples are included:

| Example | Research question |
| --- | --- |
| Schiele, *Portrait of Wally* | What context might a short ownership history omit in a work with a documented restitution dispute? |
| Monet, *Meules* | Which auction and ownership records refer to this particular work within a series of similarly titled paintings? |

Preset provenance entries are illustrative research inputs, not complete or verified ownership histories. Each run uses live retrieval, so coverage and output vary.

## Evidence and uncertainty

The server checks that citation IDs refer to sources retrieved in the current run. It removes unsourced factual timeline entries and downgrades certain uncited claim judgments to `needs_review`.

**A valid citation ID does not establish that a source supports the claim.** The model can misread a page, confuse similar artworks, or omit evidence. Summary text and suggested actions are not independently fact-checked. Review the original sources before relying on a dossier.

`unsupported` means support was not found in the retrieved material. It does not establish that a claim is false. The tool supports research; it does not authenticate artworks, determine legal title, or provide legal advice.

## Run locally

Prerequisites: Bun 1.3+, Node.js 20.9+, and an Exa API key. An OpenAI API key enables structured synthesis.

```bash
git clone https://github.com/tonyseetonydo/provenance-dossier-copilot.git
cd provenance-dossier-copilot
bun install --frozen-lockfile
cp .env.example .env.local
```

Fill in `.env.local`:

| Variable | Purpose |
| --- | --- |
| `EXA_API_KEY` | Required for public-web search and page retrieval. |
| `OPENAI_API_KEY` | Optional. Enables structured extraction; without it, sources are returned for manual review. |
| `OPENAI_MODEL` | Optional model override. The app defaults to `gpt-5.4-nano-2026-03-17`; choose a compatible model available to your account. |

```bash
bun dev
```

Open [localhost:3000](http://localhost:3000). Keys stay on the server. Searches and model calls use your provider accounts and incur their usual charges.

## Development

```bash
bun run typecheck
bun run build
```

To inspect retrieval coverage for the included research cases:

```bash
bun run validate:cases
```

This separate research script makes live API calls and writes local reports to `data/validation/`. Its case-specific checks are exploratory diagnostics, not a general accuracy benchmark or an end-to-end test of the app. See [validation notes](data/validation/README.md).

## How it works

The app uses Next.js, TypeScript, Tailwind CSS, and Zod. Exa handles search and page retrieval; OpenAI handles dossier synthesis.

The request handler builds up to ten queries from the artwork, claimed owners, and research focus. It searches in parallel, deduplicates and ranks URLs, and retrieves text for up to eight sources. The model returns JSON, which is normalized, schema-validated, and checked for valid citation IDs before the dossier is streamed to the browser. If extraction fails or no OpenAI key is configured, the app returns a clearly labeled fallback for manual source review.

See [architecture and validation boundaries](docs/architecture.md) for the implementation details.

## Current scope

This is an early working prototype. It has no accounts, saved dossiers, private-document ingestion, paid-database integrations, or specialist evaluation results. Retrieval is limited to public pages and bounded excerpts; thin coverage produces thin evidence. Confidence and risk labels are model judgments, not calibrated probabilities.

The API currently has no built-in authentication or rate limiting. Add access controls and usage limits before exposing a deployment backed by your API keys. Artwork details and claimed owner names enter search queries; synthesis sends the supplied metadata, provenance, and retrieved excerpts to OpenAI. Only submit material you can share with those providers.

## Contributing

Useful improvements include stronger artwork disambiguation, claim-to-source verification, retrieval evaluation, and dossier export. Open an issue with the research problem and a reproducible example. Use public or synthetic inputs; keep API keys, client records, and generated retrieval reports out of commits.
