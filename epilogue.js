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
