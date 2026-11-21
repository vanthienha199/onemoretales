(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const hasIO = 'IntersectionObserver' in window;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  window.__rv = true;

  /* text size */
  const setSize = size => {
    if (size === 'large') root.dataset.size = 'large'; else delete root.dataset.size;
    $$('.ts-btn').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.size === size)));
  };
  setSize(store.get('sa-size') === 'large' ? 'large' : 'normal');
  $$('.ts-btn').forEach(b => b.addEventListener('click', () => { setSize(b.dataset.size); store.set('sa-size', b.dataset.size); frame(); }));

  /* ---------- one passive, rAF-throttled scroll loop: hero parallax + demo badge ---------- */
  const ribbon = $('.ribbon');
  const hero = $('.hero'), heroMedia = $('.hero-media');
  const wide = matchMedia('(min-width: 701px)');
  const narrow = matchMedia('(max-width: 1100px)');
  let lastY = scrollY, queued = false, heroVisible = true, heroH = hero.offsetHeight;
  const parallaxOn = () => wide.matches && !reduce.matches;
  function frame() {
    queued = false;
    const y = scrollY;
    if (heroVisible && parallaxOn()) heroMedia.style.transform = `translate3d(0, ${Math.min(y, heroH) * 0.18}px, 0)`;
    const nearEnd = y + innerHeight > root.scrollHeight - 300;
    if (nearEnd) ribbon.classList.remove('away');
    else if (y <= 400) ribbon.classList.toggle('away', narrow.matches || root.dataset.size === 'large');
    else if (y > lastY + 6) ribbon.classList.add('away');
    else if (y < lastY - 6) ribbon.classList.remove('away');
    lastY = y;
  }
  addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(frame); } }, { passive: true });
  addEventListener('resize', () => { heroH = hero.offsetHeight; if (!parallaxOn()) heroMedia.style.transform = ''; }, { passive: true });
  frame();
  if (hasIO) new IntersectionObserver(([e]) => { heroVisible = e.isIntersecting; }).observe(hero);

  /* ---------- sticky header shrink (sentinel, class toggle only) ---------- */
  const head = $('.site-head');
  if (hasIO) new IntersectionObserver(([e]) => head.classList.toggle('scrolled', !e.isIntersecting)).observe($('.head-sentinel'));

  /* ---------- scroll reveals: once, staggered, never stuck hidden ---------- */
  if (root.classList.contains('js-reveal')) {
    const targets = [];
    $$('[data-reveal]').forEach(el => targets.push(el));
    $$('[data-reveal-group]').forEach(g => [...g.children].forEach((c, i) => { c.style.setProperty('--i', Math.min(i, 5)); targets.push(c); }));
    const show = el => {
      if (el.classList.contains('in')) return;
      el.classList.add('in');
      const done = () => { el.classList.add('rv-done'); el.style.removeProperty('--i'); };
      el.addEventListener('transitionend', done, { once: true });
      setTimeout(done, 1000);
    };
    const io = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) { show(e.target); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    targets.forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.top < innerHeight && r.bottom > 0) { el.classList.add('in', 'rv-done'); } else io.observe(el);
    });
    // anchor jumps (menu links, skip links) should never land on hidden content
    addEventListener('hashchange', () => { const t = document.getElementById(location.hash.slice(1)); if (t) $$('[data-reveal], [data-reveal-group] > *', t).forEach(show); });
  }

  /* ---------- active nav item ---------- */
  const navLinks = $$('.mainnav a');
  if (hasIO) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id)); });
    }, { rootMargin: '-45% 0px -50% 0px' });
    navLinks.forEach(a => { const s = $(a.getAttribute('href')); if (s) io.observe(s); });
  }

  /* ---------- overlays: animated open/close, scroll lock, focus trap, Esc, return focus ---------- */
  const menu = $('#menu'), menuBtn = $('.menu-btn'), modal = $('#give');
  let openLayer = null, returnTo = null;
  const lock = on => {
    const sbw = innerWidth - root.clientWidth;
    root.classList.toggle('locked', on);
    document.body.style.paddingRight = on && sbw > 0 ? sbw + 'px' : '';
  };
  const focusables = box => $$('a[href], button:not([disabled]), input, select, textarea', box).filter(x => !x.closest('[hidden]') && x.getClientRects().length);
  const hideLayer = (layer, animate) => {
    if (!animate || reduce.matches) { layer.hidden = true; layer.classList.remove('closing'); return; }
    layer.classList.add('closing');
    setTimeout(() => { layer.hidden = true; layer.classList.remove('closing'); }, 200);
  };
  const open = (layer, focusEl, opener) => {
    const fromMenu = openLayer === menu;
    if (openLayer) close(false, false);
    returnTo = fromMenu ? menuBtn : (opener || document.activeElement);
    layer.classList.remove('closing'); layer.hidden = false; openLayer = layer; lock(true);
    if (layer === menu) menuBtn.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(() => (focusEl || focusables(layer)[0]).focus());
  };
  const close = (restore = true, animate = true) => {
    if (!openLayer) return;
    const layer = openLayer; openLayer = null;
    if (layer === menu) menuBtn.setAttribute('aria-expanded', 'false');
    hideLayer(layer, animate); lock(false);
    if (restore && returnTo) returnTo.focus({ preventScroll: true });
  };
  document.addEventListener('keydown', e => {
    if (!openLayer) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key === 'Tab') {
      const f = focusables(openLayer); if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });
  menuBtn.addEventListener('click', () => open(menu, $('.menu-close'), menuBtn));
  $('.menu-close').addEventListener('click', () => close());
  menu.addEventListener('click', e => { if (e.target === menu) close(); });
  $$('#menu a[href^="#"]').forEach(a => a.addEventListener('click', () => close(false, false)));

  /* give modal */
  const amt = $('#g-amt');
  const resetGive = () => { $('.give-form').hidden = false; $('.give-done').hidden = true; $('.give-err').hidden = true; amt.removeAttribute('aria-invalid'); };
  $$('.give-open').forEach(b => b.addEventListener('click', () => { resetGive(); open(modal, amt, b); }));
  $$('[data-close]', modal).forEach(b => b.addEventListener('click', () => close()));
  const syncChips = () => $$('.chip').forEach(x => { const on = x.dataset.amt === amt.value; x.classList.toggle('on', on); x.setAttribute('aria-pressed', String(on)); });
  $$('.chip').forEach(c => c.addEventListener('click', () => { amt.value = c.dataset.amt; syncChips(); }));
  amt.addEventListener('input', () => { amt.value = amt.value.replace(/[^\d.]/g, ''); syncChips(); });
  $('.give-form').addEventListener('submit', e => {
    e.preventDefault();
    const v = parseFloat(amt.value);
    if (!(v > 0)) { amt.setAttribute('aria-invalid', 'true'); $('.give-err').hidden = false; amt.focus(); return; }
    resetGive();
    const freq = $('input[name="freq"]:checked').value, fund = $('#g-fund').value;
    $('.give-sum').textContent = `$${v.toFixed(2).replace(/\.00$/, '')} to the ${fund}, ${freq.toLowerCase()}.`;
    $('.give-form').hidden = true;
    const done = $('.give-done'); done.hidden = false; done.focus();
  });
  $('.give-again').addEventListener('click', () => { resetGive(); amt.focus(); });

  /* ---------- expandable rows (readings + FAQ), smooth height via grid rows ---------- */
  const toggleRow = (btn, force) => {
    const li = btn.closest('li');
    const on = force !== undefined ? force : btn.getAttribute('aria-expanded') !== 'true';
    btn.setAttribute('aria-expanded', String(on));
    li.classList.toggle('open', on);
  };
  $$('.rd-btn, .faq-q').forEach(b => b.addEventListener('click', () => toggleRow(b)));

  /* ---------- Order of Worship tabs ---------- */
  const tabs = $$('.svc-tab'), ind = $('.tab-ind');
  const placeInd = tab => { ind.style.setProperty('--tx', tab.offsetLeft + 'px'); ind.style.setProperty('--ts', (tab.offsetWidth / 100).toFixed(4)); };
  const selectTab = (tab, focus) => {
    tabs.forEach(t => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1;
      const p = document.getElementById(t.getAttribute('aria-controls'));
      if (on && p.hidden) { p.hidden = false; p.classList.remove('show'); void p.offsetWidth; p.classList.add('show'); }
      else if (!on) p.hidden = true;
    });
    placeInd(tab); if (focus) tab.focus();
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => selectTab(t));
    t.addEventListener('keydown', e => {
      const k = e.key; let n = null;
      if (k === 'ArrowRight') n = tabs[(i + 1) % tabs.length];
      else if (k === 'ArrowLeft') n = tabs[(i - 1 + tabs.length) % tabs.length];
      else if (k === 'Home') n = tabs[0]; else if (k === 'End') n = tabs[tabs.length - 1];
      if (n) { e.preventDefault(); selectTab(n, true); }
    });
  });
  placeInd(tabs[0]);
  addEventListener('resize', () => placeInd($('.svc-tab[aria-selected="true"]')), { passive: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => placeInd($('.svc-tab[aria-selected="true"]')));

  /* ---------- testimonies carousel: native scroll-snap swipe + pausable autoplay ---------- */
  const track = $('.tq-track'), slides = $$('.tq'), dots = $$('.tq-dot'), bar = $('.tq-bar'), playBtn = $('.tq-play');
  const DWELL = 7000;
  let cur = 0, userPaused = reduce.matches, hoverPause = false, inView = false, timer = null;
  const setCurrent = i => { cur = i; dots.forEach((d, k) => d.setAttribute('aria-current', k === i ? 'true' : 'false')); };
  const goTo = i => { i = (i + slides.length) % slides.length; track.scrollTo({ left: slides[i].offsetLeft - track.offsetLeft, behavior: reduce.matches ? 'auto' : 'smooth' }); setCurrent(i); restartBar(); };
  const running = () => !userPaused && !hoverPause && inView && !document.hidden;
  const restartBar = () => {
    clearTimeout(timer);
    bar.classList.remove('run', 'paused'); void bar.offsetWidth;
    if (running()) { bar.classList.add('run'); timer = setTimeout(() => goTo(cur + 1), DWELL); }
  };
  const syncPlay = () => {
    playBtn.setAttribute('aria-pressed', String(userPaused));
    playBtn.setAttribute('aria-label', userPaused ? 'Play testimonies' : 'Pause testimonies');
    restartBar();
  };
  $('.tq-prev').addEventListener('click', () => goTo(cur - 1));
  $('.tq-next').addEventListener('click', () => goTo(cur + 1));
  dots.forEach((d, i) => d.addEventListener('click', () => goTo(i)));
  playBtn.addEventListener('click', () => { userPaused = !userPaused; syncPlay(); });
  const testi = $('.testi');
  testi.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { hoverPause = true; restartBar(); } });
  testi.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') { hoverPause = false; restartBar(); } });
  testi.addEventListener('focusin', () => { hoverPause = true; restartBar(); });
  testi.addEventListener('focusout', e => { if (!testi.contains(e.relatedTarget)) { hoverPause = false; restartBar(); } });
  document.addEventListener('visibilitychange', restartBar);
  // keep the dots in sync when the visitor swipes (scrollend where supported, debounced scroll otherwise)
  let swipeT = null;
  const fromScroll = () => { const i = Math.round(track.scrollLeft / track.clientWidth); if (i !== cur) { setCurrent(i); restartBar(); } };
  if ('onscrollend' in window) track.addEventListener('scrollend', fromScroll);
  else track.addEventListener('scroll', () => { clearTimeout(swipeT); swipeT = setTimeout(fromScroll, 120); }, { passive: true });
  if (hasIO) new IntersectionObserver(([e]) => { inView = e.isIntersecting; restartBar(); }, { threshold: 0.4 }).observe(track);
  setCurrent(0); syncPlay();

  /* ---------- history: highlight the year in view ---------- */
  if (hasIO) {
    const items = $$('.tl');
    const tlio = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) items.forEach(t => t.classList.toggle('current', t === e.target)); });
    }, { rootMargin: '-49% 0px -50% 0px' });
    items.forEach(t => tlio.observe(t));
  }

  /* ---------- count-up stats, once ---------- */
  const countUp = el => {
    const end = +el.dataset.count, suf = el.dataset.suffix || '';
    if (reduce.matches) { el.textContent = end + suf; return; }
    const t0 = performance.now(), dur = 1100;
    const step = t => { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = Math.round(end * e) + (k === 1 ? suf : ''); if (k < 1) requestAnimationFrame(step); };
    el.textContent = '0'; requestAnimationFrame(step);
  };
  const stats = $('.stats');
  if (hasIO && !reduce.matches) {
    const r = stats.getBoundingClientRect();
    if (!(r.top < innerHeight && r.bottom > 0)) {
      const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { $$('[data-count]', stats).forEach(countUp); io.disconnect(); } }, { threshold: 0.5 });
      io.observe(stats);
    }
  }

  /* ---------- forms: inline errors + thank-you ---------- */
  const showErr = (input, on) => {
    const id = input.getAttribute('aria-describedby'), msg = id && document.getElementById(id);
    if (on) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
    if (msg) msg.hidden = !on;
  };
  const handle = (form, checks, after) => {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const bad = checks.filter(([input, ok]) => { const fail = !ok(input.value.trim()); showErr(input, fail); return fail; }).map(c => c[0]);
      if (bad.length) { bad[0].focus(); return; }
      const card = form.parentElement, thanks = $('.thanks', card);
      after(form, thanks);
      form.hidden = true; thanks.hidden = false; thanks.focus({ preventScroll: true });
      if (card.getBoundingClientRect().top < 80) card.scrollIntoView({ block: 'start' });
    });
    checks.forEach(([input, ok]) => input.addEventListener('input', () => { if (input.getAttribute('aria-invalid')) showErr(input, !ok(input.value.trim())); }));
  };
  const nf = $('.newform'), dateIn = $('#nf-date');
  const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const ns = new Date(); ns.setDate(ns.getDate() + ((7 - ns.getDay()) % 7 || 7));
  dateIn.value = ymd(ns); dateIn.min = ymd(new Date());
  handle(nf, [[nf.name, v => v.length > 0], [nf.email, v => /^\S+@\S+\.\S+$/.test(v)]], (f, t) => {
    $('.thanks-name', t).textContent = f.name.value.trim().split(/\s+/)[0];
    let when = 'Sunday';
    if (f.date.value) when = new Date(f.date.value + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    const kids = f.kids.value === 'yes' ? ' Someone from our Kids team will help you check in your children.' : '';
    $('.thanks-msg', t).textContent = `We have you down for the ${f.service.value} service on ${when}. A greeter will look for you at the front doors.${kids}`;
  });
  const pf = $('.prayform');
  handle(pf, [[pf.request, v => v.length > 0]], () => {});

  /* ---------- sermon player: hover preview + select ---------- */
  const msg = $('.player-msg'), ptext = $('.poster-text');
  const posterDefault = { title: $('.poster-title').textContent, ref: $('.poster-ref').textContent, by: $('.poster-by').textContent, dur: $('.duration').textContent };
  let selected = posterDefault, swapT = null;
  const showPoster = d => {
    if ($('.poster-title').textContent === d.title) return;
    clearTimeout(swapT); ptext.classList.add('swap');
    swapT = setTimeout(() => {
      $('.poster-title').textContent = d.title; $('.poster-ref').textContent = d.ref; $('.poster-by').textContent = d.by; $('.duration').textContent = d.dur;
      $('.play').setAttribute('aria-label', 'Play sermon: ' + d.title);
      ptext.classList.remove('swap');
    }, 150);
  };
  $$('.past-btn').forEach(b => {
    const d = { title: b.dataset.title, ref: b.dataset.ref, by: 'Rev. Dr. James Whitfield · ' + b.dataset.date, dur: b.dataset.dur };
    b.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') showPoster(d); });
    b.addEventListener('focus', () => showPoster(d));
    b.addEventListener('click', () => { selected = d; $$('.past-btn').forEach(x => x.setAttribute('aria-current', String(x === b))); showPoster(d); msg.hidden = true; });
  });
  const past = $('.past');
  past.addEventListener('pointerleave', () => showPoster(selected));
  past.addEventListener('focusout', e => { if (!past.contains(e.relatedTarget)) showPoster(selected); });
  $('.play').addEventListener('click', () => { msg.hidden = false; $('.player-close').focus(); });
  $('.player-close').addEventListener('click', () => { msg.hidden = true; $('.play').focus(); });

  /* print bulletin */
  $('.print-btn').addEventListener('click', () => window.print());

  /* add to calendar */
  $$('.ics').forEach(b => b.addEventListener('click', () => {
    const [start, end, title, loc] = b.closest('[data-ics]').dataset.ics.split('|');
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//St Andrews Demo//EN', 'BEGIN:VEVENT',
      `UID:${start}@standrews.example`, `DTSTART;TZID=America/New_York:${start}`, `DTEND;TZID=America/New_York:${end}`,
      `SUMMARY:${title}`, `LOCATION:${loc}, St. Andrew's Fellowship Church, 450 Lakeview Avenue, Winter Park FL`,
      'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    a.download = title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.ics';
    document.body.appendChild(a); a.click(); a.remove();
    const old = b.textContent; b.textContent = 'Saved to your downloads'; setTimeout(() => (b.textContent = old), 2000);
  }));

  /* ---------- countdown with ticking digits, only while visible ---------- */
  const cd = { d: $('[data-cd="d"]'), h: $('[data-cd="h"]'), m: $('[data-cd="m"]'), s: $('[data-cd="s"]') };
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', weekday: 'short', hourCycle: 'h23' });
  const target = () => {
    const now = new Date(), p = {}; fmt.formatToParts(now).forEach(x => (p[x.type] = x.value));
    const wall = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
    const offset = wall - Math.floor(now.getTime() / 1000) * 1000;
    const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday);
    const mins = +p.hour * 60 + +p.minute;
    let add = (7 - dow) % 7;
    if (add === 0 && mins >= 510) add = 7;
    return { t: Date.UTC(+p.year, +p.month - 1, +p.day + add, 8, 30) - offset, live: dow === 0 && mins >= 510 && mins < 840 };
  };
  const dayFmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'long', month: 'long', day: 'numeric' });
  const pad = n => String(n).padStart(2, '0');
  const setNum = (el, v) => { if (el.textContent === v) return; el.textContent = v; if (!reduce.matches) { el.classList.remove('tick'); void el.offsetWidth; el.classList.add('tick'); } };
  let lastWhen = '';
  const tick = () => {
    const { t, live } = target();
    let s = Math.max(0, Math.floor((t - Date.now()) / 1000));
    setNum(cd.d, String(Math.floor(s / 86400))); s %= 86400;
    setNum(cd.h, pad(Math.floor(s / 3600))); s %= 3600;
    setNum(cd.m, pad(Math.floor(s / 60)));
    setNum(cd.s, pad(s % 60));
    const when = live ? 'We are live now. Join the stream on YouTube.' : dayFmt.format(new Date(t)) + ' at 8:30 AM Eastern';
    if (when !== lastWhen) { $('#live-when').textContent = when; lastWhen = when; }
  };
  tick();
  let cdTimer = null;
  if (hasIO) new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !cdTimer) { tick(); cdTimer = setInterval(tick, 1000); }
    else if (!e.isIntersecting && cdTimer) { clearInterval(cdTimer); cdTimer = null; }
  }).observe($('.live'));
  else setInterval(tick, 1000);
})();
