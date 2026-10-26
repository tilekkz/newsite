(() => {
  'use strict';
  const atmosphere = document.createElement('div');
  atmosphere.className = 'night-atmosphere';
  atmosphere.setAttribute('aria-hidden', 'true');
  atmosphere.innerHTML = '<div class="night-air"></div><div class="night-air"></div><div class="night-veil"></div><div class="night-lens night-lens-one"></div><div class="night-lens night-lens-two"></div><div class="night-filament"></div>';
  for (let i = 0; i < 22; i++) {
    const speck = document.createElement('i');
    speck.className = 'night-speck';
    speck.style.cssText = `--x:${(i * 47 + 11) % 100}%;--y:${(i * 31 + 7) % 100}%;--size:${i % 6 ? 1.5 : 2.5}px;--delay:${-i * 1.7}s;--duration:${14 + i % 8}s`;
    atmosphere.append(speck);
  }
  document.body.prepend(atmosphere);
  let paused=false;
  try{paused=localStorage.getItem('520am-atmosphere-paused')==='yes'}catch{}
  const toggle=document.createElement('button');
  toggle.type='button';toggle.className='atmosphere-toggle';toggle.textContent='✧';
  document.body.append(toggle);
  const pauseAtmosphere = () => document.documentElement.classList.toggle('atmosphere-resting', paused || document.hidden || Boolean(document.querySelector('dialog[open]')));
  for (const type of ['site:modal-open','site:modal-close']) document.addEventListener(type, pauseAtmosphere, true);
  document.addEventListener('visibilitychange', pauseAtmosphere);
  function updateToggle(){
    toggle.setAttribute('aria-pressed',String(paused));
    toggle.setAttribute('aria-label',paused?'恢复动态氛围':'暂停动态氛围');
    toggle.title=paused?'恢复动态氛围':'暂停动态氛围';
    pauseAtmosphere();
  }
  toggle.addEventListener('click',()=>{
    paused=!paused;
    try{localStorage.setItem('520am-atmosphere-paused',paused?'yes':'no')}catch{}
    updateToggle();
  });
  updateToggle();
})();
