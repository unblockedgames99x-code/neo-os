# Reconstructing this evidence

This folder contains a sanitized, standalone subset. Original browser runs, Lighthouse reports, diagnostic traces, screenshots, and the measurement scripts remain in the private local audit directory. The originals are not linked from these public documents.

To reconstruct locally after all measurements finish:

1. Retain the private AUDIT folder and its canonical before/reference/after run collections. Before warm uses the explicitly designated final collections; aborted and intermediate validation runs stay excluded.
2. Run `node AUDIT/aggregate.mjs --root AUDIT` to recompute medians, valid counts and condition comparisons from the private originals.
3. Run `node AUDIT/export-evidence.mjs --audit AUDIT --dest NEW_EMPTY_DESTINATION`. Replace AUDIT and NEW_EMPTY_DESTINATION with local paths. The exporter performs filesystem reads/writes only and refuses a nonempty destination.
4. Compare SHA-256 values in manifest.json with the retained local inputs and generated outputs. Private input identifiers describe the experiment, without revealing local paths.

The export preserves numeric timings, scores, conditions, resource types and query-free resource paths, matching interaction timings, named-resource coverage counts, drag movement/frame statistics, and trace event count/duration summaries. It omits headers, bodies, inline code, DOM snippets, free-form errors, trace arguments, embedded screenshots, and private filesystem paths. No original file is modified.

Observed browser measurements, Lighthouse simulated timing, and instrumented diagnostics remain separate. Missing samples stay missing. Field INP is unavailable. Inspect phase-specific compatibility in summary.json: optional screenshot settings apply after the initial snapshot and, if different, can affect subsequent first-repeat interactions/readiness without changing already-captured initial metrics. Matching laboratory conditions do not prove a real-user responsiveness speedup. Scored Lighthouse runs with page-load time-limit warnings are explicitly counted; results and late-loading diagnostics may be incomplete. Warning descriptions are fixed allowlisted phrases rather than raw text. Timeline event durations may overlap and must not be added into a unique CPU total.
