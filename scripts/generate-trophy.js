const fs = require('fs');
const https = require('https');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const USERNAME = 'Dev-Sahad';
const TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
const TEMPLATE_PATH = path.join(ROOT, 'Assets', 'trophy-template.svg');
const OUTPUT_PATH = path.join(ROOT, 'Assets', 'trophy.svg');
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_RESPONSE_BYTES = 1_000_000;

const payload = JSON.stringify({
  query: `
    query ($login: String!) {
      user(login: $login) {
        repositories(first: 100, privacy: PUBLIC, ownerAffiliations: OWNER) {
          totalCount
          nodes { stargazerCount }
        }
        followers { totalCount }
        contributionsCollection { totalCommitContributions }
      }
    }
  `,
  variables: { login: USERNAME },
});

function requestGithubGraphql() {
  return new Promise((resolve, reject) => {
    const request = https.request({
      hostname: 'api.github.com',
      path: '/graphql',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'User-Agent': 'Dev-Sahad-Profile-Trophy',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, (response) => {
      let body = '';
      let receivedBytes = 0;

      response.setEncoding('utf8');
      response.on('data', (chunk) => {
        receivedBytes += Buffer.byteLength(chunk);
        if (receivedBytes > MAX_RESPONSE_BYTES) {
          request.destroy(new Error('GitHub response exceeded the safe size limit.'));
          return;
        }
        body += chunk;
      });
      response.on('end', () => {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(`GitHub GraphQL request failed with HTTP ${response.statusCode}.`));
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(new Error(`GitHub returned invalid JSON: ${error.message}`));
        }
      });
    });

    request.setTimeout(REQUEST_TIMEOUT_MS, () => {
      request.destroy(new Error(`GitHub request timed out after ${REQUEST_TIMEOUT_MS / 1000} seconds.`));
    });
    request.on('error', reject);
    request.end(payload);
  });
}

function renderTrophy(user) {
  if (!fs.existsSync(TEMPLATE_PATH)) {
    throw new Error(`Trophy template is missing: ${path.relative(ROOT, TEMPLATE_PATH)}.`);
  }

  const repositories = user.repositories?.nodes || [];
  const values = {
    COMMITS: user.contributionsCollection?.totalCommitContributions || 0,
    STARS: repositories.reduce((total, repository) => total + (repository.stargazerCount || 0), 0),
    REPOS: user.repositories?.totalCount || 0,
    FOLLOWERS: user.followers?.totalCount || 0,
  };

  let output = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  for (const [placeholder, value] of Object.entries(values)) {
    output = output.replaceAll(`{{${placeholder}}}`, Number(value).toLocaleString('en-US'));
  }
  if (/{{[A-Z_]+}}/.test(output)) {
    throw new Error('Trophy template contains an unresolved placeholder.');
  }
  return output;
}

async function main() {
  if (!TOKEN) {
    throw new Error('GH_TOKEN or GITHUB_TOKEN is required.');
  }

  const result = await requestGithubGraphql();
  if (result.errors?.length) {
    throw new Error(`GitHub GraphQL error: ${result.errors.map((error) => error.message).join('; ')}`);
  }
  if (!result.data?.user) {
    throw new Error(`GitHub user ${USERNAME} was not found.`);
  }

  fs.writeFileSync(OUTPUT_PATH, renderTrophy(result.data.user), 'utf8');
  console.log(`Generated ${path.relative(ROOT, OUTPUT_PATH)}.`);
}

main().catch((error) => {
  console.error(`Trophy generation failed: ${error.message}`);
  process.exit(1);
});
