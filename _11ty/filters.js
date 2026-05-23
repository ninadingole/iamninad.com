

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

    // Human-readable label for a GitHub events-API entry.
    githubEventLabel: ev => {
        if (!ev || !ev.type) return '';
        const repo = (ev.repo && ev.repo.name) || '';
        const action = (ev.payload && ev.payload.action) || '';
        switch (ev.type) {
            case 'PushEvent': {
                // Unauth /events/public strips commit details, so the data file
                // hydrates a single-line head commit message in _headMessage.
                const head = (ev.payload && ev.payload.head) || '';
                const short = head ? head.slice(0, 7) : '';
                const msg = ev.payload && ev.payload._headMessage;
                if (msg) return `${short} ${repo} — "${msg}"`;
                const ref = (ev.payload && ev.payload.ref) || '';
                const branch = ref.replace(/^refs\/heads\//, '').replace(/^refs\/tags\//, '');
                return `${short ? short + ' ' : ''}pushed${branch ? ' to ' + branch : ''} in ${repo}`;
            }
            case 'PullRequestEvent': {
                const pr = ev.payload && ev.payload.pull_request;
                const num = ev.payload && ev.payload.number;
                const title = (pr && pr.title) || '';
                return `${action} PR #${num} in ${repo}${title ? ` — "${title}"` : ''}`;
            }
            case 'CreateEvent': {
                const refType = (ev.payload && ev.payload.ref_type) || 'ref';
                const ref = (ev.payload && ev.payload.ref) || '';
                return `created ${refType}${ref ? ` ${ref}` : ''} in ${repo}`;
            }
            case 'ReleaseEvent': {
                const rel = ev.payload && ev.payload.release;
                const tag = (rel && rel.tag_name) || '';
                return `released ${tag} of ${repo}`;
            }
            case 'IssuesEvent': {
                const issue = ev.payload && ev.payload.issue;
                const num = issue && issue.number;
                const title = (issue && issue.title) || '';
                return `${action} issue #${num} in ${repo}${title ? ` — "${title}"` : ''}`;
            }
            case 'ForkEvent':
                return `forked ${repo}`;
            case 'WatchEvent':
                return `starred ${repo}`;
            default:
                return `${ev.type} on ${repo}`;
        }
    },

    githubEventUrl: ev => {
        if (!ev) return '#';
        const repo = ev.repo && ev.repo.name;
        const base = repo ? `https://github.com/${repo}` : '';
        if (!base) return '#';
        if (ev.type === 'PushEvent') {
            const head = ev.payload && ev.payload.head;
            return head ? `${base}/commit/${head}` : base;
        }
        if (ev.type === 'PullRequestEvent') {
            const pr = ev.payload && ev.payload.pull_request;
            return (pr && pr.html_url) || `${base}/pulls`;
        }
        if (ev.type === 'ReleaseEvent') {
            const rel = ev.payload && ev.payload.release;
            return (rel && rel.html_url) || `${base}/releases`;
        }
        if (ev.type === 'IssuesEvent') {
            const issue = ev.payload && ev.payload.issue;
            return (issue && issue.html_url) || `${base}/issues`;
        }
        return base;
    },

    // "2d", "3h", "12m", "just now"
    relativeTime: iso => {
        if (!iso) return '';
        const then = new Date(iso).getTime();
        if (Number.isNaN(then)) return '';
        const diff = Math.max(0, Date.now() - then) / 1000;
        if (diff < 60) return 'just now';
        if (diff < 3600) return Math.floor(diff / 60) + 'm';
        if (diff < 86400) return Math.floor(diff / 3600) + 'h';
        if (diff < 86400 * 30) return Math.floor(diff / 86400) + 'd';
        if (diff < 86400 * 365) return Math.floor(diff / (86400 * 30)) + 'mo';
        return Math.floor(diff / (86400 * 365)) + 'y';
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
