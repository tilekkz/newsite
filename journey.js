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
    returning.set(node, setTimeout(() => completeReturn(node), 1000));
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
    edgeHandoff = null;
    if (!hovered) return;
    const previous = hovered;
    hovered = null;
    previous.classList.remove('is-previewing');
    keepAboveWhileReturning(previous);
  }
  canvas.addEventListener('pointermove', event => {
    if (!hoverMedia.matches || event.pointerType === 'touch') return;
    const { clientX: x, clientY: y } = event;
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
  });
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

  function drawPath() {
    // Offset geometry belongs to the static nodes, never to the animated children.
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const points = nodes.map(node => ({ x: node.offsetLeft + node.offsetWidth / 2, y: node.offsetTop + node.offsetWidth / 2 }));
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
  drawPath();
  const observer = new ResizeObserver(entries => {
    const width = entries[0].contentRect.width;
    if (Math.abs(width - canvasWidth) < 1) return;
    canvasWidth = width;
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(drawPath);
  });
  observer.observe(canvas);

  window.MemoryJourney = {
    animate({ gsap, desktop }) {
      canvas.classList.add('has-path-motion');
      nodes.forEach(node => node.classList.toggle('is-settled', node.dataset.journeySeen === 'true'));
      drawn.style.strokeDasharray = '1';
      gsap.fromTo(drawn, { strokeDashoffset: 1 }, {
        strokeDashoffset: 0, ease: 'none',
        scrollTrigger: { id: 'memory-thread', trigger: canvas, start: 'top 78%', end: 'bottom 54%', scrub: .8 }
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
            scrub: desktop ? .45 : .25, invalidateOnRefresh: true
          }
        });
        landings.set(node, tween);
        if (tween.progress() > .98) settle(node);
      });
      gsap.fromTo('.journey-whisper, .journey-chapter', { y: desktop ? 20 : 9 }, {
        y: desktop ? -28 : -12, ease: 'none',
        scrollTrigger: { trigger: canvas, start: 'top bottom', end: 'bottom top', scrub: 1.2 }
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
