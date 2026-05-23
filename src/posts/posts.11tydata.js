// Directory data for src/posts/* — applies to every post.
// Precomputes `words` and `readMin` from the raw markdown so other templates
// (archive, home table, related posts, search index) can read these as plain
// data without depending on rendered-templateContent order during the build.

const fs = require('fs');
const { execFileSync } = require('child_process');

// Build-time cache so we don't fork `git` once per post per build.
const mtimeCache = new Map();

function gitLastModified(inputPath) {
  if (!inputPath) return null;
  if (mtimeCache.has(inputPath)) return mtimeCache.get(inputPath);
  let iso = null;
  try {
    const out = execFileSync(
      'git',
      ['log', '-1', '--pretty=%cI', '--', inputPath],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
    ).trim();
    iso = out || null;
  } catch (e) {
    // No git, shallow clone with the file outside history, etc.
    iso = null;
  }
  if (!iso) {
    // Fallback: filesystem mtime (less reliable but at least non-null).
    try {
      const st = fs.statSync(inputPath);
      iso = st.mtime.toISOString();
    } catch (e) {}
  }
  mtimeCache.set(inputPath, iso);
  return iso;
}

function bodyWords(inputPath) {
  if (!inputPath) return 0;
  let raw;
  try {
    raw = fs.readFileSync(inputPath, 'utf8');
  } catch (e) {
    return 0;
  }
  // Strip YAML frontmatter
  const body = raw.replace(/^---[\s\S]+?---\s*/, '');
  // Strip fenced code blocks and inline code
  const noCode = body.replace(/```[\s\S]+?```/g, ' ').replace(/`[^`]*`/g, ' ');
  // Strip remaining markdown punctuation
  const text = noCode.replace(/[#*_>\[\]()!{}.,?\-]/g, ' ');
  return text.split(/\s+/).filter(Boolean).length;
}

function readMinutes(words) {
  return Math.max(1, Math.round(words / 220));
}

module.exports = {
  layout: 'layouts/post',
  eleventyComputed: {
    words: data => bodyWords(data.page && data.page.inputPath),
    readMin: data => readMinutes(bodyWords(data.page && data.page.inputPath)),
    lastModified: data => gitLastModified(data.page && data.page.inputPath),
  },
};
