# Repository Architecture

## Purpose

`Dev-Sahad/Dev-Sahad` is a GitHub profile repository. Its root `README.md` is rendered on the public GitHub profile, while local JavaScript and GitHub Actions keep selected assets current and verifiable.

## Structure

```text
.
├── .github/           Community files and GitHub Actions workflows
├── .vscode/           Shared editor settings
├── Assets/            Source images, templates, and generated visual reports
├── docs/              Architecture, automation, and maintenance guides
├── scripts/           Dependency-free Node.js generators and validators
├── README.md          Public profile entry point
├── Profile.md         Compact profile overview
├── CV.md              Detailed professional profile
├── EXPERIENCE.md      Learning and experience timeline
└── SHOWCASE.md        Selected work and demonstrations
```

## Data flow

```text
GitHub API / source assets
          ↓
Node.js scripts or pinned GitHub Actions
          ↓
Generated SVG and JSON files
          ↓
README.md, Profile.md, and SHOWCASE.md
          ↓
GitHub profile renderer
```

## Ownership boundaries

- Human-authored profile content lives in Markdown files.
- Source images and SVG templates live in `Assets/`.
- Generated files are committed so profile rendering does not depend entirely on live services.
- Generators live in `scripts/` and must produce deterministic output for the same input.
- Workflows use least-privilege permissions and pin third-party actions to full commit SHAs.
- `gh-pages` and `output` are generated branches; they are intentionally separate from `main`.

## Design principles

1. Prefer reproducible local generation over opaque remote output.
2. Validate internal links, formats, and generated artifacts before merge.
3. Avoid fabricated activity, random metrics, or claims that cannot be verified.
4. Keep scheduled writes serialized to prevent conflicting automation commits.
5. Document the source and regeneration command for every committed asset.
