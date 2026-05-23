/* Terminal blog — interactive shell -------------------------------------- */
(function () {
  'use strict';

  /* ---- Service worker registration ------------------------------------ */
  // Skip via localStorage.skipSW = "1" for local dev debugging.
  {% if site.includeServiceWorker %}
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    try {
      var skip = localStorage.getItem('skipSW') === '1';
      if (!skip) {
        window.addEventListener('load', function () {
          navigator.serviceWorker.register('/service-worker.js').catch(function () {});
        });
      }
    } catch (e) {}
  }
  {% endif %}

  var html = document.documentElement;
  var body = document.body;
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* ---- Theme toggle --------------------------------------------------- */
  function currentTheme() { return html.dataset.theme || 'dark'; }
  function setTheme(theme) {
    html.dataset.theme = theme;
    try { localStorage.setItem('currentTheme', theme); } catch (e) {}
    syncThemeUI();
  }
  function syncThemeUI() {
    var theme = currentTheme();
    $$('.js-theme-label').forEach(function (el) { el.textContent = theme; });
    $$('.ThemeButton .glyph').forEach(function (el) {
      el.textContent = theme === 'dark' ? '◐' : '◑';
    });
    var stTheme = $('#status-theme');
    if (stTheme) stTheme.textContent = theme;
    var btn = $('.js-theme-btn');
    if (btn) btn.setAttribute('aria-label', 'Switch to ' + (theme === 'dark' ? 'light' : 'dark') + ' theme');
  }
  $$('.js-theme-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      setTheme(currentTheme() === 'dark' ? 'light' : 'dark');
    });
  });
  syncThemeUI();

  /* ---- Status bar: path + clock + count ------------------------------- */
  var statusPath = $('#status-path');
  if (statusPath) {
    var p = body.dataset.statusPath || document.querySelector('[data-status-path]');
    if (p) {
      statusPath.textContent = typeof p === 'string' ? p : p.dataset.statusPath;
    }
  }

  var clock = $('#status-time');
  function tick() {
    if (!clock) return;
    var d = new Date();
    var hh = String(d.getHours()).padStart(2, '0');
    var mm = String(d.getMinutes()).padStart(2, '0');
    clock.textContent = hh + ':' + mm;
  }
  tick();
  setInterval(tick, 30 * 1000);

  /* ---- Reading progress (post pages only) ----------------------------- */
  var progressFill = $('.ReadingProgress > span');
  var route = body.dataset.route;
  var isPost = route === 'post' || !!document.querySelector('.Post');
  if (progressFill && isPost) {
    var onScroll = function () {
      var docEl = document.documentElement;
      var max = (docEl.scrollHeight - docEl.clientHeight) || 1;
      var pct = Math.min(100, Math.max(0, (window.scrollY / max) * 100));
      progressFill.style.width = pct + '%';
    };
    document.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  } else {
    var rp = $('.ReadingProgress');
    if (rp) rp.style.display = 'none';
  }

  /* ---- Command palette ------------------------------------------------ */
  var palette = $('#palette');
  var paletteInput = $('#palette-input');
  var paletteList = $('#palette-list');
  var paletteCount = $('#palette-count');
  var paletteHint = $('#palette-hint');
  var openBtn = $('#status-open-palette');
  var index = null;
  var sel = 0;
  var filtered = [];

  // Search backends ---------------------------------------------------
  //   primary: pagefind  (full-content + ranked, requires post-build index)
  //   fallback: /search.json  (titles + tags only, always available)
  var pagefindPromise = null;
  function getPagefind() {
    if (pagefindPromise) return pagefindPromise;
    pagefindPromise = import('/pagefind/pagefind.js')
      .then(function (m) {
        if (m.init) { try { m.init(); } catch (e) {} }
        return m;
      })
      .catch(function () { return null; });
    return pagefindPromise;
  }

  var requestSeq = 0; // ignore stale async results when typing fast

  function openPalette() {
    if (!palette) return;
    palette.classList.add('is-open');
    sel = 0;
    if (paletteInput) {
      paletteInput.value = '';
      setTimeout(function () { paletteInput.focus(); }, 30);
    }
    if (paletteHint) paletteHint.classList.add('is-hidden');
    try { localStorage.setItem('paletteSeen', '1'); } catch (e) {}
    render('');
  }
  function closePalette() {
    if (!palette) return;
    palette.classList.remove('is-open');
  }
  function ensureIndex() {
    if (index) return Promise.resolve(index);
    return fetch('/search.json')
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (data) { index = Array.isArray(data) ? data : []; return index; })
      .catch(function () { index = []; return index; });
  }

  function navCommands() {
    return [
      { kind: 'nav',  label: 'Go to home',    hint: 'writing',  href: '/' },
      { kind: 'nav',  label: 'Go to archive', hint: 'all posts', href: '/archive/' },
      { kind: 'nav',  label: 'Go to about',   hint: 'about',    href: '/about/' },
      { kind: 'cmd',  label: 'Switch theme → ' + (currentTheme() === 'dark' ? 'light' : 'dark'), hint: 'theme', run: function () { setTheme(currentTheme() === 'dark' ? 'light' : 'dark'); } },
      { kind: 'cmd',  label: 'View RSS feed', hint: 'rss',      href: '/feed.xml' },
    ];
  }

  function shortExcerpt(html) {
    if (!html) return '';
    return html.replace(/\s+/g, ' ').trim();
  }

  function searchPosts(q) {
    var ql = q.toLowerCase().trim();
    if (!ql) return Promise.resolve([]);
    return getPagefind().then(function (pf) {
      if (pf) {
        return pf.search(q).then(function (s) {
          var top = s.results.slice(0, 8);
          return Promise.all(top.map(function (r) { return r.data(); }))
            .then(function (rows) {
              return rows.map(function (d) {
                return {
                  kind: 'post',
                  label: (d.meta && d.meta.title) || d.url,
                  hint: shortExcerpt(d.excerpt),
                  hintHTML: true,
                  href: d.url,
                };
              });
            });
        }).catch(function () { return jsonFallback(ql); });
      }
      return jsonFallback(ql);
    });
  }

  function jsonFallback(ql) {
    return ensureIndex().then(function (idx) {
      return (idx || []).filter(function (p) {
        return p.title.toLowerCase().indexOf(ql) !== -1
          || (p.excerpt || '').toLowerCase().indexOf(ql) !== -1
          || (p.tags || []).join(' ').toLowerCase().indexOf(ql) !== -1;
      }).slice(0, 8).map(function (p) {
        return {
          kind: 'post',
          label: p.title,
          hint: p.date + ' · ' + p.readMin + 'min',
          meta: (p.tags || []).slice(0, 3),
          href: p.url,
        };
      });
    });
  }

  function render(q) {
    var nav = navCommands();
    var ql = q.toLowerCase().trim();
    var navMatches = ql
      ? nav.filter(function (c) { return c.label.toLowerCase().indexOf(ql) !== -1 || (c.hint || '').toLowerCase().indexOf(ql) !== -1; })
      : nav.slice(0, 8);

    var rid = ++requestSeq;
    searchPosts(q).then(function (posts) {
      if (rid !== requestSeq) return; // stale
      filtered = ql ? navMatches.concat(posts) : nav.slice(0, 8);
      paintList(q);
    });

    if (!ql) {
      filtered = nav.slice(0, 8);
      paintList(q);
    }
  }

  function paintList(q) {
    if (paletteCount) paletteCount.textContent = filtered.length + ' results';
    if (!paletteList) return;
    if (!filtered.length) {
      paletteList.innerHTML = '<div class="Palette-Empty">no results for "' + escapeHtml(q) + '"</div>';
      return;
    }
    var html = filtered.map(function (c, i) {
      var metaStr = c.meta && c.meta.length ? '  ·  ' + c.meta.map(function (t) { return '#' + t; }).join(' ') : '';
      var hint = c.hintHTML ? (c.hint || '') + escapeHtml(metaStr) : escapeHtml((c.hint || '') + metaStr);
      return (
        '<div class="Palette-Item' + (i === sel ? ' is-active' : '') + '" data-i="' + i + '" role="option">' +
          '<div>' +
            '<div class="Palette-Item-Label">' + escapeHtml(c.label) + '</div>' +
            '<div class="Palette-Item-Hint">' + hint + '</div>' +
          '</div>' +
          (i === sel ? '<span class="Palette-Item-Enter">↵</span>' : '<span></span>') +
        '</div>'
      );
    }).join('');
    paletteList.innerHTML = html;
    paletteList.querySelectorAll('.Palette-Item').forEach(function (el) {
      el.addEventListener('click', function () {
        var i = parseInt(el.dataset.i, 10) || 0;
        run(filtered[i]);
      });
      el.addEventListener('mouseenter', function () {
        sel = parseInt(el.dataset.i, 10) || 0;
        renderSel();
      });
    });
  }
  function renderSel() {
    if (!paletteList) return;
    paletteList.querySelectorAll('.Palette-Item').forEach(function (el, i) {
      el.classList.toggle('is-active', i === sel);
      var enter = el.querySelector('.Palette-Item-Enter');
      if (enter) enter.textContent = i === sel ? '↵' : '';
    });
  }
  function run(cmd) {
    if (!cmd) return;
    closePalette();
    if (cmd.run) cmd.run();
    else if (cmd.href) window.location.href = cmd.href;
  }
  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  if (paletteInput) {
    paletteInput.addEventListener('input', function (e) {
      sel = 0;
      render(e.target.value);
    });
    paletteInput.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(filtered.length - 1, sel + 1); renderSel(); ensureSelVisible(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); renderSel(); ensureSelVisible(); }
      else if (e.key === 'Enter') { e.preventDefault(); run(filtered[sel]); }
      else if (e.key === 'Escape') { e.preventDefault(); closePalette(); }
    });
  }
  function ensureSelVisible() {
    if (!paletteList) return;
    var el = paletteList.querySelector('.Palette-Item.is-active');
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
  }

  if (palette) {
    palette.addEventListener('click', function (e) {
      if (e.target === palette) closePalette();
    });
  }
  if (openBtn) {
    openBtn.addEventListener('click', openPalette);
  }
  if (paletteHint) {
    try {
      if (localStorage.getItem('paletteSeen')) paletteHint.classList.add('is-hidden');
    } catch (e) {}
    paletteHint.addEventListener('click', openPalette);
    setTimeout(function () { paletteHint.classList.add('is-hidden'); }, 14000);
  }

  document.addEventListener('keydown', function (e) {
    var open = palette && palette.classList.contains('is-open');
    if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      if (open) closePalette(); else openPalette();
    } else if (e.key === '/' && !open) {
      var tag = (document.activeElement && document.activeElement.tagName) || '';
      if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault();
        openPalette();
      }
    } else if (e.key === 'Escape') {
      if (open) closePalette();
      var sheet = document.getElementById('vim-cheatsheet');
      if (sheet) sheet.remove();
    }
  });

  /* ---- Status bar count (post N / total) ------------------------------ */
  if (isPost) {
    var statusCount = $('#status-count');
    var postEl = $('.Post');
    if (statusCount && postEl) {
      ensureIndex().then(function (idx) {
        var id = postEl.dataset.postId;
        var i = idx.findIndex(function (p) { return p.id === id; });
        if (i >= 0) statusCount.textContent = 'post ' + (i + 1) + '/' + idx.length;
        else statusCount.textContent = idx.length + ' posts';
      });
    }
  } else {
    var sc = $('#status-count');
    if (sc) {
      var n = body.dataset.postCount;
      if (n) sc.textContent = n + ' posts';
      else ensureIndex().then(function (idx) { sc.textContent = idx.length + ' posts'; });
    }
  }

  /* ---- Activity heatmap (archive page) -------------------------------- */
  var heatmapHost = $('#heatmap');
  var heatmapGrid = $('#heatmap-grid');
  if (heatmapHost && heatmapGrid) {
    try {
      var rawPosts = JSON.parse(heatmapHost.dataset.posts || '[]');
      var monthsLetter = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
      var monthsFull = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      var byYear = {};
      var max = 0;
      rawPosts.forEach(function (r) {
        var parts = (r.d || '').split('-');
        var y = parseInt(parts[0], 10);
        var m = parseInt(parts[1], 10) - 1;
        if (!y || isNaN(m)) return;
        if (!byYear[y]) byYear[y] = new Array(12).fill(0);
        byYear[y][m] += 1;
        if (byYear[y][m] > max) max = byYear[y][m];
      });
      var years = Object.keys(byYear).map(Number).sort(function (a, b) { return b - a; });

      var html = '<span></span>';
      monthsLetter.forEach(function (ml) {
        html += '<span class="Heatmap-Month">' + ml + '</span>';
      });
      years.forEach(function (y) {
        html += '<a href="#y-' + y + '" class="Heatmap-Year">' + y + '</a>';
        byYear[y].forEach(function (n, i) {
          var bucket = bucketFor(n, max);
          html += '<div class="Heatmap-Cell"'
            + (bucket > 0 ? ' data-n="' + bucket + '"' : '')
            + ' title="' + monthsFull[i] + ' ' + y + ': ' + n + ' post' + (n === 1 ? '' : 's') + '"></div>';
        });
      });
      heatmapGrid.innerHTML = html;
    } catch (e) {
      heatmapHost.style.display = 'none';
    }
  }
  function bucketFor(n, max) {
    if (n === 0) return 0;
    if (max <= 1) return 1;
    var ratio = n / max;
    if (ratio < 0.34) return 1;
    if (ratio < 0.67) return 2;
    if (ratio < 0.95) return 3;
    return 4;
  }

  /* ---- Copy-code buttons --------------------------------------------- */
  $$('pre[class*="language-"], pre > code').forEach(function (node) {
    var pre = node.tagName === 'PRE' ? node : node.parentElement;
    if (!pre || pre.dataset.copyWired) return;
    pre.dataset.copyWired = '1';
    pre.style.position = pre.style.position || 'relative';
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'CodeCopy';
    btn.setAttribute('aria-label', 'Copy code to clipboard');
    btn.textContent = '$ copy';
    btn.addEventListener('click', function () {
      var code = pre.querySelector('code') || pre;
      var text = code.innerText || code.textContent || '';
      var done = function () {
        btn.textContent = '$ copied';
        btn.classList.add('is-ok');
        setTimeout(function () {
          btn.textContent = '$ copy';
          btn.classList.remove('is-ok');
        }, 1100);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () {});
      } else {
        var ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); done(); } catch (e) {}
        document.body.removeChild(ta);
      }
    });
    pre.appendChild(btn);
  });

  /* ---- Vim-ish keybindings ------------------------------------------- */
  // j/k scroll, gg top, G bottom, n/p next/prev post, ? cheatsheet.
  // Ignored when typing in an input or when the palette is open.
  var lastG = 0;
  function inEditable() {
    var tag = (document.activeElement && document.activeElement.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
    var ae = document.activeElement;
    return !!(ae && ae.isContentEditable);
  }
  function paletteOpen() { return palette && palette.classList.contains('is-open'); }

  document.addEventListener('keydown', function (e) {
    if (paletteOpen() || inEditable() || e.metaKey || e.ctrlKey || e.altKey) return;
    switch (e.key) {
      case 'j':
        e.preventDefault();
        window.scrollBy({ top: window.innerHeight * 0.12, behavior: 'smooth' });
        break;
      case 'k':
        e.preventDefault();
        window.scrollBy({ top: -window.innerHeight * 0.12, behavior: 'smooth' });
        break;
      case 'g': {
        var now = Date.now();
        if (now - lastG < 420) {
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: 'smooth' });
          lastG = 0;
        } else {
          lastG = now;
        }
        break;
      }
      case 'G':
        e.preventDefault();
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
        break;
      case 'n':
        navByRel('next');
        break;
      case 'p':
        navByRel('prev');
        break;
      case '?':
        e.preventDefault();
        toggleCheatsheet();
        break;
      default:
    }
  });

  function navByRel(rel) {
    var sel = 'a[data-nav="' + rel + '"], .post-nav .' + (rel === 'next' ? 'next' : 'previous') + ' a';
    var a = document.querySelector(sel);
    if (a && a.href) window.location.href = a.href;
  }

  /* ---- Vim cheatsheet popover ---------------------------------------- */
  function toggleCheatsheet() {
    var existing = document.getElementById('vim-cheatsheet');
    if (existing) {
      existing.remove();
      return;
    }
    var el = document.createElement('div');
    el.id = 'vim-cheatsheet';
    el.className = 'VimCheatsheet';
    el.innerHTML =
      '<div class="VimCheatsheet-Panel">' +
        '<div class="VimCheatsheet-Head">$ cat ~/.bindings</div>' +
        '<ul>' +
          '<li><kbd>j</kbd> / <kbd>k</kbd><span>scroll down / up</span></li>' +
          '<li><kbd>g</kbd><kbd>g</kbd> / <kbd>G</kbd><span>top / bottom</span></li>' +
          '<li><kbd>n</kbd> / <kbd>p</kbd><span>next / previous post</span></li>' +
          '<li><kbd>⌘K</kbd> / <kbd>/</kbd><span>open palette</span></li>' +
          '<li><kbd>?</kbd><span>toggle this panel</span></li>' +
          '<li><kbd>esc</kbd><span>close anything open</span></li>' +
        '</ul>' +
      '</div>';
    el.addEventListener('click', function (e) {
      if (e.target === el) el.remove();
    });
    document.body.appendChild(el);
    setTimeout(function () { el.classList.add('is-open'); }, 10);
  }

  /* ---- Console easter egg -------------------------------------------- */
  try {
    var styleAccent = 'color:#7ed79f;font:500 13px/1.4 JetBrains Mono,monospace';
    var styleDim = 'color:#525847;font:400 12px/1.4 JetBrains Mono,monospace';
    console.log(
      '%c$ whoami --verbose\n' +
      '%cneenad ingole · founding engineer · berlin\n' +
      '%cyou opened devtools — good. peek around, then say hi.\n' +
      '%c--mail = ninad.ingole [at] gmail\n' +
      '%c--git  = github.com/ninadingole\n' +
      '%c\n$ press ? on any page for the keyboard cheatsheet',
      styleAccent, 'color:#dce4d3', styleDim, styleAccent, styleAccent, styleAccent
    );
  } catch (e) {}
})();
