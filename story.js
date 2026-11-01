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
