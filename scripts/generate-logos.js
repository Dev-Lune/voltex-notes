/**
 * Voltex Notes — Logo Generator
 * Generates SVG, favicon, and apple-touch-icon from the Voltex brand mark.
 * Run: node scripts/generate-logos.js
 */

const fs = require("fs");
const path = require("path");

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

// ─── Generate ICO from an SVG string (simple BMP-based ICO) ──────────────────
function svgToIco(svgString, size) {
  // We'll create a minimal ICO file that embeds the SVG as a PNG placeholder
  // For a real build, use sharp or canvas. For now, embed SVG directly.
  // Browsers support SVG favicons with <link rel="icon" type="image/svg+xml">
  return null; // We'll use SVG favicon instead
}

// ─── Write files ──────────────────────────────────────────────────────────────
const files = [
  ["icon.svg", monoSvg],
  ["voltex-icon.svg", iconSvg],
  ["favicon.svg", faviconSvg],
  ["icon-dark-32x32.svg", dark32Svg],
  ["icon-light-32x32.svg", light32Svg],
];

for (const [name, content] of files) {
  const filePath = path.join(PUBLIC, name);
  fs.writeFileSync(filePath, content.trim(), "utf-8");
  console.log(`✓ ${name}`);
}

// Generate a rich web manifest
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
    { src: "/voltex-icon.svg", sizes: "512x512", type: "image/svg+xml", purpose: "any" },
    { src: "/icon.svg", sizes: "180x180", type: "image/svg+xml", purpose: "maskable" },
    { src: "/icon-dark-32x32.svg", sizes: "32x32", type: "image/svg+xml" },
    { src: "/favicon.svg", sizes: "32x32", type: "image/svg+xml" },
  ],
  shortcuts: [
    { name: "New Note", short_name: "New", url: "/?action=new-note", icons: [{ src: "/favicon.svg", sizes: "32x32" }] },
    { name: "Graph View", short_name: "Graph", url: "/?view=graph", icons: [{ src: "/favicon.svg", sizes: "32x32" }] },
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

console.log("\nDone! All Voltex Notes assets generated in /public");
