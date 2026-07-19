# Automation Guide

## Workflow inventory

| Workflow | Trigger | Writes repository content | Output |
|---|---|:---:|---|
| Profile Validation | Push, pull request, manual | No | Validates repository structure and generated files |
| Pixel Profile Analysis | Relevant push, pull request, manual | No | Verifies `Assets/PP.png` reports |
| Metrics | Daily, manual | Yes | `github-metrics.svg` |
| Generate Snake | Every 12 hours, manual | Yes, to `output` | Contribution snake SVGs |
| Terminal Asset Validation | Relevant push, pull request, manual | No | Verifies `terminal.svg` |
| Generate Top Languages | Daily, manual | Yes | `Assets/top-languages.svg` |
| Update GitHub Trophy | Every 12 hours, manual | Yes | `Assets/trophy.svg` |
| Update Profile README | Weekly, manual | Yes | README update date |

## Security model

- Read-only validation jobs use `contents: read` and disable persisted checkout credentials.
- Write jobs receive `contents: write` only for the job that needs it.
- Third-party actions are pinned to immutable 40-character commit SHAs.
- Dependabot opens grouped weekly proposals when pinned GitHub Actions have updates.
- `GH_TOKEN` is optional for richer public metrics; `GITHUB_TOKEN` is the fallback.
- Secrets must never be written to generated files, logs, issue templates, or Markdown.

## Concurrency

Workflows that modify assets on `main` share a repository-level concurrency group. This prevents scheduled jobs from pushing over one another. Validation workflows use cancellable per-ref groups so outdated pull-request runs do not waste runner time.

## Failure recovery

1. Open the failed run and identify the first failing step.
2. Reproduce locally with `npm run check`.
3. Regenerate only the stale asset using the command documented in [Maintenance](MAINTENANCE.md).
4. Commit the source change and generated output together.
5. Re-run the failed workflow after the fix is pushed.

Do not bypass validation by editing a generated SVG or JSON file without updating its source or generator.
