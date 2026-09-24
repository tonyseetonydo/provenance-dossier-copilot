# Retrieval diagnostics

Run from the repository root with `EXA_API_KEY` set in your shell or `.env.local`:

```bash
bun run validate:cases
```

The script searches for the Wally and Monet cases, retrieves page content, prints coverage diagnostics, and writes `wally.json` and `monet-meules.json` here. Each run overwrites those local reports and incurs provider charges.

Optional model-based checks require `OPENAI_API_KEY`:

```bash
RUN_LLM_BLIND_VALIDATION=1 bun run validate:cases
```

`OPENAI_MODEL` is tried first when set; the script also defines fallback model candidates. Its model configuration and extraction path are separate from the app.

Reports contain retrieved excerpts, raw provider responses, request identifiers, and case-specific analysis. They are generated research output, excluded from version control. Use source links and concise observations when sharing findings rather than committing the raw reports.

These diagnostics include rules and expected events tailored to known artworks. A passing result measures those checks on the retrieved material; it does not establish factual accuracy on unseen artworks or test the app end to end.
