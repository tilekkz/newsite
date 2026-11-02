/* The epilogue: every photo flies in from the night and settles into one heart,
   which then beats. Below it, the last words and a way to begin again. */
(() => {
  'use strict';
  const heart = document.querySelector('#epilogue-heart');
  if (!heart || !window.SiteLogic) return;
  const cols = 13, rows = 12;
  const cells = window.SiteLogic.heartCells(cols, rows);
  const rand = window.SiteLogic.random(1103);
  const number = i => String(i + 1).padStart(2, '0');
  const photos = [...Array.from({ length:24 }, (_, i) => `trail-${number(i)}`), ...Array.from({ length:22 }, (_, i) => `ribbon-${number(i)}`)];
  heart.style.setProperty('--cols', cols);
  heart.style.setProperty('--rows', rows);
  heart.replaceChildren(...cells.map(({ col, row }, i) => {
    const tile = document.createElement('i');
    tile.className = 'epilogue-tile';
    tile.dataset.photo = `assets/photos/${photos[(i * 7) % photos.length]}.webp?v=2`;
    // A stride of 7 through the 46 photos keeps neighbouring tiles different.
    tile.style.cssText = `--col:${col};--row:${row};background-image:url('assets/photos/${photos[(i * 7) % photos.length]}.webp?v=2');`
      + `--fx:${(rand() - .5) * 160}vw;--fy:${(rand() - .3) * 120}vh;--fr:${(rand() - .5) * 220}deg;`
      // Tiles land from the middle outwards, so the heart grows from its centre.
      + `--delay:${(Math.hypot(col - (cols - 1) / 2, row - rows * .45) * .09 + rand() * .25).toFixed(2)}s`;
    return tile;
  }));
  const gather = () => heart.classList.add('is-gathered');
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) gather();
  else new IntersectionObserver((entries, observer) => {
    if (!entries.at(-1).isIntersecting) return;
    observer.disconnect();
    gather();
  }, { threshold:.25 }).observe(heart);

  /* A closer look: with a mouse, the photo under the cursor opens whole beside it; on a phone a tap opens it
     in the middle of the screen, and a second tap anywhere (or Escape, or scrolling) puts it back. */
  const peek = document.createElement('figure');
  peek.className = 'epilogue-peek';
  peek.setAttribute('aria-hidden', 'true');
  const peekImage = new Image();
  peekImage.alt = '';
  peekImage.decoding = 'async';
  peek.append(peekImage);
  document.body.append(peek);
  const mouse = matchMedia('(hover: hover) and (pointer: fine)');
  let shown = null;
  function show(tile, centred) {
    if (!heart.classList.contains('is-gathered')) return;
    shown?.classList.remove('is-peeked');
    shown = tile;
    tile.classList.add('is-peeked');
    if (!peekImage.src.endsWith(tile.dataset.photo)) peekImage.src = tile.dataset.photo;
    peek.classList.toggle('is-centred', centred);
    if (!centred) {
      // Beside the tile, on whichever side has room, kept inside the window.
      const r = tile.getBoundingClientRect(), w = Math.min(300, innerWidth * .4), h = Math.min(400, innerHeight * .7);
      const x = r.right + 18 + w < innerWidth ? r.right + 18 : r.left - 18 - w;
      const y = Math.max(12, Math.min(innerHeight - h - 12, r.top + r.height / 2 - h / 2));
      peek.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${h}px`;
    } else peek.style.cssText = '';
    peek.classList.add('is-open');
  }
  function hide() {
    peek.classList.remove('is-open');
    shown?.classList.remove('is-peeked');
    shown = null;
  }
  heart.addEventListener('pointerover', event => {
    const tile = event.target.closest('.epilogue-tile');
    if (tile && event.pointerType === 'mouse' && mouse.matches) show(tile, false);
  });
  heart.addEventListener('pointerleave', event => { if (event.pointerType === 'mouse' && !peek.classList.contains('is-centred')) hide(); });
  heart.addEventListener('click', event => {
    const tile = event.target.closest('.epilogue-tile');
    if (!tile) return;
    event.stopPropagation();
    if (mouse.matches) return;
    if (shown === tile && peek.classList.contains('is-open')) hide(); else show(tile, true);
  });
  document.addEventListener('click', () => { if (peek.classList.contains('is-centred')) hide(); });
  addEventListener('keydown', event => { if (event.key === 'Escape') hide(); });
  addEventListener('scroll', () => { if (peek.classList.contains('is-open')) hide(); }, { passive:true });

  // The very last line waits until she reaches it.
  const last = document.querySelector('#epilogue-last');
  if (last && 'IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    new IntersectionObserver((entries, observer) => {
      if (!entries.at(-1).isIntersecting) return;
      observer.disconnect();
      last.classList.add('is-shown');
    }, { threshold:.6 }).observe(last);
  } else last?.classList.add('is-shown');

  // Begin again: the black-and-white opening, the clock and the song, as on the first visit.
  document.querySelector('#epilogue-replay')?.addEventListener('click', () => {
    try { ['520am-color', '520am-birthday-seen', '520am-theme'].forEach(key => sessionStorage.removeItem(key)); } catch { /* Optional. */ }
    window.SiteMusic?.pause();
    // Without this the browser would restore the bottom of the page, and the colour would return at once.
    history.scrollRestoration = 'manual';
    history.replaceState(null, '', location.pathname);
    scrollTo(0, 0);
    location.reload();
  });
})();
