/* The blue garden grows. A vine drawn on canvas follows the camera from the music button
   through the photos: it branches, curls into tendrils, climbs the frames and blooms,
   while grass spreads along the ground. Growth only ever moves forward. */
(() => {
  'use strict';
  const journey = document.querySelector('.garden-journey');
  if (!journey) return;
  const camera = journey.querySelector('.garden-camera'), world = journey.querySelector('.garden-world');
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const back = document.createElement('canvas'), front = document.createElement('canvas');
  back.className = 'living-garden';
  front.className = 'living-garden living-garden-front';
  for (const canvas of [back, front]) canvas.setAttribute('aria-hidden', 'true');
  camera.prepend(back);
  camera.append(front);
  const bctx = back.getContext('2d'), fctx = front.getContext('2d');

  // The same garden on every visit.
  let seed = 520;
  function rand() {
    seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
  const between = (a, b) => a + rand() * (b - a);
  const clamp = t => Math.min(1, Math.max(0, t));
  const ease = t => 1 - Math.pow(1 - clamp(t), 3);
  const pop = t => { t = clamp(t); return 1 + 2.4 * Math.pow(t - 1, 3) + 1.4 * Math.pow(t - 1, 2); };
  const PETALS = ['#9cc6ff', '#c3dbff', '#86aef2', '#e4eeff', '#b9a9f4', '#d7c9ff', '#f3d3e4'];

  // A soft light, rendered once and stamped behind blossoms, the growing tip and pollen.
  const glow = document.createElement('canvas');
  glow.width = glow.height = 64;
  const g = glow.getContext('2d'), halo = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  halo.addColorStop(0, 'rgba(220,236,255,.9)');
  halo.addColorStop(.35, 'rgba(150,190,255,.35)');
  halo.addColorStop(1, 'rgba(120,160,255,0)');
  g.fillStyle = halo;
  g.fillRect(0, 0, 64, 64);

  let stem = [], reachX = [], reachY = [], plants = [], sprouts = [], motes = [];
  let width = 0, height = 0, ground = Infinity, dpr = 1, mobile = false;
  let grownS = 0, reach = { x:0, y:0 }, lastTime = 0, frame = 0, pointer = null;
  const awake = () => root.classList.contains('garden-awake');

  // A branch is a list of points from its base; it ends in a flower, a bud or a curling tendril.
  function shape(length, angle, curl, tendril) {
    const points = [[0, 0]], steps = 22;
    let x = 0, y = 0, a = angle;
    for (let k = 1; k <= steps; k++) {
      const u = k / steps;
      a += curl / steps * (tendril && u > .55 ? 5 * u : 1);
      x += Math.cos(a) * length / steps;
      y += Math.sin(a) * length / steps;
      points.push([x, y]);
    }
    return points;
  }
  function plant(s, x, y, angle, length, options = {}) {
    const r = rand(), tendril = options.tendril ?? r > .82;
    const curl = between(-1.4, 1.4);
    const points = options.points ?? shape(length, angle, curl, tendril);
    const xs = points.map(point => point[0] + x);
    return {
      s, x, y, points, born:null, phase:rand() * 6.3, dur:between(1100, 1900),
      left:Math.min(...xs), right:Math.max(...xs),
      tip:tendril ? 'tendril' : options.tip ?? (r < .62 ? 'flower' : 'bud'),
      petals:[5, 6, 8][Math.floor(rand() * 3)], size:options.size ?? between(9, 18) * (mobile ? .8 : 1),
      blooms:options.blooms ?? [],
      color:PETALS[Math.floor(rand() * PETALS.length)], spin:rand() * 6.3,
      leaves:[.3, .55, .75].filter(() => rand() < .7).map(u => ({ u, side:rand() < .5 ? -1 : 1, size:between(6, 11) })),
      front:options.front ?? false, cluster:options.cluster ?? 0
    };
  }

  function layout({ detail }) {
    seed = 520;
    ({ width, height, ground } = detail);
    mobile = camera.clientWidth < 761;
    // Sample the vine into points with their running length; reachX and reachY are the furthest x and y reached so far.
    stem = [];
    let s = 0, previous = null;
    for (const path of detail.paths) {
      const length = path.getTotalLength();
      for (let d = 0; d <= length; d += 5) {
        const p = path.getPointAtLength(d);
        if (previous) s += Math.hypot(p.x - previous.x, p.y - previous.y);
        stem.push({ x:p.x, y:p.y, s });
        previous = p;
      }
    }
    let furthestX = -Infinity, furthestY = -Infinity;
    reachX = stem.map(point => (furthestX = Math.max(furthestX, point.x)));
    reachY = stem.map(point => (furthestY = Math.max(furthestY, point.y)));
    const nearest = (x, y) => stem.reduce((best, point) => Math.hypot(point.x - x, point.y - y) < Math.hypot(best.x - x, best.y - y) ? point : best, stem[0]);

    plants = [];
    const total = stem.at(-1)?.s ?? 0;
    for (let d = 60; d < total; d += between(mobile ? 80 : 42, mobile ? 125 : 80)) {
      const i = stem.findIndex(point => point.s >= d), p = stem[i], q = stem[Math.min(stem.length - 1, i + 2)];
      const tangent = Math.atan2(q.y - p.y, q.x - p.x), side = rand() < .72 ? -1 : 1;
      const branch = plant(d, p.x, p.y, tangent + side * between(.6, 1.35), between(40, 140) * (mobile ? .7 : 1));
      plants.push(branch);
      if (branch.tip !== 'tendril' && branch.points.length && between(0, 1) < .55) {
        const [fx, fy] = branch.points[12], [gx, gy] = branch.points[13];
        const fork = Math.atan2(gy - fy, gx - fx) + (rand() < .5 ? -.8 : .8);
        plants.push(plant(d + 30, p.x + fx, p.y + fy, fork, between(25, 60) * (mobile ? .7 : 1), { tip:'flower', tendril:false }));
      }
    }
    // Climbers find each photo and bloom at its top corners, a little in front of the frame.
    detail.photos.forEach((photo, i) => {
      for (const right of mobile ? [i % 2 === 0] : [false, true]) {
        const edge = right ? photo.x + photo.w + 6 : photo.x - 6, base = nearest(edge, photo.y + photo.h * .7);
        const target = { x:edge - (right ? 18 : -18), y:photo.y + between(10, 40) };
        const points = [];
        for (let k = 0; k <= 26; k++) {
          const u = k / 26, wave = Math.sin(u * Math.PI * 2.5 + i) * 10 * (1 - u);
          points.push([(target.x - base.x) * u + wave, (target.y - base.y) * (u * u * (3 - 2 * u))]);
        }
        plants.push(plant(base.s + 20, base.x, base.y, 0, 0, { points, tip:'flower', tendril:false, size:between(13, 20) * (mobile ? .8 : 1), front:true, cluster:4,
          blooms:[{ u:.45, size:between(7, 11) }, { u:.7, size:between(8, 13) }] }));
      }
    });
    plants.sort((a, b) => a.s - b.s);
    // Grass and small flowers along the ground, from the first photo until the ribbon turns downwards.
    sprouts = [];
    const start = detail.photos[0] ? detail.photos[0].x - 260 : 0;
    for (let x = start; x < Math.min(width, ground); x += between(mobile ? 22 : 13, mobile ? 40 : 26)) {
      const flowering = rand() < .34;
      sprouts.push({ x, h:between(12, flowering ? 90 : 56) * (mobile ? .8 : 1), lean:between(-.35, .35), born:null, phase:rand() * 6.3,
        flower:flowering ? { color:PETALS[Math.floor(rand() * PETALS.length)], size:between(3, 8), petals:5 + Math.floor(rand() * 2), spin:rand() * 6.3, phase:rand() * 6.3 } : null });
    }
    motes = [];
    resize();
    paint(performance.now());
  }

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2);
    for (const canvas of [back, front]) {
      canvas.width = Math.round(camera.clientWidth * dpr);
      canvas.height = Math.round(camera.clientHeight * dpr);
    }
  }
  // Where the view sits in the world: the world moves left, and later up, under the pinned camera.
  function offset() {
    const view = camera.getBoundingClientRect(), scene = world.getBoundingClientRect();
    return { x:view.left - scene.left, y:view.top - scene.top };
  }

  function grow(now, dt) {
    if (!awake() || !stem.length) return;
    const at = offset();
    reach = { x:Math.max(reach.x, at.x + camera.clientWidth * .85), y:Math.max(reach.y, at.y + camera.clientHeight * .85) };
    // The furthest stretch of vine that stays within reach on both axes (reachX and reachY only rise along the vine).
    let low = 0, high = stem.length - 1;
    while (low < high) { const mid = (low + high + 1) >> 1; if (reachX[mid] <= reach.x && reachY[mid] <= reach.y) low = mid; else high = mid - 1; }
    const target = stem[low].s;
    if (reduced.matches) grownS = target;
    else grownS = Math.min(target, grownS + Math.max(260, (target - grownS) * 2.4) * dt);
    let head = stem[0];
    for (const point of stem) { if (point.s > grownS) break; head = point; }
    const instant = reduced.matches ? -1e9 : null;
    for (const p of plants) if (p.born === null && p.s <= grownS) p.born = instant ?? now + between(0, 260);
    for (const sprout of sprouts) if (sprout.born === null && sprout.x <= head.x) sprout.born = instant ?? now + between(0, 500);
  }

  function petal(ctx, length, w) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(w, -length * .55, 0, -length);
    ctx.quadraticCurveTo(-w, -length * .55, 0, 0);
    ctx.fill();
  }
  function flower(ctx, x, y, p, open, now, nudge) {
    if (open <= 0) {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.ellipse(x, y, p.size * .22, p.size * .38, p.spin, 0, 6.3);
      ctx.fill();
      return;
    }
    const size = p.size * pop(open) * (1 + Math.sin(now * .002 + p.phase) * .04);
    ctx.globalAlpha = .45 * open;
    ctx.drawImage(glow, x - size * 2.2, y - size * 2.2, size * 4.4, size * 4.4);
    ctx.globalAlpha = 1;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(p.spin + now * .00015 + nudge);
    ctx.fillStyle = p.color;
    for (let i = 0; i < p.petals; i++) {
      ctx.rotate(Math.PI * 2 / p.petals);
      petal(ctx, size, size * (p.petals > 6 ? .32 : .5) * Math.min(1, open * 1.4));
    }
    ctx.fillStyle = 'rgba(255,255,255,.28)';
    for (let i = 0; i < p.petals; i++) {
      ctx.rotate(Math.PI * 2 / p.petals);
      petal(ctx, size * .55, size * .18);
    }
    ctx.fillStyle = '#f6e3a1';
    ctx.beginPath();
    ctx.arc(0, 0, size * .2, 0, 6.3);
    ctx.fill();
    ctx.restore();
  }
  function leaf(ctx, x, y, angle, size) {
    if (size <= 0) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = '#4f7d68';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(size * .5, -size * .45, size, 0);
    ctx.quadraticCurveTo(size * .5, size * .45, 0, 0);
    ctx.fill();
    ctx.strokeStyle = 'rgba(190,220,195,.35)';
    ctx.lineWidth = .6;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(size * .85, 0);
    ctx.stroke();
    ctx.restore();
  }

  function drawPlant(p, now) {
    if (p.born === null || now < p.born) return;
    const grown = ease((now - p.born) / p.dur), count = Math.max(1, Math.floor(grown * (p.points.length - 1)));
    // Branches sway from their base; flowers near the pointer lean away from it.
    let nudge = 0;
    const end = p.points[count];
    if (pointer) {
      const dx = p.x + end[0] - pointer.x, dy = p.y + end[1] - pointer.y, d = Math.hypot(dx, dy);
      if (d < 110) nudge = (1 - d / 110) * .5 * Math.sign(dx || 1);
    }
    const sway = reduced.matches ? 0 : Math.sin(now * .0009 + p.phase) * .045 + nudge * .25;
    const ctx = bctx;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(sway * (p.front ? .3 : 1));
    ctx.strokeStyle = '#5d8b76';
    ctx.lineWidth = p.front ? 1.6 : 1.3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (let k = 1; k <= count; k++) ctx.lineTo(p.points[k][0], p.points[k][1]);
    ctx.stroke();
    for (const l of p.leaves) {
      const k = Math.floor(l.u * (p.points.length - 1));
      if (k >= count) continue;
      const [x0, y0] = p.points[k], [x1, y1] = p.points[k + 1];
      leaf(ctx, x0, y0, Math.atan2(y1 - y0, x1 - x0) + l.side * 1.05, l.size * ease((grown - l.u) / .25));
    }
    for (const bloom of p.blooms) {
      const k = Math.floor(bloom.u * (p.points.length - 1));
      if (k >= count) continue;
      flower(ctx, p.points[k][0], p.points[k][1], { ...p, size:bloom.size, spin:p.spin + bloom.u * 9 }, clamp((grown - bloom.u) * 3), now, nudge);
    }
    if (p.tip === 'tendril') { ctx.restore(); return; }
    const open = reduced.matches ? 1 : clamp((now - p.born - p.dur * .85) / 1400);
    const [tx, ty] = end;
    // Climbers flower in front of the frame, at the same swayed position.
    let target = ctx;
    if (p.front) {
      const m = ctx.getTransform();
      ctx.restore();
      target = fctx;
      target.save();
      target.setTransform(m);
    }
    for (let c = 0; c <= p.cluster; c++) {
      const angle = c * 2.1 + p.spin, r = c ? p.size * 1.3 : 0;
      flower(target, tx + Math.cos(angle) * r, ty + Math.sin(angle) * r, c ? { ...p, size:p.size * .7, spin:p.spin + c } : p, clamp(open * 1.2 - c * .15), now, nudge);
    }
    target.restore();
  }

  function drawSprouts(now, left, right) {
    const ctx = bctx, ground = height - 6;
    ctx.lineCap = 'round';
    for (const sprout of sprouts) {
      if (sprout.born === null || now < sprout.born || sprout.x < left || sprout.x > right) continue;
      const grown = ease((now - sprout.born) / 1300), h = sprout.h * grown;
      const bend = sprout.lean + (reduced.matches ? 0 : Math.sin(now * .0012 + sprout.phase) * .12);
      ctx.strokeStyle = 'rgba(102,150,128,.75)';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(sprout.x, ground);
      ctx.quadraticCurveTo(sprout.x + bend * h * .3, ground - h * .6, sprout.x + bend * h, ground - h);
      ctx.stroke();
      if (sprout.flower && grown > .7) flower(ctx, sprout.x + bend * h, ground - h, sprout.flower, (grown - .7) / .3, now, 0);
    }
  }

  function drawStem(now, left, right) {
    const ctx = bctx;
    let first = stem.findIndex(point => point.x > left - 40);
    if (first < 0) return;
    first = Math.max(0, first - 2);
    ctx.lineCap = ctx.lineJoin = 'round';
    let head = null;
    for (const [color, lineWidth] of [['#2c5146', 4.2], ['#7fb096', 1.6]]) {
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      for (let i = first; i < stem.length && stem[i].s <= grownS; i++) {
        const point = stem[i];
        if (i === first) ctx.moveTo(point.x, point.y); else ctx.lineTo(point.x, point.y);
        head = point;
        if (reachX[i] > right + 60 && reachY[i] > bottom + 60) break;
      }
      ctx.stroke();
    }
    // The growing tip glows while the vine is still on its way.
    if (head && grownS < stem.at(-1).s - 4 && !reduced.matches) {
      const r = 18 + Math.sin(now * .008) * 4;
      ctx.globalAlpha = .9;
      ctx.drawImage(glow, head.x - r, head.y - r, r * 2, r * 2);
      ctx.globalAlpha = 1;
    }
  }

  function drawMotes(now, dt, left, right) {
    if (reduced.matches) return;
    // Pollen drifts up from open flowers on screen.
    if (motes.length < (mobile ? 24 : 48) && rand() < dt * (mobile ? 3 : 6)) {
      const open = plants.filter(p => p.tip === 'flower' && p.born !== null && now - p.born > p.dur + 900 && p.x > left && p.x < right);
      if (open.length) {
        const p = open[Math.floor(rand() * open.length)], end = p.points.at(-1);
        motes.push({ x:p.x + end[0], y:p.y + end[1], vx:between(-6, 6), vy:between(-22, -10), life:0, span:between(2.5, 4.5), phase:rand() * 6.3 });
      }
    }
    motes = motes.filter(m => (m.life += dt) < m.span);
    for (const m of motes) {
      m.x += (m.vx + Math.sin(now * .002 + m.phase) * 8) * dt;
      m.y += m.vy * dt;
      const fade = Math.sin(Math.PI * m.life / m.span), r = 5 + fade * 3;
      fctx.globalAlpha = fade * .8;
      fctx.drawImage(glow, m.x - r, m.y - r, r * 2, r * 2);
    }
    fctx.globalAlpha = 1;
  }

  function paint(now) {
    const dt = Math.min(.05, lastTime ? (now - lastTime) / 1000 : 0);
    lastTime = now;
    grow(now, dt);
    const shift = offset(), left = shift.x - 120, right = shift.x + camera.clientWidth + 120;
    const top = shift.y - 160, bottom = shift.y + camera.clientHeight + 160;
    // Without the pinned camera (reduced motion) the canvases ride along inside the scrolling frame.
    const native = journey.classList.contains('is-linked') ? 0 : camera.scrollLeft;
    for (const canvas of [back, front]) canvas.style.transform = native ? `translateX(${native}px)` : '';
    for (const ctx of [bctx, fctx]) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, back.width, back.height);
      ctx.setTransform(dpr, 0, 0, dpr, -shift.x * dpr, -shift.y * dpr);
    }
    if (!awake() || !stem.length) return;
    drawSprouts(now, left, right);
    drawStem(now, left, right);
    for (const p of plants) if (p.right > left && p.left < right && p.y > top - 200 && p.y < bottom + 200) drawPlant(p, now);
    drawMotes(now, dt, left, right);
  }

  function loop(now) {
    frame = 0;
    paint(now);
    if (inView() && awake() && !document.hidden && !reduced.matches) frame = requestAnimationFrame(loop);
  }
  // The camera is pinned while the ribbon plays, so its box on screen is the honest test of visibility.
  function inView() {
    const box = camera.getBoundingClientRect();
    return box.bottom > 0 && box.top < innerHeight;
  }
  function wake() {
    if (reduced.matches) paint(performance.now());
    else if (!frame && inView() && awake() && !document.hidden) { lastTime = 0; frame = requestAnimationFrame(loop); }
  }
  document.addEventListener('garden:layout', layout);
  document.addEventListener('visibilitychange', wake);
  addEventListener('scroll', wake, { passive:true });
  camera.addEventListener('scroll', wake, { passive:true });
  new ResizeObserver(() => { resize(); paint(performance.now()); }).observe(camera);
  camera.addEventListener('pointermove', event => {
    const box = camera.getBoundingClientRect();
    const at = offset();
    pointer = { x:event.clientX - box.left + at.x, y:event.clientY - box.top + at.y };
  }, { passive:true });
  camera.addEventListener('pointerleave', () => { pointer = null; });
  document.addEventListener('garden:theme', ({ detail }) => {
    if (!detail.blue) {
      // Back to the rose night: the garden returns to seed, ready to grow again.
      grownS = 0; reach = { x:0, y:0 }; motes = [];
      for (const item of [...plants, ...sprouts]) item.born = null;
    }
    requestAnimationFrame(wake);
  });
})();
