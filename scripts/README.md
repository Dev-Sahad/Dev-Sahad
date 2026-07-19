# Automation Scripts

All scripts use Node.js built-in modules only and target Node.js 24 or newer.

| Script | Command | Responsibility |
|---|---|---|
| `validate-profile.js` | `node scripts/validate-profile.js` | Validate structure, syntax, links, formats, and workflow action pins |
| `analyze-profile-image.js` | `node scripts/analyze-profile-image.js [--check]` | Decode `PP.png` and generate or verify pixel reports |
| `make-terminal-svg.js` | `node scripts/make-terminal-svg.js [--check]` | Generate or verify the deterministic terminal card |
| `generate-trophy.js` | `node scripts/generate-trophy.js` | Fetch public GitHub metrics and render the trophy template |
| `update-readme-date.js` | `node scripts/update-readme-date.js [--check]` | Update or validate the README date marker |

## Contracts

- Exit code `0` means success; non-zero means the output is invalid or stale.
- `--check` must not modify files.
- Generated output must be deterministic for the same source data.
- Scripts must not log tokens, credentials, or private API responses.
- File paths resolve from the repository root, not the caller's working directory.
