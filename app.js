(() => {
  'use strict';

  const letters = [
    { zh: '想念的时候。', en: 'When you miss someone.', paragraphs: [['有时候，只想安静地坐在你身边。不必寻找话题，也不用看时间。知道你在，就已经很好。', 'Sometimes I just want to sit beside you. No conversation to find, no clock to watch. Knowing you are here is enough.'], ['如果此刻我们相隔很远，就让这封信做一座小小的桥。放起那首歌，想象我正陪你一起听。', 'If there are miles between us tonight, let this little letter be a bridge. Play our song. Imagine I am listening right beside you.']] },
    { zh: '睡不着的时候。', en: 'When sleep won’t come.', paragraphs: [['也许，夜晚是留给那些白天羞于说出口的心事的。愿今晚的念头，都对你温柔一点。', 'Perhaps the night is for thoughts too shy to speak in daylight. May tonight’s thoughts be gentle with you.'], ['那些让你疲惫的事，可以先放一放。如果拥抱可以寄出，它此刻就在这封信里。晚安。', 'You can put the difficult things down for a while. If a hug could travel in a letter, it would be right here. Sleep softly.']] },
    { zh: '只是因为你。', en: 'Just because you’re you.', paragraphs: [['好听的话，不一定要等特别的日子。只是平凡的一天里，突然想起了你。', 'Kind words do not need a special date. Sometimes the best occasion is simply thinking of you in the middle of an ordinary day.'], ['喜欢这个世界上有一个你。有你的笑声，有你喜欢的小事，也有被你悄悄变特别的每个瞬间。', 'I like that somewhere in this enormous world, there is you. Your laugh, your little favourites, and your way of making ordinary moments feel special.']] }
  ];

  const dialog = document.querySelector('#letter-dialog');
  let letterTrigger;

  function openLetter(index, trigger) {
    const letter = letters[index];
    if (!letter) return;
    letterTrigger = trigger;
    document.querySelector('#letter-number').textContent = `第 0${index + 1} 封信 / ONLY FOR YOU`;
    const zhTitle = document.createElement('span');
    zhTitle.textContent = letter.zh;
    zhTitle.className = 'zh';
    const enTitle = document.createElement('em');
    enTitle.textContent = letter.en;
    enTitle.lang = 'en';
    document.querySelector('#letter-title').replaceChildren(zhTitle, enTitle);
    const body = document.querySelector('#letter-body');
    body.replaceChildren(...letter.paragraphs.flatMap(([zh, en]) => [zh, en].map((text, language) => {
      const paragraph = document.createElement('p');
      paragraph.textContent = text;
      paragraph.className = language ? 'letter-en' : 'letter-zh';
      paragraph.lang = language ? 'en' : 'zh-Hans';
      return paragraph;
    })));
    dialog.showModal();
    dialog.scrollTop = 0;
    document.body.classList.add('dialog-open');
    dialog.dispatchEvent(new Event('site:modal-open'));
  }

  function closeLetter() {
    dialog.close();
  }

  document.querySelectorAll('[data-letter]').forEach(button => {
    button.addEventListener('click', () => openLetter(Number(button.dataset.letter), button));
  });
  document.querySelector('.letter-close').addEventListener('click', closeLetter);
  document.querySelector('.letter-done').addEventListener('click', () => {
    closeLetter();
    document.querySelector('#announcement').textContent = '愿这封信陪着你。 / Keep this little letter close.';
  });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeLetter();
  });
  dialog.addEventListener('close', () => {
    if (!document.querySelector('dialog[open]')) document.body.classList.remove('dialog-open');
    dialog.dispatchEvent(new Event('site:modal-close'));
    letterTrigger?.focus({ preventScroll: true });
  });

  const audio = document.querySelector('#background-music');
  const musicButton = document.querySelector('[data-music-toggle]');
  const musicLabel = musicButton.querySelector('.music-toggle-label');
  const musicStatus = document.querySelector('#music-status');
  let wantsPlayback = false;
  let playAttempt = 0;
  audio.volume = 0.3;

  function updateMusicState(state) {
    const playing = state === 'playing';
    const loading = state === 'loading';
    const failed = state === 'error';
    document.body.classList.toggle('is-playing', playing);
    musicButton.dataset.state = state;
    musicButton.setAttribute('aria-pressed', String(playing));
    musicButton.setAttribute('aria-busy', String(loading));
    musicLabel.textContent = playing ? '关闭音乐 / Music off' : loading ? '连接中 / Tuning in…' : failed ? '再试一次 / Try again' : '播放音乐 / Music on';
    musicButton.setAttribute('aria-label', loading ? '取消 / Cancel music' : playing ? '关闭音乐 / Pause music' : failed ? '重试 / Retry music' : '播放音乐 / Play music');
    musicButton.title = failed ? '请再试一次 / Please try again.' : '5:20AM — 刀酱';
    musicStatus.textContent = failed ? '暂时无法播放 / Music could not be played.' : playing ? '正在播放 / Playing 5:20AM — 刀酱' : loading ? '连接中 / Loading music.' : '音乐已暂停 / Music paused.';
  }

  async function toggleMusic() {
    const attempt = ++playAttempt;
    if (wantsPlayback || !audio.paused) {
      wantsPlayback = false;
      audio.pause();
      updateMusicState('off');
      return;
    }
    wantsPlayback = true;
    updateMusicState('loading');
    try {
      if (audio.error) audio.load();
      await audio.play();
      if (!wantsPlayback) audio.pause();
    } catch (error) {
      if (attempt !== playAttempt) return;
      wantsPlayback = false;
      updateMusicState(error.name === 'AbortError' ? 'off' : 'error');
    }
  }

  musicButton.addEventListener('click', toggleMusic);
  audio.addEventListener('playing', () => {
    if (wantsPlayback) updateMusicState('playing');
    else audio.pause();
  });
  audio.addEventListener('pause', () => {
    if (!audio.paused) return;
    wantsPlayback = false;
    updateMusicState(audio.error ? 'error' : 'off');
  });
  audio.addEventListener('waiting', () => {
    if (wantsPlayback) updateMusicState('loading');
  });
  audio.addEventListener('error', () => {
    wantsPlayback = false;
    updateMusicState('error');
  });
})();
