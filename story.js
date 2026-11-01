/* The site as one night in nine acts. It opens in black and white; the first
   song gives the world its colour. Act titles breathe between scenes, and a
   small rail keeps the place. */
(() => {
  'use strict';
  const root = document.documentElement;
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const storyLine = document.querySelector('#hero-story');

  /* Act titles: each line writes itself in when it scrolls into view. */
  const acts = [...document.querySelectorAll('.act-title')];
  acts.forEach(act => act.querySelectorAll('[data-chars]').forEach(line => {
    line.replaceChildren(...[...line.dataset.chars].map((char, i) => {
      const span = document.createElement('span');
      span.textContent = char;
      span.style.setProperty('--i', i);
      return span;
    }));
  }));
  const seen = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('is-in');
    seen.unobserve(entry.target);
  }), { rootMargin:'0px 0px -22% 0px' });
  acts.forEach(act => seen.observe(act));

  /* The rail: act I is the opening page, then one mark per act title. */
  const marks = [{ no:'第一幕', name:'颜色', target:'#home' },
    ...acts.map(act => ({ no:act.dataset.no, name:act.dataset.name, target:'#' + act.id }))];
  const rail = document.createElement('nav');
  rail.className = 'act-rail';
  rail.setAttribute('aria-label', '章节');
  rail.innerHTML = `<ol>${marks.map((mark, i) => `<li><a href="${mark.target}" aria-label="${mark.no} · ${mark.name}"><i></i></a></li>`).join('')}</ol><p class="act-rail-label" aria-hidden="true"></p>`;
  document.body.append(rail);
  const links = [...rail.querySelectorAll('a')];
  const label = rail.querySelector('.act-rail-label');
  let current = -1;
  function locate() {
    let index = 0;
    acts.forEach((act, i) => { if (act.getBoundingClientRect().top < innerHeight * .5) index = i + 1; });
    rail.classList.toggle('is-shown', scrollY > innerHeight * .6);
    if (index === current) return;
    current = index;
    links.forEach((link, i) => link.toggleAttribute('aria-current', i === index));
    label.textContent = `${marks[index].no} · ${marks[index].name}`;
    root.dataset.act = String(index + 1);
  }
  let queued = false;
  addEventListener('scroll', () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; locate(); });
  }, { passive:true });
  addEventListener('resize', locate);
  locate();

  /* Section headings write themselves in, one character at a time (inline spans keep Chinese line breaking). */
  const headings = [...document.querySelectorAll('main h2 .zh')].filter(zh => !zh.closest('.act-title') && zh.children.length === 0);
  headings.forEach(zh => {
    zh.classList.add('ink-heading');
    zh.replaceChildren(...[...zh.textContent].map((char, i) => {
      const span = document.createElement('span');
      span.textContent = char;
      span.style.setProperty('--i', i);
      return span;
    }));
  });
  const inked = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('is-in');
    inked.unobserve(entry.target);
  }), { rootMargin:'0px 0px -12% 0px' });
  headings.forEach(zh => inked.observe(zh));

  /* Scene stops: nothing is ever blocked. Near the frame where a scene sits best, scrolling slows a little,
     and when she stops just before it (or just past it) the camera glides the rest of the way. */
  // Each scene lists what the camera should hold, most complete first: [first element, last element].
  // The first span that fits the screen is centred, so a short MacBook screen drops the heading before the controls.
  const stops = [
    ['#surprise', [['.cat-heading', '.cat-controls'], ['.cat-heading', '#cat-stage'], ['#cat-stage', '.cat-controls']]],
    ['#feeling', []],
    ['#starlight', [['.sky-layout', '.sky-layout']]],
    ['#last-letter', [['.keepsake-heading', '.keepsake-controls'], ['.keepsake-heading', '.keepsake-stage'], ['.keepsake-stage', '.keepsake-controls']]],
    ['#tomorrow-postcard', [['.postcard-heading', '.postcard-actions'], ['.postcard-stage', '.postcard-actions']]],
    ['#moon-garden', []],
    ['#two-windows', [['.twosky-heading', '.twosky-afterword'], ['#twosky-windows-title', '.twosky-stage'], ['.twosky-stage', '.twosky-afterword'], ['.twosky-stage', '.twosky-stage']]],
    ['#lanterns', [['.lantern-heading', '.lantern-controls'], ['#lantern-title', '.lantern-controls'], ['#lantern-stage', '.lantern-controls']]],
    ['#birthday-finale', [['.cake-heading', '.cake-tap'], ['#closing-title', '.cake-tap'], ['.cake-heading', '.cake-stage'], ['.cake-stage', '.cake-tap']]]
  ].map(([selector, spans]) => ({ scene:document.querySelector(selector), spans })).filter(stop => stop.scene);
  // No span fits (or none listed): short scenes are centred, tall ones (the photo trail, the pinned garden) start at their top.
  function stopFor({ scene, spans }) {
    const page = scrollY, room = innerHeight - 40;
    for (const [first, last] of spans) {
      const a = scene.querySelector(first), b = scene.querySelector(last);
      if (!a?.offsetHeight || !b?.offsetHeight) continue;
      const top = a.getBoundingClientRect().top + page, span = b.getBoundingClientRect().bottom + page - top;
      if (span <= room) return Math.round(Math.max(0, top - (innerHeight - span) / 2));
    }
    const box = scene.getBoundingClientRect(), top = box.top + page;
    return Math.round(Math.max(0, box.height <= innerHeight ? top - (innerHeight - box.height) / 2 : top));
  }
  // A stop ahead within a third of a screen, or one just overshot, in the direction she was going.
  function nearStop(y, direction) {
    return stops.map(stopFor).find(stop => {
      const ahead = (stop - y) * direction;
      return ahead > 3 && ahead < innerHeight * .3 || ahead <= -3 && ahead > -innerHeight * .15;
    });
  }
  const glide = t => 1 - Math.pow(1 - t, 3);
  function softenWithLenis(lenis) {
    let timer = 0, direction = 1;
    lenis.options.virtualScroll = event => {
      if (event.deltaY) direction = Math.sign(event.deltaY);
      // Friction near a frame: the wheel still moves, just more gently.
      const y = lenis.targetScroll, zone = innerHeight * .18;
      const stop = stops.map(stopFor).find(s => Math.abs(s - y) < zone);
      if (stop !== undefined) event.deltaY *= .35 + .65 * Math.abs(stop - y) / zone;
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (document.querySelector('dialog[open]')) return;
        const near = nearStop(lenis.targetScroll, direction);
        if (near !== undefined) lenis.scrollTo(near, { duration:.9, lerp:0, easing:glide });
      }, 220);
      return true;
    };
    return () => { clearTimeout(timer); lenis.options.virtualScroll = undefined; };
  }
  function settleNative() {
    let timer = 0, touching = false, quietUntil = 0, lastY = scrollY, direction = 1;
    const quiet = () => { quietUntil = performance.now() + 1600; };
    function settle() {
      if (touching || performance.now() < quietUntil || document.querySelector('dialog[open]')) return;
      const near = nearStop(scrollY, direction);
      if (near === undefined) return;
      quietUntil = performance.now() + 900;
      scrollTo({ top:near, behavior:'smooth' });
    }
    const onScroll = () => {
      if (scrollY !== lastY) direction = Math.sign(scrollY - lastY);
      lastY = scrollY;
      clearTimeout(timer);
      timer = setTimeout(settle, 180);
    };
    const onTouch = event => { touching = event.type === 'touchstart'; if (!touching) onScroll(); };
    const onLink = event => { if (event.target.closest('a[href^="#"]')) quiet(); };
    addEventListener('scroll', onScroll, { passive:true });
    addEventListener('touchstart', onTouch, { passive:true });
    addEventListener('touchend', onTouch, { passive:true });
    document.addEventListener('site:frame-scene', quiet);
    document.addEventListener('click', onLink);
    return () => {
      clearTimeout(timer);
      removeEventListener('scroll', onScroll);
      removeEventListener('touchstart', onTouch);
      removeEventListener('touchend', onTouch);
      document.removeEventListener('site:frame-scene', quiet);
      document.removeEventListener('click', onLink);
    };
  }

  /* Motion that follows the scroll: act titles drift away as they leave, the night's specks trail behind fast scrolling. */
  const atmosphere = document.querySelector('.night-atmosphere');
  let velocity = () => 0, drift = 0, lastScroll = scrollY;
  function scrollMotion() {
    const { gsap } = window;
    acts.forEach(act => gsap.fromTo(act, { opacity:1, y:0, filter:'blur(0px)' }, {
      opacity:0, y:-70, filter:'blur(6px)', ease:'none',
      scrollTrigger:{ trigger:act, start:'center 38%', end:'bottom top', scrub:.4 }
    }));
    const follow = () => {
      const pace = velocity();
      drift += (Math.max(-60, Math.min(60, -pace * .9)) - drift) * .08;
      if (Math.abs(drift) > .05) atmosphere?.style.setProperty('--drift', drift.toFixed(2));
    };
    gsap.ticker.add(follow);
    return () => gsap.ticker.remove(follow);
  }
  let detach = () => {};
  document.addEventListener('site:scroller', ({ detail }) => {
    detach();
    detach = () => {};
    if (detail.reduced || detail.off) return;
    const { lenis } = detail;
    velocity = lenis ? () => lenis.velocity : () => { const pace = scrollY - lastScroll; lastScroll = scrollY; return pace; };
    const release = lenis ? softenWithLenis(lenis) : settleNative();
    const stopMotion = scrollMotion();
    detach = () => { release(); stopMotion(); };
  });

  /* A soft light that follows the pointer through the sky behind the scenes. */
  if (matchMedia('(pointer: fine)').matches && !reduced() && window.gsap) {
    const light = document.createElement('i');
    light.className = 'pointer-light';
    light.setAttribute('aria-hidden', 'true');
    document.body.append(light);
    const toX = gsap.quickTo(light, 'x', { duration:1.1, ease:'power3.out' });
    const toY = gsap.quickTo(light, 'y', { duration:1.1, ease:'power3.out' });
    addEventListener('pointermove', event => { toX(event.clientX); toY(event.clientY); light.classList.add('is-on'); }, { passive:true });
    document.addEventListener('pointerleave', () => light.classList.remove('is-on'));
  }

  /* Black and white until the music starts (or until she walks on without it). */
  if (!root.classList.contains('is-grey')) return;
  const veil = document.createElement('div');
  veil.className = 'grey-veil';
  veil.setAttribute('aria-hidden', 'true');
  document.body.append(veil);
  let origin = null, waiting = null, done = false;
  // Colour spreads from wherever she pressed play.
  document.addEventListener('pointerdown', event => {
    if (event.target.closest('#home-music-rose, [data-music-toggle]')) origin = { x:event.clientX, y:event.clientY };
  }, true);
  function bloom(from, duration) {
    if (done) return;
    done = true;
    clearTimeout(waiting);
    try { sessionStorage.setItem('520am-color', 'yes'); } catch { /* Optional. */ }
    if (storyLine) {
      storyLine.classList.add('is-changing');
      setTimeout(() => {
        storyLine.querySelector('.zh').textContent = storyLine.dataset.after;
        storyLine.querySelector('em').textContent = storyLine.dataset.afterEn;
        storyLine.classList.remove('is-changing');
      }, 700);
    }
    const finish = () => { root.classList.remove('is-grey'); veil.remove(); };
    if (reduced() || !window.gsap) {
      veil.style.transition = 'opacity .9s';
      veil.style.opacity = '0';
      setTimeout(finish, 950);
      return;
    }
    const x = from?.x ?? innerWidth / 2, y = from?.y ?? 0;
    const reach = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    veil.style.setProperty('--cx', x + 'px');
    veil.style.setProperty('--cy', y + 'px');
    veil.classList.add('is-opening');
    const glow = document.createElement('i');
    glow.className = 'color-bloom';
    glow.style.cssText = `left:${x}px;top:${y}px`;
    document.body.append(glow);
    const radius = { r:0 };
    gsap.to(radius, { r:reach * 1.25, duration, ease:'power2.inOut',
      onUpdate:() => veil.style.setProperty('--r', radius.r + 'px'), onComplete:finish });
    gsap.fromTo(glow, { scale:0, opacity:.75 }, { scale:reach / 40, opacity:0, duration:duration * .9, ease:'power2.out', onComplete:() => glow.remove() });
  }
  document.addEventListener('site:music-state', event => {
    const { state } = event.detail;
    if (state === 'playing' || state === 'error') bloom(origin, 2.6);
    // A slow connection should not keep her waiting in grey.
    else if (state === 'loading' && !waiting) waiting = setTimeout(() => bloom(origin, 2.6), 3000);
  });
  // Walking on without music (or a reload that lands further down): the colour comes anyway, softly, from above.
  const hero = document.querySelector('#home');
  const walkedOn = () => {
    if (hero.getBoundingClientRect().bottom > innerHeight * .55) return;
    removeEventListener('scroll', walkedOn);
    bloom(null, 3.2);
  };
  if (hero) { addEventListener('scroll', walkedOn, { passive:true }); addEventListener('load', walkedOn); walkedOn(); }
})();
