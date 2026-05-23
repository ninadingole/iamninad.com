const firstPostYear = 2017;
const currentYear = new Date().getFullYear();

const twitterHandle = "@iamneenad";
const fullName = "Neenad Ingole";

module.exports = {
  title: "iamninad",
  description: "Build, break and Improve.",
  url: "https://iamninad.com",
  domain: "iamninad.com",
  baseUrl: "/",
  maxPostsInHomePage: 10,
  author: fullName.toLowerCase(),
  language: "en",
  themeColor: "#0c0d0a",

  gaAnalytics: null,
  currentYear,
  includeServiceWorker: false,

  // Third-party IDs — referenced by templates and JS via Nunjucks interpolation.
  analytics: {
    heap: "88898451",
    gtm: "GTM-PHB9929",
    adsPub: "ca-pub-1093249658913290",
  },

  disqus: {
    shortname: "iamninad",
  },

  seo: {
    twitterHandle: twitterHandle.replace(/^@/, ""), // SEO plugin wants the handle without @
  },

  // PWA manifest — rendered into /manifest.json via src/manifest.json.njk
  manifest: {
    name: "iamninad",
    shortName: "iamninad",
    backgroundColor: "#0c0d0a",
    themeColor: "#0c0d0a",
  },

  profile: {
    handle: "ninad",
    host: "blog",
    name: fullName,
    twitter: twitterHandle,
    authorTag: `${fullName} <${twitterHandle}>`, // used in post meta-block
    role: "Founding Engineer",
    location: "Berlin, DE",
    yearsWriting: currentYear - 2014,
    bio:
      "Founding engineer in Berlin. I write about backend systems and the unromantic work " +
      "that comes with them — mostly in Go these days, but the archive runs wider. " +
      "Usually it's the post I wanted to find three hours into the same problem.",
    // About-page paragraphs. First is primary, the rest are softer.
    // These are plain copy — if you change location or job title, update them here too.
    aboutCopy: [
      "I'm Neenad. Founding engineer in Berlin. I've been writing here since 2017 about backend systems and the unromantic work of moving data between them. These days I mostly code in Go, but the archive isn't picky — there's Java, Scala, Node, Postgres, Kafka, Docker, whatever a given week happened to push me into.",
      "Most of what's here started as a bug at work. The 'Billion Dollar Go Mistake' posts came out of one of those — a transaction-timeout pattern that nearly cost real money before a Prometheus alert caught it. Other things are smaller. How I actually test UUID generation. A Compose file for Debezium and Postgres that doesn't make you cry. A one-line git trailer that quietly fixes the credit problem when you pair-program.",
      "I care about tests, less for ideology and more because production has bitten me a few times. Half of what's here could be retitled \"something I wish I'd written a test for first.\" The rest is notes I wanted to find when I was three hours into the same problem. If something on this site saves you that third hour, that's the whole point.",
    ],
    languages: ["go", "postgres", "docker", "ts"],
    os: "macOS+linux",
    shell: "fish",
    version: "v2.6.0",
  },

  socials: [
    { label: "github",    handle: "@ninadingole", url: "https://github.com/ninadingole" },
    { label: "twitter",   handle: "@iamneenad",   url: "https://twitter.com/iamneenad" },
    { label: "medium",    handle: "@iamninad",    url: "https://medium.com/@iamninad" },
    { label: "sponsor",   handle: "github/sponsors", url: "https://github.com/sponsors/ninadingole" },
    { label: "rss",       handle: "/feed.xml",    url: "/feed.xml" },
  ],

  stack: [
    { name: "go",         level: 95 },
    { name: "postgres",   level: 88 },
    { name: "docker",     level: 82 },
    { name: "kafka",      level: 70 },
    { name: "kubernetes", level: 66 },
    { name: "typescript", level: 75 },
    { name: "terraform",  level: 60 },
  ],

  // Day-to-day AI tooling. Surfaced on the home profile card,
  // the About page (`$ ls ~/ai/`), and the footer disclosure.
  ai: {
    headline: "vibe-coded with claude-code",
    daily: ["claude-code", "codex", "conductor"],
    tools: [
      { name: "claude-code", level: 92, role: "primary pair-programmer" },
      { name: "codex",       level: 78, role: "alt suggestions / scaffolding" },
      { name: "cursor",      level: 65, role: "inline edits" },
      { name: "conductor",   level: 50, role: "long-running task orchestration" },
    ],
  },

  social: {
    twitter: "https://twitter.com/iamneenad",
    github: "https://github.com/ninadingole",
    sponser: "https://github.com/sponsors/ninadingole",
    newsletter: "https://medium.com/@iamninad/subscribe",
  },
};
