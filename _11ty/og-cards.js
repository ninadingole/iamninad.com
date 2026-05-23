// Generate per-post Open Graph card images (1200×630 PNGs) at build time.
// Satori turns a small vDOM tree into SVG; sharp converts that SVG to PNG.
// Output: www/og/<slug>.png and a single www/og/default.png for landing pages.
//
// Runs from the `eleventy.after` hook so it sees finished post data.
// Set OG_CARDS_DISABLE=1 to skip locally.

const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");
const sharp = require("sharp");

const FONT_PATH = "node_modules/@fontsource/jetbrains-mono/files";
const FONT_500 = fs.readFileSync(path.join(FONT_PATH, "jetbrains-mono-latin-500-normal.woff"));
const FONT_700 = fs.readFileSync(path.join(FONT_PATH, "jetbrains-mono-latin-700-normal.woff"));

// Terminal palette mirrors src/_includes/assets/css/variables.css :root values.
const COLOURS = {
  bg: "#0c0d0a",
  surface: "#111310",
  fg: "#dce4d3",
  fgSoft: "#8a9180",
  fgDim: "#525847",
  rule: "#1f221c",
  accent: "#7ed79f",
  warn: "#d9a64e",
};

const W = 1200;
const H = 630;

function truncate(s, max) {
  if (!s) return "";
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + "…";
}

function tree({ slug, title, date, readMin, site }) {
  const safeTitle = truncate(title || "", 90);
  return {
    type: "div",
    props: {
      style: {
        width: W + "px",
        height: H + "px",
        background: COLOURS.bg,
        color: COLOURS.fg,
        display: "flex",
        flexDirection: "column",
        padding: "64px 72px",
        fontFamily: "JetBrains Mono",
        position: "relative",
      },
      children: [
        // accent stripe on the left
        {
          type: "div",
          props: {
            style: {
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: "8px",
              background: COLOURS.accent,
            },
          },
        },
        // window-bar dots, top right
        {
          type: "div",
          props: {
            style: {
              position: "absolute",
              top: "44px",
              right: "72px",
              display: "flex",
              gap: "10px",
            },
            children: [
              dot("#e26b5f"),
              dot(COLOURS.warn),
              dot(COLOURS.accent),
            ],
          },
        },
        // shell prompt
        {
          type: "div",
          props: {
            style: { display: "flex", fontSize: "22px", color: COLOURS.fgDim },
            children: [
              { type: "span", props: { style: { color: COLOURS.accent }, children: "$" } },
              { type: "span", props: { style: { marginLeft: "10px" }, children: "cat ~/posts/" + slug + ".md" } },
            ],
          },
        },
        // title — pushed to the bottom of the flex column
        {
          type: "div",
          props: {
            style: {
              fontSize: safeTitle.length > 48 ? "54px" : "64px",
              fontWeight: 700,
              lineHeight: 1.12,
              color: COLOURS.fg,
              marginTop: "auto",
              letterSpacing: "-0.02em",
            },
            children: safeTitle,
          },
        },
        // meta row
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              gap: "16px",
              fontSize: "22px",
              color: COLOURS.fgSoft,
              marginTop: "20px",
            },
            children: [
              { type: "span", props: { children: date } },
              { type: "span", props: { style: { color: COLOURS.fgDim }, children: "·" } },
              { type: "span", props: { children: readMin + " min read" } },
            ],
          },
        },
        // footer rule + signature
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              fontSize: "22px",
              color: COLOURS.fgDim,
              marginTop: "32px",
              borderTop: "1px solid " + COLOURS.rule,
              paddingTop: "20px",
            },
            children: [
              { type: "span", props: { style: { color: COLOURS.accent }, children: "$" } },
              { type: "span", props: { style: { marginLeft: "10px" }, children: site.profile.handle + "@" + site.profile.host + " · " + site.domain } },
            ],
          },
        },
      ],
    },
  };
}

function dot(color) {
  return {
    type: "div",
    props: {
      style: {
        width: "14px",
        height: "14px",
        borderRadius: "999px",
        background: color,
      },
    },
  };
}

const fontsConfig = [
  { name: "JetBrains Mono", data: FONT_500, weight: 500, style: "normal" },
  { name: "JetBrains Mono", data: FONT_700, weight: 700, style: "normal" },
];

async function renderCard(spec) {
  // Lazy-load satori; ESM-only module so we use dynamic import.
  const { default: satori } = await import("satori");
  const svg = await satori(tree(spec), { width: W, height: H, fonts: fontsConfig });
  return sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
}

async function generateForPosts(outputDir, site) {
  const postsDir = "src/posts";
  const files = fs.readdirSync(postsDir).filter(f => f.endsWith(".md"));
  fs.mkdirSync(outputDir, { recursive: true });

  for (const file of files) {
    const slug = file.replace(/\.md$/, "");
    const raw = fs.readFileSync(path.join(postsDir, file), "utf8");
    const { data, content } = matter(raw);
    if (data.draft) continue;
    const words = content.replace(/[^\w\s]/g, "").split(/\s+/).filter(Boolean).length;
    const readMin = Math.max(1, Math.round(words / 220));
    const date =
      data.date instanceof Date
        ? data.date.toISOString().slice(0, 10)
        : (typeof data.date === "string" ? data.date.slice(0, 10) : "");

    const outPath = path.join(outputDir, slug + ".png");
    const png = await renderCard({
      slug,
      title: data.title || slug,
      date,
      readMin,
      site,
    });
    fs.writeFileSync(outPath, png);
  }

  // Default OG card for home / about / archive / etc.
  const defaultPng = await renderCard({
    slug: "index",
    title: site.title || site.profile.name,
    date: new Date().toISOString().slice(0, 10),
    readMin: site.profile.yearsWriting + "y archive",
    site,
  });
  fs.writeFileSync(path.join(outputDir, "default.png"), defaultPng);
}

module.exports = { generateForPosts };
