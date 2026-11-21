(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var root = document.documentElement;
  var hasIO = 'IntersectionObserver' in window;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var phone = window.matchMedia('(max-width: 640px)');
  var pad = function (v) { return (v < 10 ? '0' : '') + v; };

  /* ---------- header: solid + compact after the hero (IntersectionObserver, no scroll math) ---------- */
  var head = $('.site-head'), hero = $('.hero');
  if (hasIO && hero) {
    new IntersectionObserver(function (e) {
      var past = !e[0].isIntersecting;
      head.classList.toggle('solid', past);
      head.classList.toggle('compact', past);
    }, { rootMargin: '-80px 0px 0px 0px' }).observe(hero);
  } else { head.classList.add('solid'); }

  var navLinks = $$('.main-nav a');
  if (hasIO) {
    var secIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) navLinks.forEach(function (a) { a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ['visit', 'watch', 'ministries', 'events'].forEach(function (id) { var el = document.getElementById(id); if (el) secIO.observe(el); });
  }

  /* ---------- one rAF loop for scroll work: hero parallax + badge ---------- */
  var heroMedia = $('.hero-media'), heroH = hero ? hero.offsetHeight : 0, ticking = false, lastY = -1;
  var parallax = !reduce && !!heroMedia;
  var factor = function () { return phone.matches ? 0.18 : 0.3; };
  window.addEventListener('resize', function () { heroH = hero ? hero.offsetHeight : 0; }, { passive: true });
  var frame = function () {
    ticking = false;
    var y = window.scrollY;
    if (y === lastY) return;
    lastY = y;
    if (parallax && y <= heroH) heroMedia.style.transform = 'translate3d(0,' + (y * factor()).toFixed(1) + 'px,0)';
  };
  var badge = $('.demo-badge'), scrollTimer = null, moving = false;
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(frame); }
    if (!moving) { moving = true; badge.classList.add('moving'); }
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(function () { moving = false; badge.classList.remove('moving'); }, 700);
  }, { passive: true });

  /* ---------- scroll reveals: added by JS (nothing hidden without JS), run once, fallback timeout ---------- */
  var groups = [
    '.welcome-copy', '.welcome-photo', '.stats li',
    '#visit .sec-head', '.expect > li', '.times-card', '#new', '.faq h3', '.faq .qa',
    '#watch .sec-head', '.player', '.sermon',
    '#ministries .sec-head', '.min',
    '.life .sec-head', '.life-grid > .ph',
    '#stories .sec-head', '.st-track',
    '#events .sec-head', '.ev-feature', '.ev-row',
    '.give-in > div', '.ways li',
    '.prayer', '.beliefs .h2', '.b-list li',
    '#staff .sec-head', '.staff-grid li',
    '.loc-copy', '.map'
  ];
  var revealed = function (el) {
    el.classList.add('in');
    var d = parseFloat(el.style.getPropertyValue('--d')) || 0;
    setTimeout(function () { el.classList.remove('rv', 'in'); el.style.removeProperty('--d'); }, 500 + d * 1000);
    if (el.classList.contains('map')) dropPin();
  };
  var map = $('.map');
  var dropPin = function () { if (map.classList.contains('pin-wait')) { map.classList.remove('pin-wait'); map.classList.add('pin-drop'); } };
  if (!reduce && hasIO) {
    /* read every position first, then write, so setup costs one layout instead of one per element */
    var vh = window.innerHeight, items = [], plan = [];
    groups.forEach(function (sel) {
      var list = $$(sel);
      list.forEach(function (el) {
        var sibs = list.filter(function (n) { return n.parentElement === el.parentElement; });
        plan.push({ el: el, i: Math.max(0, sibs.indexOf(el)), top: el.getBoundingClientRect().top });
      });
    });
    var mapBelow = map.getBoundingClientRect().top >= vh;
    plan.forEach(function (x) {
      if (x.top < vh) return;
      x.el.style.setProperty('--d', Math.min(x.i * 0.07, 0.35) + 's');
      x.el.classList.add('rv');
      items.push(x.el);
    });
    if (mapBelow) map.classList.add('pin-wait');
    var fired = false;
    var rio = new IntersectionObserver(function (entries) {
      fired = true;
      entries.forEach(function (e) { if (e.isIntersecting) { rio.unobserve(e.target); revealed(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    items.forEach(function (el) { rio.observe(el); });
    setTimeout(function () { if (!fired) items.forEach(revealed); }, 3000);
    /* anything the visitor skipped past (fast fling, anchor jump) is shown as soon as it is above the viewport */
    var skipIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (!e.isIntersecting && e.boundingClientRect.bottom < 0 && e.target.classList.contains('rv')) { skipIO.unobserve(e.target); revealed(e.target); } });
    });
    items.forEach(function (el) { skipIO.observe(el); });
  }

  /* ---------- count-up stats (once, when visible) ---------- */
  var stats = $$('.stats b[data-count]:not([data-plain])');
  if (stats.length && hasIO && !reduce) {
    stats.forEach(function (b) { b.dataset.final = b.textContent; b.textContent = '0' + (b.dataset.suffix || ''); });
    var sio = new IntersectionObserver(function (entries) {
      if (!entries.some(function (e) { return e.isIntersecting; })) return;
      sio.disconnect();
      var t0 = performance.now(), dur = 1200;
      var step = function (t) {
        var p = Math.min(1, (t - t0) / dur), k = 1 - Math.pow(1 - p, 3);
        stats.forEach(function (b) { b.textContent = Math.round(+b.dataset.count * k) + (b.dataset.suffix || ''); });
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, { threshold: 0.4 });
    sio.observe($('.stats'));
  }

  /* ---------- scroll lock shared by menu (phone) and modal ---------- */
  var locks = 0;
  var lock = function (on) { locks = Math.max(0, locks + (on ? 1 : -1)); root.classList.toggle('locked', locks > 0); };

  /* ---------- menu with animated open/close ---------- */
  var menuBtn = $('.menu-btn'), menu = $('#menu'), menuOpen = false, menuLocked = false, menuTimer = null;
  var focusables = function (el) { return $$('a[href], button:not([disabled]), input, select, textarea', el).filter(function (n) { return n.offsetParent !== null; }); };
  var setMenu = function (open, restore) {
    if (open === menuOpen) return;
    menuOpen = open;
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    clearTimeout(menuTimer);
    if (open) {
      menu.classList.remove('closing');
      menu.hidden = false;
      head.classList.add('open');
      if (phone.matches) { lock(true); menuLocked = true; }
      var f = focusables(menu)[0]; if (f) f.focus();
    } else {
      if (menuLocked) { lock(false); menuLocked = false; }
      var finish = function () { menu.hidden = true; menu.classList.remove('closing'); head.classList.remove('open'); };
      if (reduce) finish(); else { menu.classList.add('closing'); menuTimer = setTimeout(finish, 200); }
      if (restore) menuBtn.focus();
    }
  };
  menuBtn.addEventListener('click', function () { setMenu(!menuOpen, true); });
  menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('click', function (e) { if (menuOpen && !e.target.closest('.site-head')) setMenu(false); });
  document.addEventListener('keydown', function (e) {
    if (!menuOpen) return;
    if (e.key === 'Escape') { setMenu(false, true); return; }
    if (e.key === 'Tab') {
      var list = [menuBtn].concat(focusables(menu)), first = list[0], last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* ---------- time in Orlando ---------- */
  var fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23', weekday: 'short' });
  var DOW = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  var orlando = function () {
    var p = {};
    fmt.formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
    return { y: +p.year, mo: +p.month, d: +p.day, h: +p.hour % 24, mi: +p.minute, s: +p.second, dow: DOW[p.weekday] };
  };

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

  /* ---------- countdown with ticking digits (WAAPI, only while visible) ---------- */
  var live = $('.live'), countEl = $('#count'), label = $('.live-label', live), units = {};
  $$('[data-u]', countEl).forEach(function (b) { units[b.dataset.u] = b; });
  var setDigit = function (b, v) {
    if (b.textContent === v) return;
    b.textContent = v;
    if (!reduce && b.animate) b.animate([{ transform: 'translateY(-45%)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 280, easing: 'cubic-bezier(.2,.7,.3,1)' });
  };
  var tick = function () {
    var n = orlando(), mins = n.h * 60 + n.mi;
    if (n.dow === 0 && mins >= 540 && mins < 735) { label.textContent = 'We are live right now'; countEl.hidden = true; return; }
    label.textContent = 'Next live stream in'; countEl.hidden = false;
    var ahead = (7 - n.dow) % 7;
    if (ahead === 0 && mins >= 540) ahead = 7;
    var diff = Math.max(0, Math.floor((Date.UTC(n.y, n.mo - 1, n.d + ahead, 9) - Date.UTC(n.y, n.mo - 1, n.d, n.h, n.mi, n.s)) / 1000));
    setDigit(units.d, String(Math.floor(diff / 86400)));
    setDigit(units.h, pad(Math.floor(diff % 86400 / 3600)));
    setDigit(units.m, pad(Math.floor(diff % 3600 / 60)));
    setDigit(units.s, pad(diff % 60));
  };
  tick();
  var ticker = null;
  if (hasIO) new IntersectionObserver(function (e) { clearInterval(ticker); if (e[0].isIntersecting) { tick(); ticker = setInterval(tick, 1000); } }).observe(live);
  else ticker = setInterval(tick, 1000);

  /* ---------- service-time tabs with sliding indicator ---------- */
  var tabs = $$('.svc-tabs [role="tab"]'), tabBox = $('.svc-tabs');
  var placeInd = function (t) {
    tabBox.style.setProperty('--x', t.offsetLeft + 'px'); tabBox.style.setProperty('--y', t.offsetTop + 'px');
    tabBox.style.setProperty('--w', t.offsetWidth + 'px'); tabBox.style.setProperty('--h', t.offsetHeight + 'px');
  };
  placeInd(tabs[0]);
  window.addEventListener('resize', function () { placeInd(tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0]); }, { passive: true });
  var selectTab = function (i, focus) {
    tabs.forEach(function (t, j) {
      var on = j === i;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
    placeInd(tabs[i]);
    if (focus) tabs[i].focus();
  };
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { selectTab(i); });
    t.addEventListener('keydown', function (e) {
      var k = e.key, n = tabs.length;
      if (k === 'ArrowRight' || k === 'ArrowLeft' || k === 'Home' || k === 'End') {
        e.preventDefault();
        selectTab(k === 'Home' ? 0 : k === 'End' ? n - 1 : (i + (k === 'ArrowRight' ? 1 : -1) + n) % n, true);
      }
    });
  });

  /* ---------- FAQ accordion: animate both open and close ---------- */
  $$('.qa').forEach(function (d) {
    var sum = $('summary', d), body = $('.qa-a', d), timer = null;
    sum.addEventListener('click', function (e) {
      e.preventDefault();
      clearTimeout(timer);
      if (!d.open) {
        d.open = true;
        if (reduce) { d.classList.add('show'); return; }
        requestAnimationFrame(function () { requestAnimationFrame(function () { d.classList.add('show'); }); });
      } else {
        d.classList.remove('show');
        if (reduce) { d.open = false; return; }
        timer = setTimeout(function () { d.open = false; }, 300);
      }
    });
  });

  /* ---------- sermon player with hover-preview list ---------- */
  var player = $('#player'), poster = $('.poster', player), posterA = $('.poster-a', player), posterB = $('.poster-b', player);
  var cap = $('.poster-cap', player), capText = $('[data-cap]', cap), durEl = $('.dur', player), lenEl = $('.bar-time', player);
  var items = $$('.r-item'), current = items[0], timer = null, t = 0, LEN = 38 * 60 + 12;
  var fill = $('.bar-fill', player), tEl = $('[data-t]', player), toggle = $('[data-toggle]', player);
  var toSec = function (s) { var p = s.split(':'); return +p[0] * 60 + +p[1]; };
  var draw = function () { fill.style.transform = 'scaleX(' + (t / LEN) + ')'; tEl.textContent = Math.floor(t / 60) + ':' + pad(t % 60); };
  var run = function () { clearInterval(timer); player.classList.remove('paused'); toggle.setAttribute('aria-label', 'Pause'); timer = setInterval(function () { t = Math.min(LEN, t + 1); draw(); }, 1000); };
  var pause = function () { clearInterval(timer); player.classList.add('paused'); toggle.setAttribute('aria-label', 'Play'); };
  var showPoster = function (item) {
    var src = item.dataset.poster;
    if (posterA.getAttribute('src') === src && !poster.classList.contains('swap')) { setCap(item); return; }
    if (posterB.getAttribute('src') === src && poster.classList.contains('swap')) { setCap(item); return; }
    var back = poster.classList.contains('swap') ? posterA : posterB;
    back.src = src;
    var go = function () { poster.classList.toggle('swap', back === posterB); };
    if (back.decode) back.decode().then(go, go); else go();
    setCap(item);
  };
  var setCap = function (item) {
    if (capText.textContent === item.dataset.title) return;
    cap.classList.add('changing');
    setTimeout(function () { capText.textContent = item.dataset.title; cap.classList.remove('changing'); }, reduce ? 0 : 150);
    $('small', cap).textContent = item === items[0] ? 'Latest' : 'Preview';
  };
  items.forEach(function (it) {
    it.addEventListener('mouseenter', function () { if (!player.classList.contains('on')) showPoster(it); });
    it.addEventListener('focus', function () { if (!player.classList.contains('on')) showPoster(it); });
    it.addEventListener('click', function () {
      current.classList.remove('is-current'); it.classList.add('is-current'); current = it;
      clearInterval(timer); player.classList.remove('on', 'paused'); t = 0;
      LEN = toSec(it.dataset.len); durEl.textContent = it.dataset.len; lenEl.lastChild.textContent = ' / ' + it.dataset.len; draw();
      poster.setAttribute('aria-label', 'Play sermon: ' + it.dataset.title + ', ' + it.dataset.len);
      showPoster(it);
      $('small', cap).textContent = it === items[0] ? 'Latest' : 'Now selected';
    });
  });
  $('.recent').addEventListener('mouseleave', function () { if (!player.classList.contains('on')) showPoster(current); });
  /* warm the poster cache once the section is near, so hover swaps are instant */
  if (hasIO) {
    var pio = new IntersectionObserver(function (e) {
      if (!e[0].isIntersecting) return; pio.disconnect();
      items.forEach(function (it) { var im = new Image(); im.src = it.dataset.poster; });
    }, { rootMargin: '400px 0px' });
    pio.observe(player);
  }
  poster.addEventListener('click', function () {
    if (!player.classList.contains('on')) { player.classList.add('on'); run(); toggle.focus(); return; }
    if (player.classList.contains('paused')) run(); else pause();
  });
  toggle.addEventListener('click', function () { if (player.classList.contains('paused')) run(); else pause(); });

  /* ---------- stories carousel: swipe/drag, arrows, dots, pausable autoplay ---------- */
  var stories = $('#stories'), track = $('.st-track', stories), cards = $$('.st-card', stories), dots = $$('.st-dots button', stories);
  var idx = 0, auto = null, userPaused = reduce, hovering = false, visible = false, DUR = 6000;
  stories.style.setProperty('--st-dur', DUR / 1000 + 's');
  var goTo = function (i) {
    idx = (i + cards.length) % cards.length;
    track.scrollTo({ left: cards[idx].offsetLeft - track.offsetLeft - 2, behavior: reduce ? 'auto' : 'smooth' });
    mark(idx);
  };
  var mark = function (i) {
    idx = i;
    cards.forEach(function (c, j) { c.classList.toggle('is-active', j === i); });
    dots.forEach(function (d, j) { if (j === i) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current'); });
    restartBar();
  };
  var restartBar = function () {
    var d = dots[idx];
    if (!d || !stories.classList.contains('playing')) return;
    stories.classList.remove('playing'); void d.offsetWidth; stories.classList.add('playing');
  };
  var running = function () { return !userPaused && !hovering && visible; };
  var schedule = function () {
    clearInterval(auto);
    stories.classList.toggle('playing', running());
    stories.classList.toggle('paused', userPaused);
    if (running()) auto = setInterval(function () { goTo(idx + 1); }, DUR);
  };
  if (hasIO) {
    /* after a swipe settles, the active story is the one snapped to the start (or the chosen one at the very end) */
    var settle = null;
    track.addEventListener('scroll', function () {
      clearTimeout(settle);
      settle = setTimeout(function () {
        if (drag) return;
        var step = cards[1].offsetLeft - cards[0].offsetLeft, j = Math.round(track.scrollLeft / step);
        var atEnd = track.scrollLeft >= track.scrollWidth - track.clientWidth - 4;
        if (atEnd && idx >= j) return;
        if (j !== idx) mark(Math.min(j, cards.length - 1));
      }, 120);
    }, { passive: true });
    new IntersectionObserver(function (e) { visible = e[0].isIntersecting; schedule(); }, { threshold: 0.35 }).observe(track);
  }
  $('[data-st="prev"]', stories).addEventListener('click', function () { goTo(idx - 1); schedule(); });
  $('[data-st="next"]', stories).addEventListener('click', function () { goTo(idx + 1); schedule(); });
  var pauseBtn = $('[data-st="pause"]', stories);
  pauseBtn.addEventListener('click', function () {
    userPaused = !userPaused;
    pauseBtn.setAttribute('aria-label', userPaused ? 'Play auto-play' : 'Pause auto-play');
    schedule();
  });
  dots.forEach(function (d, i) { d.addEventListener('click', function () { goTo(i); schedule(); }); });
  track.addEventListener('mouseenter', function () { hovering = true; schedule(); });
  track.addEventListener('mouseleave', function () { hovering = false; schedule(); });
  track.addEventListener('focusin', function () { hovering = true; schedule(); });
  track.addEventListener('focusout', function () { hovering = false; schedule(); });
  track.addEventListener('touchstart', function () { userPaused = true; pauseBtn.setAttribute('aria-label', 'Play auto-play'); schedule(); }, { passive: true });
  track.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); goTo(idx + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(idx - 1); }
  });
  /* mouse drag (touch and trackpads already scroll natively) */
  var drag = null;
  track.addEventListener('pointerdown', function (e) {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    drag = { x: e.clientX, left: track.scrollLeft, moved: false };
  });
  window.addEventListener('pointermove', function (e) {
    if (!drag) return;
    var dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) > 4) { drag.moved = true; track.classList.add('dragging'); }
    if (drag.moved) track.scrollLeft = drag.left - dx;
  }, { passive: true });
  window.addEventListener('pointerup', function (e) {
    if (!drag) return;
    var moved = drag.moved, dx = e.clientX - drag.x;
    drag = null;
    if (!moved) return;
    track.classList.remove('dragging');
    var base = idx;
    goTo(Math.abs(dx) > 60 ? base + (dx < 0 ? 1 : -1) : base);
    schedule();
  });
  mark(0);

  /* ---------- forms ---------- */
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

  /* ---------- Tithely-style giving modal: animated open/close, scroll lock, Esc, focus return ---------- */
  var modal = $('#give-modal'), gForm = $('.gm-form', modal), gThanks = $('.gm-thanks', modal), opener = null, closing = false;
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
  var closeGive = function () {
    if (!modal.open || closing) return;
    if (reduce) { modal.close(); return; }
    closing = true;
    modal.classList.add('closing');
    setTimeout(function () { modal.classList.remove('closing'); closing = false; modal.close(); }, 200);
  };
  var openGive = function (from) {
    opener = from || document.activeElement;
    setMenu(false);
    gForm.hidden = false; gThanks.hidden = true; gErr.hidden = true;
    update();
    modal.showModal();
    lock(true);
    badgeState();
  };
  modal.addEventListener('cancel', function (e) { e.preventDefault(); closeGive(); });
  modal.addEventListener('close', function () { lock(false); badgeState(); if (opener && opener.focus) opener.focus(); });
  $$('[data-give]').forEach(function (b) { b.addEventListener('click', function (e) { e.preventDefault(); openGive(b); }); });
  $$('[data-close]', modal).forEach(function (b) { b.addEventListener('click', closeGive); });
  modal.addEventListener('click', function (e) { if (e.target === modal) closeGive(); });
  gForm.addEventListener('submit', function (e) {
    e.preventDefault();
    if (value() < 1) { gErr.hidden = false; amt.focus(); return; }
    var f = gForm.elements.freq.value, fund = gForm.elements.fund.value;
    $('[data-msg]', gThanks).textContent = $('[data-total]', modal).textContent.replace(/ (weekly|monthly)$/, '') + (f === 'once' ? ' one time' : ' ' + f) + ' to ' + (fund === 'Missions' ? '' : 'the ') + fund + '.';
    gForm.hidden = true; gThanks.hidden = false; gThanks.focus();
  });

  /* ---------- demo badge: hidden over the hero, over the footer, while the modal is open ---------- */
  var footVisible = false, heroVisible = true;
  var badgeState = function () { badge.classList.toggle('away', heroVisible || footVisible || modal.open); };
  badgeState();
  if (hasIO) {
    new IntersectionObserver(function (e) { footVisible = e[0].isIntersecting; badgeState(); }).observe($('#foot'));
    new IntersectionObserver(function (e) { heroVisible = e[0].isIntersecting; badgeState(); }, { rootMargin: '0px 0px -100px 0px' }).observe($('.infobar'));
  } else { heroVisible = false; badgeState(); }
})();
