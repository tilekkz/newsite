/* Local botanical assets; reveal from the music button, then continue into the ribbon. */
(() => {
  'use strict';
  const root=document.documentElement;
  const section=document.querySelector('#blue-hour');
  const buttonStage=section?.querySelector('.blue-button-stage');
  if(!buttonStage)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const sources={
    canopy:{src:'assets/garden-canopy-v2.webp',width:1774,height:887},
    vine:{src:'assets/garden-vine-v2.webp',width:1942,height:809},
    spray:{src:'assets/garden-spray-hd.webp',width:1312,height:1199}
  };
  let preparing=false, ready=Promise.resolve(), washGrow;
  const observers='IntersectionObserver' in window?new IntersectionObserver(entries=>{
    entries.forEach(({target,isIntersecting})=>{
      target.classList.toggle('plant-in-view',isIntersecting);
      if(isIntersecting)target.classList.add('plant-seen');
    });
  },{threshold:.01}):null;
  function createImage(kind){
    const source=sources[kind], image=new Image();
    image.alt='';image.decoding='async';image.draggable=false;
    image.width=source.width;image.height=source.height;
    image.dataset.gardenSrc=source.src;
    image.addEventListener('error',()=>image.classList.add('garden-image-unavailable'),{once:true});
    if(preparing)image.src=source.src;
    return image;
  }
  function prepare(){
    if(preparing)return ready;
    preparing=true;
    const loads=Object.values(sources).map(source=>{
      const preload=new Image();preload.src=source.src;return preload.decode();
    });
    document.querySelectorAll('[data-garden-src]').forEach(image=>{image.src=image.dataset.gardenSrc});
    ready=Promise.allSettled(loads);
    return ready;
  }
  function watch(plant){
    if(observers)observers.observe(plant);
    else plant.classList.add('plant-in-view','plant-seen');
  }
  const garden=document.createElement('div');
  garden.className='button-garden';garden.setAttribute('aria-hidden','true');
  const canopy=document.createElement('div');canopy.className='button-canopy';
  const sway=document.createElement('div');sway.className='garden-sway';
  sway.append(createImage('canopy'));canopy.append(sway);garden.append(canopy);
  const attachment=document.createElement('i');attachment.className='garden-attachment';garden.append(attachment);
  for(let i=0;i<10;i++){
    const mote=document.createElement('i');
    mote.className='garden-mote';
    mote.style.cssText='--x:'+(8+(i*29)%85)+'%;--y:'+(20+(i*19)%60)+'%;--delay:'+(-i*.9)+'s;--duration:'+(5+i%4)+'s';
    garden.append(mote);
  }
  buttonStage.prepend(garden);
  const halo=document.createElement('div');halo.className='garden-button-glow';halo.setAttribute('aria-hidden','true');buttonStage.prepend(halo);
  function setTheme(theme){
    const blue=theme==='ocean';

    root.classList.toggle('garden-awake',blue);
    if(blue)prepare();
    document.dispatchEvent(new CustomEvent('garden:theme',{detail:{blue}}));
  }
  function paintWash(wash){
    if(reduced.matches)return;
    const bounds=garden.getBoundingClientRect();
    const clone=garden.cloneNode(true);
    clone.classList.add('garden-wash-copy');
    clone.style.cssText='position:absolute;left:'+bounds.left+'px;top:'+bounds.top+'px;width:'+bounds.width+'px;height:'+bounds.height+'px;transform:none;opacity:1;view-transition-name:none;';
    const button=section.querySelector('#blue-play'), buttonBounds=button.getBoundingClientRect();
    clone.style.setProperty('--button-clearance',buttonBounds.width/2+'px');
    Object.assign(clone.style,{maskImage:'radial-gradient(ellipse at 50.3% 0%,#000 57%,transparent 76%)',maskRepeat:'no-repeat',maskPosition:'50.3% 0%'});
    wash.append(clone);
    // Preserve the visual attachment while the fallback color layer covers the page.
    const buttonEcho=button.cloneNode(true);
    buttonEcho.removeAttribute('id');buttonEcho.tabIndex=-1;buttonEcho.inert=true;
    buttonEcho.setAttribute('aria-hidden','true');
    buttonEcho.classList.add('garden-button-echo');
    buttonEcho.style.cssText='position:absolute;left:'+buttonBounds.left+'px;top:'+buttonBounds.top+'px;width:'+buttonBounds.width+'px;height:'+buttonBounds.height+'px;transform:none;pointer-events:none;z-index:2;';
    wash.append(buttonEcho);
    washGrow=clone.animate([
      {maskSize:'0% 0%'},
      {maskSize:'250% 250%'}
    ],{duration:1700,easing:'cubic-bezier(.4,0,.3,1)'});
  }
  const endMotion=()=>{washGrow?.finish();washGrow=null;};
  reduced.addEventListener('change',()=>{if(reduced.matches)endMotion()});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)endMotion()});
  section.querySelector('#blue-play').addEventListener('pointerenter',prepare,{once:true});
  section.querySelector('#blue-play').addEventListener('focus',prepare,{once:true});
  window.NightMotion?.whenNear(section,prepare,'1000px');
  window.MoonGarden={createImage,prepare,watch,setTheme,paintWash,get ready(){return ready}};
  setTheme(root.dataset.theme);

  // Delicate local light lives behind each chapter, never over the copy.
  for(const id of ['surprise','starlight','last-letter','tomorrow-postcard','two-windows']){
    const scene=document.getElementById(id);if(!scene)continue;
    scene.classList.add('has-night-garden');
    const air=document.createElement('div');air.className='scene-garden-air';air.setAttribute('aria-hidden','true');
    for(let i=0;i<6;i++){
      const light=document.createElement('i');
      light.className='scene-firefly';
      light.style.cssText='--x:'+(6+(i*37)%89)+'%;--y:'+(12+(i*23)%78)+'%;--delay:'+(-i*2.3)+'s;--duration:'+(9+i*2)+'s';
      air.append(light);
    }
    scene.prepend(air);
  }
})();