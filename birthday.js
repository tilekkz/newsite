/* Birthday: an opening with 24 candles, a live countdown and a finale of wishes. */
(() => {
  'use strict';
  // Edit here. `name` is optional: when set, the invitation card is skipped
  // and every greeting uses it.
  const BIRTHDAY = { year:2002, month:11, day:3, name:'' };
  const { gsap } = window;
  const root = document.documentElement;
  const reducedMedia = matchMedia('(prefers-reduced-motion: reduce)');
  const reduced = () => reducedMedia.matches;
  const intro = document.querySelector('#birthday-intro');
  let resolveIntro;
  window.Birthday = { name:BIRTHDAY.name.trim().slice(0, 24), introDone:new Promise(resolve => { resolveIntro = resolve; }) };
  // Later scripts (the letter, the bouquet) read the guest name from storage.
  if (window.Birthday.name) try { sessionStorage.setItem('520am-name', window.Birthday.name); } catch { /* Optional. */ }

  // Dates: local midnight of the birthday, so "today" matches her own calendar.
  const birthdayIn = year => new Date(year, BIRTHDAY.month - 1, BIRTHDAY.day);
  function birthdayState(now = new Date()) {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisYear = birthdayIn(now.getFullYear());
    if (today.getTime() === thisYear.getTime()) return { phase:'today', age:now.getFullYear() - BIRTHDAY.year };
    if (today > thisYear) {
      const since = Math.round((today - thisYear) / 864e5) + 1;
      if (since <= 30) return { phase:'after', age:now.getFullYear() - BIRTHDAY.year, since };
      const next = birthdayIn(now.getFullYear() + 1);
      return { phase:'before', age:next.getFullYear() - BIRTHDAY.year, ms:next - now };
    }
    return { phase:'before', age:thisYear.getFullYear() - BIRTHDAY.year, ms:thisYear - now };
  }
  const age = birthdayState().age;

  /* Confetti: one small pooled 2D engine shared by the opening and the finale. */
  function confetti(canvas) {
    const context = canvas.getContext('2d');
    const palette = ['#f4b6cb', '#e9a2bc', '#f8dfe8', '#c93a5b', '#d8344a', '#e8c483', '#fff1d6'];
    const pieces = [];
    let frame = 0, last = 0, width = 0, height = 0, drizzle = 0;
    function size() {
      const ratio = Math.min(devicePixelRatio || 1, 2);
      width = canvas.clientWidth; height = canvas.clientHeight;
      canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    }
    function add(x, y, burst) {
      const kind = Math.random();
      const angle = burst ? -Math.PI / 2 + (Math.random() - .5) * 2.3 : Math.PI / 2;
      const speed = burst ? 260 + Math.random() * 520 : 20 + Math.random() * 30;
      pieces.push({
        x, y, vx:Math.cos(angle) * speed, vy:Math.sin(angle) * speed,
        kind:kind < .52 ? 'petal' : kind < .78 ? 'paper' : 'spark',
        color:palette[Math.floor(Math.random() * palette.length)],
        size:4 + Math.random() * 7, spin:(Math.random() - .5) * 9, turn:Math.random() * 6,
        wobble:Math.random() * 6, life:0, ttl:burst ? 3.2 + Math.random() * 2.2 : 7 + Math.random() * 4
      });
    }
    function draw(piece) {
      const fade = Math.min(1, piece.life * 4, (piece.ttl - piece.life) * 1.4);
      context.globalAlpha = Math.max(0, fade) * (piece.kind === 'spark' ? .95 : .85);
      context.fillStyle = piece.color;
      context.save();
      context.translate(piece.x, piece.y);
      context.rotate(piece.turn);
      if (piece.kind === 'spark') {
        const s = piece.size * .45 * (.7 + Math.sin(piece.life * 14 + piece.wobble) * .3);
        context.beginPath();
        context.moveTo(0, -s * 2); context.quadraticCurveTo(0, 0, s * 2, 0); context.quadraticCurveTo(0, 0, 0, s * 2);
        context.quadraticCurveTo(0, 0, -s * 2, 0); context.quadraticCurveTo(0, 0, 0, -s * 2); context.fill();
      } else if (piece.kind === 'paper') {
        context.scale(1, Math.cos(piece.life * 7 + piece.wobble));
        context.fillRect(-piece.size * .5, -piece.size * .3, piece.size, piece.size * .6);
      } else {
        context.scale(1, .55 + Math.abs(Math.cos(piece.life * 3 + piece.wobble)) * .45);
        context.beginPath(); context.ellipse(0, 0, piece.size * .5, piece.size * .85, 0, 0, Math.PI * 2); context.fill();
      }
      context.restore();
    }
    function tick(now) {
      const dt = Math.min(.033, last ? (now - last) / 1000 : .016);
      last = now;
      context.clearRect(0, 0, width, height);
      if (drizzle && pieces.length < 70 && Math.random() < dt * drizzle) add(Math.random() * width, -12, false);
      for (let i = pieces.length - 1; i >= 0; i--) {
        const p = pieces[i];
        p.life += dt;
        const drag = p.kind === 'spark' ? 1.6 : 2.4;
        p.vx -= p.vx * drag * dt;
        p.vy += (p.kind === 'spark' ? 120 : 170) * dt - p.vy * drag * dt * .5;
        p.x += (p.vx + Math.sin(p.life * 2 + p.wobble) * 26) * dt;
        p.y += p.vy * dt;
        p.turn += p.spin * dt;
        if (p.life > p.ttl || p.y > height + 30) { pieces.splice(i, 1); continue; }
        draw(p);
      }
      context.globalAlpha = 1;
      frame = pieces.length || drizzle ? requestAnimationFrame(tick) : 0;
      if (!frame) last = 0;
    }
    function run() { if (!frame && !document.hidden) frame = requestAnimationFrame(tick); }
    new ResizeObserver(size).observe(canvas);
    size();
    return {
      burst(x, y, count = 150) {
        if (reduced()) return;
        if (!width) size();
        for (let i = 0; i < count && pieces.length < 320; i++) add(x, y, true);
        run();
      },
      // Petals keep falling gently while the celebration stays on screen.
      drizzle(rate) { drizzle = reduced() ? 0 : rate; if (drizzle) run(); },
      clear() { pieces.length = 0; drizzle = 0; cancelAnimationFrame(frame); frame = 0; last = 0; context.clearRect(0, 0, width, height); }
    };
  }

  function chime(notes, gap = .12, level = .04) {
    const Context = window.AudioContext || window.webkitAudioContext;
    let muted = false;
    try { muted = localStorage.getItem('520am-sfx') === 'off'; } catch { /* Optional. */ }
    if (!Context || muted) return;
    try {
      chime.context ||= new Context();
      const audio = chime.context;
      audio.resume().catch(() => {});
      notes.forEach((frequency, index) => {
        const start = audio.currentTime + index * gap;
        const oscillator = audio.createOscillator(), gain = audio.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, start);
        gain.gain.setValueAtTime(.0001, start);
        gain.gain.exponentialRampToValueAtTime(level, start + .03);
        gain.gain.exponentialRampToValueAtTime(.0001, start + 1.6);
        oscillator.connect(gain).connect(audio.destination);
        oscillator.start(start); oscillator.stop(start + 1.7);
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      });
    } catch { /* The celebration is complete without sound. */ }
  }

  /* Hero: a quiet countdown that becomes a greeting on the day. */
  const chip = document.querySelector('#birthday-chip');
  function paintChip() {
    if (!chip) return;
    const state = birthdayState();
    const text = chip.querySelector('span');
    chip.dataset.phase = state.phase;
    if (state.phase === 'today') text.textContent = `今天是你的生日 · ${state.age} 岁快乐`;
    else if (state.phase === 'after') text.textContent = `${state.age} 岁的第 ${state.since} 天 · 生日快乐`;
    else {
      const hours = Math.floor(state.ms / 36e5), days = Math.floor(hours / 24);
      text.textContent = days > 0 ? `离你的生日还有 ${days} 天 ${hours % 24} 小时` : `再过 ${Math.max(1, hours)} 小时，就是你的生日`;
    }
  }
  paintChip();
  setInterval(paintChip, 6e4);

  /* Opening. */
  if (!intro) { resolveIntro(); return; }
  const stage = intro.querySelector('.bday-stage');
  const cake = intro.querySelector('.bday-cake');
  const mic = intro.querySelector('.bday-mic');
  const enter = intro.querySelector('.bday-enter');
  const skip = intro.querySelector('.bday-skip');
  const status = intro.querySelector('.bday-status');
  const introSparks = confetti(intro.querySelector('.bday-confetti'));
  const name = window.Birthday.name;
  let prelude, celebration, listening, blown = false, opened = false;
  intro.querySelectorAll('[data-bday-age]').forEach(element => { element.textContent = String(age); });
  intro.querySelectorAll('[data-bday-digit]').forEach(digit => { digit.textContent = String(age).padStart(2, '0')[digit.dataset.bdayDigit]; });
  if (name) intro.querySelector('.bday-name').textContent = `${name}，`;
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) mic.hidden = true;

  function step(next) {
    stage.dataset.step = next;
    intro.querySelectorAll('[data-step-view]').forEach(view => {
      const active = view.dataset.stepView === next;
      view.inert = !active;
      view.setAttribute('aria-hidden', String(!active));
    });
  }
  function showCake() {
    if (stage.dataset.step !== 'prelude') return;
    prelude?.kill();
    step('cake');
    if (gsap && !reduced()) // Opacity only: a hidden button cannot take focus.
    gsap.from('.bday-cake-scene > *', { y:18, opacity:0, duration:.9, stagger:.09, ease:'power3.out', clearProps:'transform,opacity' });
    cake.focus({ preventScroll:true });
  }
  function open({ atCake = false } = {}) {
    opened = true; blown = false;
    celebration?.progress(1);
    root.classList.add('birthday-intro-open');
    intro.classList.remove('is-blown', 'clock-turned');
    intro.style.removeProperty('--breath');
    status.textContent = '';
    mic.textContent = '或者，对着麦克风吹一口气';
    mic.disabled = false;
    if (!intro.open) intro.showModal();
    document.body.classList.add('dialog-open');
    intro.dispatchEvent(new Event('site:modal-open'));
    step('prelude');
    if (atCake || reduced() || !gsap) { showCake(); return; }
    // The clock reaches 05:20, then the date arrives line by line.
    const clock = intro.querySelector('.bday-clock span');
    clock.textContent = '05:19';
    gsap.set('.bday-prelude', { clearProps:'opacity,visibility,transform' });
    prelude = gsap.timeline({ onComplete:showCake })
      .from('.bday-clock', { autoAlpha:0, y:8, duration:.8, ease:'power2.out' }, .2)
      .call(() => { clock.textContent = '05:20'; intro.classList.add('clock-turned'); }, [], 1.35)
      .from('.bday-line', { autoAlpha:0, y:14, duration:1, stagger:.7, ease:'power2.out' }, 1.7)
      .from('.bday-date', { autoAlpha:0, letterSpacing:'.6em', duration:1.4, ease:'power3.out' }, 3.1)
      .to('.bday-prelude', { autoAlpha:0, y:-14, duration:.7, ease:'power2.in' }, 5.6);
  }
  function stopListening() {
    if (!listening) return;
    cancelAnimationFrame(listening.frame);
    listening.stream.getTracks().forEach(track => track.stop());
    listening.context.close().catch(() => {});
    listening = null;
  }
  function blow() {
    if (blown || stage.dataset.step !== 'cake') return;
    blown = true;
    stopListening();
    intro.classList.add('is-blown');
    status.textContent = '蜡烛吹灭了。生日快乐！';
    chime([523.25, 659.25, 783.99, 1046.5, 1318.5]);
    // A direct tap keeps the gesture for audio; the mic path retries on "enter".
    if (window.SiteMusic && window.SiteMusic.snapshot().state !== 'playing') window.SiteMusic.play('rose');
    setTimeout(() => {
      if (!intro.open) return;
      step('celebrate');
      const bounds = cake.getBoundingClientRect();
      introSparks.burst(bounds.left + bounds.width / 2, bounds.top + bounds.height * .3, innerWidth < 760 ? 110 : 170);
      introSparks.drizzle(5);
      if (gsap && !reduced()) {
        celebration = gsap.timeline()
          .from('.bday-title > span', { autoAlpha:0, y:40, rotation:() => (Math.random() - .5) * 14, duration:1.1, stagger:.12, ease:'back.out(1.6)', clearProps:'transform,opacity,visibility' }, 0)
          .from('.bday-seal', { autoAlpha:0, scale:1.9, rotation:-24, duration:.55, ease:'power4.in', clearProps:'transform,opacity,visibility' }, .75)
          .from('.bday-after', { opacity:0, y:14, duration:.8, stagger:.12, ease:'power2.out', clearProps:'transform,opacity' }, 1.1);
      }
      enter.focus({ preventScroll:true });
    }, reduced() ? 0 : 900);
  }
  async function listen() {
    if (listening || blown) return;
    mic.disabled = true;
    mic.textContent = '正在打开麦克风…';
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio:{ echoCancellation:false, noiseSuppression:false } });
      const Context = window.AudioContext || window.webkitAudioContext;
      const context = new Context();
      const analyser = context.createAnalyser();
      analyser.fftSize = 1024;
      context.createMediaStreamSource(stream).connect(analyser);
      const samples = new Float32Array(analyser.fftSize);
      const started = performance.now();
      let loud = 0;
      listening = { stream, context, frame:0 };
      mic.textContent = '在听哦，轻轻吹一口气～';
      const sample = () => {
        if (!listening) return;
        analyser.getFloatTimeDomainData(samples);
        let sum = 0;
        for (const value of samples) sum += value * value;
        // A breath is a sustained, broadband rush: loud for several frames in a row.
        loud = Math.sqrt(sum / samples.length) > .085 ? loud + 1 : Math.max(0, loud - 1);
        intro.style.setProperty('--breath', Math.min(1, loud / 7).toFixed(2));
        if (loud >= 7) { blow(); return; }
        if (performance.now() - started > 20000) { stopListening(); mic.disabled = false; mic.textContent = '没听到，轻触烛火也可以'; return; }
        listening.frame = requestAnimationFrame(sample);
      };
      sample();
    } catch {
      stopListening();
      mic.disabled = false;
      mic.textContent = '麦克风不可用，轻触烛火就好';
    }
  }
  function close() {
    if (!intro.open) return;
    prelude?.kill(); celebration?.progress(1);
    stopListening();
    const done = () => { introSparks.clear(); intro.close(); };
    if (gsap && !reduced()) gsap.to(intro, { autoAlpha:0, duration:.6, ease:'power2.inOut', onComplete:() => { done(); gsap.set(intro, { clearProps:'opacity,visibility' }); } });
    else done();
  }
  cake.addEventListener('click', blow);
  mic.addEventListener('click', listen);
  enter.addEventListener('click', () => {
    if (window.SiteMusic && window.SiteMusic.snapshot().state === 'off') window.SiteMusic.play('rose');
    close();
  });
  skip.addEventListener('click', close);
  intro.addEventListener('click', event => { if (event.target.closest('.bday-prelude') || event.target === intro) showCake(); });
  intro.addEventListener('cancel', event => { event.preventDefault(); close(); });
  intro.addEventListener('close', () => {
    stopListening();
    root.classList.remove('birthday-intro-open');
    if (!document.querySelector('dialog[open]')) document.body.classList.remove('dialog-open');
    intro.dispatchEvent(new Event('site:modal-close'));
    try { sessionStorage.setItem('520am-birthday-seen', 'yes'); } catch { /* Optional. */ }
    if (opened) { opened = false; resolveIntro(); }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) prelude?.progress(1); });

  let seen = false;
  try { seen = sessionStorage.getItem('520am-birthday-seen') === 'yes'; } catch { /* Optional. */ }
  if (seen) resolveIntro();
  else open();

  /* Finale: blessings, petals and the candles once more. */
  const finale = document.querySelector('#birthday-finale');
  if (!finale) return;
  const blessings = [
    '岁岁平安，万事胜意。',
    '所求皆如愿，所行化坦途。',
    `${age} 岁，也要一直闪闪发光。`,
    '本命年，红色的好运都给你。',
    '愿你被这个世界温柔以待。',
    '平安喜乐，年年有今日。'
  ];
  const blessing = finale.querySelector('.finale-blessing');
  const wishButton = finale.querySelector('#finale-wish');
  const sky = document.createElement('canvas');
  sky.className = 'finale-confetti';
  sky.setAttribute('aria-hidden', 'true');
  document.body.append(sky);
  const finaleSparks = confetti(sky);
  let wish = 0, cheered = false;
  finale.querySelectorAll('[data-bday-age]').forEach(element => { element.textContent = String(age); });
  if (window.Birthday.name) finale.querySelector('.finale-name').textContent = `${window.Birthday.name}，`;
  function cheer(origin) {
    const bounds = origin.getBoundingClientRect();
    finaleSparks.burst(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2, innerWidth < 760 ? 90 : 140);
  }
  wishButton.addEventListener('click', () => {
    blessing.textContent = blessings[wish++ % blessings.length];
    if (gsap && !reduced()) gsap.fromTo(blessing, { autoAlpha:0, y:10, scale:.96 }, { autoAlpha:1, y:0, scale:1, duration:.6, ease:'back.out(1.5)', clearProps:'transform,opacity,visibility' });
    chime([659.25, 783.99, 1046.5], .09, .035);
    cheer(wishButton);
  });
  finale.querySelector('#finale-candles').addEventListener('click', () => open({ atCake:true }));
  new IntersectionObserver(entries => {
    const visible = entries[0].isIntersecting;
    if (visible && !cheered) { cheered = true; setTimeout(() => cheer(finale.querySelector('h2')), 450); }
    finaleSparks.drizzle(visible && !document.hidden ? 2.2 : 0);
  }, { threshold:.45 }).observe(finale);
  document.addEventListener('visibilitychange', () => { if (document.hidden) finaleSparks.clear(); });
})();
