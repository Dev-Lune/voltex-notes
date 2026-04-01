/**
 * Voltex Notes — Logo & Favicon Generator
 * Generates SVG, favicon.ico, PNG icons, and apple-touch-icon from the Voltex brand mark.
 * Run: node scripts/generate-logos.js
 */

const fs = require("fs");
const path = require("path");

let sharp;
try {
  sharp = require("sharp");
} catch {
  // sharp will be resolved from next's deps
  sharp = require(require.resolve("sharp", { paths: [path.join(__dirname, "..", "node_modules", "next")] }));
}

const PUBLIC = path.join(__dirname, "..", "public");

// ─── Base shape (original coordinates in viewBox 0 0 82 116) ──────────────────
const crystalAndBolt = `
  <polygon points="10,47 72,38 41,80" fill="FILL_TOP"/>
  <polygon points="72,38 80,82 41,113 41,80" fill="FILL_RIGHT"/>
  <polygon points="10,47 41,80 41,113 2,84" fill="FILL_LEFT"/>
  <path d="M 47 2 L 35 2 L 27 17 L 38 17 L 29 33 L 55 33 L 59 17 L 46 17 Z" fill="FILL_BOLT"/>`;

function colorShape(fills) {
  return crystalAndBolt
    .replace("FILL_TOP", fills.top)
    .replace("FILL_RIGHT", fills.right)
    .replace("FILL_LEFT", fills.left)
    .replace("FILL_BOLT", fills.bolt);
}

const darkColors = { top: "#40C4FF", right: "#0D47A1", left: "#1976D2", bolt: "#FFD600" };
const lightColors = { top: "#0288D1", right: "#01579B", left: "#0277BD", bolt: "#F9A825" };
const monoColors = { top: 'white" opacity="0.9', right: 'white" opacity="0.5', left: 'white" opacity="0.7', bolt: "white" };

// ─── Full-color app icon SVG (rounded square, 512x512) ────────────────────────
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#111118"/>
  <svg x="113" y="30" width="286" height="452" viewBox="0 0 82 116">
    ${colorShape(darkColors)}
  </svg>
</svg>`;

// ─── Compact square SVG for favicon (no padding, viewBox-tight) ───────────────
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 82 116">
  ${colorShape(darkColors)}
</svg>`;

// ─── Monochrome / adaptive icon ───────────────────────────────────────────────
const monoSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 82 116">
  ${colorShape(monoColors)}
</svg>`;

// ─── Dark 32x32 icon ──────────────────────────────────────────────────────────
const dark32Svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="6" fill="#111118"/>
  <svg x="7" y="2" width="18" height="28" viewBox="0 0 82 116">
    ${colorShape(darkColors)}
  </svg>
</svg>`;

// ─── Light 32x32 icon ─────────────────────────────────────────────────────────
const light32Svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="6" fill="#F0F0F5"/>
  <svg x="7" y="2" width="18" height="28" viewBox="0 0 82 116">
    ${colorShape(lightColors)}
  </svg>
</svg>`;

// ─── SVG for raster conversion (square with background) ──────────────────────
function makeSquareSvg(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#111118"/>
  <svg x="113" y="30" width="286" height="452" viewBox="0 0 82 116">
    ${colorShape(darkColors)}
  </svg>
</svg>`;
}

// ─── Generate ICO from PNG buffer ────────────────────────────────────────────
function createIco(png16, png32) {
  // ICO format: header + directory entries + image data
  const images = [
    { size: 16, data: png16 },
    { size: 32, data: png32 },
  ];
  const headerSize = 6;
  const dirEntrySize = 16;
  const dirSize = dirEntrySize * images.length;
  let offset = headerSize + dirSize;

  // Header
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // ICO type
  header.writeUInt16LE(images.length, 4); // count

  // Directory entries
  const dir = Buffer.alloc(dirSize);
  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    const o = i * dirEntrySize;
    dir.writeUInt8(img.size === 256 ? 0 : img.size, o); // width
    dir.writeUInt8(img.size === 256 ? 0 : img.size, o + 1); // height
    dir.writeUInt8(0, o + 2); // color palette
    dir.writeUInt8(0, o + 3); // reserved
    dir.writeUInt16LE(1, o + 4); // color planes
    dir.writeUInt16LE(32, o + 6); // bits per pixel
    dir.writeUInt32LE(img.data.length, o + 8); // size
    dir.writeUInt32LE(offset, o + 12); // offset
    offset += img.data.length;
  }

  return Buffer.concat([header, dir, ...images.map((i) => i.data)]);
}

// ─── Write SVG files ──────────────────────────────────────────────────────────
const svgFiles = [
  ["icon.svg", monoSvg],
  ["voltex-icon.svg", iconSvg],
  ["favicon.svg", faviconSvg],
  ["icon-dark-32x32.svg", dark32Svg],
  ["icon-light-32x32.svg", light32Svg],
];

for (const [name, content] of svgFiles) {
  const filePath = path.join(PUBLIC, name);
  fs.writeFileSync(filePath, content.trim(), "utf-8");
  console.log(`✓ ${name}`);
}

// ─── Generate raster icons (PNG + ICO) ────────────────────────────────────────
async function generateRasterIcons() {
  const sizes = [16, 32, 48, 192, 512];
  const svgBuffer = Buffer.from(makeSquareSvg(512));

  for (const size of sizes) {
    const png = await sharp(svgBuffer).resize(size, size).png().toBuffer();
    const name = `icon-${size}x${size}.png`;
    fs.writeFileSync(path.join(PUBLIC, name), png);
    console.log(`✓ ${name}`);
  }

  // Apple touch icon (180x180)
  const apple = await sharp(svgBuffer).resize(180, 180).png().toBuffer();
  fs.writeFileSync(path.join(PUBLIC, "apple-touch-icon.png"), apple);
  console.log("✓ apple-touch-icon.png");

  // favicon.ico (16 + 32)
  const png16 = await sharp(svgBuffer).resize(16, 16).png().toBuffer();
  const png32 = await sharp(svgBuffer).resize(32, 32).png().toBuffer();
  const ico = createIco(png16, png32);
  fs.writeFileSync(path.join(PUBLIC, "favicon.ico"), ico);
  console.log("✓ favicon.ico");
}

// ─── Generate manifest ───────────────────────────────────────────────────────
const manifest = {
  name: "Voltex Notes — Open-Source Knowledge Base",
  short_name: "Voltex Notes",
  description: "Open-source knowledge base with graph view, markdown editing, cloud sync, version history, and a plugin ecosystem. Built by DevLune Studios.",
  start_url: "/",
  id: "/",
  display: "standalone",
  display_override: ["window-controls-overlay", "standalone"],
  orientation: "any",
  background_color: "#0A0A0F",
  theme_color: "#1976D2",
  scope: "/",
  lang: "en",
  dir: "ltr",
  categories: ["productivity", "utilities", "education"],
  icons: [
    { src: "/icon-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "/icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    { src: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    { src: "/favicon.svg", sizes: "any", type: "image/svg+xml" },
  ],
  shortcuts: [
    { name: "New Note", short_name: "New", url: "/?action=new-note", icons: [{ src: "/icon-48x48.png", sizes: "48x48", type: "image/png" }] },
    { name: "Graph View", short_name: "Graph", url: "/?view=graph", icons: [{ src: "/icon-48x48.png", sizes: "48x48", type: "image/png" }] },
  ],
  related_applications: [],
  prefer_related_applications: false,
};

fs.writeFileSync(
  path.join(PUBLIC, "manifest.json"),
  JSON.stringify(manifest, null, 2),
  "utf-8"
);
console.log("✓ manifest.json");

// Run raster generation
generateRasterIcons()
  .then(() => console.log("\nDone! All Voltex Notes assets generated in /public"))
  .catch((err) => {
    console.error("Failed to generate raster icons:", err.message);
    console.log("\nSVG assets and manifest generated. Install sharp for PNG/ICO generation.");
  });
