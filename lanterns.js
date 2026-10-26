/* Twenty-four sky lanterns, one wish each, rising into the shared night before the cake. */
(() => {
  'use strict';
  const section = document.querySelector('#lanterns');
  if (!section) return;
  const stage = section.querySelector('#lantern-stage');
  const field = section.querySelector('.lantern-field');
  const wishText = section.querySelector('#lantern-wish');
  const count = section.querySelector('#lantern-count');
  const release = section.querySelector('#lantern-release');
  const reducedMedia = matchMedia('(prefers-reduced-motion: reduce)');
  const reduced = () => reducedMedia.matches;
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
  let released = 0;

  // A deterministic field of faint stars behind the lanterns.
  const stars = section.querySelector('.lantern-stars');
  for (let i = 0; i < 46; i++) {
    const star = document.createElement('i');
    star.style.cssText = `--x:${(i * 37 + 9) % 100}%;--y:${(i * 23 + 5) % 72}%;--size:${i % 7 ? 1.5 : 2.5}px;--delay:${-i * .6}s`;
    stars.append(star);
  }

  function lanternElement(depth) {
    const lantern = document.createElement('span');
    lantern.className = 'lantern';
    lantern.style.setProperty('--depth', depth.toFixed(2));
    lantern.innerHTML = '<span class="lantern-bob"><i class="lantern-body"></i></span>';
    return lantern;
  }
  // The newest wish stays until the next lantern replaces it.
  function showWish(text) {
    wishText.textContent = text;
    wishText.classList.remove('is-shown');
    void wishText.offsetWidth;
    wishText.classList.add('is-shown');
  }
  function launch(xRatio) {
    if (released >= total) return;
    const index = released++;
    const width = stage.clientWidth, height = stage.clientHeight;
    // Later lanterns fly a little further away: smaller, higher, softer.
    const depth = 1 - .55 * (index / (total - 1)) * (.6 + Math.random() * .4);
    const x = Math.max(.06, Math.min(.94, xRatio ?? (.12 + Math.random() * .76))) * width;
    const restX = x + (Math.random() - .5) * width * .18;
    const restY = height * (.08 + (1 - depth) * .2 + Math.random() * .34);
    const lantern = lanternElement(depth);
    field.append(lantern);
    const end = `translate(${restX}px, ${restY}px) scale(${depth})`;
    if (reduced() || typeof lantern.animate !== 'function') {
      lantern.style.transform = end;
    } else {
      lantern.animate([
        { transform:`translate(${x}px, ${height + 40}px) scale(${Math.min(1.25, depth + .35)})`, opacity:0 },
        { opacity:1, offset:.12 },
        { transform:end, opacity:1 }
      ], { duration:5200 + Math.random() * 2200, easing:'cubic-bezier(.22,.6,.3,1)', fill:'forwards' });
    }
    showWish(wishes[index]);
    count.textContent = `${released} / ${total}`;
    section.dataset.lanterns = String(released);
    if (released === total) {
      section.classList.add('is-complete');
      release.disabled = true;
      release.firstChild.textContent = '二十四盏，都飞起来了 ';
      setTimeout(() => showWish('二十四盏灯，照亮你的二十四岁。'), reduced() ? 0 : 1600);
    }
  }
  stage.addEventListener('click', event => {
    const bounds = stage.getBoundingClientRect();
    launch((event.clientX - bounds.left) / bounds.width);
  });
  release.addEventListener('click', () => launch());
  // Pause the idle bobbing while the scene is off screen.
  new IntersectionObserver(entries => {
    section.classList.toggle('lanterns-resting', !entries[0].isIntersecting);
  }, { rootMargin:'80px' }).observe(section);
})();
