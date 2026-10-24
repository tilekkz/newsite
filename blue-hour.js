(() => {
  'use strict';
  const root = document.documentElement;
  const scene = document.querySelector('#blue-hour');
  const playButton = document.querySelector('#blue-play');
  const returnButton = document.querySelector('#back-to-rose');
  const homeMusic = document.querySelector('#home-music-rose');
  const player = document.querySelector('.memory-player');
  if (!scene || !playButton || !player) return;
  const gsap = window.gsap;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const music = window.SiteMusic;
  const status = document.querySelector('#blue-status');
  const playerMusic = document.querySelector('#player-music');
  let shifting = false;
  let themeTransition;
  let themeAnimation;
  let wash;

  function commitTheme(theme) {
    root.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'ocean' ? '#051539' : '#110b0f');
    try { sessionStorage.setItem('520am-theme', theme); } catch (_) { /* Private storage is optional. */ }
  }
  function clearTransition() {
    themeAnimation?.cancel();
    shifting = false;
    root.classList.remove('theme-shifting');
    [returnButton, homeMusic].forEach(button => button?.removeAttribute('aria-disabled'));
    wash?.remove(); wash = null;
    themeTransition = null; themeAnimation = null;
  }
  function flowingFrames(x, y) {
    const reach = Math.hypot(Math.max(x, innerWidth-x), Math.max(y, innerHeight-y)) + 60;
    // Overlapping, feathered lobes: one current leads, the others curl around it.
    const currents = [
      { delay:0, dx:-.18, dy:-.12, width:2.4, height:1.5 },
      { delay:.06, dx:.24, dy:.08, width:2.0, height:2.3 },
      { delay:.13, dx:-.10, dy:.30, width:2.7, height:1.7 },
      { delay:.19, dx:.08, dy:-.23, width:1.9, height:2.7 },
      { delay:.24, dx:0, dy:0, width:3.8, height:3.8 }
    ];
    return Array.from({ length:41 }, (_, i) => {
      const t = i/40, sizes = [], positions = [];
      currents.forEach(current => {
        const p = Math.max(0, (t-current.delay)/(1-current.delay));
        const growth = p*p*(3-2*p);
        const width = Math.max(.01, reach*current.width*growth);
        const height = Math.max(.01, reach*current.height*growth);
        const cx = x + innerWidth*current.dx*Math.sin(p*Math.PI/2);
        const cy = y + innerHeight*current.dy*Math.sin(p*Math.PI/2);
        sizes.push(`${width.toFixed(2)}px ${height.toFixed(2)}px`);
        positions.push(`${(cx-width/2).toFixed(2)}px ${(cy-height/2).toFixed(2)}px`);
      });
      return { offset:t, maskSize:sizes.join(','), maskPosition:positions.join(',') };
    });
  }
  async function changeTheme(theme, origin) {
    if (shifting || root.dataset.theme === theme) return;
    if (reduced.matches) { commitTheme(theme); return; }
    shifting = true;
    root.classList.add('theme-shifting');
    [returnButton, homeMusic].forEach(button => button?.setAttribute('aria-disabled', 'true'));
    const bounds = origin.getBoundingClientRect();
    const x = Math.max(0, Math.min(innerWidth, bounds.left + bounds.width / 2));
    const y = Math.max(0, Math.min(innerHeight, bounds.top + bounds.height / 2));
    const frames = flowingFrames(x,y);
    try {
      // Both APIs are required: never apply the snapshot mask to the real document.
      const canAnimateSnapshot = document.startViewTransition &&
        typeof KeyframeEffect !== 'undefined' && 'pseudoElement' in KeyframeEffect.prototype;
      if (canAnimateSnapshot) {
        themeTransition = document.startViewTransition(() => commitTheme(theme));
        // Handle finished independently; hidden tabs can skip the captured animation.
        const finished = themeTransition.finished.catch(() => {});
        await themeTransition.ready;
        themeAnimation = root.animate(frames, {
          duration:1900, easing:'linear', fill:'both', pseudoElement:'::view-transition-new(root)'
        });
        await themeAnimation.finished;
        themeAnimation.cancel();
        await finished;
      } else {
        wash = document.createElement('div');
        wash.className = `theme-wash${theme === 'rose' ? ' to-rose' : ''}`;
        document.body.append(wash);
        themeAnimation = wash.animate(frames, { duration:1900, fill:'both' });
        await themeAnimation.finished;
        commitTheme(theme);
        themeAnimation = wash.animate({ opacity:[1,0] }, { duration:reduced.matches ? 0 : 350, fill:'forwards' });
        await themeAnimation.finished;
      }
    } catch (_) {
      // A skipped capture must never strand the UI between themes.
      themeTransition?.skipTransition();
      commitTheme(theme);
    } finally {
      clearTransition();
    }
  }
  function openBlue() {
    if (shifting) return;
    if (root.dataset.theme === 'ocean' && music?.snapshot().track === 'ocean') music.toggle();
    else {
      music?.play('ocean');
      changeTheme('ocean', playButton);
    }
  }
  playButton.addEventListener('click', openBlue);
  function returnToRose(origin) {
    if (shifting) return;
    if (root.dataset.theme !== 'ocean' && music?.snapshot().track === 'rose') music.toggle();
    else { music?.play('rose'); changeTheme('rose', origin); }
  }
  returnButton.addEventListener('click', () => returnToRose(returnButton));
  homeMusic?.addEventListener('click', () => returnToRose(homeMusic));
  playerMusic.addEventListener('click', () => music?.toggle());

  function textPair(target, zh, en) {
    const translation = document.createElement('span'); translation.lang = 'en'; translation.textContent = en;
    target.replaceChildren(document.createTextNode(zh), translation);
  }
  function updateMusic({ detail }) {
    const { state, track, preview, reason } = detail;
    const ocean = track === 'ocean';
    const playing = state === 'playing';
    const loading = state === 'loading';
    const heroTitle = document.querySelector('.hero-track>div>p');
    if (heroTitle) heroTitle.textContent = ocean ? `特別的人 — Khalil Fong${preview ? ' · Preview' : ''}` : '5:20AM — 刀酱';
    if (homeMusic) {
      homeMusic.setAttribute('aria-pressed', String(!ocean && playing));
      homeMusic.setAttribute('aria-label', ocean ? '回到第一首和粉色夜晚 / Return to 5:20AM and the rosy night' : playing ? '暂停 5:20AM / Pause 5:20AM' : '播放 5:20AM / Play 5:20AM');
      homeMusic.querySelector('.home-music-symbol').textContent = ocean ? '↶' : playing ? 'Ⅱ' : '▷';
      homeMusic.querySelector('.home-music-zh').textContent = ocean ? '回到第一首' : playing ? '暂停这一首' : '听最初的歌';
      homeMusic.querySelector('small').textContent = ocean ? 'Back to 5:20AM' : playing ? 'Pause 5:20AM' : 'Play 5:20AM';
    }
    playButton.setAttribute('aria-pressed', String(ocean && playing));
    playButton.setAttribute('aria-busy', String(ocean && loading));
    playButton.setAttribute('aria-label', ocean && playing ? '暂停特别的人 / Pause Special Person' : ocean && loading ? '取消播放 / Cancel loading' : '播放特别的人，进入蓝色时刻 / Play Special Person and enter the blue hour');
    playerMusic.setAttribute('aria-pressed', String(playing));
    playerMusic.setAttribute('aria-label', playing ? '暂停背景音乐 / Pause background music' : loading ? '取消播放 / Cancel loading' : '播放背景音乐 / Play background music');
    document.querySelector('#player-music-label').textContent = playing ? '暂停音乐 / Pause music' : loading ? '加载中 / Loading…' : state === 'error' ? '重新播放 / Retry music' : '播放音乐 / Play music';
    if (!ocean) textPair(status, '为特别的你，留一首特别的歌。', 'A special song, for someone special.');
    else if (reason === 'missing-file') textPair(status, '这首歌还在路上，先听最初的歌吧。', 'This song is on its way. Return to 5:20AM for now.');
    else if (state === 'error') textPair(status, '音乐暂时无法播放，轻点再试。', 'The music could not play. Tap to try again.');
    else if (state === 'loading') textPair(status, '下一首温柔，正在路上。', 'Tuning in to a different shade of night…');
    else if (state === 'ended') textPair(status, '再听一次，好吗？', preview ? 'The preview has ended. One more time?' : 'One more time?');
    else if (playing) textPair(status, preview ? '正在试听 · 特別的人' : '正在播放 · 特別的人', `Now playing · Special Person${preview ? ' · Official preview' : ''}`);
    else textPair(status, '蓝色时刻，等你继续。', 'A little pause, in our blue hour.');
  }
  document.addEventListener('site:music-state', updateMusic);
  try { if (sessionStorage.getItem('520am-theme') === 'ocean') commitTheme('ocean'); } catch (_) {}
  music?.select(root.dataset.theme === 'ocean' ? 'ocean' : 'rose');
  if (music) updateMusic({ detail:music.snapshot() });

  const memories = [
    ['初见的光', 'The light we found.'], ['一起走过', 'A little way together.'],
    ['平凡的美好', 'Nothing ordinary, with you.'], ['海风与笑声', 'A breeze. Your laugh.'],
    ['心里的晴天', 'A little sunshine, kept.'], ['还想再来一次', 'Let us do it all again.']
  ];
  const stack = document.querySelector('#photo-stack');
  const cards = [...stack.querySelectorAll('.player-photo')];
  const dots = [...document.querySelectorAll('[data-memory]')];
  let current = 0;
  let desired = 0;
  let lastDirection = 1;
  let photoTimeline;
  let busy = false;
  const wrap = n => (n % memories.length + memories.length) % memories.length;
  const number = n => String(n + 1).padStart(2, '0');
  function pose(slot) {
    const small = innerWidth <= 760;
    return { x:slot * (small ? 15 : 22), y:slot * 10, rotation:[-5,4,11][slot], scale:[1,.98,.94][slot], opacity:1, force3D:false };
  }
  function paintCard(card, index, slot) {
    card.dataset.slot = String(slot);
    card.dataset.memoryIndex = String(index);
    card.style.zIndex = String(3-slot);
    card.inert = slot !== 0;
    card.tabIndex = slot === 0 ? 0 : -1;
    if (slot) card.setAttribute('aria-hidden', 'true'); else card.removeAttribute('aria-hidden');
    card.setAttribute('aria-label', `${memories[index][0]} / ${memories[index][1]} — 下一张 / Next memory`);
    card.querySelector('.placeholder-number').textContent = number(index);
    card.querySelector('.player-photo-caption>span').textContent = memories[index][0];
    card.querySelector('.player-photo-caption>em').textContent = memories[index][1];
    card.querySelector('.player-photo-caption>i').textContent = `${number(index)} / 06`;
  }
  function settle() {
    const focused = cards.includes(document.activeElement);
    cards.forEach((card,slot) => {
      paintCard(card,wrap(current + slot),slot);
      if (gsap) gsap.set(card, pose(slot));
      else card.style.transform = `translate(${pose(slot).x}px,${pose(slot).y}px) rotate(${pose(slot).rotation}deg) scale(${pose(slot).scale})`;
    });
    if (focused) cards[0].focus({ preventScroll:true });
    document.querySelector('#memory-caption-zh').textContent = memories[current][0];
    document.querySelector('#memory-caption-en').textContent = memories[current][1];
    document.querySelector('#memory-position').textContent = `${number(current)} / 06`;
    player.dataset.memoryIndex = String(current);
    dots.forEach((dot,i) => dot.setAttribute('aria-pressed', String(i === current)));
  }
  function turn() {
    if (busy || current === desired) return;
    if (reduced.matches || !gsap) { current = desired; settle(); return; }
    busy = true;
    const target = desired;
    const direction = lastDirection;
    const incoming = cards[1];
    const outgoing = cards[0];
    paintCard(incoming,target,1);
    photoTimeline = gsap.timeline({ defaults:{ ease:'power3.inOut' }, onComplete:() => {
      current = target;
      // Recycle the old front card underneath; the new front stays in place.
      cards.push(cards.shift());
      busy = false;
      photoTimeline = null;
      settle();
      if (current !== desired) turn();
    }});
    const distance = stack.clientWidth * (innerWidth <= 760 ? .63 : .94);
    photoTimeline.addLabel('lift',0)
      .to(outgoing, { x:-direction*distance, y:-30, rotation:-direction*19, scale:1.02, duration:.36, force3D:false }, 'lift')
      .to(incoming, { ...pose(0), duration:.63 }, 'lift+=.06')
      .to(cards[2], { ...pose(1), duration:.6 }, 'lift+=.08')
      .addLabel('tuck',.36)
      .set(outgoing, { zIndex:0 }, 'tuck')
      .to(outgoing, { ...pose(2), duration:.4, ease:'power2.inOut' }, 'tuck');
  }
  function go(index, direction = 1) { desired = wrap(index); lastDirection = direction; turn(); }
  function step(direction) { go(desired + direction,direction); }
  cards.forEach(card => card.addEventListener('click', () => step(1)));
  document.querySelector('#photo-next').addEventListener('click', () => step(1));
  document.querySelector('#photo-previous').addEventListener('click', () => step(-1));
  dots.forEach((dot,i) => dot.addEventListener('click', () => go(i,i < current ? -1 : 1)));
  player.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); step(event.key === 'ArrowRight' ? 1 : -1); }
    if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); go(event.key === 'Home' ? 0 : memories.length-1); }
  });
  // Horizontal swipes work without stealing vertical scrolling.
  let touchStart;
  let ignoreClickUntil = 0;
  stack.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'mouse') touchStart = { x:event.clientX,y:event.clientY,id:event.pointerId };
  });
  stack.addEventListener('pointerup', event => {
    if (!touchStart || event.pointerId !== touchStart.id) return;
    const dx = event.clientX-touchStart.x, dy = event.clientY-touchStart.y;
    touchStart = null;
    if (Math.abs(dx) > 42 && Math.abs(dx) > Math.abs(dy)*1.3) { ignoreClickUntil = performance.now()+400; step(dx < 0 ? 1 : -1); }
  });
  stack.addEventListener('pointercancel', () => { touchStart = null; });
  stack.addEventListener('click', event => { if (performance.now() < ignoreClickUntil) { event.stopImmediatePropagation(); event.preventDefault(); } },true);
  settle();
  let playerVisible = false, sceneVisible = false;
  function visibility() {
    document.body.classList.toggle('player-in-view',playerVisible && !document.hidden && !reduced.matches);
    document.body.classList.toggle('blue-in-view',sceneVisible && !document.hidden && !reduced.matches);
  }
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => { if (entry.target === player) playerVisible = entry.isIntersecting; else sceneVisible = entry.isIntersecting; });
    visibility();
  }, { threshold:.06 });
  observer.observe(player); observer.observe(scene);
  document.addEventListener('visibilitychange', visibility);
  reduced.addEventListener('change', () => {
    if (reduced.matches) {
      themeTransition?.skipTransition(); themeAnimation?.finish();
      if (photoTimeline) { photoTimeline.kill(); photoTimeline=null; busy=false; current=desired; settle(); }
    }
    visibility();
  });
  window.addEventListener('resize', () => { if (!busy) settle(); });
})();
