(() => {
  'use strict';

  const root = document.documentElement;
  const dialogs = [...document.querySelectorAll('dialog')];
  const { gsap, ScrollTrigger, Lenis } = window;

  function attachFallbackReveals() {
    if (!('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -22% 0px' });
    document.querySelectorAll('.reveal').forEach(element => observer.observe(element));
    root.classList.add('js-ready');
  }

  if (!gsap || !ScrollTrigger) {
    attachFallbackReveals();
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  gsap.ticker.lagSmoothing(0);
  const media = gsap.matchMedia();
  let introPlayed = false;

  media.add({
    desktop: '(min-width: 761px) and (pointer: fine)',
    mobile: '(max-width: 760px), (pointer: coarse)',
    reduced: '(prefers-reduced-motion: reduce)'
  }, context => {
    const { desktop, reduced } = context.conditions;
    if (reduced) {
      root.classList.remove('motion-ready', 'motion-smooth');
      return;
    }

    let lenis;
    let tick;
    if (desktop && Lenis) {
      lenis = new Lenis({
        autoRaf: false,
        lerp: 0.085,
        smoothWheel: true,
        syncTouch: false,
        wheelMultiplier: 0.9,
        anchors: false,
        stopInertiaOnNavigate: false,
        prevent: node => Boolean(node.closest?.('dialog'))
      });
      tick = seconds => lenis.raf(seconds * 1000);
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(tick);
      root.classList.add('motion-smooth');
    }

    root.classList.add('motion-ready');
    const amount = desktop ? 1 : 0.42;

    // The parent owns parallax; its children own their entrance animations.
    gsap.fromTo('.hero-art img',
      { yPercent: 0, scale: desktop ? 1.16 : 1.1 },
      { yPercent: desktop ? 7 : 4, scale: desktop ? 1.18 : 1.1, ease: 'none',
        scrollTrigger: { id: 'hero-depth', trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.9, invalidateOnRefresh: true } });
    gsap.fromTo('.hero-copy', { y: 0 }, {
      y: -64 * amount,
      ease: 'none',
      scrollTrigger: { id: 'hero-copy-depth', trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.7, invalidateOnRefresh: true }
    });
    gsap.fromTo('.night-dust i', { autoAlpha: 0.12 }, {
      y: index => -(55 + index * 16) * amount,
      autoAlpha: 0.45,
      ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1.2 }
    });

    let introTween;
    function playIntro() {
      if (introPlayed) return;
      introPlayed = true;
      if (window.scrollY >= 80) return;
      introTween = gsap.from('.hero-copy > *', {
        y: 22, autoAlpha: 0, duration: 1.25, stagger: 0.12, ease: 'power3.out', clearProps: 'transform,opacity,visibility'
      });
    }
    document.addEventListener('site:entered', playIntro);
    if (!document.querySelector('#entry-gate')?.open) playIntro();

    document.querySelectorAll('.reveal').forEach(element => {
      // Rebuilding on resize must not hide content the visitor has already read.
      if (element.dataset.motionSeen === 'true' || element.getBoundingClientRect().top < innerHeight * 0.78) {
        element.dataset.motionSeen = 'true';
        return;
      }
      gsap.from(element, {
        y: element.matches('.envelope-item') ? 45 : 28,
        autoAlpha: 0,
        duration: 1.3,
        ease: 'power2.out',
        delay: element.matches('.envelope-item') && desktop ? Number(element.dataset.letter) * 0.12 : 0,
        clearProps: 'transform,opacity,visibility',
        scrollTrigger: {
          trigger: element, start: 'clamp(top 78%)', once: true,
          onEnter: () => { element.dataset.motionSeen = 'true'; }
        }
      });
    });

    gsap.fromTo('.cat-side-note', { y: 25 * amount }, {
      y: -35 * amount, ease: 'none',
      scrollTrigger: { trigger: '.cat-section', start: 'top bottom', end: 'bottom top', scrub: 1.2 }
    });
    gsap.fromTo('.cat-background-word', { y: 30 * amount }, {
      y: -65 * amount, ease: 'none',
      scrollTrigger: { trigger: '.cat-section', start: 'top bottom', end: 'bottom top', scrub: 1.4 }
    });
    // The continuous photo trail shares this context and the existing Lenis clock.
    const cleanupJourney = window.MemoryJourney?.animate({ gsap, ScrollTrigger, desktop });
    window.Afterglow?.animate({ gsap, ScrollTrigger, desktop });
    window.ContinuationScenes?.animate({ gsap, ScrollTrigger, desktop });

    gsap.fromTo('.closing-heart', { y: 20 * amount, scale: 0.92 }, {
      y: -12 * amount, scale: 1.06, ease: 'none',
      scrollTrigger: { trigger: '.closing', start: 'top bottom', end: 'bottom top', scrub: 1 }
    });

    function followAnchor(event) {
      if (!lenis || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target.closest('a[href^="#"]');
      if (!link) return;
      const hash = link.getAttribute('href');
      const target = document.getElementById(hash.slice(1));
      if (!target) return;
      event.preventDefault();
      if (location.hash !== hash) history.pushState(null, '', hash);
      lenis.scrollTo(target, {
        offset: 0, duration: 1.35, lerp: 0,
        easing: progress => 1 - Math.pow(1 - progress, 4),
        onComplete: () => {
          if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
          target.focus({ preventScroll: true });
        }
      });
    }

    function followHistory() {
      if (!lenis) return;
      const target = document.getElementById(location.hash.slice(1));
      lenis.scrollTo(target || 0, { immediate: true, offset: 0 });
    }

    function frameScene(event) {
      if (!lenis) return;
      event.preventDefault();
      lenis.scrollTo(event.detail.target, {
        offset: -innerHeight * .04, duration: .85, lerp: 0,
        easing: progress => 1 - Math.pow(1 - progress, 3)
      });
    }

    function openLetter(event) {
      lenis?.stop();
      const dialog = event.currentTarget;
      if (dialog.id !== 'letter-dialog') return;
      gsap.fromTo(dialog, { autoAlpha: 0, y: 16, scale: 0.98 }, {
        autoAlpha: 1, y: 0, scale: 1, duration: 0.5, ease: 'power3.out', overwrite: true,
        clearProps: 'transform,opacity,visibility'
      });
    }

    function closeLetter(event) {
      const dialog = event.currentTarget;
      gsap.killTweensOf(dialog);
      gsap.set(dialog, { clearProps: 'transform,opacity,visibility' });
      if (!dialogs.some(modal => modal.open)) lenis?.start();
    }

    document.addEventListener('click', followAnchor);
    document.addEventListener('site:frame-scene', frameScene);
    window.addEventListener('hashchange', followHistory);
    dialogs.forEach(dialog => {
      dialog.addEventListener('site:modal-open', openLetter);
      dialog.addEventListener('site:modal-close', closeLetter);
    });
    if (dialogs.some(dialog => dialog.open)) lenis?.stop();

    return () => {
      cleanupJourney?.();
      document.removeEventListener('click', followAnchor);
      document.removeEventListener('site:frame-scene', frameScene);
      window.removeEventListener('hashchange', followHistory);
      document.removeEventListener('site:entered', playIntro);
      introTween?.kill();
      gsap.set('.hero-copy > *', { clearProps: 'transform,opacity,visibility' });
      dialogs.forEach(dialog => {
        dialog.removeEventListener('site:modal-open', openLetter);
        dialog.removeEventListener('site:modal-close', closeLetter);
        gsap.killTweensOf(dialog);
        gsap.set(dialog, { clearProps: 'transform,opacity,visibility' });
      });
      if (lenis) {
        gsap.ticker.remove(tick);
        lenis.off('scroll', ScrollTrigger.update);
        lenis.destroy();
      }
      root.classList.remove('motion-ready', 'motion-smooth');
    };
  });

  const refresh = () => ScrollTrigger.refresh();
  document.fonts?.ready.then(refresh);
  document.fonts?.addEventListener('loadingdone', refresh);
  if (document.readyState === 'complete') refresh();
  else window.addEventListener('load', refresh, { once: true });
  window.addEventListener('pageshow', refresh);
})();
