/* Shared helpers for both pages. They talk to the Apps Script web app with a plain POST (no cookies). */
(function () {
  var F = window.Fines = {};
  var cfg = window.FINES_CONFIG || {};
  F.$ = function (s, r) { return (r || document).querySelector(s); };
  F.$$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  F.copy = function (text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    var t = document.createElement('textarea'); t.value = text; t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select();
    try { document.execCommand('copy'); } finally { t.remove(); }
    return Promise.resolve();
  };
  F.h = function (s) { return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  F.store = {
    get: function (k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } }
  };
  F.api = function (fn) {
    var args = [].slice.call(arguments, 1);
    if (window.FINES_MOCK) return window.FINES_MOCK(fn, args);   // offline preview only
    if (!cfg.SCRIPT_URL) return Promise.reject(new Error('This page has not been connected yet (SCRIPT_URL is empty in config.js).'));
    var body = JSON.stringify({ fn: fn, args: args });
    // Google occasionally answers with a hiccup (an error page, or the request treated as a plain visit); every call is safe to repeat, so try up to three times
    function attempt(n) {
      return fetch(cfg.SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: body })
        .then(function (r) { return r.text(); })
        .then(function (t) {
          var j = null;
          try { j = JSON.parse(t); } catch (e) { /* not JSON: a hiccup */ }
          if ((!j || j.retry) && n < 3) return new Promise(function (ok) { setTimeout(ok, 700 * n); }).then(function () { return attempt(n + 1); });
          if (!j) throw new Error('Google is having a moment. Please try again.');
          if (!j.ok) throw new Error(j.error || 'Something went wrong.');
          return j.data;
        });
    }
    return attempt(1);
  };
  // a private key lives in the link's #key=... part, is remembered on this device (top table and judge separately), and is then removed from the address bar
  F.key = function (store) {
    store = store || 'fines_key';
    var m = /[#&]key=([A-Za-z0-9]+)/.exec(location.hash || '');
    if (m) { F.store.set(store, m[1]); try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* ignore */ } }
    return F.store.get(store) || '';
  };
  F.busy = function (btn, on, label) {
    if (on) { btn.dataset.l = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>' + F.h(label || 'Saving…'); }
    else { btn.disabled = false; btn.innerHTML = btn.dataset.l || btn.innerHTML; }
  };
  F.dateLabel = function (ds) {
    if (!/^\d{4}-\d{2}-\d{2}/.test(ds || '')) return '';
    var p = ds.slice(0, 10).split('-').map(Number), d = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
    return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getUTCDay()] + ' ' + p[2] + ' ' + ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][p[1] - 1];
  };
  F.todayStr = function () { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); };
  // the chapter meets on Fridays: today if it is a Friday, otherwise the coming one
  F.nextFriday = function () { var d = new Date(); d.setDate(d.getDate() + (5 - d.getDay() + 7) % 7); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); };
  F.isFriday = function (ds) { var p = String(ds || '').split('-').map(Number); return p.length === 3 && new Date(Date.UTC(p[0], p[1] - 1, p[2])).getUTCDay() === 5; };
  // fills a <select> with every Friday of this year (plus January of next year once it is December), grouped by month
  F.fillFridays = function (sel, chosen) {
    var now = new Date(), y = now.getFullYear(), d = new Date(Date.UTC(y, 0, 1)), end = Date.UTC(y + 1, now.getMonth() === 11 ? 1 : 0, 1);
    while (d.getUTCDay() !== 5) d.setUTCDate(d.getUTCDate() + 1);
    var html = '', group = '';
    for (; d.getTime() < end; d.setUTCDate(d.getUTCDate() + 7)) {
      var ds = d.toISOString().slice(0, 10), g = F.dateLabel(ds).split(' ').slice(2).join(' ') + ' ' + ds.slice(0, 4);
      if (g !== group) { html += (group ? '</optgroup>' : '') + '<optgroup label="' + g + '">'; group = g; }
      html += '<option value="' + ds + '">' + F.dateLabel(ds) + '</option>';
    }
    sel.innerHTML = html + '</optgroup>';
    sel.value = chosen || F.nextFriday();
  };
  // a donation link may contain {amount}; it is swapped for the member's total so the charity page opens with it filled in
  F.donateUrl = function (link, total) { return String(link || '').split('{amount}').join(String(total)); };
})();
