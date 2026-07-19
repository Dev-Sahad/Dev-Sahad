const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const README_PATH = path.join(ROOT, 'README.md');
const CHECK_ONLY = process.argv.includes('--check');
const DATE_PATTERN = /(<strong>Last Updated: <code>)(\d{4}-\d{2}-\d{2})(<\/code><\/strong>)/g;

try {
  const readme = fs.readFileSync(README_PATH, 'utf8');
  const matches = [...readme.matchAll(DATE_PATTERN)];
  if (matches.length !== 1) {
    throw new Error(`expected exactly one Last Updated marker, found ${matches.length}.`);
  }

  const existingDate = matches[0][2];
  if (Number.isNaN(Date.parse(`${existingDate}T00:00:00Z`))) {
    throw new Error(`README date is invalid: ${existingDate}.`);
  }

  if (CHECK_ONLY) {
    console.log(`Verified README date marker (${existingDate}).`);
  } else {
    const currentDate = new Date().toISOString().slice(0, 10);
    const updated = readme.replace(DATE_PATTERN, `$1${currentDate}$3`);
    fs.writeFileSync(README_PATH, updated, 'utf8');
    console.log(`Updated README date to ${currentDate}.`);
  }
} catch (error) {
  console.error(`README date update failed: ${error.message}`);
  process.exit(1);
}
