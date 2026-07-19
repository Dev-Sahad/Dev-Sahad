# Maintainer Guide

## Ownership map

| Area | Primary responsibility |
|---|---|
| Profile content and personal details | Repository owner |
| JavaScript generators and validation | Repository owner and approved contributors |
| GitHub Actions and permissions | Repository owner |
| Generated assets | Owning script or workflow |
| Community and security documents | Repository owner |

## Merge checklist

- The pull request has one clear purpose.
- `npm run check` and `git diff --check` pass.
- Generated files were updated with their source changes.
- Workflow permissions remain least privilege.
- New action references use immutable commit SHAs.
- Personal claims and project statuses are accurate.
- No secrets, private repository URLs, or private reports are exposed.

## Branch policy

Changes should enter `main` through focused pull requests. The `gh-pages` and `output` branches contain generated deployment artifacts and must not be merged into `main`.

## Security

Handle vulnerability reports according to [SECURITY.md](SECURITY.md). Do not copy private reports into public issues, discussions, commits, or workflow logs.
