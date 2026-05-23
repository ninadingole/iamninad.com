// Set initial theme (dark default) before paint to avoid a flash.
(function () {
  try {
    var stored = localStorage.getItem('currentTheme');
    var theme = stored === 'light' || stored === 'dark' ? stored : 'dark';
    document.documentElement.dataset.theme = theme;
    var accent = localStorage.getItem('accent');
    if (accent) document.documentElement.dataset.accent = accent;
  } catch (e) {
    document.documentElement.dataset.theme = 'dark';
  }
})();

// Netlify Identity dispatches password-recovery / invite / email-confirm
// links back to the site root with a #<token>_token=... fragment. The
// Identity widget only loads on /admin/, so bounce the fragment over so
// the widget can pop the right modal.
(function () {
  if (!location.hash) return;
  var tokens = /(?:^|[#&])(recovery_token|invite_token|confirmation_token|access_token|email_change_token)=/;
  if (!tokens.test(location.hash)) return;
  if (location.pathname.indexOf('/admin') === 0) return;
  location.replace('/admin/' + location.hash);
})();

window.heap = window.heap || [];
heap.load = function (e, t) {
  window.heap.appid = e;
  window.heap.config = t = t || {};
  var r = document.createElement('script');
  r.type = 'text/javascript';
  r.async = !0;
  r.src = 'https://cdn.heapanalytics.com/js/heap-' + e + '.js';
  var a = document.getElementsByTagName('script')[0];
  a.parentNode.insertBefore(r, a);
  for (
    var n = function (e) {
        return function () {
          heap.push([e].concat(Array.prototype.slice.call(arguments, 0)));
        };
      },
      p = [
        'addEventProperties',
        'addUserProperties',
        'clearEventProperties',
        'identify',
        'resetIdentity',
        'removeEventProperty',
        'setEventProperties',
        'track',
        'unsetEventProperty',
      ],
      o = 0;
    o < p.length;
    o++
  ) heap[p[o]] = n(p[o]);
};
heap.load('{{ site.analytics.heap }}');
