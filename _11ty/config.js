const pluginRss = require('@11ty/eleventy-plugin-rss');
const syntaxHighlight = require('@11ty/eleventy-plugin-syntaxhighlight');
const lazyImagesPlugin = require('eleventy-plugin-lazyimages');
const markdownIt = require("markdown-it");
const markdownItAnchor = require("markdown-it-anchor");
const markdownItEmoji = require('markdown-it-emoji');
const path = require('path');
const { minify } = require('terser');
const sitemap = require("@quasibit/eleventy-plugin-sitemap");
const readingTime = require('eleventy-plugin-reading-time');


const filters = require('./filters');
const shortcodes = require('./shortcodes');

module.exports = function (eleventyConfig) {
    // Filters
    Object.keys(filters).forEach(filterName => {
        eleventyConfig.addFilter(filterName, filters[filterName]);
    });

    // Shortcodes
    Object.keys(shortcodes).forEach(shortcodeName => {
        let val = shortcodes[shortcodeName];
        let fn = val.isPaired ? 'addPairedShortcode' : 'addShortcode';
        eleventyConfig[fn](shortcodeName, val.fn);
    });

    // Plugins
    eleventyConfig.addPlugin(pluginRss);
    eleventyConfig.addPlugin(syntaxHighlight);
    eleventyConfig.addPlugin(lazyImagesPlugin, {
        transformImgPath: src => isAbsolutePath(src) ? src : path.join(__dirname, '../src/_includes', src)
    });

    // Collections
    const livePosts = post => post.date <= new Date() && !post.data.draft;
    eleventyConfig.addCollection('posts', collection => {
        return collection.getFilteredByGlob('**/posts/**/*.md').filter(livePosts).reverse();
    });

    // Transforms
    eleventyConfig.addTransform('htmlmin', filters.htmlmin);

    /* Markdown Overrides */
    let markdownLibrary = markdownIt({
        html: true,
        breaks: true,
        linkify: true
    }).use(markdownItAnchor, {
        permalink: true,
        permalinkBefore: true,
        permalinkSymbol: ""
    }).use(markdownItEmoji);

    eleventyConfig.setLibrary("md", markdownLibrary);

    eleventyConfig.addNunjucksAsyncFilter('jsmin', async function( code, callback) {
        try {
            const minified = await minify(code);
            callback(null, minified.code);
        } catch (err) {
            console.error('Terser error: ', err);
            callback(null, code);
        }
    });

    eleventyConfig.addPlugin(sitemap, {
        sitemap: {
        hostname: "https://iamninad.com",
        },
    });

    eleventyConfig.addPlugin(readingTime);

    eleventyConfig
        .addPassthroughCopy({ 'src/_includes/assets': 'assets' })
        .addPassthroughCopy('src/manifest.json')
        .addPassthroughCopy('src/_redirects');

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



function isAbsolutePath(src) {
    if (typeof src !== 'string') {
        throw new TypeError(`Expected a \`string\`, got \`${typeof src}\``);
    }

    if (/^[a-zA-Z]:\\/.test(src)) {
        return false;
    }

    return /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(src);
};
