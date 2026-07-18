const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.resolve(__dirname, '..');
const SOURCE = path.join(ROOT, 'Assets', 'PP.png');
const JSON_OUTPUT = path.join(ROOT, 'Assets', 'pixel-profile.json');
const SVG_OUTPUT = path.join(ROOT, 'Assets', 'pixel-profile.svg');
const CHECK_ONLY = process.argv.includes('--check');
const PNG_SIGNATURE = Buffer.from('89504e470d0a1a0a', 'hex');

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function parsePng(buffer) {
  if (!buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error('Assets/PP.png does not contain a valid PNG signature.');
  }

  let offset = 8;
  let header;
  let palette;
  const imageData = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const typeBuffer = buffer.subarray(offset + 4, offset + 8);
    const type = typeBuffer.toString('ascii');
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    const storedCrc = buffer.readUInt32BE(offset + 8 + length);
    const calculatedCrc = crc32(Buffer.concat([typeBuffer, data]));

    if (storedCrc !== calculatedCrc) {
      throw new Error(`PNG chunk ${type} failed its CRC check.`);
    }

    if (type === 'IHDR') {
      header = {
        width: data.readUInt32BE(0),
        height: data.readUInt32BE(4),
        bitDepth: data[8],
        colorType: data[9],
        compression: data[10],
        filter: data[11],
        interlace: data[12],
      };
    } else if (type === 'PLTE') {
      palette = data;
    } else if (type === 'IDAT') {
      imageData.push(data);
    } else if (type === 'IEND') {
      break;
    }

    offset += length + 12;
  }

  if (!header || imageData.length === 0) {
    throw new Error('PNG is missing required IHDR or IDAT data.');
  }
  if (header.bitDepth !== 8 || header.interlace !== 0) {
    throw new Error('Analyzer supports non-interlaced, 8-bit PNG images.');
  }

  const channelsByType = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };
  const channels = channelsByType[header.colorType];
  if (!channels) {
    throw new Error(`Unsupported PNG color type: ${header.colorType}.`);
  }
  if (header.colorType === 3 && !palette) {
    throw new Error('Indexed PNG is missing its palette.');
  }

  const rowBytes = header.width * channels;
  const inflated = zlib.inflateSync(Buffer.concat(imageData));
  const expectedBytes = (rowBytes + 1) * header.height;
  if (inflated.length !== expectedBytes) {
    throw new Error(`Unexpected pixel data length: ${inflated.length}; expected ${expectedBytes}.`);
  }

  const pixels = Buffer.alloc(rowBytes * header.height);
  const paeth = (a, b, c) => {
    const estimate = a + b - c;
    const distanceA = Math.abs(estimate - a);
    const distanceB = Math.abs(estimate - b);
    const distanceC = Math.abs(estimate - c);
    return distanceA <= distanceB && distanceA <= distanceC ? a : distanceB <= distanceC ? b : c;
  };

  for (let y = 0; y < header.height; y += 1) {
    const inputStart = y * (rowBytes + 1);
    const filterType = inflated[inputStart];
    const outputStart = y * rowBytes;
    for (let x = 0; x < rowBytes; x += 1) {
      const raw = inflated[inputStart + 1 + x];
      const left = x >= channels ? pixels[outputStart + x - channels] : 0;
      const up = y > 0 ? pixels[outputStart - rowBytes + x] : 0;
      const upperLeft = y > 0 && x >= channels ? pixels[outputStart - rowBytes + x - channels] : 0;
      let value;
      if (filterType === 0) value = raw;
      else if (filterType === 1) value = raw + left;
      else if (filterType === 2) value = raw + up;
      else if (filterType === 3) value = raw + Math.floor((left + up) / 2);
      else if (filterType === 4) value = raw + paeth(left, up, upperLeft);
      else throw new Error(`Unsupported PNG filter type: ${filterType}.`);
      pixels[outputStart + x] = value & 0xff;
    }
  }

  return { ...header, channels, palette, pixels };
}

function greatestCommonDivisor(a, b) {
  return b === 0 ? a : greatestCommonDivisor(b, a % b);
}

function analyze(buffer, png) {
  const totalPixels = png.width * png.height;
  let luminanceSum = 0;
  let luminanceSquaredSum = 0;
  let monochromePixels = 0;
  const paletteCounts = new Map();

  for (let index = 0; index < png.pixels.length; index += png.channels) {
    let red;
    let green;
    let blue;
    if (png.colorType === 0 || png.colorType === 4) {
      red = green = blue = png.pixels[index];
    } else if (png.colorType === 3) {
      const paletteIndex = png.pixels[index] * 3;
      red = png.palette[paletteIndex];
      green = png.palette[paletteIndex + 1];
      blue = png.palette[paletteIndex + 2];
    } else {
      red = png.pixels[index];
      green = png.pixels[index + 1];
      blue = png.pixels[index + 2];
    }

    const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
    luminanceSum += luminance;
    luminanceSquaredSum += luminance ** 2;
    if (Math.max(red, green, blue) - Math.min(red, green, blue) <= 8) monochromePixels += 1;

    const quantize = (value) => Math.min(255, Math.round(value / 32) * 32);
    const color = [quantize(red), quantize(green), quantize(blue)]
      .map((value) => value.toString(16).padStart(2, '0'))
      .join('');
    paletteCounts.set(color, (paletteCounts.get(color) || 0) + 1);
  }

  const averageLuminance = luminanceSum / totalPixels;
  const variance = Math.max(0, luminanceSquaredSum / totalPixels - averageLuminance ** 2);
  const divisor = greatestCommonDivisor(png.width, png.height);
  const dominantPalette = [...paletteCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([hex, count]) => ({ hex: `#${hex.toUpperCase()}`, share: Number(((count / totalPixels) * 100).toFixed(1)) }));

  return {
    source: 'Assets/PP.png',
    format: 'PNG',
    width: png.width,
    height: png.height,
    aspectRatio: `${png.width / divisor}:${png.height / divisor}`,
    totalPixels,
    fileSizeBytes: buffer.length,
    averageLuminancePercent: Number(((averageLuminance / 255) * 100).toFixed(1)),
    contrastPercent: Number(((Math.sqrt(variance) / 127.5) * 100).toFixed(1)),
    monochromePixelsPercent: Number(((monochromePixels / totalPixels) * 100).toFixed(1)),
    dominantPalette,
    sha256: crypto.createHash('sha256').update(buffer).digest('hex'),
  };
}

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} KiB`;
}

function renderSvg(report) {
  const palette = report.dominantPalette.map((color, index) => {
    const x = 415 + index * 66;
    return `<rect x="${x}" y="263" width="54" height="34" rx="8" fill="${color.hex}" stroke="#64748b"/><text x="${x + 27}" y="315" text-anchor="middle" class="palette">${color.hex}</text>`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="350" viewBox="0 0 800 350" role="img" aria-labelledby="title description">
  <title id="title">Pixel profile analysis for PP.png</title>
  <desc id="description">Technical image metrics including resolution, luminance, contrast, monochrome coverage, and dominant colors.</desc>
  <defs>
    <linearGradient id="background" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0f172a"/>
      <stop offset="0.55" stop-color="#172554"/>
      <stop offset="1" stop-color="#0f172a"/>
    </linearGradient>
    <style>
      .title { fill: #f8fafc; font: 700 25px 'Segoe UI', sans-serif; }
      .subtitle { fill: #93c5fd; font: 500 13px 'Segoe UI', sans-serif; letter-spacing: 1px; }
      .label { fill: #94a3b8; font: 500 12px 'Segoe UI', sans-serif; }
      .value { fill: #f8fafc; font: 700 21px 'Segoe UI', sans-serif; }
      .palette { fill: #cbd5e1; font: 500 10px 'Consolas', monospace; }
      .footer { fill: #64748b; font: 500 11px 'Segoe UI', sans-serif; }
    </style>
  </defs>
  <rect width="800" height="350" rx="22" fill="url(#background)"/>
  <rect x="1" y="1" width="798" height="348" rx="21" fill="none" stroke="#334155"/>
  <text x="38" y="48" class="title">PIXEL PROFILE ANALYSIS</text>
  <text x="38" y="72" class="subtitle">DETERMINISTIC · LOCAL · PRIVACY-SAFE</text>
  <g transform="translate(38 103)">
    <rect width="224" height="118" rx="14" fill="#0f172a" stroke="#334155"/>
    <text x="18" y="31" class="label">RESOLUTION</text>
    <text x="18" y="60" class="value">${report.width} × ${report.height}</text>
    <text x="18" y="87" class="label">${report.totalPixels.toLocaleString('en-US')} pixels · ${report.aspectRatio}</text>
    <text x="18" y="105" class="label">${formatBytes(report.fileSizeBytes)} · PNG</text>
  </g>
  <g transform="translate(278 103)">
    <rect width="224" height="118" rx="14" fill="#0f172a" stroke="#334155"/>
    <text x="18" y="31" class="label">LIGHT &amp; CONTRAST</text>
    <text x="18" y="60" class="value">${report.averageLuminancePercent}% light</text>
    <text x="18" y="87" class="label">${report.contrastPercent}% normalized contrast</text>
  </g>
  <g transform="translate(518 103)">
    <rect width="244" height="118" rx="14" fill="#0f172a" stroke="#334155"/>
    <text x="18" y="31" class="label">COLOR CHARACTER</text>
    <text x="18" y="60" class="value">${report.monochromePixelsPercent}% neutral</text>
    <text x="18" y="87" class="label">Pixel-channel analysis only</text>
  </g>
  <text x="38" y="280" class="label">SHA-256</text>
  <text x="38" y="305" class="value">${report.sha256.slice(0, 12)}</text>
  <text x="415" y="248" class="label">DOMINANT PALETTE</text>
  ${palette}
  <text x="38" y="333" class="footer">Generated by scripts/analyze-profile-image.js · No facial recognition or biometric inference</text>
</svg>
`;
}

function writeOrCheck(filePath, content) {
  if (CHECK_ONLY) {
    if (!fs.existsSync(filePath) || fs.readFileSync(filePath, 'utf8') !== content) {
      throw new Error(`${path.relative(ROOT, filePath)} is stale. Run node scripts/analyze-profile-image.js.`);
    }
    return;
  }
  fs.writeFileSync(filePath, content);
}

try {
  const source = fs.readFileSync(SOURCE);
  const report = analyze(source, parsePng(source));
  writeOrCheck(JSON_OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
  writeOrCheck(SVG_OUTPUT, renderSvg(report));
  console.log(`${CHECK_ONLY ? 'Verified' : 'Generated'} pixel profile: ${report.width}×${report.height}, ${report.totalPixels.toLocaleString('en-US')} pixels.`);
} catch (error) {
  console.error(`Pixel profile analysis failed: ${error.message}`);
  process.exit(1);
}
