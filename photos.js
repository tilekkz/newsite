/* Your photos. Put files in assets/photos/ and list their names below, in order.
   Empty slots keep their placeholder frame. JPG/WebP around 1200px wide is plenty. */
(() => {
  'use strict';
  const number = i => String(i + 1).padStart(2, '0');
  const TRAIL = Array.from({ length:16 }, (_, i) => `trail-${number(i)}.webp`);
  const RIBBON = Array.from({ length:12 }, (_, i) => `ribbon-${number(i)}.webp`);

  function fill(frames, names, label) {
    names.slice(0, frames.length).forEach((name, index) => {
      const frame = frames[index];
      const image = new Image();
      image.alt = '';
      image.loading = 'lazy';
      image.decoding = 'async';
      image.draggable = false;
      image.className = 'memory-photo';
      image.addEventListener('load', () => { frame.classList.add('has-photo'); label?.(frame, index); }, { once:true });
      image.addEventListener('error', () => image.remove(), { once:true });
      image.src = `assets/photos/${name}`;
      frame.prepend(image);
    });
  }
  // Trail cards are named by their captions in the markup; a filled ribbon print takes its caption as its name.
  fill([...document.querySelectorAll('.memory-square')], TRAIL);
  fill([...document.querySelectorAll('.ribbon-print')], RIBBON, frame =>
    frame.setAttribute('aria-label', frame.closest('figure')?.querySelector('figcaption span')?.textContent || '回忆'));
})();
