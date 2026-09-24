# Product thesis

## The problem

Before recommending an artwork or accepting it for sale, a specialist needs to understand its documented history. Who owned it? Which exhibitions and sales refer to the same object? Where does the record become uncertain? What documents would resolve those gaps?

Public evidence is spread across institutions and formats. Search results provide leads; turning those leads into an inspectable research file still requires gathering, matching, and reconciling them.

Provenance Dossier Copilot explores whether that first pass can become a repeatable product: supply an artwork and its claimed history, receive an organized evidence packet with clear paths back to the sources.

## Who it serves

The initial user is an auction specialist or independent art advisor reviewing a work before consignment, cataloguing, or a purchase recommendation. A potential starting market is smaller teams with recurring research needs and limited dedicated research capacity.

This is a product hypothesis. The repository demonstrates the workflow; it does not establish customer adoption, time savings, or willingness to pay.

## The unit of value

A useful dossier should help a specialist do three things:

- Locate relevant public records with less repetitive searching.
- Separate documented events, seller claims, and unresolved questions.
- Decide which sources or private documents to examine next.

The product succeeds when reviewing its evidence takes less effort than assembling an equivalent packet manually. More generated text, more sources, or a confident risk score would not establish that value.

## Product choices

**Start with a claimed history.** The seller's account gives the research a concrete set of claims to examine. It also guides owner-specific queries. The current parser is deliberately simple and can miss aliases or split names incorrectly.

**Make the dossier inspectable.** A timeline, claim table, and source list keep the output close to a specialist's review workflow. Citation navigation reduces the effort of checking where an assertion came from.

**Keep uncertainty visible.** Missing public evidence is a reason to investigate. It should not become an accusation, a clean bill of health, or a fabricated ownership link.

**Begin with public sources.** They make the workflow reproducible without importing confidential collection records. Private archives and specialist databases remain important parts of the broader research process.

**Separate retrieval from synthesis.** Exa supplies search and page retrieval; a language model organizes the retrieved material. Server-side schema and citation checks catch structural errors. Substantive interpretation still requires specialist review.

## What exists today

The prototype accepts artwork metadata and claimed provenance, runs live public-web retrieval, and produces a structured dossier with a visible research log. It includes two editable examples and a separate script for exploring retrieval coverage.

There is no collaborative review, document upload, persistent case file, export workflow, or integration with paid art databases. The implementation does not yet verify that each citation substantively supports its associated claim.

## How to test the idea

A proposed pilot would compare manual research with tool-assisted research on 30–50 works from a consenting specialist team. Include obscure works and ambiguous titles alongside well-documented examples; otherwise, easy retrieval could make the workflow look more reliable than it is.

Measure total research and correction time, useful sources found, incorrect artwork matches, missed material events, and whether each cited assertion is supported by its source. Have specialists review source support without knowing which workflow produced the assertion where practical.

Agree on acceptable error levels before the pilot. The central question is whether the tool saves effort while preserving research quality. Frequent correction, confidently misleading citations, or poor coverage on ordinary inventory would weaken the thesis even if the famous examples look convincing.

## Next decisions

1. **Resolve artwork identity.** Match titles, dates, dimensions, and catalogue identifiers more reliably before combining records.
2. **Strengthen evidence review.** Show the passage behind a claim and evaluate whether it supports the wording.
3. **Make research reusable.** Explore saved dossiers, annotations, and exports after observing how specialists actually review a packet.

Broader users could include collection managers, appraisers, and museum acquisition teams. Expansion depends on evidence that this focused workflow earns trust and saves time.
