const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT_PATH = path.join(ROOT, 'terminal.svg');
const CHECK_ONLY = process.argv.includes('--check');

const TERMINAL_LINES = [
  '$ whoami',
  'Dev-Sahad',
  '',
  '$ profile --focus',
  ' Automation · Bots · AI-assisted tools',
  ' Web applications · Community systems',
  '',
  '$ repository --health',
  ' Validation     : automated',
  ' Generated data : reproducible',
  ' Workflows      : least privilege',
  '',
  '$ contact --github',
  ' https://github.com/Dev-Sahad',
  '',
  '$ exit',
  'logout',
];

function escapeXml(value) {
  return value.replace(/[<>&'"]/g, (character) => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    "'": '&apos;',
    '"': '&quot;',
  })[character]);
}

function buildSvg(lines) {
  const lineHeight = 24;
  const height = lines.length * lineHeight + 58;
  const body = lines.map((line, index) => (
    `  <text x="22" y="${40 + index * lineHeight}" class="line">${escapeXml(line)}</text>`
  )).join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="${height}" viewBox="0 0 720 ${height}" role="img" aria-labelledby="title description">
  <title id="title">Dev-Sahad terminal profile</title>
  <desc id="description">A terminal-style summary of Dev-Sahad's development focus and repository practices.</desc>
  <rect width="720" height="${height}" rx="16" fill="#020617"/>
  <rect x="1" y="1" width="718" height="${height - 2}" rx="15" fill="none" stroke="#1e293b"/>
  <style>
    .line { fill: #22c55e; font: 16px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; white-space: pre; }
  </style>
${body}
</svg>
`;
}

function normalizeLineEndings(value) {
  return value.replace(/\r\n/g, '\n');
}

try {
  const output = buildSvg(TERMINAL_LINES);
  if (CHECK_ONLY) {
    if (!fs.existsSync(OUTPUT_PATH) || normalizeLineEndings(fs.readFileSync(OUTPUT_PATH, 'utf8')) !== output) {
      throw new Error('terminal.svg is stale. Run npm run generate:terminal.');
    }
    console.log('Verified terminal.svg.');
  } else {
    fs.writeFileSync(OUTPUT_PATH, output, 'utf8');
    console.log(`Generated ${path.relative(ROOT, OUTPUT_PATH)}.`);
  }
} catch (error) {
  console.error(`Terminal generation failed: ${error.message}`);
  process.exit(1);
}
