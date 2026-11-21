(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var root = document.documentElement;
  var hasIO = 'IntersectionObserver' in window;

  /* header: transparent over the hero, solid after it (IntersectionObserver, no scroll handler) */
  var head = $('.site-head'), hero = $('.hero');
  if (hasIO && hero) {
    new IntersectionObserver(function (e) { head.classList.toggle('solid', !e[0].isIntersecting); }, { rootMargin: '-80px 0px 0px 0px' }).observe(hero);
  } else { head.classList.add('solid'); }

  /* active nav link */
  var navLinks = $$('.main-nav a');
  if (hasIO) {
    var secIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) navLinks.forEach(function (a) { a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ['visit', 'watch', 'ministries', 'events'].forEach(function (id) { var el = document.getElementById(id); if (el) secIO.observe(el); });
  }

  /* scroll lock shared by menu (phone) and modal */
  var locks = 0;
  var lock = function (on) { locks = Math.max(0, locks + (on ? 1 : -1)); root.classList.toggle('locked', locks > 0); };

  /* menu */
  var menuBtn = $('.menu-btn'), menu = $('#menu'), menuOpen = false, menuLocked = false, phone = window.matchMedia('(max-width: 640px)');
  var focusables = function (el) { return $$('a[href], button:not([disabled]), input, select, textarea', el).filter(function (n) { return n.offsetParent !== null; }); };
  var setMenu = function (open, restore) {
    if (open === menuOpen) return;
    menuOpen = open;
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.hidden = !open;
    head.classList.toggle('open', open);
    if (open && phone.matches) { lock(true); menuLocked = true; }
    else if (!open && menuLocked) { lock(false); menuLocked = false; }
    if (open) { var f = focusables(menu)[0]; if (f) f.focus(); }
    else if (restore) menuBtn.focus();
  };
  menuBtn.addEventListener('click', function () { setMenu(!menuOpen, true); });
  menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('click', function (e) { if (menuOpen && !e.target.closest('.site-head')) setMenu(false); });
  document.addEventListener('keydown', function (e) {
    if (!menuOpen) return;
    if (e.key === 'Escape') { setMenu(false, true); return; }
    if (e.key === 'Tab') {
      var items = [menuBtn].concat(focusables(menu)), first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* time in Orlando */
  var fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23', weekday: 'short' });
  var DOW = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  var orlando = function () {
    var p = {};
    fmt.formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
    return { y: +p.year, mo: +p.month, d: +p.day, h: +p.hour % 24, mi: +p.minute, s: +p.second, dow: DOW[p.weekday] };
  };
  var pad = function (v) { return (v < 10 ? '0' : '') + v; };

  /* Sundays for the visit form */
  var dateSel = $('#visit-date');
  (function () {
    var n = orlando(), ahead = (7 - n.dow) % 7;
    if (ahead === 0 && n.h >= 11) ahead = 7;
    for (var i = 0; i < 4; i++) {
      var dt = new Date(Date.UTC(n.y, n.mo - 1, n.d + ahead + i * 7));
      var o = document.createElement('option');
      o.value = dt.toISOString().slice(0, 10);
      o.textContent = (i === 0 ? 'This Sunday, ' : '') + dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
      dateSel.appendChild(o);
    }
  })();

  /* countdown to the next Sunday 9:00 AM; only ticks while visible */
  var live = $('.live'), countEl = $('#count'), label = $('.live-label', live), units = {};
  $$('[data-u]', countEl).forEach(function (b) { units[b.dataset.u] = b; });
  var tick = function () {
    var n = orlando(), mins = n.h * 60 + n.mi;
    if (n.dow === 0 && mins >= 540 && mins < 735) { label.textContent = 'We are live right now'; countEl.hidden = true; return; }
    label.textContent = 'Next live stream in'; countEl.hidden = false;
    var ahead = (7 - n.dow) % 7;
    if (ahead === 0 && mins >= 540) ahead = 7;
    var diff = Math.max(0, Math.floor((Date.UTC(n.y, n.mo - 1, n.d + ahead, 9) - Date.UTC(n.y, n.mo - 1, n.d, n.h, n.mi, n.s)) / 1000));
    units.d.textContent = Math.floor(diff / 86400);
    units.h.textContent = pad(Math.floor(diff % 86400 / 3600));
    units.m.textContent = pad(Math.floor(diff % 3600 / 60));
    units.s.textContent = pad(diff % 60);
  };
  tick();
  var ticker = null;
  if (hasIO) {
    new IntersectionObserver(function (e) {
      clearInterval(ticker);
      if (e[0].isIntersecting) { tick(); ticker = setInterval(tick, 1000); }
    }).observe(live);
  } else { ticker = setInterval(tick, 1000); }

  /* demo sermon player */
  var player = $('#player'), timer = null, t = 0, LEN = 38 * 60 + 12;
  var fill = $('.bar-fill', player), tEl = $('[data-t]', player), toggle = $('[data-toggle]', player);
  var draw = function () { fill.style.transform = 'scaleX(' + (t / LEN) + ')'; tEl.textContent = Math.floor(t / 60) + ':' + pad(t % 60); };
  var run = function () { clearInterval(timer); player.classList.remove('paused'); toggle.setAttribute('aria-label', 'Pause'); timer = setInterval(function () { t = Math.min(LEN, t + 1); draw(); }, 1000); };
  var pause = function () { clearInterval(timer); player.classList.add('paused'); toggle.setAttribute('aria-label', 'Play'); };
  $('.poster', player).addEventListener('click', function () {
    if (!player.classList.contains('on')) { player.classList.add('on'); run(); toggle.focus(); return; }
    if (player.classList.contains('paused')) run(); else pause();
  });
  toggle.addEventListener('click', function () { if (player.classList.contains('paused')) run(); else pause(); });

  /* forms */
  var emailOk = function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); };
  var flag = function (input, bad) {
    input.setAttribute('aria-invalid', bad ? 'true' : 'false');
    var msg = document.getElementById(input.getAttribute('aria-describedby'));
    if (msg) msg.hidden = !bad;
  };
  var swap = function (card, done) {
    $('form', card).hidden = done;
    var ty = $('.thanks', card); ty.hidden = !done;
    if (done) ty.focus();
  };
  $$('.form-card').forEach(function (card) {
    var r = $('[data-reset]', card);
    if (r) r.addEventListener('click', function () { swap(card, false); var f = $('input, textarea', card); if (f) f.focus(); });
  });

  var nf = $('.newform'), nfName = nf.elements.name, nfEmail = nf.elements.email;
  [nfName, nfEmail].forEach(function (i) { i.addEventListener('input', function () { if (i.getAttribute('aria-invalid') === 'true') flag(i, i === nfEmail ? !emailOk(i.value.trim()) : !i.value.trim()); }); });
  nf.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = nfName.value.trim(), email = nfEmail.value.trim();
    flag(nfName, !name); flag(nfEmail, !emailOk(email));
    if (!name) { nfName.focus(); return; }
    if (!emailOk(email)) { nfEmail.focus(); return; }
    var card = nf.closest('.form-card');
    var kids = nf.elements.kids.value === 'yes';
    var day = dateSel.options[dateSel.selectedIndex].textContent.replace('This Sunday, ', '');
    $('[data-name]', card).textContent = name.split(/\s+/)[0];
    $('[data-msg]', card).textContent = 'We have you down for ' + day + ' at ' + nf.elements.service.value + '. Look for Linh at the welcome table by the front doors' + (kids ? '. She will walk you and your kids to check-in.' : '. She will save you a seat.') + ' A confirmation is on its way to ' + email + '.';
    swap(card, true);
  });

  var pf = $('.prayform'), pfReq = pf.elements.req;
  pfReq.addEventListener('input', function () { if (pfReq.getAttribute('aria-invalid') === 'true') flag(pfReq, !pfReq.value.trim()); });
  pf.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!pfReq.value.trim()) { flag(pfReq, true); pfReq.focus(); return; }
    flag(pfReq, false);
    swap(pf.closest('.form-card'), true);
    pf.reset();
  });

  /* Tithely-style giving modal: scroll lock, Esc, focus trap (native dialog), focus returns to the opener */
  var modal = $('#give-modal'), gForm = $('.gm-form', modal), gThanks = $('.gm-thanks', modal), opener = null;
  var amt = $('#gm-amt'), chips = $$('.gm-chips button', modal), gErr = $('#gm-err');
  var money = function (v) { return '$' + v.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','); };
  var value = function () { var v = parseFloat(String(amt.value).replace(/[^0-9.]/g, '')); return isFinite(v) ? v : 0; };
  var update = function () {
    var v = value(), feeAmt = v > 0 ? Math.round((v * 0.029 + 0.3) * 100) / 100 : 0, f = gForm.elements.freq.value;
    amt.style.width = (Math.max(2, String(amt.value).length) + 0.8) + 'ch';
    $('[data-fee]', modal).textContent = money(feeAmt);
    $('[data-total]', modal).textContent = money(v + (gForm.elements.cover.checked ? feeAmt : 0)) + (f === 'weekly' ? ' weekly' : f === 'monthly' ? ' monthly' : '');
    chips.forEach(function (c) { c.setAttribute('aria-pressed', String(+c.dataset.amt === v)); });
  };
  chips.forEach(function (c) { c.addEventListener('click', function () { amt.value = c.dataset.amt; gErr.hidden = true; update(); }); });
  amt.addEventListener('input', function () { gErr.hidden = true; update(); });
  gForm.addEventListener('change', update);
  var openGive = function (from) {
    opener = from || document.activeElement;
    setMenu(false);
    gForm.hidden = false; gThanks.hidden = true; gErr.hidden = true;
    update();
    modal.showModal();
    lock(true);
    badge.classList.add('away');
  };
  modal.addEventListener('close', function () { lock(false); badgeState(); if (opener && opener.focus) opener.focus(); });
  $$('[data-give]').forEach(function (b) { b.addEventListener('click', function (e) { e.preventDefault(); openGive(b); }); });
  $$('[data-close]', modal).forEach(function (b) { b.addEventListener('click', function () { modal.close(); }); });
  modal.addEventListener('click', function (e) { if (e.target === modal) modal.close(); });
  gForm.addEventListener('submit', function (e) {
    e.preventDefault();
    if (value() < 1) { gErr.hidden = false; amt.focus(); return; }
    var f = gForm.elements.freq.value, fund = gForm.elements.fund.value;
    $('[data-msg]', gThanks).textContent = $('[data-total]', modal).textContent.replace(/ (weekly|monthly)$/, '') + (f === 'once' ? ' one time' : ' ' + f) + ' to ' + (fund === 'Missions' ? '' : 'the ') + fund + '.';
    gForm.hidden = true; gThanks.hidden = false; gThanks.focus();
  });

  /* demo badge: hidden while the footer (which has the same contact card) is on screen */
  var badge = $(".demo-badge"), footVisible = false, heroVisible = true;
  var badgeState = function () { badge.classList.toggle("away", heroVisible || footVisible || modal.open); };
  badgeState();
  if (hasIO) {
    new IntersectionObserver(function (e) { footVisible = e[0].isIntersecting; badgeState(); }).observe($("#foot"));
    new IntersectionObserver(function (e) { heroVisible = e[0].isIntersecting; badgeState(); }, { rootMargin: "0px 0px -100px 0px" }).observe($(".infobar"));
  } else { heroVisible = false; badgeState(); }
  /* the badge steps aside while the visitor scrolls so it never sits on text they are reading; one passive listener, class toggle only */
  var scrollTimer = null, scrolling = false;
  window.addEventListener("scroll", function () {
    if (!scrolling) { scrolling = true; badge.classList.add("moving"); }
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(function () { scrolling = false; badge.classList.remove("moving"); }, 700);
  }, { passive: true });
})();
