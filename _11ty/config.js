const fs = require("fs");

const pluginRss = require('@11ty/eleventy-plugin-rss');
const syntaxHighlight = require('@11ty/eleventy-plugin-syntaxhighlight');
const { eleventyImageTransformPlugin } = require('@11ty/eleventy-img');
const markdownIt = require("markdown-it");
const markdownItAnchor = require("markdown-it-anchor");
const markdownItEmoji = require('markdown-it-emoji');
const readingTime = require('eleventy-plugin-reading-time');
const pluginSEO = require("eleventy-plugin-seo");
const markdownItContainer = require('markdown-it-container')
const markdownItFootnote = require('markdown-it-footnote');
const markdownItAttributes = require('markdown-it-attrs');
const markdownItAbbr = require('markdown-it-abbr');
const markdownItSpan = require('markdown-it-span');
const eleventyNavigationPlugin = require("@11ty/eleventy-navigation");
const mdfigcaption = require("markdown-it-image-figures");

const globalFilters = require('./filters');
const globalShortCodes = require('./shortcodes');
const nunjucksShortCodes = require('../src/_includes/nunjucks/sortcodes');
const nunjucksFilters = require('../src/_includes/nunjucks/filters');
const site = require('../src/_data/site');

module.exports = function (eleventyConfig) {

    eleventyConfig.setDataDeepMerge(true);

    // After every Eleventy build:
    //   1. Generate per-post Open Graph card images (1200x630 PNGs).
    //   2. Rebuild the Pagefind index so the ⌘K palette can do
    //      full-content search.
    // Either step can be skipped with OG_CARDS_DISABLE=1 / PAGEFIND_DISABLE=1.
    eleventyConfig.on("eleventy.after", async () => {
        if (process.env.OG_CARDS_DISABLE !== "1") {
            try {
                const { generateForPosts } = require("./og-cards");
                const t0 = Date.now();
                await generateForPosts("./www/og", site);
                console.log(`[og] cards generated in ${Date.now() - t0}ms`);
            } catch (err) {
                console.warn("[og] generation skipped:", err.message);
            }
        }
        if (process.env.PAGEFIND_DISABLE !== "1") {
            try {
                const { execFile } = require("child_process");
                const { promisify } = require("util");
                const exec = promisify(execFile);
                const { stderr } = await exec("npx", ["pagefind", "--site", "www", "--quiet"]);
                if (stderr) process.stderr.write(stderr);
            } catch (err) {
                console.warn("[pagefind] indexing skipped:", err.message);
            }
        }
    });

    // Filters
    Object.keys(globalFilters).forEach(filterName => {
        eleventyConfig.addFilter(filterName, globalFilters[filterName]);
    });

    // Shortcodes
    Object.keys(globalShortCodes).forEach(shortcodeName => {
        let val = globalShortCodes[shortcodeName];
        let fn = val.isPaired ? 'addPairedShortcode' : 'addShortcode';
        eleventyConfig[fn](shortcodeName, val.fn);
    });

    // Plugins
    eleventyConfig.addPlugin(pluginRss);
    eleventyConfig.addPlugin(syntaxHighlight);

    // Auto-optimise every <img> in rendered HTML: AVIF + WebP + original
    // fallback, responsive srcset, lazy + async by default. Replaces the
    // older regex-based lazyimages plugin and the manual {% resI %} flow.
    eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
        extensions: 'html',
        formats: ['avif', 'webp', 'auto'],
        widths: [400, 800, 1200, 'auto'],
        urlPath: '/images/optimized/',
        outputDir: './www/images/optimized/',
        defaultAttributes: {
            loading: 'lazy',
            decoding: 'async',
            sizes: '(max-width: 760px) 92vw, 760px',
        },
        failOnError: false,
    });


    eleventyConfig.addPlugin(readingTime);
    eleventyConfig.addPlugin(pluginSEO, {
        title: site.title,
        url: site.url,
        author: site.author,
        twitter: site.seo.twitterHandle,
        options: {
            twitterCardType: "summary_large_image",
        }
    });
    eleventyConfig.addPlugin(eleventyNavigationPlugin);
    
    // Collections
    const livePosts = post => post.date <= new Date() && !post.data.draft;
    eleventyConfig.addCollection('posts', collection => {
        return collection.getFilteredByGlob('**/posts/**/*.md').filter(livePosts).reverse();
    });
    // Drafts collection — read straight from disk so it bypasses
    // eleventyExcludeFromCollections (which posts.11tydata.js sets to
    // true for drafts to keep them out of every other collection).
    // Populated only in dev (serve/watch); always empty in prod builds.
    // Detect dev mode from argv because ELEVENTY_RUN_MODE isn't reliable
    // at config-load time for addCollection.
    const isDev = process.argv.includes('--serve') || process.argv.includes('--watch');
    eleventyConfig.addCollection('drafts', () => {
        if (!isDev) return [];
        const fs = require('fs');
        const matter = require('gray-matter');
        const postsDir = 'src/posts';
        const out = [];
        for (const f of fs.readdirSync(postsDir)) {
            if (!f.endsWith('.md')) continue;
            const raw = fs.readFileSync(`${postsDir}/${f}`, 'utf8');
            const fm = matter(raw);
            if (fm.data.draft !== true) continue;
            const slug = f.replace(/\.md$/, '');
            const body = fm.content
                .replace(/```[\s\S]+?```/g, ' ')
                .replace(/`[^`]*`/g, ' ')
                .replace(/[#*_>\[\]()!{}.,?\-]/g, ' ');
            const words = body.split(/\s+/).filter(Boolean).length;
            out.push({
                fileSlug: slug,
                url: `/drafts/${slug}/`,
                date: fm.data.date instanceof Date ? fm.data.date : new Date(fm.data.date || Date.now()),
                data: {
                    title: fm.data.title || slug,
                    tags: fm.data.tags || [],
                    readMin: Math.max(1, Math.round(words / 220)),
                    words,
                },
            });
        }
        return out.sort((a, b) => b.date - a.date);
    });

    // Transforms
    eleventyConfig.addTransform('htmlmin', globalFilters.htmlmin);

    /* Markdown Overrides */
    let markdownLibrary = markdownIt({
        html: true,
        linkify: true
    }).use(markdownItAnchor, {
        permalink: markdownItAnchor.permalink.linkInsideHeader({
            symbol: "",
            placement: "after",
        }),
    }).use(markdownItEmoji.full)
    .use(markdownItContainer, 'info')
    .use(markdownItContainer, 'lead')
    .use(markdownItContainer, 'success')
    .use(markdownItContainer, 'warning')
    .use(markdownItContainer, 'error')
    .use(markdownItFootnote)
    .use(markdownItAbbr)
    .use(markdownItAttributes)
    .use(markdownItSpan)
    .use(mdfigcaption, {
      figcaption: true
    });

    eleventyConfig.setLibrary("md", markdownLibrary);

    nunjucksFilters.add(eleventyConfig);
    nunjucksShortCodes.add(eleventyConfig);

    eleventyConfig
        .addPassthroughCopy({ 'src/_includes/assets': 'assets' })
        .addPassthroughCopy('src/_redirects')
        .addPassthroughCopy('src/_headers')
        .addPassthroughCopy('src/images')
        .addPassthroughCopy('src/.well-known')
        .addPassthroughCopy({ 'src/admin': 'admin' });

    
    // Override Browsersync defaults (used only with --serve)
    eleventyConfig.setBrowserSyncConfig({
        callbacks: {
        ready: function(err, browserSync) {
            const content_404 = fs.readFileSync('www/404.html');

            browserSync.addMiddleware("*", (req, res) => {
            // Provides the 404 content without redirect.
            res.writeHead(404, {"Content-Type": "text/html; charset=UTF-8"});
            res.write(content_404);
            res.end();
            });
        },
        },
        ui: false,
        ghostMode: false
    });

    return {
        templateFormats: ['njk', 'md', 'html', '11ty.js'],
        dir: {
            input: 'src',
            includes: '_includes',
            data: '_data',
            output: 'www',
        },
        markdownTemplateEngine: 'njk',
        htmlTemplateEngine: 'njk',
        dataTemplateEngine: 'njk',
        passthroughFileCopy: true,
    };
};
