// scripts/make-terminal-svg.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.join(__dirname, "..", "terminal.svg");

const FORTUNES = [
  "Keep it simple.",
  "Code. Commit. Repeat.",
  "In Linux we trust.",
  "Hack the planet.",
];

function generateTerminalData() {
  return {
    uptime: Math.floor(Math.random() * 9999),
    load: (Math.random() * 2).toFixed(2),
    fortune: FORTUNES[Math.floor(Math.random() * FORTUNES.length)],
  };
}

function buildLines({ uptime, load, fortune }) {
  return [
    "$ whoami",
    "Dev-Sahad",
    "",
    "$ hostnamectl",
    " Static hostname: devbox",
    " Operating Sys  : GNU/Linux (GitHub)",
    " Kernel         : 5.x (container)",
    " Shell          : bash 5.x",
    "",
    "$ uptime",
    ` up ${uptime} hours, load average: ${load}, ${load}, ${load}`,
    "",
    "$ fortune",
    fortune,
    "",
    "$ exit",
    "logout",
  ];
}

function escapeXml(str) {
  return str.replace(/[<>&'"]/g, (c) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    "'": "&apos;",
    '"': "&quot;",
  }[c]));
}

function buildSvg(lines) {
  const height = lines.length * 24 + 60;
  const header = `<svg width="720" height="${height}" xmlns="http://www.w3.org/2000/svg">
<style><![CDATA[
@import url('https://fonts.googleapis.com/css2?family=Fira+Code&display=swap');
text { font-family: 'Fira Code', monospace; font-size: 16px; fill: #00FF66; white-space: pre; }
rect { fill: #000; }
@keyframes fadeIn { to { opacity: 1; } }
]]></style>
<rect width="100%" height="100%"/>
`;

  let y = 40;
  const body = lines
    .map((line, i) => {
      const delay = (i * 0.3).toFixed(1);
      const svgLine = `<text x="20" y="${y}" opacity="0" style="animation: fadeIn 0.4s ${delay}s forwards">${escapeXml(line)}</text>`;
      y += 24;
      return svgLine;
    })
    .join("\n");

  return `${header}${body}\n</svg>`;
}

function main() {
  try {
    const data = generateTerminalData();
    const lines = buildLines(data);
    const svg = buildSvg(lines);

    fs.writeFileSync(OUTPUT_PATH, svg, "utf8");
    console.log(`Generated: ${OUTPUT_PATH}`);
  } catch (err) {
    console.error("Failed to generate terminal.svg:", err.message);
    process.exit(1);
  }
}

main();