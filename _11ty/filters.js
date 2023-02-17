

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
            yearMap.set(year, [item, ...(yearMap.get(year) || [])])
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
};
