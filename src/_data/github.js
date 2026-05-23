// Build-time fetch of the user's recently-starred GitHub repos.
// Cached for 30 minutes so repeated builds don't burn the 60 req/h
// unauthenticated rate limit. Set GITHUB_FETCH_DISABLE=1 to skip,
// or GITHUB_TOKEN (any classic PAT with public-repo scope) to raise
// the limit to 5000/h on shared CI.

const Fetch = require("@11ty/eleventy-fetch");
const site = require("./site");

const username =
  (site.social &&
    site.social.github &&
    site.social.github.replace(/^https?:\/\/github\.com\//, "")) ||
  "ninadingole";

const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

function headers() {
  const h = {
    "User-Agent": "iamninad.com-build",
    // The `star+json` mediatype returns each row as
    // { starred_at, repo: {...} } instead of just the repo object,
    // so we can show "starred 2d ago".
    "Accept": "application/vnd.github.star+json",
  };
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

function shape(rows) {
  if (!Array.isArray(rows)) return [];
  return rows
    .filter(r => r && r.repo)
    .map(r => ({
      starredAt: r.starred_at,
      name: r.repo.full_name || r.repo.name,
      url: r.repo.html_url,
      description: r.repo.description || "",
      language: r.repo.language || "",
      stars: r.repo.stargazers_count || 0,
    }))
    .slice(0, 12);
}

module.exports = async function () {
  if (process.env.GITHUB_FETCH_DISABLE === "1") {
    return { username, stars: [], fetchedAt: null };
  }
  try {
    const rows = await Fetch(
      `https://api.github.com/users/${username}/starred?sort=created&direction=desc&per_page=12`,
      {
        duration: "30m",
        type: "json",
        fetchOptions: { headers: headers() },
      }
    );
    return {
      username,
      stars: shape(rows),
      fetchedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.warn("[github] starred fetch failed:", err.message);
    return { username, stars: [], fetchedAt: null };
  }
};
