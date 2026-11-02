(() => {
  'use strict';
  const canvas = document.querySelector('.journey-canvas');
  if (!canvas) return;
  const nodes = [...canvas.querySelectorAll('.memory-node')];
  const buttons = nodes.map(node => node.querySelector('.memory-card'));
  const guide = canvas.querySelector('.journey-line-guide');
  const drawn = canvas.querySelector('.journey-line-drawn');
  const svg = canvas.querySelector('svg');
  let expanded;
  let resizeFrame;
  let canvasWidth = 0;
  const hoverMedia = matchMedia('(hover: hover) and (pointer: fine)');
  const landings = new Map();
  const returning = new Map();
  let hovered;
  let edgeHandoff;
  let hoverFrame = 0, pointerSample;

  function finishReturn(node) {
    clearTimeout(returning.get(node));
    returning.delete(node);
    node.classList.remove('is-returning');
  }
  function keepAboveWhileReturning(node) {
    if (node.matches('.is-previewing, .is-keyboard-preview, .is-expanded')) return;
    finishReturn(node);
    node.classList.add('is-returning');
    // Keep the frame above the pile until its shrinking transform has finished.
    returning.set(node, setTimeout(() => completeReturn(node), 450));
  }
  function completeReturn(node) {
    const moving = node.querySelector('.memory-card').getAnimations().some(animation =>
      animation.transitionProperty === 'transform' && animation.playState !== 'finished');
    if (moving) returning.set(node, setTimeout(() => completeReturn(node), 100));
    else finishReturn(node);
  }
  function preview(node) {
    if (!hoverMedia.matches || !node.classList.contains('is-settled')) return;
    if (hovered && hovered !== node) {
      const previous = hovered;
      previous.classList.remove('is-previewing');
      keepAboveWhileReturning(previous);
    }
    hovered = node;
    finishReturn(node);
    node.classList.add('is-previewing');
  }
  function clearPreview() {
    cancelAnimationFrame(hoverFrame); hoverFrame = 0; pointerSample = null;
    edgeHandoff = null;
    if (!hovered) return;
    const previous = hovered;
    hovered = null;
    previous.classList.remove('is-previewing');
    keepAboveWhileReturning(previous);
  }
  function updatePreview() {
    hoverFrame = 0;
    if (!pointerSample) return;
    const { x, y } = pointerSample;
    pointerSample = null;
    // Layer changes also generate pointer enter/leave events. Only intentional
    // cursor movement can turn another page, with a small dead zone for jitter.
    if (edgeHandoff && Math.hypot(x - edgeHandoff.x, y - edgeHandoff.y) < 30) return;
    edgeHandoff = null;
    const stack = [...new Set(document.elementsFromPoint(x, y)
      .map(element => element.closest('.memory-card')?.closest('.memory-node'))
      .filter(node => node && canvas.contains(node) && node.classList.contains('is-settled')))];
    const top = stack[0];
    if (!top) { clearPreview(); return; }
    if (!hovered || !stack.includes(hovered)) { preview(top); return; }
    const bounds = hovered.querySelector('.memory-square').getBoundingClientRect();
    const band = Math.min(30, bounds.width * .13);
    const nearEdge = Math.min(x - bounds.left, bounds.right - x, y - bounds.top, bounds.bottom - y) <= band;
    const underneath = stack.find(node => node !== hovered);
    if (nearEdge && underneath) {
      preview(underneath);
      edgeHandoff = { x, y };
    }
  }
  canvas.addEventListener('pointermove', event => {
    if (!hoverMedia.matches || event.pointerType === 'touch') return;
    pointerSample = { x:event.clientX, y:event.clientY };
    if (!hoverFrame) hoverFrame = requestAnimationFrame(updatePreview);
  }, { passive:true });
  canvas.addEventListener('pointerleave', clearPreview);
  window.addEventListener('scroll', clearPreview, { passive: true });
  function settle(node) {
    node.dataset.journeySeen = 'true';
    node.classList.add('is-settled');
    const tween = landings.get(node);
    if (tween) {
      landings.delete(node);
      tween.progress(1);
      tween.scrollTrigger?.kill(false);
      tween.kill();
    }
    if (node.matches(':hover')) preview(node);
  }

  function closeExpanded() {
    const previous = expanded;
    expanded = null;
    if (!previous) return;
    previous.classList.remove('is-expanded');
    previous.querySelector('button').setAttribute('aria-pressed', 'false');
    if (previous.contains(document.activeElement)) document.activeElement.blur();
    keepAboveWhileReturning(previous);
  }
  buttons.forEach((button, index) => {
    const node = nodes[index];
    button.addEventListener('transitionend', event => {
      if (event.target === button && event.propertyName === 'transform') completeReturn(node);
    });
    button.addEventListener('focus', () => {
      settle(node);
      if (button.matches(':focus-visible')) {
        finishReturn(node);
        node.classList.add('is-keyboard-preview');
      }
    });
    button.addEventListener('blur', () => {
      const wasPreviewing = node.classList.contains('is-keyboard-preview');
      node.classList.remove('is-keyboard-preview');
      if (wasPreviewing) keepAboveWhileReturning(node);
    });
    button.addEventListener('click', () => {
      if (!node.classList.contains('is-settled')) return;
      const wasExpanded = expanded === nodes[index];
      closeExpanded();
      if (wasExpanded) return;
      finishReturn(node);
      expanded = nodes[index];
      expanded.classList.add('is-expanded');
      button.setAttribute('aria-pressed', 'true');
    });
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('.memory-card')) closeExpanded();
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    closeExpanded();
    if (document.activeElement?.matches('.memory-card')) document.activeElement.blur();
  });
  hoverMedia.addEventListener('change', () => {
    clearPreview();
    nodes.forEach(node => {
      node.classList.remove('is-previewing');
      keepAboveWhileReturning(node);
    });
  });

  /* Each photo keeps its own shape, so the trail is laid out here rather than on a fixed grid:
     the path meanders across the width, and every card rises as high as it can beside the
     cards before it without covering a photo, a caption or a side note. */
  const phone = matchMedia('(max-width: 600px)');
  function layout() {
    const width = canvas.clientWidth;
    const pad = 10; // rotated corners
    const obstacles = [...canvas.querySelectorAll('.journey-chapter, .journey-whisper')]
      .filter(note => note.offsetParent)
      .map(note => ({ x: note.offsetLeft - 24, y: note.offsetTop - 34, w: note.offsetWidth + 48, h: note.offsetHeight + 68 }));
    const placed = [...obstacles];
    const step = (nodes[0]?.offsetWidth || 160) * .3;
    let previous = phone.matches ? 140 : 160, bottom = 0;
    nodes.forEach((node, i) => {
      const w = node.offsetWidth;
      const h = node.querySelector('.memory-square').offsetHeight + node.querySelector('.memory-caption').offsetHeight + 22;
      // Golden-ratio steps scatter the cards over the whole width without a regular zigzag.
      const lane = ((i * .618 + .2) % 1) * 2 - 1;
      const x = width / 2 + lane * (width / 2 - w / 2 - 6);
      let y = previous, moved = true;
      while (moved) {
        moved = false;
        for (const r of placed) {
          if (x - w / 2 - pad < r.x + r.w && x + w / 2 + pad > r.x && y < r.y + r.h && y + h > r.y) { y = r.y + r.h; moved = true; }
        }
      }
      node.style.left = `${x}px`;
      node.style.top = `${y}px`;
      placed.push({ x: x - w / 2, y, w, h });
      // A card pushed down by a side note does not drag the next one with it: that one may fill the gap beside it.
      previous = Math.max(previous + step, y - w * .9);
      bottom = Math.max(bottom, y + h);
    });
    canvas.style.height = `${bottom + (phone.matches ? 90 : 130)}px`;
  }

  function drawPath() {
    // Offset geometry belongs to the static nodes, never to the animated children.
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const points = nodes.map(node => ({ x: node.offsetLeft + node.offsetWidth / 2, y: node.offsetTop + node.firstElementChild.offsetHeight / 2 }));
    points.unshift({ x: width / 2, y: 0 });
    points.push({ x: width / 2, y: height - 15 });
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let index = 0; index < points.length - 1; index++) {
      const p0 = points[Math.max(0, index - 1)];
      const p1 = points[index];
      const p2 = points[index + 1];
      const p3 = points[Math.min(points.length - 1, index + 2)];
      path += ` C ${p1.x + (p2.x - p0.x) / 6} ${p1.y + (p2.y - p0.y) / 6}, ${p2.x - (p3.x - p1.x) / 6} ${p2.y - (p3.y - p1.y) / 6}, ${p2.x} ${p2.y}`;
    }
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    guide.setAttribute('d', path);
    drawn.setAttribute('d', path);
  }
  const relayout = () => { layout(); drawPath(); };
  relayout();
  // Captions in the web font are a little taller than in the fallback.
  document.fonts?.ready.then(() => { relayout(); window.ScrollTrigger?.refresh(); });
  const observer = new ResizeObserver(entries => {
    const width = entries[0].contentRect.width;
    if (Math.abs(width - canvasWidth) < 1) return;
    canvasWidth = width;
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(relayout);
  });
  observer.observe(canvas);

  window.MemoryJourney = {
    animate({ gsap, desktop }) {
      canvas.classList.add('has-path-motion');
      nodes.forEach(node => node.classList.toggle('is-settled', node.dataset.journeySeen === 'true'));
      drawn.style.strokeDasharray = '1';
      gsap.fromTo(drawn, { strokeDashoffset: 1 }, {
        strokeDashoffset: 0, ease: 'none',
        scrollTrigger: { id: 'memory-thread', trigger: canvas, start: 'top 78%', end: 'bottom 54%', scrub: .3 }
      });
      nodes.forEach((node, index) => {
        const target = node.querySelector('.memory-flight');
        if (node.dataset.journeySeen === 'true') {
          gsap.set(target, { x: 0, y: 0, rotation: 0, scale: 1, opacity: 1 });
          return;
        }
        const previous = nodes[Math.max(0, index - 1)];
        const tween = gsap.fromTo(target, {
          x: () => index ? (previous.offsetLeft - node.offsetLeft) * .85 : 0,
          y: () => index ? (previous.offsetTop - node.offsetTop) * .85 : -90,
          rotation: index % 2 ? -15 : 15,
          scale: .82, opacity: 0
        }, {
          x: 0, y: 0, rotation: 0, scale: 1, opacity: 1, ease: 'power1.inOut',
          onUpdate() { if (this.progress() > .98 && node.dataset.journeySeen !== 'true') settle(node); },
          scrollTrigger: {
            id: `memory-${index + 1}`, trigger: node, start: 'clamp(top 84%)', end: 'clamp(top 46%)',
            scrub: desktop ? .22 : .15, invalidateOnRefresh: true
          }
        });
        landings.set(node, tween);
        if (tween.progress() > .98) settle(node);
      });
      gsap.fromTo('.journey-whisper, .journey-chapter', { y: desktop ? 20 : 9 }, {
        y: desktop ? -28 : -12, ease: 'none',
        scrollTrigger: { trigger: canvas, start: 'top bottom', end: 'bottom top', scrub: .4 }
      });
      return () => {
        clearPreview();
        canvas.classList.remove('has-path-motion');
        nodes.forEach(node => node.classList.add('is-settled'));
        drawn.style.removeProperty('stroke-dasharray');
        closeExpanded();
        landings.clear();
        nodes.forEach(node => {
          finishReturn(node);
          node.classList.remove('is-previewing', 'is-keyboard-preview');
        });
      };
    }
  };
  // With reduced motion or unavailable libraries the complete path stays visible.
  nodes.forEach(node => node.classList.add('is-settled'));
})();
