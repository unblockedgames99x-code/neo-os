# Sanitized performance evidence

Aggregate generated 2026-09-12T03:04:33.079Z. All timings below are milliseconds. Only valid canonical repetitions contribute to medians.

## Observed browser medians

| Phase | Profile | Cache | Valid/found | FCP | LCP | Start ready | Transfer KiB | CDP task |
|---|---|---|---:|---:|---:|---:|---:|---:|
| before | desktop | cold | 5/5 | 2,496 | 4,352 | 4,339.2 | 476.12 | 274.36 |
| before | desktop | warm | 5/5 | 2,224 | 4,068 | 4,061 | 22.75 | 261.51 |
| before | mobile | cold | 5/5 | 3,956 | 6,068 | 6,049.7 | 476.59 | 1,527.35 |
| before | mobile | warm | 5/5 | 2,824 | 4,928 | 4,908.4 | 23 | 970.52 |
| reference | desktop | cold | 5/5 | 568 | 568 | — | 1,358.1 | 1,612.79 |
| reference | desktop | warm | 5/5 | 416 | 416 | — | 226.64 | 2,223.49 |
| reference | mobile | cold | 5/5 | 1,408 | 1,408 | — | 530.51 | 7,693.14 |
| reference | mobile | warm | 5/5 | 880 | 880 | — | 829.16 | 8,708.28 |
| after | desktop | cold | 5/5 | 2,592 | 3,208 | 2,666.3 | 770.86 | 270.74 |
| after | desktop | warm | 5/5 | 2,000 | 2,484 | 2,060.9 | 22.76 | 179.17 |
| after | mobile | cold | 5/5 | 4,336 | 5,036 | 4,865.6 | 771.25 | 1,245.14 |
| after | mobile | warm | 5/5 | 2,152 | 2,152 | 2,528.9 | 23.05 | 675.91 |

Initial navigation conditions match across before/after. The only recorded difference is optional first-repeat screenshots (before on, after off), taken after these initial metrics were captured. That later difference leaves first-repeat guest-entry/desktop-ready timing and scripted interactions not strictly matched. Five-run interaction medians are descriptive and do not establish a strictly controlled responsiveness speedup. Field INP is unavailable; no real-user field dataset was collected.

## Lighthouse cold medians

Lighthouse uses simulated timing; its values are separate from the observed-browser table. Scores are on a 0–100 scale.

| Phase | Profile | Valid/found | Load-limit warning runs | Performance | FCP | LCP | TBT | CLS |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| before | desktop | 5/5 | 5/5 | 78 | 783.3 | 2,181.77 | 0 | 0 |
| before | mobile | 5/5 | 5/5 | 73 | 2,076.01 | 4,751.92 | 64.5 | 0 |
| reference | desktop | 5/5 | 0/5 | 73 | 2,109.7 | 2,764.36 | 0 | 0 |
| reference | mobile | 5/5 | 0/5 | 80 | 3,489.86 | 3,980.49 | 0 | 0 |
| after | desktop | 5/5 | 5/5 | 93 | 807.41 | 1,103.99 | 0 | 0.02 |
| after | mobile | 5/5 | 5/5 | 78 | 2,122.18 | 4,342.16 | 50.14 | 0.04 |

A valid/scored Lighthouse run can still reach its page-load time limit. Flagged runs carry an incomplete-results warning, so late-loading resources and related diagnostics may be incomplete. Warning counts and allowlisted types are retained; arbitrary warning contents are omitted.

The JSON files contain per-run metrics, sample counts, conditions, matching scripted interactions, sanitized resource paths, and separate coverage/drag/timeline summaries. No raw logs are linked here.

The observed long-task blocking sum is not Lighthouse TBT. Scripted Event Timing is not field INP. Phase-specific compatibility and the retained screenshot flag difference are recorded in summary.json. Coverage and drag diagnostics are excluded from primary medians.
