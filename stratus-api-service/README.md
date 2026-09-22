# NEO Stratus API service

This folder packages the upstream Stratus API for NEO Cloud. It preserves the
upstream service and adds deployment-safe configuration for a hosted Node.js
process, CORS support for the browser client, and a health endpoint.

## Environment

- `STRATUS_API_KEY` (required in production)
- `PORT` (provided by the host)
- `MAX_CONCURRENT_SESSIONS` (default `4`)
- `MAX_SESSION_SECONDS` (default `900`)
- `RATE_LIMIT_PER_MINUTE` (default `60`)
- `RATE_LIMIT_PER_HOUR` (default `1000`)
- `RATE_LIMIT_PER_DAY` (default `10000`)
- `RATE_LIMIT_PER_MONTH` (default `100000`)
- `DISABLE_ACCOUNT_PREFILL=1` (local smoke tests only)

Run `npm install` and `npm start` from this directory.

The upstream license is included in `LICENSE`.
