# Sanitized performance evidence

Aggregate generated 2026-09-12T03:32:25.423Z. All timings below are milliseconds. Only valid canonical repetitions contribute to medians.

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
| after | desktop | cold | 5/5 | 2,336 | 2,876 | 2,477.9 | 769.84 | 286.24 |
| after | desktop | warm | 5/5 | 2,232 | 2,380 | 2,369 | 22.15 | 195.43 |
| after | mobile | cold | 5/5 | 3,860 | 4,648 | 4,587.1 | 769.93 | 1,466.94 |
| after | mobile | warm | 5/5 | 2,268 | 2,268 | 2,700.1 | 22.38 | 754.38 |

Recorded before/after conditions match for both initial navigation and post-navigation diagnostics, including first-repeat screenshot settings. Matching laboratory conditions do not make scripted interaction timings field INP or prove a real-user responsiveness speedup. Field INP is unavailable; no real-user field dataset was collected.

## Lighthouse cold medians

Lighthouse uses simulated timing; its values are separate from the observed-browser table. Scores are on a 0–100 scale.

| Phase | Profile | Valid/found | Load-limit warning runs | Performance | FCP | LCP | TBT | CLS |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| before | desktop | 5/5 | 5/5 | 78 | 783.3 | 2,181.77 | 0 | 0 |
| before | mobile | 5/5 | 5/5 | 73 | 2,076.01 | 4,751.92 | 64.5 | 0 |
| reference | desktop | 5/5 | 0/5 | 73 | 2,109.7 | 2,764.36 | 0 | 0 |
| reference | mobile | 5/5 | 0/5 | 80 | 3,489.86 | 3,980.49 | 0 | 0 |
| after | desktop | 5/5 | 0/5 | 86 | 923.67 | 1,798.15 | 0 | 0.02 |
| after | mobile | 5/5 | 0/5 | 78 | 2,060.94 | 4,334.88 | 46.84 | 0.04 |

A valid/scored Lighthouse run can still reach its page-load time limit. Flagged runs carry an incomplete-results warning, so late-loading resources and related diagnostics may be incomplete. Warning counts and allowlisted types are retained; arbitrary warning contents are omitted.

The JSON files contain per-run metrics, sample counts, conditions, matching scripted interactions, sanitized resource paths, and separate coverage/drag/timeline summaries. No raw logs are linked here.

The observed long-task blocking sum is not Lighthouse TBT. Scripted Event Timing is not field INP. Phase-specific compatibility and any recorded condition differences are retained in summary.json. Coverage and drag diagnostics are excluded from primary medians.
