(() => {
  'use strict';
  const { gsap } = window;
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const gate = document.querySelector('#entry-gate');
  const bloom = document.querySelector('#bloom-scene');
  const cat = document.querySelector('#cat-button');
  const catSize = cat.querySelector('.cat-size');
  const stage = document.querySelector('#cat-stage');
  const section = document.querySelector('#surprise');
  const world = stage.querySelector('.cat-world');
  const flight = bloom.querySelector('.bouquet-flight');
  const drift = bloom.querySelector('.bouquet-drift');
  const bouquetTouch = bloom.querySelector('.bouquet-touch');
  const steps = [...document.querySelectorAll('.cat-steps i')];
  const instruction = document.querySelector('#cat-instruction');
  const bouquet = bloom.querySelector('.bloom-bouquet');
  const message = bloom.querySelector('.bloom-message');
  const next = bloom.querySelector('.bloom-next');
  const controls = section.querySelector('.cat-controls');
  let nickname = '';
  let entered = false;
  let sounds = true;
  let audioContext;
  let bloomTimeline;
  let catTween;
  let bloomPulse;
  let entryTimeline;
  let busy = false;
  let count = 0;
  let entryClosing = false;
  let bloomActive = false;
  let bloomTapBusy = false;
  let framing = false;
  ['wheel', 'touchstart', 'pointerdown', 'keydown'].forEach(type => {
    window.addEventListener(type, () => { framing = false; }, { passive: true });
  });
  try {
    nickname = sessionStorage.getItem('520am-name') || '';
    entered = sessionStorage.getItem('520am-entered') === 'yes';
    sounds = localStorage.getItem('520am-sfx') !== 'off';
  } catch { /* Storage is optional, including private browsing. */ }

  function chime(level = 0, finale = false) {
    if (!sounds) return;
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    try {
      audioContext ||= new Audio();
      audioContext.resume().catch(() => {});
      const now = audioContext.currentTime;
      const notes = finale ? [523.25, 659.25, 783.99, 1046.5] : [392, 440, 493.88, 523.25, 587.33, 659.25];
      (finale ? notes : [notes[Math.min(level, 5)]]).forEach((frequency, index) => {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const start = now + (finale ? index * 0.13 : 0);
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(finale ? 0.035 : 0.055, start + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + (finale ? 1.25 : 0.55));
        oscillator.connect(gain).connect(audioContext.destination);
        oscillator.start(start);
        oscillator.stop(start + 1.4);
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      });
    } catch { /* The visual experience also works without Web Audio. */ }
  }

  function updateSoundButtons() {
    document.querySelectorAll('[data-sfx-toggle]').forEach(button => {
      button.setAttribute('aria-pressed', String(sounds));
      button.setAttribute('aria-label', sounds ? '关闭音效 / Turn sound effects off' : '开启音效 / Turn sound effects on');
      const label = button.querySelector('span');
      label.replaceChildren(document.createTextNode(sounds ? '轻柔音效' : '音效已关'));
      const english = document.createElement('small');
      english.lang = 'en';
      english.textContent = sounds ? 'Gentle sounds on' : 'Gentle sounds off';
      label.append(english);
    });
  }
  document.querySelectorAll('[data-sfx-toggle]').forEach(button => button.addEventListener('click', () => {
    sounds = !sounds;
    try { localStorage.setItem('520am-sfx', sounds ? 'on' : 'off'); } catch { /* Optional. */ }
    updateSoundButtons();
    if (sounds) chime(0);
  }));
  updateSoundButtons();

  function openModal(dialog) {
    if (!dialog.open) dialog.showModal();
    document.body.classList.add('dialog-open');
    dialog.dispatchEvent(new Event('site:modal-open'));
  }
  function modalClosed(dialog) {
    if (!document.querySelector('dialog[open]')) document.body.classList.remove('dialog-open');
    dialog.dispatchEvent(new Event('site:modal-close'));
  }

  function openInvitation() {
    entryClosing = false;
    document.querySelector('#guest-name').value = nickname;
    entryTimeline?.kill();
    if (gsap) gsap.set([gate, '.entry-copy'], { clearProps: 'opacity,visibility,transform' });
    openModal(gate);
    // Keep mobile keyboards closed until the optional name field is chosen.
    gate.querySelector('.entry-close').focus({ preventScroll: true });
    if (gsap && !reduced()) entryTimeline = gsap.from('.entry-copy > *', {
      y:10, autoAlpha:0, duration:.5, stagger:.06, ease:'power2.out', clearProps:'transform,opacity,visibility'
    });
  }
  function enterWorld(saveName) {
    if (entryClosing) return;
    entryClosing = true;
    if (saveName) nickname = document.querySelector('#guest-name').value.trim().slice(0, 24);
    try {
      sessionStorage.setItem('520am-name', nickname);
      sessionStorage.setItem('520am-entered', 'yes');
    } catch { /* An invitation never requires storage. */ }
    chime(0, true);
    entryTimeline?.kill();
    const finish = () => { gate.close(); };
    if (gsap && !reduced()) gsap.to(gate, { opacity: 0, duration: 0.55, ease: 'power2.inOut', onComplete: finish });
    else finish();
  }
  gate.querySelector('.entry-close').addEventListener('click', () => enterWorld(false));
  gate.addEventListener('cancel', event => { event.preventDefault(); enterWorld(false); });
  gate.addEventListener('close', () => {
    modalClosed(gate);
    entryClosing = false;
    document.dispatchEvent(new Event('site:entered'));
  });
  document.querySelector('#entry-form').addEventListener('submit', event => { event.preventDefault(); enterWorld(true); });
  document.querySelector('[data-open-invitation]').addEventListener('click', openInvitation);

  const cap = () => Math.min(1.6, (innerWidth - 38) / cat.offsetWidth, (stage.clientHeight - 55) / cat.offsetHeight);
  const currentScale = () => 0.7 + (cap() - 0.7) * Math.min(count, 4) / 4;
  function hint(zh, en) {
    const translation = document.createElement('span');
    translation.lang = 'en';
    translation.textContent = en;
    instruction.replaceChildren(document.createTextNode(zh), translation);
  }
  function clickSparkles() {
    if (!gsap || reduced()) return;
    for (let i = 0; i < 7; i++) {
      const particle = document.createElement('span');
      particle.textContent = i % 3 ? '✧' : '♡';
      document.querySelector('#click-particles').append(particle);
      gsap.fromTo(particle, { x: (Math.random() - 0.5) * 130, y: 50, scale: 0.4, opacity: 0 }, {
        x: (Math.random() - 0.5) * 320, y: -70 - Math.random() * 160, scale: 0.5 + Math.random() * 0.5,
        opacity: 0, keyframes: { opacity: [0, 0.8, 0] }, rotation: (Math.random() - 0.5) * 50,
        duration: 1.1 + Math.random() * 0.4, ease: 'power2.out', onComplete: () => particle.remove()
      });
    }
  }
  function resetCat() {
    window.BouquetDepth?.reset();
    bloomTimeline?.kill();
    catTween?.kill();
    bloomPulse?.kill();
    bloomActive = false;
    bloomTapBusy = false;
    framing = false;
    bloom.hidden = true;
    bloom.style.removeProperty('z-index');
    bloom.inert = true;
    world.inert = false;
    controls.inert = false;
    section.classList.remove('is-blooming');
    section.style.removeProperty('--bloom-tail');
    const petals = bloom.querySelector('.bloom-petals');
    gsap?.killTweensOf(petals.children);
    petals.replaceChildren();
    if (gsap) {
      gsap.killTweensOf([world, flight, drift, stage, message, bouquetTouch, next]);
      gsap.set([world, flight, drift, stage, message, bouquetTouch, next], { clearProps: 'transform,opacity,visibility,height' });
      gsap.set(catSize, { x:0, rotation:0 });
    } else {
      world.removeAttribute('style');
      stage.removeAttribute('style');
      [flight, message, next].forEach(element => element.removeAttribute('style'));
    }
    gsap?.killTweensOf(catSize);
    count = 0;
    busy = false;
    cat.disabled = false;
    stage.dataset.phase = 'growing';
    stage.dataset.clicks = '0';
    steps.forEach(step => step.classList.remove('active'));
    if (gsap) gsap.set(catSize, { scale: 0.7 });
    else catSize.style.transform = 'scale(.7)';
    hint('每一次靠近，都是心动。', 'Every click, a little closer.');
  }
  function petalShower() {
    const container = bloom.querySelector('.bloom-petals');
    gsap?.killTweensOf(container.children);
    container.replaceChildren();
    if (!gsap || reduced()) return;
    for (let i = 0; i < 22; i++) {
      const petal = document.createElement('i');
      container.append(petal);
      gsap.fromTo(petal, { x: (Math.random() - 0.5) * stage.clientWidth * 0.4, y: stage.clientHeight * 0.18, rotation: Math.random() * 180, opacity: 0 }, {
        x: (Math.random() - 0.5) * stage.clientWidth * 0.9, y: -stage.clientHeight * 0.5, rotation: Math.random() * 480,
        keyframes: { opacity: [0, 0.75, 0] }, duration: 3 + Math.random() * 2, delay: Math.random() * 0.8, ease: 'power1.out', onComplete: () => petal.remove()
      });
    }
  }
  function bloomPose() {
    const available = innerWidth <= 760 ? innerWidth * 1.04 : innerWidth * .72;
    const size = Math.min(available, bloomHeight() * .86 * 1215 / 1295);
    return { x: 0, y: 0, z: 0, scale: size / flight.offsetWidth, rotation: -1, rotationY: 0 };
  }
  function bloomHeight() { return Math.max(500, Math.min(980, innerHeight * .9)); }
  function fitBloomTail() {
    // The flowers may extend above their scene. Keep the stems clear of the
    // next chapter without changing the bouquet's scale or its focal point.
    section.style.setProperty('--bloom-tail', '0px');
    const extra = Math.max(0, Math.ceil(bouquet.getBoundingClientRect().bottom - section.getBoundingClientRect().bottom + 72));
    section.style.setProperty('--bloom-tail', `${extra}px`);
  }
  function frameBouquet() {
    const event = new CustomEvent('site:frame-scene', { cancelable: true, detail: { target: stage } });
    if (document.dispatchEvent(event)) {
      window.scrollTo({ top: scrollY + stage.getBoundingClientRect().top - innerHeight * .04, behavior: reduced() ? 'instant' : 'smooth' });
    }
  }
  async function openBloom() {
    if (bloomActive) return;
    bloomTimeline?.kill();
    bloomActive = true;
    stage.dataset.phase = 'revealing';
    await window.BouquetDepth?.ready;
    if (!bloomActive || stage.dataset.phase !== 'revealing') return;
    const recipient = document.querySelector('#bloom-recipient');
    recipient.textContent = nickname ? `给 ${nickname} / FOR ${nickname}` : '专属于你 / JUST FOR YOU';
    // The flowers inherit the kitten's exact on-page location, never a top layer.
    const catBounds = document.querySelector('#kitten-image').getBoundingClientRect();
    const stageBounds = stage.getBoundingClientRect();
    const originX = catBounds.left + catBounds.width * 0.5 - stageBounds.left - stage.clientWidth / 2;
    const originY = catBounds.top + catBounds.height * 0.68 - stageBounds.top - stage.clientHeight * (innerWidth <= 760 ? .39 : .43);
    bloom.hidden = false;
    bloom.inert = false;
    bloom.style.zIndex = '2';
    world.inert = true;
    controls.inert = true;
    section.classList.add('is-blooming');
    bouquetTouch.disabled = true;
    chime(0, true);
    if (window.BouquetDepth) window.BouquetDepth.open({ instant: reduced() });
    else petalShower();
    framing = true;
    frameBouquet();
    const finished = () => {
      stage.style.height = `${bloomHeight()}px`;
      gsap?.set(flight, bloomPose());
      fitBloomTail();
      stage.dataset.phase = 'complete';
      busy = false;
      framing = false;
      bouquetTouch.disabled = false;
      hint('慢慢往下，还有回忆在等你。', 'Scroll a little further. There is more for you.');
      // Announce the new content without moving the visitor or trapping focus.
      if (document.activeElement === cat || document.activeElement === document.body) {
        document.querySelector('#bloom-title').focus({ preventScroll: true });
      }
    };
    if (!gsap || reduced()) {
      bloom.style.zIndex = '5';
      stage.style.height = `${bloomHeight()}px`;
      if (gsap) {
        gsap.set(world, { scale: 0.9, opacity: 0 });
        gsap.set(flight, { xPercent: -50, yPercent: -50, ...bloomPose(), autoAlpha: 1 });
        gsap.set(message, { autoAlpha: 1, y: 0, z: 0 });
        gsap.set(next, { autoAlpha: 1, y: 0 });
      } else {
        world.style.opacity = '0';
        flight.style.transform = `translate(-50%,-50%) scale(${bloomPose().scale})`;
        next.style.opacity = '1';
        next.style.visibility = 'visible';
      }
      message.style.opacity = '1';
      message.style.visibility = 'visible';
      finished();
      window.ScrollTrigger?.refresh();
      return;
    }
    gsap.set(message, { autoAlpha: 0, y: 16, z: 0 });
    gsap.set(next, { autoAlpha: 0, y: 12 });
    gsap.set(flight, { xPercent: -50, yPercent: -50, x: originX + catBounds.width * .1, y: originY, z: 0, rotation: 24, scale: catBounds.width * .55 / flight.offsetWidth, autoAlpha: 1 });
    bloomTimeline = gsap.timeline({ defaults: { ease: 'power3.inOut' }, onComplete: () => { finished(); window.ScrollTrigger?.refresh(); } })
      .to(catSize, { x:-12, rotation:-2.5, duration:.42, ease:'power2.out' },0)
      .to(flight, { x:originX+catBounds.width*.57, y:originY-75, rotation:12, scale:catBounds.width*.72/flight.offsetWidth, duration:.48, ease:'power2.out' },0)
      .call(()=>{bloom.style.zIndex='5';},[],.46)
      .to(world, { x:-35, rotationY:-10, scale:.92, opacity:0, duration:.65 },.46)
      .to(stage, { height: bloomHeight(), duration: .85, onComplete: () => { if (framing) frameBouquet(); } }, 0)
      .to(flight, { ...bloomPose(), duration:1.1, ease:'power3.out' },.46)
      .to(message, { y: 0, autoAlpha: 1, duration: .6, ease: 'power2.out', onStart: () => { stage.dataset.phase = 'message'; } }, 1.7)
      .to(next, { y: 0, autoAlpha: 1, duration: .45, ease: 'power2.out' }, 2.35)
      .timeScale(1.25);
  }
  cat.addEventListener('click', () => {
    if (busy) return;
    if (bloomActive) return;
    catTween?.kill();
    count = Math.min(count + 1, 6);
    busy = count === 6;
    cat.disabled = busy;
    stage.dataset.clicks = String(count);
    steps.forEach((step, index) => step.classList.toggle('active', index < count));
    chime(count - 1);
    clickSparkles();
    if (count < 4) hint('再靠近一点点。', 'A little closer. I have something for you.');
    else if (count === 4) { stage.dataset.phase = 'close'; hint('到了！再轻轻点两下。', 'Here I am. Two more little taps.'); }
    else if (count === 5) hint('最后一下，闭上眼睛。', 'One more. Make a little wish.');
    else hint('这份温柔，送给你。', 'All this tenderness, just for you.');
    const finish = () => {
      if (gsap) gsap.set(catSize, { scale: currentScale() });
      if (count === 6) openBloom();
      else { busy = false; cat.disabled = false; }
    };
    if (!gsap || reduced()) {
      if (gsap) gsap.set(catSize, { scale: currentScale() });
      else catSize.style.transform = `scale(${currentScale()})`;
      finish();
    } else if (count <= 4) {
      catTween = gsap.to(catSize, { scale: currentScale(), duration: .24, ease: 'power2.out', overwrite: true, onComplete: finish });
    } else {
      catTween = gsap.timeline({ onComplete: finish }).to(catSize, { scale: cap() * 1.035, duration: .08, ease: 'power2.out' })
        .to(catSize, { scale: cap(), duration: .14, ease: 'power2.out' });
    }
  });
  document.querySelector('#bloom-replay').addEventListener('click', () => {
    const finish = () => { resetCat(); cat.focus({ preventScroll: true }); window.ScrollTrigger?.refresh(); };
    bloomTimeline?.kill();
    bloomPulse?.kill();
    window.BouquetDepth?.reset();
    if (!gsap || reduced()) { finish(); return; }
    busy = true;
    bouquetTouch.disabled = true;
    const baseHeight = innerWidth <= 390 ? 565 : innerWidth <= 760 ? 590 : 660;
    bloomTimeline = gsap.timeline({ defaults: { duration: .5, ease: 'power3.inOut' }, onComplete: finish })
      .to(message, { autoAlpha: 0, y: 15, duration: .2 }, 0)
      .to(flight, { scale: 0.18, z: -100, autoAlpha: 0 }, 0)
      .to(world, { x: 0, z: 0, rotationY: 0, opacity: 1 }, 0)
      .to(stage, { height: baseHeight }, 0);
  });
  bouquetTouch.addEventListener('click', () => {
    if (busy || bloomTapBusy) return;
    chime(4);
    if (window.BouquetDepth) { window.BouquetDepth.touch(); return; }
    petalShower();
    if (!gsap || reduced()) return;
    bloomTapBusy = true;
    bloomPulse = gsap.timeline({ onComplete: () => { bloomTapBusy = false; } })
      .to(bouquetTouch, { scale: 1.025, rotation: -1, duration: .14, ease: 'power2.out' })
      .to(bouquetTouch, { scale: 1, rotation: 0, duration: .38, ease: 'power2.out' });
  });
  const pointerMedia = matchMedia('(pointer: fine) and (prefers-reduced-motion: no-preference)');
  section.addEventListener('pointermove', event => {
    if (!gsap || !pointerMedia.matches || stage.dataset.phase !== 'complete' || !bloomActive) return;
    const bounds = stage.getBoundingClientRect();
    const x = Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1));
    const y = Math.max(-1, Math.min(1, (event.clientY - bounds.top) / bounds.height * 2 - 1));
    if (window.BouquetDepth) { window.BouquetDepth.pointer(x, y); return; }
    gsap.to(drift, { x: x * 12, y: y * 8, rotationY: x * 3, rotationX: -y * 2, duration: .6, ease: 'power3.out', overwrite: true });
    gsap.to(message, { x: -x * 3, rotationY: -x, duration: .7, ease: 'power3.out', overwrite: 'auto' });
  });
  function centerDepth() {
    if (window.BouquetDepth) { window.BouquetDepth.center(); return; }
    if (!gsap) return;
    gsap.to(drift, { x: 0, y: 0, rotationX: 0, rotationY: 0, duration: reduced() ? 0 : 0.8, overwrite: true });
    gsap.to(message, { x: 0, rotationY: 0, duration: reduced() ? 0 : 0.8, overwrite: 'auto' });
  }
  section.addEventListener('pointerleave', centerDepth);
  pointerMedia.addEventListener('change', centerDepth);
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', event => {
    if (!event.matches) return;
    catTween?.progress(1);
    if (bloomActive && busy) bloomTimeline?.progress(1);
    bloomPulse?.progress(1);
    const petals = bloom.querySelector('.bloom-petals');
    gsap?.killTweensOf(petals.children);
    petals.replaceChildren();
    centerDepth();
  });
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (busy) return;
      if (bloomActive) {
        stage.style.height = `${bloomHeight()}px`;
        gsap?.set(flight, bloomPose());
        fitBloomTail();
        centerDepth();
        window.ScrollTrigger?.refresh();
        return;
      }
      if (gsap) gsap.set(catSize, { scale: currentScale() });
      else catSize.style.transform = `scale(${currentScale()})`;
    }, 120);
  });
  resetCat();
  bouquet.decode?.().catch(() => {});
  // The birthday candles come first; a preset name makes the invitation unnecessary.
  const presetName = window.Birthday?.name;
  if (presetName) nickname = presetName;
  if (!entered) (window.Birthday?.introDone ?? Promise.resolve()).then(() => {
    if (!presetName) { openInvitation(); return; }
    try { sessionStorage.setItem('520am-entered', 'yes'); } catch { /* Optional. */ }
    document.dispatchEvent(new Event('site:entered'));
  });
})();
