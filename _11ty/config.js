const htmlmin = require('html-minifier')
const Image = require("@11ty/eleventy-img");

const syntaxHighlight = require('@11ty/eleventy-plugin-syntaxhighlight');
const lazyImagesPlugin = require('eleventy-plugin-lazyimages');
const markdownIt = require("markdown-it");
const markdownItAnchor = require("markdown-it-anchor");
const markdownItEmoji = require('markdown-it-emoji');
const path = require('path');
const readingTime = require('eleventy-plugin-time-to-read');
const markdownItContainer = require('markdown-it-container')
const markdownItFootnote = require('markdown-it-footnote');
const markdownItAttributes = require('markdown-it-attrs');
const markdownItAbbr = require('markdown-it-abbr');
const markdownItSpan = require('markdown-it-span');
const eleventyNavigationPlugin = require("@11ty/eleventy-navigation");
const mdfigcaption = require("markdown-it-image-figures");
const emojiRegex = require('emoji-regex')()
const emojiShortName = require('emoji-short-name')

const globalFilters = require('./filters');
const site = require('../src/_data/site');

module.exports = function (eleventyConfig) {

    if (process.env.NODE_ENV === 'production') {
        eleventyConfig.addTransform('htmlmin', minifyHTML)
    }

    eleventyConfig.addTransform('emoji', a11yEmojis)

    eleventyConfig.setDataDeepMerge(true);

    // Filters
    Object.keys(globalFilters).forEach(filterName => {
        eleventyConfig.addFilter(filterName, globalFilters[filterName]);
    });

    eleventyConfig.addFilter('markdown', content => markdown(content, true));
    eleventyConfig.addPairedShortcode('markdown', content => markdown(content, false));
    eleventyConfig.addFilter('time', time)
    eleventyConfig.addFilter('date_to_rfc3339', dateToRFC3339)
    eleventyConfig.addFilter('dateToXmlSchema', dateToXmlSchema);

    // Plugins
    eleventyConfig.addPlugin(syntaxHighlight, {
        templateFormats: ["liquid", "md"]
    });
    eleventyConfig.addPlugin(lazyImagesPlugin, {
        transformImgPath: src => isAbsolutePath(src) ? src : path.join(__dirname, '../www', src)
    });


    eleventyConfig.addPlugin(readingTime);
    eleventyConfig.addPlugin(eleventyNavigationPlugin);

    // Collections
    const livePosts = post => post.date <= new Date() && !post.data.draft;
    eleventyConfig.addCollection('posts', collection => {
        return collection.getFilteredByGlob('**/posts/**/*.md').filter(livePosts).reverse();
    });

    const readBooks = book => !book.data.read;
    eleventyConfig.addCollection('books', collection => {
        return collection.getFilteredByGlob('**/books/**/*.md');
    });

    /* Markdown Overrides */
    let markdownLibrary = markdownIt({
        html: true,
        linkify: true
    }).use(markdownItAnchor, {
        permalink: true,
        permalinkBefore: true,
        permalinkSymbol: ""
    }).use(markdownItEmoji)
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

    eleventyConfig
        .addPassthroughCopy({ 'src/assets': 'assets' })
        .addPassthroughCopy('src/manifest.json')
        .addPassthroughCopy('src/_redirects')
        .addPassthroughCopy('src/images')
        .addPassthroughCopy('src/.well-known');


    // // Override Browsersync defaults (used only with --serve)
    // eleventyConfig.setBrowserSyncConfig({
    //     callbacks: {
    //         ready: function (err, browserSync) {
    //             const content_404 = fs.readFileSync('www/404.html');
    //
    //             browserSync.addMiddleware("*", (req, res) => {
    //                 // Provides the 404 content without redirect.
    //                 res.writeHead(404, { "Content-Type": "text/html; charset=UTF-8" });
    //                 res.write(content_404);
    //                 res.end();
    //             });
    //         },
    //     },
    //     ui: false,
    //     ghostMode: false
    // });

  eleventyConfig.setServerOptions({
    liveReload: true,
    domDiff: true,
    port: 8080,
    encoding: "utf-8",
  });


    eleventyConfig.addShortcode("Link",  (href = '', isExternal = false, content, classes = '', noopener = false) => (`
      <a href="${href}" ${isExternal ? 'target="_blank"' : ''} class="${classes}" 
        ${noopener ? 'rel="noopener"' : ''}
      >${content}</a>
    `));

    eleventyConfig.addShortcode("Header",  (level = 'h1', title = '') => (`
        <h${level} class="">
        ${title}
        </h${level}>
    `));

    eleventyConfig.addLiquidShortcode("resI", async (src, alt, widths) => {
        const w = widths.split(',').map(Number);
        let metadata = await Image(src, {
            widths: w,
            formats: ["webp", "jpeg"],
            urlPath: '/images',
            outputDir: 'www/images',
            useCache: false,
            cacheOptions: {
                duration: '1d',
                directory: 'www/.cache',
                removeUrlQueryParams: false,

            }
        });

        // You bet we throw an error on missing alt in `imageAttributes` (alt="" works okay)
        let lowsrc = metadata.jpeg[0];
        let highsrc = metadata.jpeg[metadata.jpeg.length - 1];

        return `<picture>
        ${Object.values(metadata).map(imageFormat => {
            return `  <source type="${imageFormat[0].sourceType}" srcset="${imageFormat.map(entry => entry.srcset).join(", ")}" sizes="100vw">`;
        }).join("\n")}
        <img
            src="${lowsrc.url}"
            width="${highsrc.width}"
            height="${highsrc.height}"
            alt="${alt}"
            loading="lazy"
            decoding="async">
        </picture>`;
    });


    return {
        dir: {
            input: 'src',
            includes: '_includes',
            layouts: '_layouts',
            data: '_data',
            output: 'www',
        },
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

function dateToRFC3339(value) {
    let date = new Date(value).toISOString()
    let chunks = date.split('.')
    chunks.pop()

    return chunks.join('') + 'Z'
}


function dateToString(value) {
    const date = new Date(value)
    const formatter = new Intl.DateTimeFormat('en', {
        year: 'numeric',
        month: 'long',
        day: '2-digit',
    })
    const parts = formatter.formatToParts(date)
    const month = parts[0].value
    const day = Number(parts[2].value)
    const year = parts[4].value
    const suffix = ['st', 'nd', 'rd'][day - 1] || 'th'

    return month + ' ' + day + suffix + ', ' + year
}

function replaceEmoji(match) {
  const label = emojiShortName[match]

  return label
    ? `<span role="img" aria-label="${label}" title="${label}">${match}</span>`
    : match
}

function a11yEmojis(content, outputPath) {
  return outputPath.endsWith('.html')
    ? content.replace(emojiRegex, replaceEmoji)
    : content
}


function time(value) {
    return `<time datetime="${dateToXmlSchema(value)}">${dateToString(
        value
    )}</time>`
}


function dateToXmlSchema(value) {
    return new Date(value).toISOString()
}

function minifyHTML(content, outputPath) {
    return outputPath.endsWith('.html')
        ? htmlmin.minify(content, {
            collapseBooleanAttributes: true,
            collapseWhitespace: true,
            conservativeCollapse: true,
            minifyCSS: true,
            minifyJS: true,
            removeComments: true,
            sortAttributes: true,
            sortClassName: true,
            useShortDoctype: true,
        })
        : content
}

function markdown(content, inline = true) {
  const html = markdownIt({
    html: true,
  }).use(markdownItAnchor, {
  }).render(content);

  return inline ? html.replace('<p>', '').replace('</p>', '') : html;
}
