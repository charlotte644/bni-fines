/* Shared helpers for both pages. They talk to the Apps Script web app with a plain POST (no cookies). */
(function () {
  var F = window.Fines = {};
  var cfg = window.FINES_CONFIG || {};
  F.$ = function (s, r) { return (r || document).querySelector(s); };
  F.h = function (s) { return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  F.store = {
    get: function (k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } }
  };
  F.api = function (fn) {
    var args = [].slice.call(arguments, 1);
    if (window.FINES_MOCK) return window.FINES_MOCK(fn, args);   // offline preview only
    if (!cfg.SCRIPT_URL) return Promise.reject(new Error('This page has not been connected yet (SCRIPT_URL is empty in config.js).'));
    return fetch(cfg.SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ fn: fn, args: args }) })
      .then(function (r) { return r.json(); })
      .then(function (j) { if (!j.ok) throw new Error(j.error || 'Something went wrong.'); return j.data; });
  };
  // the private top-table key lives in the link's #key=... part, is remembered on this device, and is then removed from the address bar
  F.key = function () {
    var m = /[#&]key=([A-Za-z0-9]+)/.exec(location.hash || '');
    if (m) { F.store.set('fines_key', m[1]); try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* ignore */ } }
    return F.store.get('fines_key') || '';
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
  // a donation link may contain {amount}; it is swapped for the member's total so the charity page opens with it filled in
  F.donateUrl = function (link, total) { return String(link || '').split('{amount}').join(String(total)); };
})();
