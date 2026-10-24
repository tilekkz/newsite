(() => {
  'use strict';
  const atmosphere = document.createElement('div');
  atmosphere.className = 'night-atmosphere';
  atmosphere.setAttribute('aria-hidden', 'true');
  atmosphere.innerHTML = '<div class="night-air"></div><div class="night-air"></div>';
  for (let i = 0; i < 20; i++) {
    const speck = document.createElement('i');
    speck.className = 'night-speck';
    speck.style.cssText = `--x:${(i * 47 + 11) % 100}%;--y:${(i * 31 + 7) % 100}%;--size:${i % 6 ? 1.5 : 2.5}px;--delay:${-i * 1.7}s;--duration:${14 + i % 8}s`;
    atmosphere.append(speck);
  }
  document.body.prepend(atmosphere);
  const pauseAtmosphere = () => document.documentElement.classList.toggle('atmosphere-resting', document.hidden);
  document.addEventListener('visibilitychange', pauseAtmosphere);
  pauseAtmosphere();
})();
