/* Shared lifecycle only; each scene retains its own motion and interactions. */
(() => {
  'use strict';
  function whenNear(element, prepare, margin = '120px') {
    if (!element) return;
    if (!('IntersectionObserver' in window)) { prepare(); return; }
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      observer.disconnect();
      prepare();
    }, { rootMargin:margin });
    observer.observe(element);
  }
  window.NightMotion = { whenNear };
  // Pause ambient CSS motion outside the viewport, without changing layout or
  // interfering with ScrollTrigger's measured section positions.
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) entry.target.classList.toggle('scene-resting', !entry.isIntersecting);
    }, { rootMargin:'80px' });
    document.querySelectorAll('main > section').forEach(section => observer.observe(section));
  }
})();
