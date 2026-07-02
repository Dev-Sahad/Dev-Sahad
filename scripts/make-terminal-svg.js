// scripts/make-terminal-svg.js
import fs from "fs";

const uptime = Math.floor(Math.random() * 9999);
const load = (Math.random() * 2).toFixed(2);
const fortunes = [
  "Keep it simple.",
  "Code. Commit. Repeat.",
  "In Linux we trust.",
  "Hack the planet.",
];
const fortune = fortunes[Math.floor(Math.random() * fortunes.length)];

const lines = [
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

const svgHeader = `
<svg width="720" height="${lines.length * 24 + 60}" xmlns="http://www.w3.org/2000/svg">
<style>
@import url('https://fonts.googleapis.com/css2?family=Fira+Code&display=swap');
text { font-family: 'Fira Code', monospace; font-size: 16px; fill: #00FF66; white-space: pre; }
rect { fill: #000; }
@keyframes fadeIn { to { opacity: 1; } }
</style>
<rect width="100%" height="100%"/>
`;

let y = 40;
let svgContent = "";
lines.forEach((l, i) => {
  const delay = i * 0.3;
  svgContent += `<text x="20" y="${y}" opacity="0" style="animation: fadeIn 0.4s ${delay}s forwards">${l}</text>\n`;
  y += 24;
});

const svgFooter = "</svg>";
fs.writeFileSync("terminal.svg", svgHeader + svgContent + svgFooter);
console.log("✅ Generated terminal.svg");
