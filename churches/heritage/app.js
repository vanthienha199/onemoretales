(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  /* text size */
  const setSize = size => {
    if (size === 'large') document.documentElement.dataset.size = 'large';
    else delete document.documentElement.dataset.size;
    $$('.ts-btn').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.size === size)));
  };
  setSize(store.get('sa-size') === 'large' ? 'large' : 'normal');
  $$('.ts-btn').forEach(b => b.addEventListener('click', () => { setSize(b.dataset.size); store.set('sa-size', b.dataset.size); if (window.__ribbonCheck) window.__ribbonCheck(); }));

  /* demo badge steps aside while reading down (rAF-throttled, passive) */
  const ribbon = $('.ribbon');
  let lastY = scrollY, ticking = false;
  const narrow = matchMedia('(max-width: 1100px)');
  const onScroll = () => {
    const y = scrollY, nearEnd = y + innerHeight > document.documentElement.scrollHeight - 300;
    const top = y <= 400;
    if (nearEnd) ribbon.classList.remove('away');
    else if (top) ribbon.classList.toggle('away', narrow.matches || document.documentElement.dataset.size === 'large');
    else if (y > lastY + 6) ribbon.classList.add('away');
    else if (y < lastY - 6) ribbon.classList.remove('away');
    lastY = y; ticking = false;
  };
  onScroll();
  window.__ribbonCheck = onScroll;
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });

  /* active nav item */
  const navLinks = $$('.mainnav a');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id)); });
    }, { rootMargin: '-45% 0px -50% 0px' });
    navLinks.forEach(a => { const s = $(a.getAttribute('href')); if (s) io.observe(s); });
  }

  /* overlay helpers: scroll lock, focus trap, Esc, return focus */
  let openLayer = null, returnTo = null;
  const lock = on => {
    const sbw = innerWidth - document.documentElement.clientWidth;
    document.documentElement.classList.toggle('locked', on);
    document.body.style.paddingRight = on && sbw > 0 ? sbw + 'px' : '';
  };
  const focusables = box => $$('a[href], button:not([disabled]), input, select, textarea', box).filter(x => !x.closest('[hidden]') && x.getClientRects().length);
  const open = (layer, focusEl, opener) => {
    const fromMenu = openLayer === menu;
    if (openLayer) close(false);
    returnTo = fromMenu ? menuBtn : (opener || document.activeElement);
    layer.hidden = false; openLayer = layer; lock(true);
    requestAnimationFrame(() => (focusEl || focusables(layer)[0]).focus());
  };
  const close = (restore = true) => {
    if (!openLayer) return;
    openLayer.hidden = true;
    if (openLayer === menu) menuBtn.setAttribute('aria-expanded', 'false');
    openLayer = null; lock(false);
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

  /* menu */
  const menu = $('#menu'), menuBtn = $('.menu-btn');
  menuBtn.addEventListener('click', () => { open(menu, $('.menu-close'), menuBtn); menuBtn.setAttribute('aria-expanded', 'true'); });
  $('.menu-close').addEventListener('click', () => close());
  menu.addEventListener('click', e => { if (e.target === menu) close(); });
  $$('#menu a[href^="#"]').forEach(a => a.addEventListener('click', () => close(false)));

  /* give modal */
  const modal = $('#give'), amt = $('#g-amt');
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

  /* forms with inline errors and thank-you state */
  const showErr = (input, on) => {
    const msg = input.getAttribute('aria-describedby') && document.getElementById(input.getAttribute('aria-describedby'));
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
      const top = card.getBoundingClientRect().top;
      if (top < 80) card.scrollIntoView({ block: 'start' });
    });
    checks.forEach(([input, ok]) => input.addEventListener('input', () => { if (input.getAttribute('aria-invalid')) showErr(input, !ok(input.value.trim())); }));
  };
  const nf = $('.newform');
  const dateIn = $('#nf-date');
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

  /* sermon poster */
  const msg = $('.player-msg');
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

  /* countdown to next Sunday 8:30 AM Eastern, only ticks while visible */
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
  const pad = n => String(n).padStart(2, '0');
  let lastWhen = '';
  const tick = () => {
    const { t, live } = target();
    let s = Math.max(0, Math.floor((t - Date.now()) / 1000));
    cd.d.textContent = Math.floor(s / 86400); s %= 86400;
    cd.h.textContent = pad(Math.floor(s / 3600)); s %= 3600;
    cd.m.textContent = pad(Math.floor(s / 60));
    cd.s.textContent = pad(s % 60);
    const when = live ? 'We are live now. Join the stream on YouTube.' : new Date(t).toLocaleDateString('en-US', { timeZone: 'America/New_York', weekday: 'long', month: 'long', day: 'numeric' }) + ' at 8:30 AM Eastern';
    if (when !== lastWhen) { $('#live-when').textContent = when; lastWhen = when; }
  };
  tick();
  let timer = null;
  const live = $('.live');
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !timer) { tick(); timer = setInterval(tick, 1000); }
      else if (!e.isIntersecting && timer) { clearInterval(timer); timer = null; }
    }).observe(live);
  } else setInterval(tick, 1000);
})();
