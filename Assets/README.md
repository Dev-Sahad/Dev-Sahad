# Asset Catalog

| File | Type | Source or generator |
|---|---|---|
| `PP.png` | Source image | Maintainer-provided profile photograph |
| `pixel-profile.json` | Generated data | `node scripts/analyze-profile-image.js` |
| `pixel-profile.svg` | Generated card | `node scripts/analyze-profile-image.js` |
| `trophy-template.svg` | Source template | Used by `scripts/generate-trophy.js` |
| `trophy.svg` | Generated card | GitHub Trophy workflow |
| `top-languages.svg` | Generated card | Generate Top Languages workflow |

Generated files are committed intentionally so the profile has stable local assets. Do not hand-edit generated output; update its source or generator and regenerate it.

All new images must have meaningful alternative text where they are embedded. Keep binary images reasonably sized and use SVG for generated cards where practical.
