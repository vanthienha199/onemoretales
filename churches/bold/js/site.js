(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pad = v => String(v).padStart(2, '0');

  const CAMPUS = {
    orlando: { times: 'Sundays 9:00, 10:30 and 12:00', address: '1800 N Mills Ave, Orlando, FL 32803', parking: 'Guest spots are in the front row off Mills Ave. Turn on your hazards and a parking volunteer will wave you in.', slots: ['9:00 AM', '10:30 AM', '12:00 PM'], lastEnd: 13 * 60 + 15, name: 'Orlando campus' },
    nona: { times: 'Sundays at 10:00 AM', address: '6900 Tavistock Lakes Blvd, Orlando, FL 32827', parking: 'Park on level 1 of the Town Center garage. Our team waits at the elevator with coffee and directions.', slots: ['10:00 AM'], lastEnd: 11 * 60 + 15, name: 'Lake Nona campus' }
  };
  let campus = 'orlando';
  function setCampus(c, animate) {
    const changed = c !== campus; campus = c; const d = CAMPUS[c];
    $$('.campus-switch').forEach(w => { w.dataset.active = c; });
    $$('.campus-switch button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.campus === c)));
    $$('[data-c]').forEach(el => {
      el.textContent = d[el.dataset.c];
      if (animate && changed && !reduce) { el.classList.remove('swap'); void el.offsetWidth; el.classList.add('swap'); }
    });
    const sel = $('#nfCampus'); if (sel.value !== c) sel.value = c;
    fillVisitOptions();
  }
  $$('.campus-switch button').forEach(b => b.addEventListener('click', () => setCampus(b.dataset.campus, true)));
  $('#nfCampus').addEventListener('change', e => setCampus(e.target.value, true));

  function nyNow() {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', weekday: 'short' }).formatToParts(new Date()).map(x => [x.type, x.value]));
    return { y: +p.year, m: +p.month, d: +p.day, H: +p.hour % 24, M: +p.minute, S: +p.second, wd: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday) };
  }
  function nextStream() {
    const n = nyNow(), now = Date.UTC(n.y, n.m - 1, n.d, n.H, n.M, n.S);
    if (n.wd === 0) {
      const start = Date.UTC(n.y, n.m - 1, n.d, 9), end = Date.UTC(n.y, n.m - 1, n.d, 13, 15);
      if (now >= start && now < end) return { live: true };
      if (now < start) return { ms: start - now };
    }
    return { ms: Date.UTC(n.y, n.m - 1, n.d + ((7 - n.wd) % 7 || 7), 9) - now };
  }
  const chip = $('#liveChip'), chipLbl = chip.querySelector('.live-lbl'), chipT = $('#liveT'), cd = $('#cd'), boxes = $$('#cdBoxes b');
  const setText = (el, v) => { if (el.textContent !== v) el.textContent = v; };
  function tick() {
    const r = nextStream();
    chip.classList.toggle('on', !!r.live); cd.classList.toggle('live-now', !!r.live);
    if (r.live) { setText(chipLbl, 'Live now'); setText(chipT, 'Watch'); setText($('#cdLabel'), 'We are live right now from Orlando'); return; }
    const t = Math.max(0, Math.floor(r.ms / 1000)), D = Math.floor(t / 86400), H = Math.floor(t % 86400 / 3600), M = Math.floor(t % 3600 / 60), S = t % 60;
    setText(chipLbl, 'Next live stream in'); setText(chipT, D > 0 ? `${D}d ${pad(H)}:${pad(M)}:${pad(S)}` : `${pad(H)}:${pad(M)}:${pad(S)}`);
    const v = { d: String(D), h: pad(H), m: pad(M), s: pad(S) };
    boxes.forEach(b => {
      const val = v[b.dataset.u]; if (b.textContent === val) return;
      if (reduce || !b.firstElementChild) { b.innerHTML = '<span class="tk-s"></span>'; b.firstChild.textContent = val; if (!reduce) b.firstChild.className = 'tk'; return; }
      const sp = document.createElement('span'); sp.className = 'tk'; sp.textContent = val; b.replaceChildren(sp);
    });
  }
  tick(); setInterval(tick, 1000);

  function fillVisitOptions() {
    const n = nyNow(), ds = $('#nfDate'), ts = $('#nfTime'), keepD = ds.value, keepT = ts.value;
    let start = (7 - n.wd) % 7; if (start === 0 && n.H * 60 + n.M >= CAMPUS[campus].lastEnd) start = 7;
    ds.innerHTML = [0, 1, 2, 3].map(i => {
      const k = start + i * 7, dt = new Date(Date.UTC(n.y, n.m - 1, n.d + k, 12));
      return `<option value="${dt.toISOString().slice(0, 10)}">${dt.toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' })}${k === 0 ? ' (today)' : ''}</option>`;
    }).join('');
    if ([...ds.options].some(o => o.value === keepD)) ds.value = keepD;
    ts.innerHTML = CAMPUS[campus].slots.map(s => `<option>${s}</option>`).join('');
    if ([...ts.options].some(o => o.value === keepT)) ts.value = keepT;
  }

  let openers = new Map();
  function closeDialog(dlg, after) {
    if (!dlg.open) { if (after) after(); return; }
    if (after) dlg.addEventListener('close', () => after(), { once: true });
    if (reduce || dlg.classList.contains('closing')) { if (!dlg.classList.contains('closing')) dlg.close(); return; }
    dlg.classList.add('closing');
    let done = false; const fin = () => { if (done) return; done = true; dlg.classList.remove('closing'); dlg.close(); };
    dlg.addEventListener('animationend', e => { if (e.target === dlg) fin(); }, { once: true });
    setTimeout(fin, 320);
  }
  function openDialog(dlg, opener) {
    openers.set(dlg, opener || document.activeElement);
    document.documentElement.classList.add('lock');
    dlg.showModal();
  }
  function onDialogClose(dlg) {
    dlg.addEventListener('close', () => {
      if (!$$('dialog[open]').length) document.documentElement.classList.remove('lock');
      const o = openers.get(dlg); if (o && o.isConnected && !dlg.dataset.skipFocus) o.focus({ preventScroll: true });
      delete dlg.dataset.skipFocus;
    });
    dlg.addEventListener('click', e => { if (e.target === dlg) closeDialog(dlg); });
    dlg.addEventListener('cancel', e => { e.preventDefault(); closeDialog(dlg); });
  }

  const menu = $('#menu');
  onDialogClose(menu);
  $('#menuBtn').addEventListener('click', e => openDialog(menu, e.currentTarget));
  $('#menuClose').addEventListener('click', () => closeDialog(menu));
  $$('#menu nav a').forEach((a, i) => a.style.setProperty('--i', i));
  menu.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]'); if (!a) return;
    e.preventDefault(); menu.dataset.skipFocus = '1';
    const t = document.querySelector(a.getAttribute('href'));
    closeDialog(menu, () => { if (t) { t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); history.replaceState(null, '', a.getAttribute('href')); } });
  });

  const vid = $('#heroVid'), vt = $('#vidToggle');
  const saveData = !!(navigator.connection && navigator.connection.saveData);
  let userPaused = reduce || saveData, heroVisible = true;
  function syncVid() {
    vt.setAttribute('aria-pressed', String(userPaused));
    vt.setAttribute('aria-label', userPaused ? 'Play background video' : 'Pause background video');
    if (userPaused || !heroVisible) { vid.pause(); return; }
    if (!vid.src) vid.src = vid.dataset.src;
    vid.play().catch(() => {});
  }
  vt.addEventListener('click', () => { userPaused = !userPaused; syncVid(); });
  const startVid = () => setTimeout(syncVid, 300);
  if (!userPaused) { document.readyState === 'complete' ? startVid() : addEventListener('load', startVid, { once: true }); } else syncVid();
  const badge = $('#badge');
  new IntersectionObserver(([e]) => {
    heroVisible = e.isIntersecting;
    if (vid.src) syncVid();
    badge.hidden = e.intersectionRatio > .4;
  }, { threshold: [0, .4] }).observe($('.hero'));

  const navLinks = $$('.links a');
  const navIO = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) navLinks.forEach(a => a.setAttribute('aria-current', String(a.getAttribute('href') === '#' + e.target.id))); }), { rootMargin: '-45% 0px -50% 0px' });
  ['visit', 'watch', 'ministries', 'events', 'about'].forEach(id => navIO.observe(document.getElementById(id)));

  const V = [
    { t: "A Kingdom That Can't Be Moved", s: 'Unshaken, week 3', spk: 'Marcus Reed', date: 'Nov 15, 2026 · Orlando campus', dur: '41:12', img: 'img/sermon-600.webp', th: 'img/th-sermon.webp', pos: '50% 20%' },
    { t: 'Run With Endurance', s: 'Unshaken, week 2', spk: 'Marcus Reed', date: 'Nov 8, 2026 · Orlando campus', dur: '38:47', img: 'img/ev-worship-560.webp', th: 'img/th-ev-worship.webp', pos: '50% 50%' },
    { t: 'Eyes Up', s: 'Unshaken, week 1', spk: 'Dev Raman', date: 'Nov 1, 2026 · Lake Nona campus', dur: '36:05', img: 'img/series-art-600.webp', th: 'img/th-series-art.webp', pos: '60% 50%' },
    { t: 'Neighbors, Not Projects', s: 'Ordinary Saints, week 4', spk: 'Sara Haddad', date: 'Oct 25, 2026 · Orlando campus', dur: '34:20', img: 'img/groups-640.webp', th: 'img/th-groups.webp', pos: '50% 50%' },
    { t: 'Faithful in the Small', s: 'Ordinary Saints, week 3', spk: 'Marcus Reed', date: 'Oct 18, 2026 · Orlando campus', dur: '40:02', img: 'img/ev-serve-560.webp', th: 'img/th-ev-serve.webp', pos: '50% 40%' },
    { t: 'Who Told You That?', s: 'Students, Wednesday night', spk: 'Jordan Okafor', date: 'Oct 14, 2026 · Orlando campus', dur: '27:31', img: 'img/students-640.webp', th: 'img/th-students.webp', pos: '50% 40%' }
  ];
  let cur = 0;
  $('#upnext').innerHTML = V.map((v, i) => `<li><button class="item" type="button" data-i="${i}" aria-current="${i === 0}"><span class="th"><img src="${v.th}" alt="" width="136" height="77" loading="lazy" decoding="async" style="object-position:${v.pos}"><span class="d">${v.dur}</span><span class="np">PLAYING</span></span><span><span class="t">${v.t}</span><span class="m">${v.s} · ${v.spk}</span></span></button></li>`).join('');
  let preview = null;
  function info(i) {
    const v = V[i];
    setText($('#vTitle'), v.t); setText($('#vSpk'), v.spk); setText($('#vDate'), v.date);
    setText($('#poSeries'), v.s); setText($('#poTitle'), v.t); setText($('#poDur'), v.dur);
    const pi = $('#posterImg');
    if (!pi.src.endsWith(v.img)) { pi.src = v.img; pi.style.objectPosition = v.pos; if (!reduce) { pi.classList.remove('swapimg'); void pi.offsetWidth; pi.classList.add('swapimg'); } }
    $$('.item').forEach(b => b.setAttribute('aria-current', String(+b.dataset.i === (preview ?? i))));
  }
  const st = $('#pst'), sx = st.getContext('2d');
  function noiseFrame() { const d = sx.createImageData(st.width, st.height); for (let i = 0; i < d.data.length; i += 4) { const g = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = g; d.data[i + 3] = 255; } sx.putImageData(d, 0, 0); }
  function flash(label) {
    if (reduce) return;
    const t0 = performance.now(); st.classList.remove('go'); void st.offsetWidth; st.classList.add('go');
    (function f() { noiseFrame(); if (performance.now() - t0 < 280) requestAnimationFrame(f); })();
    const osd = $('#osd'); osd.textContent = label; osd.classList.add('show'); clearTimeout(flash.t); flash.t = setTimeout(() => osd.classList.remove('show'), 1400);
  }
  function play(i) {
    cur = i; preview = null; info(i); flash(`CH ${pad(i + 1)}`);
    const pv = $('#pv'); if (!pv.src) pv.src = 'video/hero.mp4';
    pv.hidden = false; $('#poster').hidden = true; pv.play().catch(() => {});
    const note = $('#demoNote'); note.hidden = false; clearTimeout(play.t); play.t = setTimeout(() => { note.hidden = true; }, 3500);
  }
  $('#poster').addEventListener('click', () => { play(cur); $('#pv').focus({ preventScroll: true }); });
  $('#upnext').addEventListener('click', e => {
    const b = e.target.closest('.item'); if (!b) return; play(+b.dataset.i);
    const r = $('#player').getBoundingClientRect(); if (r.top < 0 || r.bottom > innerHeight) $('#player').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
  });
  new IntersectionObserver(([e]) => { if (!e.isIntersecting) $('#pv').pause(); }).observe($('#player'));
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    let warmed = false;
    const list = $('#upnext');
    list.addEventListener('pointerover', e => {
      const b = e.target.closest('.item'); if (!b || !$('#pv').hidden) return;
      if (!warmed) { warmed = true; V.forEach(v => { const im = new Image(); im.src = v.img; }); }
      const i = +b.dataset.i; if (i === preview) return; preview = i; info(i);
    });
    list.addEventListener('pointerleave', () => { if (preview === null) return; preview = null; if ($('#pv').hidden) info(cur); });
  }

  const vf = $('#visitForm'), emailOk = v => /^\S+@\S+\.\S+$/.test(v);
  vf.addEventListener('submit', e => {
    e.preventDefault();
    const name = vf.name.value.trim(), email = vf.email.value.trim(), err = $('#visitErr');
    vf.name.setAttribute('aria-invalid', String(!name)); vf.email.setAttribute('aria-invalid', String(!emailOk(email)));
    if (!name) { err.textContent = 'Please add your name.'; vf.name.focus(); return; }
    if (!emailOk(email)) { err.textContent = 'Please add a valid email so we can send directions.'; vf.email.focus(); return; }
    err.textContent = '';
    const kids = vf.kids.value === 'yes', dl = $('#nfDate').selectedOptions[0].textContent.replace(' (today)', '');
    $('#thName').textContent = name.split(' ')[0];
    $('#thLine').textContent = `${dl} at ${vf.time.value}, ${CAMPUS[campus].name}. We'll email ${email} directions and a parking map${kids ? ', and our Kids team will have your check-in tags ready' : ''}.`;
    $('#visitBody').hidden = true; const th = $('#visitThanks'); th.hidden = false; th.focus();
  });
  ['name', 'email'].forEach(n => vf[n].addEventListener('input', () => vf[n].removeAttribute('aria-invalid')));
  $('#visitReset').addEventListener('click', () => { vf.reset(); setCampus(campus); $('#visitThanks').hidden = true; $('#visitBody').hidden = false; vf.name.focus(); });

  const pf = $('#prayerForm');
  pf.addEventListener('submit', e => {
    e.preventDefault();
    const ok = pf.req.value.trim().length > 0;
    pf.req.setAttribute('aria-invalid', String(!ok));
    if (!ok) { $('#prErr').textContent = 'Write a few words so our team knows how to pray.'; pf.req.focus(); return; }
    $('#prErr').textContent = ''; $('#prBody').hidden = true; const th = $('#prThanks'); th.hidden = false; th.focus();
  });
  $('#prReset').addEventListener('click', () => { pf.reset(); $('#prThanks').hidden = true; $('#prBody').hidden = false; pf.req.focus(); });

  const gm = $('#giveModal'), amt = $('#gmAmt');
  onDialogClose(gm);
  const money = v => '$' + v.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  function calc() {
    const a = parseFloat(amt.value) || 0, fee = a > 0 ? Math.round((a * 0.029 + 0.3) * 100) / 100 : 0, total = a + ($('#gmFees').checked ? fee : 0);
    setText($('#gmFee'), money(fee)); setText($('#gmTotal'), money(total));
    $$('.gm-chips button').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.amt === a)));
    return { a, total };
  }
  document.addEventListener('click', e => {
    const g = e.target.closest('[data-give]'); if (!g) return;
    e.preventDefault();
    if (menu.open) { menu.dataset.skipFocus = '1'; menu.classList.remove('closing'); menu.close(); }
    $('#gmStep1').hidden = false; $('#gmStep2').hidden = true; $('#gmErr').textContent = '';
    openDialog(gm, g.closest('dialog') ? $('#menuBtn') : g); calc(); amt.focus(); amt.select();
  });
  $('#gmClose').addEventListener('click', () => closeDialog(gm));
  amt.addEventListener('input', () => { const c = amt.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1').slice(0, 7); if (c !== amt.value) amt.value = c; calc(); });
  $$('.gm-chips button').forEach(b => b.addEventListener('click', () => { amt.value = b.dataset.amt; calc(); }));
  $('#gmFees').addEventListener('change', calc);
  $('#gmGo').addEventListener('click', () => {
    const { a, total } = calc();
    if (a < 1) { $('#gmErr').textContent = 'Enter an amount of at least $1.'; amt.focus(); return; }
    $('#gmSummary').textContent = `${money(total)} to ${$('#gmFund').value}, ${$('input[name="freq"]:checked').value.toLowerCase()}.`;
    $('#gmStep1').hidden = true; const s2 = $('#gmStep2'); s2.hidden = false; s2.focus();
  });
  $('#gmAgain').addEventListener('click', () => closeDialog(gm));

  setCampus('orlando');

  const top = $('#top');
  new IntersectionObserver(([e]) => top.classList.toggle('scrolled', !e.isIntersecting), { threshold: 0 }).observe($('.util'));

  const rvSel = '.stats-in > div, .sec-head, .series-art, .series-copy, .wgrid > div, .ex-photo, .ex-grid article, .newform, .mcard, .ev-rail, .car-prog, .give-in > *, .beliefs li, .staff-h, .staff li, .prform, .prayer-in > div, .loc, .loc-note, .ha-card, .foot-grid > div';
  const rvEls = $$(rvSel);
  const sib = new Map();
  rvEls.forEach(el => { const p = el.parentElement, n = sib.get(p) || 0; sib.set(p, n + 1); el.style.setProperty('--rv', Math.min(n, 5)); el.classList.add('rv'); });
  const vh = innerHeight;
  rvEls.forEach(el => { if (el.getBoundingClientRect().top < vh * .92) el.classList.add('in', 'nt'); });
  requestAnimationFrame(() => requestAnimationFrame(() => rvEls.forEach(el => el.classList.remove('nt'))));
  const rio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); rio.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: 0.01 });
  rvEls.forEach(el => { if (!el.classList.contains('in')) rio.observe(el); });
  addEventListener('load', () => setTimeout(() => { $$('.rv:not(.in)').forEach(el => { const r = el.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) el.classList.add('in'); }); }, 2500));

  const counters = $$('[data-count]');
  if (!reduce) {
    const fmt = n => n.toLocaleString('en-US');
    const cio = new IntersectionObserver(es => {
      const hit = es.filter(e => e.isIntersecting).map(e => e.target); if (!hit.length) return;
      hit.forEach(el => cio.unobserve(el));
      const t0 = performance.now(), dur = 1100;
      const step = t => { const p = Math.min(1, (t - t0) / dur), k = 1 - Math.pow(1 - p, 3); hit.forEach(el => { const v = fmt(Math.round(+el.dataset.count * k)); if (el.textContent !== v) el.textContent = v; }); if (p < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    }, { threshold: .6 });
    counters.forEach(el => { const r = el.getBoundingClientRect(); if (r.top > innerHeight) { el.textContent = '0'; cio.observe(el); } });
  }

  const rail = $('#evRail'), bar = $('#carBar'), cbtns = $$('.car-btn');
  const cardStep = () => { const c = rail.querySelector('.ev'); return c ? c.getBoundingClientRect().width + parseFloat(getComputedStyle(rail).columnGap || 24) : 340; };
  let rq = 0;
  const syncRail = () => {
    rq = 0; const max = rail.scrollWidth - rail.clientWidth, x = rail.scrollLeft;
    const vis = rail.clientWidth / rail.scrollWidth, p = max > 0 ? x / max : 1;
    bar.style.transform = `translateX(${(p * (1 - vis) / vis) * 100}%) scaleX(1)`;
    bar.style.width = (vis * 100) + '%';
    cbtns[0].disabled = x <= 2; cbtns[1].disabled = x >= max - 2;
  };
  rail.addEventListener('scroll', () => { if (!rq) rq = requestAnimationFrame(syncRail); }, { passive: true });
  addEventListener('resize', () => { if (!rq) rq = requestAnimationFrame(syncRail); }, { passive: true });
  syncRail();
  cbtns.forEach(b => b.addEventListener('click', () => rail.scrollBy({ left: +b.dataset.dir * cardStep(), behavior: reduce ? 'auto' : 'smooth' })));
  rail.addEventListener('keydown', e => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); rail.scrollBy({ left: (e.key === 'ArrowRight' ? 1 : -1) * cardStep(), behavior: reduce ? 'auto' : 'smooth' }); } });
  let drag = null;
  rail.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    drag = { x: e.clientX, left: rail.scrollLeft, moved: false, last: e.clientX, v: 0, t: e.timeStamp, raf: 0 };
  });
  addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) > 5) { drag.moved = true; rail.classList.add('drag'); rail.setPointerCapture?.(e.pointerId); }
    if (!drag.moved) return;
    const dt = Math.max(1, e.timeStamp - drag.t); drag.v = (e.clientX - drag.last) / dt; drag.last = e.clientX; drag.t = e.timeStamp;
    const target = drag.left - dx;
    if (!drag.raf) drag.raf = requestAnimationFrame(() => { if (drag) { drag.raf = 0; rail.scrollLeft = target; } });
  }, { passive: true });
  const endDrag = () => {
    if (!drag) return; const d = drag; drag = null;
    if (!d.moved) return;
    const stepW = cardStep(), projected = rail.scrollLeft - d.v * 220;
    const target = Math.max(0, Math.min(rail.scrollWidth - rail.clientWidth, Math.round(projected / stepW) * stepW));
    rail.scrollTo({ left: target, behavior: reduce ? 'auto' : 'smooth' });
    const restore = () => rail.classList.remove('drag');
    if ('onscrollend' in window) rail.addEventListener('scrollend', restore, { once: true }); else setTimeout(restore, 450);
    setTimeout(restore, 900);
    const block = ev => { ev.preventDefault(); ev.stopPropagation(); };
    rail.addEventListener('click', block, { capture: true });
    setTimeout(() => rail.removeEventListener('click', block, { capture: true }), 80);
  };
  addEventListener('pointerup', endDrag); addEventListener('pointercancel', endDrag);
})();
