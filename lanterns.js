/* Twenty-four sky lanterns, one wish each. They rise out of their scene and keep
   drifting up into the shared sky above; the 24th gathers them into a heart. */
(() => {
  'use strict';
  const section = document.querySelector('#lanterns');
  if (!section) return;
  const stage = section.querySelector('#lantern-stage');
  const field = section.querySelector('.lantern-field');
  const sky = document.querySelector('#two-windows');
  const wishText = section.querySelector('#lantern-wish');
  const count = section.querySelector('#lantern-count');
  const release = section.querySelector('#lantern-release');
  const finale = section.querySelector('.lantern-finale');
  const reducedMedia = matchMedia('(prefers-reduced-motion: reduce)');
  const reduced = () => reducedMedia.matches || typeof Element.prototype.animate !== 'function';
  const wishes = [
    '愿你每天醒来，都被温柔叫醒。',
    '愿你想吃的，都能马上吃到。',
    '愿你的笑，一直这么好看。',
    '愿你的努力，都被好好看见。',
    '愿你累的时候，有人抱抱你。',
    '愿你的天空，常常是晴天。',
    '愿你喜欢的歌，一直单曲循环。',
    '愿你出门，总是遇到绿灯。',
    '愿你每一晚，都睡得香甜。',
    '愿每一只小猫，都愿意让你摸摸。',
    '愿你永远有勇气，做真实的自己。',
    '愿你的日子，平凡又闪闪发光。',
    '愿所有的距离，都只是暂时的。',
    '愿你心里的小愿望，慢慢都成真。',
    '愿你被爱，也一直懂得爱自己。',
    '愿你的二十四岁，比二十三岁更快乐。',
    '愿你的本命年，红红火火，好运连连。',
    '愿你身体健康，平安喜乐。',
    '愿你想去的地方，都能去看看。',
    '愿你的烦恼，像蜡烛一样，一吹就灭。',
    '愿你永远保有一颗孩子的心。',
    '愿每一个节日，都有人记得你。',
    '愿下一个生日，我就在你身边。',
    '愿你知道：你是我最特别的人。'
  ];
  const total = wishes.length;
  const lanterns = [];
  let released = 0;

  // A deterministic field of faint stars behind the lanterns.
  const stars = section.querySelector('.lantern-stars');
  for (let i = 0; i < 46; i++) {
    const star = document.createElement('i');
    star.style.cssText = `--x:${(i * 37 + 9) % 100}%;--y:${(i * 23 + 5) % 72}%;--size:${i % 7 ? 1.5 : 2.5}px;--delay:${-i * .6}s`;
    stars.append(star);
  }

  // The field reaches from the bottom of this stage up to the top of the two windows,
  // so lanterns can keep climbing into that sky. Coordinates below are stage-relative.
  let lift = 0;
  function measure() {
    lift = sky ? Math.max(0, stage.getBoundingClientRect().top - sky.getBoundingClientRect().top) : 0;
    field.style.setProperty('--lift', lift + 'px');
  }
  measure();
  new ResizeObserver(measure).observe(document.body);
  const place = (x, y, s) => `translate(${x.toFixed(1)}px, ${(y + lift).toFixed(1)}px) scale(${s.toFixed(3)})`;
  function current(lantern) {
    const m = new DOMMatrixReadOnly(getComputedStyle(lantern).transform);
    return { x:m.e, y:m.f - lift, s:Math.hypot(m.a, m.b) };
  }

  // Where a lantern finally rests: open sky only, never in front of the two windows.
  // Above the windows near the moon, in the gap between them, or beside this scene's heading.
  function openSky(x, width) {
    const { top, left:offset } = stage.getBoundingClientRect();
    const rel = rect => ({ left:rect.left - offset, right:rect.right - offset, top:rect.top - top, bottom:rect.bottom - top });
    const windows = [...document.querySelectorAll('.twosky-window')].map(w => rel(w.getBoundingClientRect()));
    const skyStage = document.querySelector('.twosky-stage');
    if (!windows.length || !skyStage) return { x, y:-lift * (.3 + Math.random() * .6) };
    const sky = rel(skyStage.getBoundingClientRect());
    const heading = rel(section.querySelector('.lantern-heading').getBoundingClientRect());
    const between = (a, b) => a + Math.random() * Math.max(0, b - a);
    const roll = Math.random();
    if (roll < .55) {
      return { x:between(width * .05, width * .95), y:between(sky.top + 30, Math.min(...windows.map(w => w.top)) - 30) };
    }
    if (roll < .78) {
      const [west, east] = [...windows].sort((a, b) => a.left - b.left);
      // Open shutters reach about a third of a window's width beyond its frame.
      const reach = w => (w.right - w.left) * .34;
      return { x:between(west.right + reach(west) + 16, east.left - reach(east) - 16), y:between(Math.max(west.top, east.top), Math.min(west.bottom, east.bottom) - 90) };
    }
    const left = Math.random() < .5;
    return { x:left ? between(width * .04, width * .2) : between(width * .8, width * .96), y:between(heading.top - 40, heading.bottom) };
  }
  function showWish(text) {
    wishText.textContent = text;
    wishText.classList.remove('is-shown');
    void wishText.offsetWidth;
    wishText.classList.add('is-shown');
  }
  function drift(item, from, delay = 0) {
    // A short rise out of the hills, then a slow climb into the sky above, where it stays.
    const { rest } = item;
    item.flight?.cancel();
    if (reduced()) { item.el.style.transform = place(rest.x, rest.y, rest.s); return; }
    const mid = { x:from.x + (rest.x - from.x) * .25, y:item.mid, s:item.depth };
    const firstLeg = from.y > mid.y + 40;
    item.flight = item.el.animate(firstLeg ? [
      { transform:place(from.x, from.y, from.s), opacity:from.o ?? 1, easing:'cubic-bezier(.22,.62,.3,1)' },
      { transform:place(mid.x, mid.y, mid.s), opacity:1, offset:.13, easing:'cubic-bezier(.42,0,.58,1)' },
      { transform:place(rest.x, rest.y, rest.s), opacity:1 }
    ] : [
      { transform:place(from.x, from.y, from.s), easing:'cubic-bezier(.42,0,.58,1)' },
      { transform:place(rest.x, rest.y, rest.s) }
    ], { duration:item.duration, delay, fill:'both' });
  }
  function launch(xRatio) {
    if (released >= total) return;
    const index = released++;
    const width = stage.clientWidth, height = stage.clientHeight;
    measure();
    // Later lanterns fly a little further away: smaller and softer.
    const depth = 1 - .5 * (index / (total - 1)) * (.6 + Math.random() * .4);
    const x = Math.max(.06, Math.min(.94, xRatio ?? (.12 + Math.random() * .76))) * width;
    const el = document.createElement('span');
    el.className = 'lantern';
    el.innerHTML = '<span class="lantern-bob"><i class="lantern-body"></i></span>';
    field.append(el);
    const item = {
      el, depth,
      mid:height * (.2 + Math.random() * .36),
      duration:52000 + Math.random() * 26000,
      rest:{ ...openSky(x, width), s:depth * (.42 + Math.random() * .16) }
    };
    lanterns.push(item);
    drift(item, { x, y:height + 40, s:Math.min(1.25, depth + .35), o:0 });
    showWish(wishes[index]);
    count.textContent = `${released} / ${total}`;
    section.dataset.lanterns = String(released);
    if (released === total) celebrate();
  }

  /* The 24th: every lantern glides into a heart, a line of light appears, then they go on up. */
  // Points spaced evenly along the heart's outline (equal angles would bunch at the dip and the tip).
  function heartPoints(cx, cy, r) {
    const curve = Array.from({ length:721 }, (_, k) => {
      const t = Math.PI * 2 * k / 720;
      return { x:16 * Math.sin(t) ** 3, y:-(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) };
    });
    const lengths = [0];
    for (let k = 1; k < curve.length; k++) lengths.push(lengths[k - 1] + Math.hypot(curve[k].x - curve[k - 1].x, curve[k].y - curve[k - 1].y));
    const perimeter = lengths[lengths.length - 1];
    return Array.from({ length:total }, (_, i) => {
      const k = lengths.findIndex(length => length >= perimeter * i / total);
      return { x:cx + curve[k].x * r / 16, y:cy + curve[k].y * r / 16 };
    });
  }
  function dust(cx, cy, radius) {
    for (let i = 0; i < 36; i++) {
      const dot = document.createElement('i');
      dot.className = 'lantern-dust';
      field.append(dot);
      const angle = Math.random() * Math.PI * 2, reach = radius * (.6 + Math.random() * .9);
      const start = place(cx, cy, .4), end = place(cx + Math.cos(angle) * reach, cy + Math.sin(angle) * reach * .85, .2);
      dot.animate([
        { transform:start, opacity:0 }, { opacity:1, offset:.2 }, { transform:end, opacity:0 }
      ], { duration:1800 + Math.random() * 1400, delay:Math.random() * 300, easing:'cubic-bezier(.2,.7,.3,1)' })
        .finished.catch(() => {}).finally(() => dot.remove());
    }
  }
  function prepareLine() {
    finale.hidden = false;
    finale.querySelectorAll('[data-chars]').forEach(line => {
      line.replaceChildren(...[...line.dataset.chars].map((char, i) => {
        const span = document.createElement('span');
        span.textContent = char;
        span.style.setProperty('--i', i);
        return span;
      }));
    });
  }
  const writeLine = () => requestAnimationFrame(() => finale.classList.add('is-writing'));
  function celebrate() {
    section.classList.add('is-complete');
    release.disabled = true;
    release.firstChild.textContent = '二十四盏，都飞起来了 ';
    // Announced for screen readers; the drawn line below carries it visually.
    wishText.textContent = '二十四盏灯，照亮你的二十四岁。';
    wishText.classList.remove('is-shown');
    prepareLine();
    // The heart sits above the written line: its tip reaches 1.06 r below the centre, its lobes .75 r above.
    const width = stage.clientWidth, height = stage.clientHeight;
    const textTop = finale.offsetTop;
    const radius = Math.min(width * (width < 760 ? .36 : .28), 230, (textTop - 50) / 1.81);
    const cx = width / 2, cy = Math.max(radius * .75 + 20, textTop - 30 - radius * 1.06);
    if (reduced()) { writeLine(); return; }
    // Nearest-in-order assignment keeps the paths from crossing much.
    const spots = heartPoints(cx, cy, radius).sort((a, b) => a.x - b.x);
    const order = [...lanterns].sort((a, b) => current(a.el).x - current(b.el).x);
    const gather = 2600;
    order.forEach((item, i) => {
      const from = current(item.el);
      item.flight?.cancel();
      item.heart = spots[i];
      item.flight = item.el.animate([
        { transform:place(from.x, from.y, from.s) },
        { transform:place(item.heart.x, item.heart.y, .62) }
      ], { duration:gather, delay:i * 40, easing:'cubic-bezier(.3,.75,.2,1)', fill:'both' });
    });
    setTimeout(() => {
      field.classList.add('is-heart');
      field.style.setProperty('--heart-x', cx + 'px');
      field.style.setProperty('--heart-y', cy + lift + 'px');
      dust(cx, cy, radius * 1.3);
      writeLine();
    }, gather + total * 40);
    // After a long breath the heart lets go, and every lantern continues upward.
    setTimeout(() => {
      field.classList.remove('is-heart');
      lanterns.forEach((item, i) => {
        item.duration = 34000 + Math.random() * 16000;
        drift(item, { x:item.heart.x, y:item.heart.y, s:.62 }, i * 120);
      });
    }, gather + total * 40 + 7200);
  }

  stage.addEventListener('click', event => {
    const bounds = stage.getBoundingClientRect();
    launch((event.clientX - bounds.left) / bounds.width);
  });
  release.addEventListener('click', () => launch());
  // Pause the idle bobbing while no lantern is on screen.
  new IntersectionObserver(entries => {
    section.classList.toggle('lanterns-resting', !entries[0].isIntersecting);
  }, { rootMargin:'80px' }).observe(field);
})();
