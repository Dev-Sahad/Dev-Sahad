const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const errors = [];
const requiredFiles = [
  '.github/FUNDING.yml',
  '.github/PULL_REQUEST_TEMPLATE.md',
  '.github/ISSUE_TEMPLATE/bug_report.md',
  '.github/ISSUE_TEMPLATE/feature_request.md',
  '.github/ISSUE_TEMPLATE/config.yml',
  'Assets/PP.png',
  'Assets/pixel-profile.json',
  'Assets/pixel-profile.svg',
  'README.md',
  'SECURITY.md',
  'LICENSE',
];
const misplacedCommunityFiles = [
  'FUNDING.yml',
  'PULL_REQUEST_TEMPLATE.md',
  'bug_report.md',
  'feature_request.md',
  'DISCUSSION_TEMPLATE.md',
];

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === '.git' || entry.name === 'node_modules') {
      return [];
    }

    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

function relative(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function isExternal(target) {
  return /^(?:https?:|mailto:|tel:|#|\/)/i.test(target);
}

function validateLocalTarget(sourceFile, target) {
  if (!target || isExternal(target) || target.includes('${{')) {
    return;
  }

  const withoutAnchor = target.split('#')[0].split('?')[0];
  if (!withoutAnchor) {
    return;
  }

  let decodedTarget = withoutAnchor;
  try {
    decodedTarget = decodeURIComponent(withoutAnchor);
  } catch {
    // Keep the original target and let the filesystem check report it.
  }

  const resolved = path.resolve(path.dirname(sourceFile), decodedTarget);
  if (!fs.existsSync(resolved)) {
    errors.push(`${relative(sourceFile)} references missing file: ${target}`);
  }
}

const files = walk(ROOT);
const markdownFiles = files.filter((file) => file.endsWith('.md'));

for (const requiredFile of requiredFiles) {
  if (!fs.existsSync(path.join(ROOT, requiredFile))) {
    errors.push(`Required repository file is missing: ${requiredFile}`);
  }
}

const profileImage = fs.readFileSync(path.join(ROOT, 'Assets', 'PP.png'));
const pngSignature = Buffer.from('89504e470d0a1a0a', 'hex');
if (!profileImage.subarray(0, 8).equals(pngSignature)) {
  errors.push('Assets/PP.png must contain valid PNG data.');
}

for (const misplacedFile of misplacedCommunityFiles) {
  if (fs.existsSync(path.join(ROOT, misplacedFile))) {
    errors.push(`Community file is in an unsupported root location: ${misplacedFile}`);
  }
}

for (const file of markdownFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const markdownLinks = content.matchAll(/!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g);
  const htmlLinks = content.matchAll(/\b(?:href|src)=["']([^"']+)["']/gi);

  for (const match of markdownLinks) {
    validateLocalTarget(file, match[1]);
  }
  for (const match of htmlLinks) {
    validateLocalTarget(file, match[1]);
  }
}

const readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
if (/example\.com/i.test(readme)) {
  errors.push('README.md contains a placeholder example.com address.');
}

const workflowDirectory = path.join(ROOT, '.github', 'workflows');
for (const workflow of walk(workflowDirectory)) {
  const content = fs.readFileSync(workflow, 'utf8');
  if (/@latest\b/.test(content)) {
    errors.push(`${relative(workflow)} uses a mutable @latest action reference.`);
  }

  for (const match of content.matchAll(/^\s*-?\s*uses:\s*([^\s#]+)/gm)) {
    const action = match[1];
    if (action.startsWith('./') || action.startsWith('docker://')) {
      continue;
    }
    const separator = action.lastIndexOf('@');
    const reference = separator === -1 ? '' : action.slice(separator + 1);
    if (!/^[0-9a-f]{40}$/i.test(reference)) {
      errors.push(`${relative(workflow)} must pin action ${action} to a full commit SHA.`);
    }
  }
}

for (const svg of files.filter((file) => file.endsWith('.svg'))) {
  const content = fs.readFileSync(svg, 'utf8');
  if (!/<svg[\s>]/i.test(content)) {
    errors.push(`${relative(svg)} is not valid SVG content.`);
  }
  if (!svg.endsWith('trophy-template.svg') && /{{[A-Z_]+}}/.test(content)) {
    errors.push(`${relative(svg)} contains an unresolved template placeholder.`);
  }
}

if (errors.length > 0) {
  console.error('Profile validation failed:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`Profile validation passed (${markdownFiles.length} Markdown files checked).`);
