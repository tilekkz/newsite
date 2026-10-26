/* A shared sky: no transport, overlays, audio or remote services. */
(() => {
  'use strict';
  const section = document.querySelector('.shared-sky');
  if (!section) return;
  const stage = section.querySelector('.twosky-stage');
  const moon = section.querySelector('#shared-moon');
  const message = section.querySelector('.twosky-wish-message');
  const stars = section.querySelector('.twosky-stars');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const motions = new Set();
  let visible = false, frame = 0, busy = false, wish = 0;
  let x = 0, y = 0, targetX = 0, targetY = 0, lastTick = 0;
  const wishes = [
    ['星光替我说：今晚也想你。', 'The stars say: I’m thinking of you tonight.'],
    ['愿下一次看月亮，我们就在彼此身旁。', 'Next time, may we watch the moon side by side.'],
    ['距离再远，也分享这一点温柔。', 'A little tenderness, across all this distance.']
  ];
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < 28; i += 1) {
    const star = document.createElement('i');
    star.className = 'twosky-star';
    star.style.cssText = '--x:' + (5 + ((i * 43) % 90)) + '%;--y:' + (5 + ((i * 31) % 69)) + '%;--size:' + (1 + i % 3) + 'px;--duration:' + (4 + i % 4) + 's;--delay:-' + (i % 9) + 's';
    fragment.append(star);
  }
  stars.append(fragment);

  function paint() {
    section.style.setProperty('--twosky-x', x.toFixed(2) + 'px');
    section.style.setProperty('--twosky-y', y.toFixed(2) + 'px');
  }
  function tick(now) {
    frame = 0;
    if (!visible || document.hidden || reduced.matches) return;
    const dt = Math.min(lastTick ? (now-lastTick)/1000 : 1/60, .05);
    lastTick = now;
    const follow = 1-Math.exp(-dt*9);
    x += (targetX - x) * follow;
    y += (targetY - y) * follow;
    paint();
    if (Math.abs(targetX - x) + Math.abs(targetY - y) > .035) frame = requestAnimationFrame(tick);
  }
  function moveTo(nextX, nextY) {
    targetX = nextX; targetY = nextY;
    if (!frame && visible && !document.hidden && !reduced.matches) { lastTick=0; frame=requestAnimationFrame(tick); }
  }
  function stopMotion() {
    cancelAnimationFrame(frame); frame = 0; lastTick = 0;
    x = y = targetX = targetY = 0;
    paint();
    motions.forEach(animation => animation.cancel());
  }
  function syncActivity() {
    const resting = !visible || document.hidden;
    section.classList.toggle('twosky-resting', resting);
    if (resting || reduced.matches) stopMotion();
  }
  if ('IntersectionObserver' in window) {
    section.classList.add('twosky-ready', 'twosky-resting');
    const observer = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;

      syncActivity();
    }, {threshold:0});
    observer.observe(stage);
    // Reveal each window when the frame itself reaches the viewport.
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('twosky-in-view');
        revealObserver.unobserve(entry.target);
      });
    }, {threshold:.12, rootMargin:'0px 0px -6% 0px'});
    section.querySelectorAll('.twosky-window').forEach(windowFrame => revealObserver.observe(windowFrame));
  } else {
    visible = true;
  }
  stage.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || reduced.matches || !visible) return;
    const rect = stage.getBoundingClientRect();
    moveTo((event.clientX - rect.left - rect.width / 2) / rect.width * 14, (event.clientY - rect.top - rect.height / 2) / rect.height * 12);
  });
  stage.addEventListener('pointerleave', () => moveTo(0, 0));

  moon.addEventListener('click', () => {
    if (busy) return;
    const copy = wishes[wish % wishes.length];
    wish += 1;
    message.querySelector('span').textContent = copy[0];
    message.querySelector('em').textContent = copy[1];
    stage.dataset.wishes = String(wish);
    if (reduced.matches || typeof moon.animate !== 'function' || document.hidden) return;
    busy = true;
    moon.setAttribute('aria-disabled', 'true');
    const face = section.querySelector('.twosky-moon-face').animate([
      {transform:'scale(1)'}, {transform:'scale(1.06) rotate(-4deg)', offset:.4}, {transform:'scale(1)'}
    ], {duration:1000, easing:'ease-in-out'});
    motions.add(face);
    face.finished.catch(() => {}).finally(() => motions.delete(face));
    shower();
    // The shower keeps falling; the moon can be wished on again a little sooner.
    setTimeout(() => { busy = false; moon.removeAttribute('aria-disabled'); }, 2600);
  });

  /* A meteor shower from one radiant: dense at first, with a long thinning tail.
     Far streaks pass behind the windows, every fifth one is a bright near streak. */
  const farSky = section.querySelector('.twosky-meteors');
  const nearSky = document.createElement('div');
  nearSky.className = 'twosky-meteors twosky-meteors-near';
  nearSky.setAttribute('aria-hidden', 'true');
  stage.append(nearSky);
  farSky.replaceChildren();
  let showerTimer;
  function spark(x, y) {
    const dot = document.createElement('i');
    dot.className = 'twosky-spark';
    dot.style.left = x + 'px'; dot.style.top = y + 'px';
    farSky.append(dot);
    const glint = dot.animate([
      {opacity:0, transform:'scale(.4)'}, {opacity:1, transform:'scale(1.7)', offset:.3}, {opacity:0, transform:'scale(.2)'}
    ], {duration:1100, easing:'ease-out'});
    motions.add(glint);
    glint.finished.catch(() => {}).finally(() => { motions.delete(glint); dot.remove(); });
  }
  function shower() {
    const width = stage.clientWidth, height = stage.clientHeight;
    if (farSky.childElementCount + nearSky.childElementCount > 140) return;
    const count = width < 760 ? 28 : 46;
    const radiant = 26 + Math.random() * 10;
    stage.classList.add('is-showering');
    clearTimeout(showerTimer);
    showerTimer = setTimeout(() => stage.classList.remove('is-showering'), 7600);
    for (let i = 0; i < count; i += 1) {
      const near = i % 5 === 0;
      const meteor = document.createElement('i');
      const length = near ? 170 + Math.random() * 130 : 50 + Math.random() * 130;
      const thick = near ? 2.4 + Math.random() * 1.2 : .9 + Math.random() * 1.3;
      const x = (-.12 + Math.random() * .9) * width, y = (-.1 + Math.random() * .55) * height;
      meteor.style.cssText = '--mx:' + x + 'px;--my:' + y + 'px;--len:' + length + 'px;--thick:' + thick + 'px';
      (near ? nearSky : farSky).append(meteor);
      const angle = radiant + (Math.random() - .5) * 6, rad = angle * Math.PI / 180;
      const distance = (near ? .62 : .28 + Math.random() * .3) * Math.max(width, 620);
      const dx = Math.cos(rad) * distance, dy = Math.sin(rad) * distance;
      const streak = meteor.animate([
        {opacity:0, transform:'translate(0, 0) rotate(' + angle + 'deg) scaleX(.2)'},
        {opacity:near ? 1 : .5 + Math.random() * .45, offset:.18},
        {opacity:.75, offset:.72},
        {opacity:0, transform:'translate(' + dx + 'px, ' + dy + 'px) rotate(' + angle + 'deg) scaleX(1)'}
      ], {duration:near ? 950 + Math.random() * 500 : 1300 + Math.random() * 1200,
        delay:Math.pow(Math.random(), 1.5) * 6200, easing:'cubic-bezier(.2,.55,.35,1)', fill:'both'});
      motions.add(streak);
      streak.finished.then(() => {
        // The head is the streak's right end; it ends where the translation stops.
        if (!near && Math.random() < .45) spark(x + length + dx, y + thick / 2 + dy);
      }).catch(() => {}).finally(() => { motions.delete(streak); meteor.remove(); });
    }
  }
  document.addEventListener('visibilitychange', syncActivity);
  reduced.addEventListener('change', syncActivity);
  window.addEventListener('resize', () => moveTo(0, 0), {passive:true});
  window.addEventListener('pagehide', stopMotion);
})();
