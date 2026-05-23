

const htmlmin = require('html-minifier');
const CleanCSS = require('clean-css');
const Terser = require('terser');
const { DateTime } = require('luxon');
const markdown = require('markdown-it')({
    html: true,
    breaks: true,
    linkify: true,
    typographer: true,
}).use(require('markdown-it-anchor'), {
    level: [2],
    permalink: false,
});


const parseDate = str => {
    if (str instanceof Date) {
        return str;
    }
    const date = DateTime.fromISO(str, { zone: 'utc' });
    return date.toJSDate();
};

module.exports = {
    htmlmin: (content, outputPath) => {
        if (outputPath.indexOf('.html') > -1) {
            let minified = htmlmin.minify(content, {
                useShortDoctype: true,
                removeComments: true,
                collapseWhitespace: true,
            });
            return minified;
        }
        return content;
    },

    cssmin: code => new CleanCSS({}).minify(code).styles,

    jsmin: code => {
        let minified = Terser.minify(code);
        if (minified.error) {
            console.log('Terser error: ', minified.error);
            return code;
        }
        return minified.code;
    },

    markdownify: str => markdown.render(str || ''),

    addYear: _collection => {
        let collection = _collection.slice()

        collection = collection.map(post => {
            return {
                ...post,
                year: DateTime.fromJSDate(parseDate(post.date)).toFormat('yyyy')
            }
        })

        return collection;
    },

    groupByYear: collection => {
        let yearMap = new Map();

        for (let item of collection) {
            let year = DateTime.fromJSDate(parseDate(item.date)).toFormat('yyyy');
            // let currentItems = ;

            // if (Array.isArray(currentItems)) {
            //     currentItems.push(item)
            // } else {
            yearMap.set(year, [item, ...(yearMap.get(year) || [])])
            //}
        }

        for (let [key, value] of yearMap) {
          yearMap.set(key, [...value].reverse());
        }

        return [...yearMap]
    },

    mailHref: str => {
        if (/\S+@\S+\.\S+/.test(str)) {
            return `mailto:${str}`
        }

        return str;
    },

    markdownify_inline: str => markdown.renderInline(str),

    strip_html: str => str.replace(/<script.*?<\/script>|<!--.*?-->|<style.*?<\/style>|<.*?>/g, ''),



    date_formatted: obj => {
        const date = parseDate(obj);
        return DateTime.fromJSDate(date).toFormat('DD');
    },

    permalink: str => str.replace(/\.html/g, ''),

    take: (arr, n = 1) => arr.slice(0, n),

    linkName: (linkString) => linkString.split('|').map(x => x.trim()).shift(),

    linkUrl: (linkString) => linkString.split('|').map(x => x.trim()).reverse().shift(),
    
    hostname: href => {
        const match = href.match(
            /^(https?\:)\/\/(([^:\/?#]*)(?:\:([0-9]+))?)([\/]{0,1}[^?#]*)(\?[^#]*|)(#.*|)$/,
        );
        const hostUrl = match[3];
        return hostUrl.replace(/(?:www\.)?/g, '');
    },

    relatedPosts: (collection, current, limit = 3) => {
        if (!current || !current.data || !Array.isArray(current.data.tags)) return [];
        const currentTags = new Set(current.data.tags.filter(t => t !== 'posts'));
        if (currentTags.size === 0) return [];
        const scored = collection
            .filter(p => p.url !== current.url)
            .map(p => {
                const tags = (p.data && p.data.tags) ? p.data.tags : [];
                const score = tags.reduce((s, t) => s + (currentTags.has(t) ? 1 : 0), 0);
                return { p, score };
            })
            .filter(x => x.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map(x => x.p);
        return scored;
    },

    wordCount: str => {
        if (!str) return 0;
        return str.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length;
    },

    readMinutes: str => {
        if (!str) return 1;
        const words = str.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length;
        return Math.max(1, Math.round(words / 220));
    },

    iso_date: obj => {
        const date = parseDate(obj);
        return DateTime.fromJSDate(date).toFormat('yyyy-LL-dd');
    },

    short_date: obj => {
        const date = parseDate(obj);
        return DateTime.fromJSDate(date).toFormat('yyyy-LL');
    },

    excludePost: (collection, urlToSkip) => {
        if (!collection || !urlToSkip) return collection;
        return collection.filter(p => p.url !== urlToSkip);
    },

    totalWords: collection => {
        if (!collection) return 0;
        return collection.reduce((sum, p) => sum + ((p.data && p.data.words) || 0), 0);
    },

    totalReadMin: collection => {
        if (!collection) return 0;
        return collection.reduce((sum, p) => sum + ((p.data && p.data.readMin) || 0), 0);
    },

    tagCounts: collection => {
        const counts = {};
        collection.forEach(p => {
            const tags = (p.data && p.data.tags) ? p.data.tags : [];
            tags.forEach(t => {
                if (t === 'posts') return;
                counts[t] = (counts[t] || 0) + 1;
            });
        });
        return Object.entries(counts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
    },
};
