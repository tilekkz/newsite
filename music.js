(() => {
  'use strict';

  // The ocean entry is an AAC stream copy starting at 15.5s of the user's video.
  // Keep the full extraction alongside it; native looping uses the entry file.
  const tracks = {
    rose: { title:'5:20AM — 刀酱', src:'assets/520am.mp3', available:true },
    ocean: { title:'特別的人 — Khalil Fong', src:'assets/special-person-entry.m4a', available:true }
  };
  const LEVEL = .3, CROSSFADE = 2400, FADE_IN = 800, FADE_OUT = 220;
  const button = document.querySelector('[data-music-toggle]');
  const label = button.querySelector('.music-toggle-label');
  const status = document.querySelector('#music-status');
  const players = { rose:document.querySelector('#background-music'), ocean:new Audio() };
  const levels = { rose:0, ocean:0 };
  const gains = {};
  let context;
  let selected = 'rose', state = 'off', reason = null;
  let wantsPlayback = false, attempt = 0, readyAttempt = -1;
  let loadingTimer, mixTimer, mixFrame, envelope;

  function snapshot() {
    return { state, reason, track:selected, title:tracks[selected].title,
      available:tracks[selected].available, preview:false };
  }
  function update(next, error = null) {
    state = next;
    reason = error;
    const playing = state === 'playing', loading = state === 'loading';
    const missing = reason === 'missing-file';
    document.body.classList.toggle('is-playing', playing);
    button.dataset.state = state;
    button.dataset.track = selected;
    button.setAttribute('aria-pressed', String(playing));
    button.setAttribute('aria-busy', String(loading));
    label.textContent = playing ? '关闭音乐 / Music off' : loading ? '加载中 / Loading…'
      : missing ? '歌曲准备中 / Song coming soon' : state === 'error' ? '再试一次 / Try again' : '播放音乐 / Music on';
    button.setAttribute('aria-label', loading ? '取消 / Cancel music' : playing ? '关闭音乐 / Pause music'
      : missing ? '歌曲准备中 / Song coming soon' : '播放音乐 / Play music');
    button.title = tracks[selected].title;
    status.textContent = missing ? '这首歌还没有准备好。 / This song is not available yet.'
      : state === 'error' ? '暂时无法播放，轻点再试。 / Music could not play. Tap to retry.'
      : playing ? `正在播放 / Playing ${tracks[selected].title}`
      : loading ? '正在加载音乐。 / Loading music.' : '音乐已暂停 / Music paused.';
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = playing ? 'playing' : state === 'off' ? 'paused' : 'none';
    }
    document.dispatchEvent(new CustomEvent('site:music-state', { detail:snapshot() }));
  }
  function mediaTitle() {
    if ('MediaMetadata' in window && 'mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title:selected === 'rose' ? '5:20AM' : '特別的人',
        artist:selected === 'rose' ? '刀酱' : 'Khalil Fong',
        album:selected === 'ocean' ? 'Dangerous World' : ''
      });
    }
  }
  function curveLevel(from, to, progress) {
    const t = Math.max(0, Math.min(1, progress));
    const eased = (1 - Math.cos(Math.PI * t)) / 2;
    return Math.sqrt(Math.max(0, from * from + (to * to - from * from) * eased));
  }
  function levelNow(track) {
    return envelope ? curveLevel(envelope.from[track], envelope.to[track],
      (performance.now() - envelope.start) / envelope.duration) : levels[track];
  }
  function setLevel(track, value) {
    levels[track] = value;
    if (gains[track]) {
      const gain = gains[track].gain;
      gain.cancelScheduledValues(context.currentTime);
      gain.setValueAtTime(value, context.currentTime);
    } else players[track].volume = value;
  }
  function freezeMix() {
    const held = Object.fromEntries(Object.keys(players).map(track => [track, levelNow(track)]));
    clearTimeout(mixTimer);
    cancelAnimationFrame(mixFrame);
    envelope = null;
    Object.entries(held).forEach(([track, value]) => setLevel(track, value));
  }
  function prepareMixer() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!context && AudioContext) {
      // Resume in the click handler before audio.play(), including Safari.
      try { context = new AudioContext(); } catch (_) { /* Native volume fallback. */ }
      if (context) Object.entries(players).forEach(([track, player]) => {
        let source;
        try {
          const gain = context.createGain();
          gain.gain.value = levels[track];
          gain.connect(context.destination);
          source = context.createMediaElementSource(player);
          source.connect(gain);
          gains[track] = gain;
          player.volume = 1;
        } catch (_) {
          // Captured media must remain connected even if gain setup failed.
          if (source) { source.disconnect(); source.connect(context.destination); }
          player.volume = levels[track];
        }
      });
    }
    return context && context.state !== 'running' && context.state !== 'closed'
      ? context.resume() : Promise.resolve();
  }
  function blendTo(track, duration) {
    freezeMix();
    const to = Object.fromEntries(Object.keys(players).map(key => [key, key === track ? LEVEL : 0]));
    envelope = { from:{ ...levels }, to, start:performance.now(), duration };
    const currentEnvelope = envelope;
    Object.keys(players).forEach(key => {
      if (!gains[key]) return;
      const curve = Float32Array.from({ length:121 }, (_, index) =>
        curveLevel(levels[key], to[key], index / 120));
      gains[key].gain.setValueCurveAtTime(curve, context.currentTime, duration / 1000);
    });
    if (Object.keys(gains).length < Object.keys(players).length) {
      const tick = () => {
        if (envelope !== currentEnvelope) return;
        Object.keys(players).forEach(key => { if (!gains[key]) players[key].volume = levelNow(key); });
        mixFrame = requestAnimationFrame(tick);
      };
      tick();
    }
    mixTimer = setTimeout(() => {
      if (envelope !== currentEnvelope) return;
      freezeMix();
      Object.keys(players).forEach(key => {
        setLevel(key, to[key]);
        if (key !== track) players[key].pause();
      });
    }, duration + 30);
  }
  function clearLoading() { clearTimeout(loadingTimer); loadingTimer = null; }
  function otherPlaying() {
    return Object.keys(players).find(track => track !== selected &&
      !players[track].paused && levelNow(track) > .001);
  }
  function fail(error) {
    ++attempt;
    clearLoading();
    freezeMix();
    const failed = selected, fallback = otherPlaying();
    // Change state before pause() emits its media event.
    wantsPlayback = false;
    setLevel(failed, 0);
    players[failed].pause();
    if (fallback) {
      selected = fallback;
      wantsPlayback = true;
      readyAttempt = attempt;
      blendTo(fallback, FADE_IN);
      update('playing', error);
      mediaTitle();
    } else update('error', error);
  }
  function watchLoading() {
    if (loadingTimer) return;
    const ticket = attempt;
    loadingTimer = setTimeout(() => {
      loadingTimer = null;
      if (ticket === attempt && wantsPlayback) fail('timeout');
    }, 20000);
  }
  function pause(immediate = false) {
    ++attempt;
    wantsPlayback = false;
    clearLoading();
    if (immediate) {
      freezeMix();
      Object.keys(players).forEach(track => { setLevel(track, 0); players[track].pause(); });
    } else blendTo(null, FADE_OUT);
    update('off');
  }
  function select(track) {
    if (!Object.hasOwn(tracks, track) || selected === track) return;
    pause(true);
    selected = track;
    update('off');
  }
  async function play(track = selected) {
    if (!Object.hasOwn(tracks, track)) return;
    if (track === selected && wantsPlayback && state === 'playing') return;
    const ticket = ++attempt;
    clearLoading();
    freezeMix();
    selected = track;
    wantsPlayback = true;
    if (!tracks[track].available) { fail('missing-file'); return; }
    Object.keys(players).forEach(key => {
      if (key !== track && levels[key] < .001) players[key].pause();
    });
    const player = players[track];
    update('loading');
    watchLoading();
    if (!player.getAttribute('src')) player.src = tracks[track].src;
    if (player.error) player.load();
    try {
      const mixerReady = prepareMixer();
      // Start both synchronously so the user gesture survives on Safari.
      const playbackReady = player.play();
      await Promise.all([mixerReady, playbackReady]);
      if (ticket !== attempt || !wantsPlayback) return;
      clearLoading();
      readyAttempt = ticket;
      blendTo(track, otherPlaying() ? CROSSFADE : FADE_IN);
      update('playing');
      mediaTitle();
    } catch (error) {
      if (ticket !== attempt || !wantsPlayback) return;
      fail(error.name === 'NotAllowedError' ? 'gesture' : 'media');
    }
  }
  function toggle() {
    if (state === 'playing' || state === 'loading') pause();
    else play();
  }
  Object.entries(players).forEach(([track, player]) => {
    player.volume = 0;
    player.loop = true;
    player.preload = 'none';
    player.addEventListener('playing', () => {
      // The initial play promise owns the first blend; this handles buffering.
      if (!wantsPlayback || selected !== track || readyAttempt !== attempt) return;
      if (state === 'loading') {
        clearLoading();
        blendTo(track, otherPlaying() ? CROSSFADE : FADE_IN);
        update('playing');
      }
    });
    player.addEventListener('pause', () => {
      if (selected !== track || !player.paused || state !== 'playing' || !wantsPlayback) return;
      pause();
    });
    player.addEventListener('waiting', () => {
      if (selected !== track || !wantsPlayback) return;
      // Keep the outgoing track audible if the incoming buffer stalls.
      if (readyAttempt === attempt && otherPlaying()) freezeMix();
      update('loading');
      watchLoading();
    });
    player.addEventListener('error', () => {
      if (selected === track && wantsPlayback && player.error) fail('media');
    });
  });
  button.addEventListener('click', toggle);
  window.addEventListener('pagehide', () => pause(true));
  window.SiteMusic = { play, pause:() => pause(), select, toggle, snapshot };
  if ('mediaSession' in navigator) {
    for (const [action, handler] of Object.entries({ play:() => play(), pause:() => pause() })) {
      try { navigator.mediaSession.setActionHandler(action, handler); } catch (_) { /* Optional OS controls. */ }
    }
  }
  update('off');
})();
