# Maintenance Guide

## Local requirements

- Git
- Node.js 24 or newer
- No npm dependencies are required

## Standard validation

```bash
npm run check
git diff --check
```

The check command validates JavaScript syntax, JSON files, local Markdown links, workflow action pins, PNG identity, SVG structure, and deterministic generated outputs.

## Regenerate local assets

```bash
npm run generate:pixel
npm run generate:terminal
```

`Assets/trophy.svg`, `Assets/top-languages.svg`, and `github-metrics.svg` depend on GitHub data and are normally updated by Actions.

## Change procedures

### Update the profile photograph

1. Replace `Assets/PP.png` with a genuine PNG.
2. Run `npm run generate:pixel`.
3. Review both `Assets/pixel-profile.json` and `Assets/pixel-profile.svg`.
4. Run `npm run check`.

### Update a generator

1. Make the generator deterministic for identical inputs.
2. Regenerate its output.
3. Update `scripts/README.md` if the interface changed.
4. Run the full validation command.

### Add a workflow

1. Grant the narrowest possible permissions.
2. Pin every action to a full commit SHA.
3. Add a timeout and appropriate concurrency policy.
4. Document the trigger and output in `docs/AUTOMATION.md`.

### Add Markdown

1. Give the document one clear responsibility.
2. Use repository-relative links for tracked files.
3. Link the document from `docs/README.md` or the appropriate folder guide.
4. Run `npm run check` to catch broken paths.

## Monthly review

- Confirm scheduled workflows are succeeding.
- Check external profile cards and badges for outages.
- Review claims, project statuses, and contact links for accuracy.
- Remove obsolete automation instead of leaving disabled or duplicate workflows.
