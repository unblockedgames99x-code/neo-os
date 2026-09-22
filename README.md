# NEO OS

The complete source snapshot for NEO OS: a browser-based desktop with apps,
themes, games, media clients, a proxied browser, and standalone launchers.

## Project contents

- `neo-os/` — the desktop shell, applications, browser runtime, themes, and assets.
- `games/` — the local HTML game catalog and cover library.
- `scripts/` — build, optimization, export, and CDN publishing tools.
- `tests/` — browser and source-level regression coverage.
- `exports/` — portable and standalone exports.
- `index.html` — the lightweight web launcher.

## Run locally

From the repository root:

```powershell
node local-preview.mjs
```

Then open the local address printed in the terminal. Static hosting can also
serve the repository directly.

## Open-source license

Original NEO OS code is released under the MIT License. Bundled third-party
software, games, fonts, media, trademarks, and other assets retain their own
licenses and ownership terms. See `LICENSE`, `THIRD_PARTY_NOTICES.md`, and any
nested notice files.
