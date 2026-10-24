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
  let x = 0, y = 0, targetX = 0, targetY = 0;
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
  function tick() {
    frame = 0;
    if (!visible || document.hidden || reduced.matches) return;
    x += (targetX - x) * .085;
    y += (targetY - y) * .085;
    paint();
    if (Math.abs(targetX - x) + Math.abs(targetY - y) > .035) frame = requestAnimationFrame(tick);
  }
  function moveTo(nextX, nextY) {
    targetX = nextX; targetY = nextY;
    if (!frame && visible && !document.hidden && !reduced.matches) frame = requestAnimationFrame(tick);
  }
  function stopMotion() {
    cancelAnimationFrame(frame); frame = 0;
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
    const distance = Math.min(stage.clientWidth * .35, 330);
    const animations = [...section.querySelectorAll('.twosky-meteors i')].map((meteor, index) => meteor.animate([
      {opacity:0, transform:'translate(0, 0) rotate(24deg) scaleX(.4)', offset:0},
      {opacity:.95, offset:.15},
      {opacity:.8, offset:.65},
      {opacity:0, transform:'translate(' + distance + 'px, ' + (distance * .44) + 'px) rotate(24deg) scaleX(1)', offset:1}
    ], {duration:1500, delay:index * 180, easing:'cubic-bezier(.18,.5,.35,1)'}));
    animations.push(section.querySelector('.twosky-moon-face').animate([
      {transform:'scale(1)'}, {transform:'scale(1.06) rotate(-4deg)', offset:.4}, {transform:'scale(1)'}
    ], {duration:1000, easing:'ease-in-out'}));
    animations.forEach(animation => motions.add(animation));
    Promise.allSettled(animations.map(animation => animation.finished)).then(() => {
      animations.forEach(animation => motions.delete(animation));
      busy = false;
      moon.removeAttribute('aria-disabled');
    });
  });
  document.addEventListener('visibilitychange', syncActivity);
  reduced.addEventListener('change', syncActivity);
  window.addEventListener('resize', () => moveTo(0, 0), {passive:true});
  window.addEventListener('pagehide', stopMotion);
})();
