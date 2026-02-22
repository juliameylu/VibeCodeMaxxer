GOAL: Add structured logging + error capture + make CI artifacts useful.

Requirements:
1) Add a logger utility that supports:
   - info/warn/error
   - JSON lines output (timestamp, level, msg, context)
2) Ensure API handlers log:
   - request start
   - request end (status, latency)
   - errors (stack, request id)
3) Add a CI step or script that writes logs into a known folder, e.g. /var/log/jarvis or ./logs
4) Update GitHub Actions workflow to upload ./logs as artifacts (if present).
5) Add a small "smoke test" script that hits endpoints locally and generates logs.

Prove it works:
- logs folder exists after test run
- artifacts include logs
