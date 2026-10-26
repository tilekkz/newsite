/* Your photos. Put files in assets/photos/ and list their names below, in order.
   Empty slots keep their placeholder frame. JPG/WebP around 1200px wide is plenty. */
(() => {
  'use strict';
  const TRAIL = [ /* up to 32, e.g. '01.jpg', '02.jpg' */ ];
  const RIBBON = [ /* up to 12, the blue garden photos */ ];

  function fill(frames, names) {
    names.slice(0, frames.length).forEach((name, index) => {
      const frame = frames[index];
      const image = new Image();
      image.alt = '';
      image.loading = 'lazy';
      image.decoding = 'async';
      image.draggable = false;
      image.className = 'memory-photo';
      image.addEventListener('load', () => frame.classList.add('has-photo'), { once:true });
      image.addEventListener('error', () => image.remove(), { once:true });
      image.src = `assets/photos/${name}`;
      frame.prepend(image);
    });
  }
  fill([...document.querySelectorAll('.memory-square')], TRAIL);
  fill([...document.querySelectorAll('.ribbon-print')], RIBBON);
})();
