const fs = require('fs');
const path = require('path');
const https = require('https');

const USERNAME = 'Dev-Sahad';
const TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;

if (!TOKEN) {
  console.error('Error: GITHUB_TOKEN environment variable is missing.');
  process.exit(1);
}

// GraphQL Query to pull comprehensive multi-tier profile metrics
const query = JSON.stringify({
  query: `
    query ($login: String!) {
      user(login: $login) {
        repositories(first: 100, privacy: PUBLIC, ownerAffiliations: OWNER) {
          totalCount
          nodes {
            stargazerCount
          }
        }
        followers {
          totalCount
        }
        contributionsCollection {
          totalCommitContributions
        }
      }
    }
  `,
  variables: { login: USERNAME }
});

const options = {
  hostname: 'api.github.com',
  path: '/graphql',
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${TOKEN}`,
    'User-Agent': 'NodeJS-Trophy-Generator',
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(query)
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  
  res.on('end', () => {
    try {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        throw new Error(`GitHub GraphQL request failed with HTTP ${res.statusCode}: ${data}`);
      }

      const result = JSON.parse(data);
      if (result.errors) {
        console.error('GraphQL API Error:', result.errors);
        process.exit(1);
      }

      const user = result.data?.user;
      if (!user) {
        throw new Error(`GitHub user ${USERNAME} was not found.`);
      }
      
      // Calculate data aggregations Safely
      const commits = user.contributionsCollection.totalCommitContributions || 0;
      const repos = user.repositories.totalCount || 0;
      const followers = user.followers.totalCount || 0;
      const stars = user.repositories.nodes.reduce((acc, node) => acc + node.stargazerCount, 0);

      const templatePath = path.join(__dirname, '../Assets/trophy-template.svg');
      const outputPath = path.join(__dirname, '../Assets/trophy.svg');

      if (!fs.existsSync(templatePath)) {
        throw new Error(`Trophy template is missing: ${templatePath}`);
      }

      const template = fs.readFileSync(templatePath, 'utf8');


      // Inject metrics safely into SVG structure
      const updatedSvg = template
        .replace(/{{COMMITS}}/g, commits.toLocaleString())
        .replace(/{{STARS}}/g, stars.toLocaleString())
        .replace(/{{REPOS}}/g, repos.toLocaleString())
        .replace(/{{FOLLOWERS}}/g, followers.toLocaleString());

      // Ensure directory footprint is built
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, updatedSvg, 'utf8');
      
      console.log(`🚀 Profile Trophy generated successfully at ${outputPath}`);
    } catch (err) {
      console.error('Processing Execution Error:', err);
      process.exit(1);
    }
  });
});

req.on('error', (err) => {
  console.error('Network Request Failure:', err);
  process.exit(1);
});

req.write(query);
req.end();

