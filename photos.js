/* Your photos. Put files in assets/photos/ and list their names below, in order.
   Empty slots keep their placeholder frame. JPG/WebP around 1200px wide is plenty. */
(() => {
  'use strict';
  const number = i => String(i + 1).padStart(2, '0');
  const TRAIL = Array.from({ length:16 }, (_, i) => `trail-${number(i)}.webp`);
  const RIBBON = Array.from({ length:22 }, (_, i) => `ribbon-${number(i)}.webp`);

  // Photos load ahead of her, a few at a time, in the order she meets them; a frame coming
  // close to the screen jumps the queue. Lazy loading alone left frames empty on a real network.
  const queue = [];
  let running = 0;
  function start(item) {
    if (item.started) return;
    item.started = true;
    running++;
    const done = () => { running--; pump(); };
    item.image.addEventListener('load', done, { once:true });
    item.image.addEventListener('error', done, { once:true });
    item.image.src = item.src;
  }
  function pump() {
    while (running < 3) {
      const next = queue.find(item => !item.started);
      if (!next) return;
      start(next);
    }
  }
  const near = 'IntersectionObserver' in window ? new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    near.unobserve(entry.target);
    const item = queue.find(candidate => candidate.frame === entry.target);
    if (item) start(item);
  }), { rootMargin:'150% 150%' }) : null;

  function fill(frames, names, label) {
    names.slice(0, frames.length).forEach((name, index) => {
      const frame = frames[index];
      const image = new Image();
      image.alt = '';
      image.decoding = 'async';
      image.draggable = false;
      image.className = 'memory-photo';
      image.addEventListener('load', () => { frame.classList.add('has-photo'); label?.(frame, index); }, { once:true });
      image.addEventListener('error', () => { frame.classList.add('photo-missing'); image.remove(); }, { once:true });
      frame.prepend(image);
      queue.push({ frame, image, src:`assets/photos/${name}`, started:false });
      near?.observe(frame);
    });
  }
  // Trail cards are named by their captions in the markup; a filled ribbon print takes its caption as its name.
  fill([...document.querySelectorAll('.memory-square')], TRAIL);
  fill([...document.querySelectorAll('.ribbon-print')], RIBBON, frame =>
    frame.setAttribute('aria-label', frame.closest('figure')?.querySelector('figcaption span')?.textContent || '回忆'));
  // The first screen comes first; then the rest of the photos follow in the background.
  if (document.readyState === 'complete') pump();
  else addEventListener('load', pump, { once:true });
})();
