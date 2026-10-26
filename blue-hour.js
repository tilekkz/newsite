(() => {
  'use strict';
  const root = document.documentElement;
  const scene = document.querySelector('#blue-hour');
  const playButton = document.querySelector('#blue-play');
  const returnButton = document.querySelector('#back-to-rose');
  const homeMusic = document.querySelector('#home-music-rose');
  if (!scene || !playButton) return;
  const gsap = window.gsap;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const music = window.SiteMusic;
  const status = document.querySelector('#blue-status');
  let shifting = false;
  let themeTransition;
  let themeAnimation;
  let wash;

  function commitTheme(theme) {
    root.dataset.theme = theme;
    window.MoonGarden?.setTheme(theme);
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
    window.MoonGarden?.prepare();
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
          duration:1450, easing:'linear', fill:'both', pseudoElement:'::view-transition-new(root)'
        });
        await themeAnimation.finished;
        themeAnimation.cancel();
        await finished;
      } else {
        wash = document.createElement('div');
        wash.className = `theme-wash${theme === 'rose' ? ' to-rose' : ''}`;
        document.body.append(wash);
        if (theme === 'ocean') window.MoonGarden?.paintWash(wash);
        themeAnimation = wash.animate(frames, { duration:1450, fill:'both' });
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

  function textPair(target, zh) { target.textContent = zh; }
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
      homeMusic.querySelector('.home-music-zh').textContent = ocean ? '回到第一首' : loading ? '正在加载…' : playing ? '暂停音乐' : state === 'error' ? '轻点重试' : '听听这首歌';
      homeMusic.querySelector('small').textContent = '5:20AM · 刀酱';
      homeMusic.setAttribute('aria-busy',String(!ocean && loading));
      document.querySelector('#home-music-feedback').textContent = !ocean && state === 'error' ? '暂时无法播放，轻点再试。' : '';
    }
    playButton.setAttribute('aria-pressed', String(ocean && playing));
    playButton.setAttribute('aria-busy', String(ocean && loading));
    playButton.setAttribute('aria-label', ocean && playing ? '暂停特别的人 / Pause Special Person' : ocean && loading ? '取消播放 / Cancel loading' : '播放特别的人，进入蓝色时刻 / Play Special Person and enter the blue hour');
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

  let sceneVisible=false;
  function visibility() {
    document.body.classList.toggle('blue-in-view',sceneVisible&&!document.hidden&&!reduced.matches);
  }
  const observer=new IntersectionObserver(entries=>{
    sceneVisible=entries[0].isIntersecting;visibility();
  },{threshold:.06});
  observer.observe(scene);
  document.addEventListener('visibilitychange',visibility);
  reduced.addEventListener('change',()=>{
    if(reduced.matches){themeTransition?.skipTransition();themeAnimation?.finish();}
    visibility();
  });
})();
