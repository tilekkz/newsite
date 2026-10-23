(() => {
 'use strict';
 const water=document.querySelector('#harbor-water'),turn=document.querySelector('#postcard-turn');
 if(!water||!turn)return;
 const gsap=window.gsap,preference=matchMedia('(prefers-reduced-motion: reduce)');
 const reduced=()=>preference.matches;
 const flight=document.querySelector('#boat-flight'),boat=document.querySelector('#paper-boat'),send=document.querySelector('#harbor-send');
 const options=[...document.querySelectorAll('[data-wish]')];
 const wishes=[
  ['平静','愿你的心，偶尔也能像水面一样安静。','May your heart find a quiet place to rest.'],
  ['勇气','愿你带着一点勇气，走向心里想去的地方。','May a little courage carry you towards the things you love.'],
  ['快乐','愿平凡的日子里，也有让你眼睛发亮的小事。','May ordinary days bring little things that light up your eyes.']
 ];
 const state={progress:0},size={width:1,height:1};
 let selected=0,voyageTween,rippleTween,noteTween,visible=false;
 const status=document.querySelector('#harbor-status');
 function label(button,zh,en){const small=document.createElement('small');small.lang='en';small.textContent=en;button.replaceChildren(document.createTextNode(zh),small)}
 function paintBoat(){
  const t=state.progress,s=1-t;
  const x=(s*s*.28+2*s*t*.53+t*t*.82)*size.width;
  const y=(s*s*.75+2*s*t*.68+t*t*.46)*size.height;
  const scale=1-t*.68,rotation=Math.sin(t*Math.PI)*-5;
  if(gsap)gsap.set(flight,{x,y,xPercent:-50,yPercent:-65,scale,rotation});
  else flight.style.transform=`translate(${x}px,${y}px) translate(-50%,-65%) scale(${scale}) rotate(${rotation}deg)`;
 }
 function measure(){size.width=water.clientWidth;size.height=water.clientHeight;paintBoat()}
 function setVoyage(phase){
  water.dataset.voyage=phase;boat.disabled=phase!=='ready';
  if(phase==='ready')label(send,'让它出发','Send it softly ↗');
  else if(phase==='sailing')label(send,'回到岸边','Bring it back ↺');
  else if(phase==='arrived')label(send,'再寄一份温柔','Another little wish ↺');
  else label(send,'正在靠岸','Coming back softly…');
 }
 function returnBoat(){
  voyageTween?.kill();rippleTween?.kill();
  if(gsap)gsap.set('.harbor-ripple',{autoAlpha:0});
  setVoyage('returning');
  const finish=()=>{state.progress=0;paintBoat();setVoyage('ready');status.textContent='一只小船，满满心意。 / One little boat. A heartful of things.'};
  if(!gsap||reduced()){finish();return}
  voyageTween=gsap.to(state,{progress:0,duration:.7,ease:'power2.inOut',onUpdate:paintBoat,onComplete:finish});
 }
 function launch(){
  if(water.dataset.voyage!=='ready'){returnBoat();return}
  const view=water.getBoundingClientRect();
  if(view.top<0||view.bottom>innerHeight){
   const event=new CustomEvent('site:frame-scene',{cancelable:true,detail:{target:water}});
   if(document.dispatchEvent(event))scrollTo({top:scrollY+view.top-innerHeight*.04,behavior:reduced()?'instant':'smooth'});
  }
  setVoyage('sailing');status.textContent='心愿在路上了。 / Your little wish is on its way.';
  const finish=()=>{state.progress=1;paintBoat();setVoyage('arrived');status.textContent='愿这份温柔，慢慢来到你身边。 / May this little kindness find its way to you.'};
  if(!gsap||reduced()){finish();return}
  rippleTween=gsap.fromTo('.harbor-ripple',{scale:.35,autoAlpha:.65},{scale:2.6,autoAlpha:0,duration:2.4,stagger:.28,ease:'sine.out'});
  voyageTween=gsap.to(state,{progress:1,duration:3.2,ease:'sine.inOut',onUpdate:paintBoat,onComplete:finish});
 }
 options.forEach((button,index)=>button.addEventListener('click',()=>{
  selected=index;options.forEach((option,i)=>option.setAttribute('aria-pressed',String(i===index)));
  document.querySelector('#boat-wish').textContent=wishes[index][0];
  document.querySelector('#harbor-wish-zh').textContent=wishes[index][1];document.querySelector('#harbor-wish-en').textContent=wishes[index][2];
  noteTween?.kill();
  if(gsap&&!reduced())noteTween=gsap.fromTo('.harbor-message',{autoAlpha:0,y:5},{autoAlpha:1,y:0,duration:.35,clearProps:'transform,opacity,visibility'});
  if(water.dataset.voyage!=='ready')returnBoat();
 }));
 boat.addEventListener('click',launch);send.addEventListener('click',launch);
 function syncWater(){water.classList.toggle('is-water-live',visible&&!document.hidden&&!reduced())}
 new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;syncWater()},{threshold:.02}).observe(water);
 document.addEventListener('visibilitychange',syncWater);
 new ResizeObserver(measure).observe(water);measure();

 const stage=document.querySelector('#postcard-stage'),front=document.querySelector('#postcard-front'),back=document.querySelector('#postcard-back');
 const flip=document.querySelector('#postcard-flip'),keep=document.querySelector('#postcard-keep'),mark=document.querySelector('#postcard-postmark'),feedback=document.querySelector('#postcard-feedback');
 let showingBack=false,kept=false,flipTween,stampTween,flipping=false;
 try{kept=localStorage.getItem('520am-postcard-kept')==='yes'}catch{/* A keepsake does not require storage. */}
 function setFeedback(saved){
  const en=document.createElement('em');en.lang='en';en.textContent=saved?'This little moment is yours to keep.':'Some views are better with you.';
  feedback.replaceChildren(document.createTextNode(saved?'珍藏好了。':'有些风景，想和你一起看。'),en);
 }
 function ink(animate=false){
  stampTween?.kill();keep.setAttribute('aria-pressed',String(kept));
  label(keep,kept?'已经珍藏':'珍藏这一刻',kept?'Kept close ♡':'Keep this little moment ♡');setFeedback(kept);
  if(!gsap){mark.style.opacity=kept?'.78':'0';mark.style.transform='rotate(-15deg)';return}
  if(animate&&!reduced()){
   stampTween=kept?gsap.fromTo(mark,{scale:1.4,rotation:-23,autoAlpha:0},{scale:1,rotation:-15,autoAlpha:.78,duration:.55,ease:'back.out(1.25)'}):gsap.to(mark,{autoAlpha:0,scale:1.12,duration:.25});
  }else gsap.set(mark,{scale:1,rotation:-15,autoAlpha:kept ? .78 : 0});
 }
 function accessibleSide(isBack){front.inert=isBack;back.inert=!isBack}
 function flipCard(){
  showingBack=!showingBack;flipping=true;flipTween?.kill();
  flip.setAttribute('aria-expanded',String(showingBack));
  label(flip,showingBack?'再看看风景':'翻到另一面',showingBack?'Back to the little view ↻':'Turn it over ↻');
  keep.hidden=!showingBack;keep.disabled=true;stage.dataset.side=showingBack?'turning-back':'turning-front';
  const finish=()=>{flipping=false;accessibleSide(showingBack);stage.dataset.side=showingBack?'back':'front';keep.disabled=false};
  if(!gsap||reduced()){
   if(gsap)gsap.set(turn,{rotationY:showingBack?180:0,rotation:showingBack?1:-3});
   else turn.style.transform=`rotate(${showingBack?1:-3}deg) rotateY(${showingBack?180:0}deg)`;
   finish();return;
  }
  flipTween=gsap.to(turn,{rotationY:showingBack?180:0,rotation:showingBack?1:-3,duration:.95,ease:'power2.inOut',onUpdate:()=>accessibleSide(Math.abs(gsap.getProperty(turn,'rotationY'))>90),onComplete:finish});
 }
 flip.addEventListener('click',flipCard);
 keep.addEventListener('click',()=>{if(flipping)return;kept=!kept;try{localStorage.setItem('520am-postcard-kept',kept?'yes':'no')}catch{}ink(true)});
 if(gsap)gsap.set(turn,{rotation:-3,rotationY:0});
 ink();
 preference.addEventListener('change',()=>{
  syncWater();if(!reduced())return;
  voyageTween?.progress(1);rippleTween?.progress(1);noteTween?.progress(1);flipTween?.progress(1);stampTween?.progress(1);
 });
 window.ContinuationScenes={animate({gsap}){
  gsap.fromTo('.harbor-moon',{y:16},{y:-18,ease:'none',scrollTrigger:{trigger:'#little-harbor',start:'top bottom',end:'bottom top',scrub:1}});
  gsap.fromTo('.moon-reflection',{y:8},{y:-8,ease:'none',scrollTrigger:{trigger:'#little-harbor',start:'top bottom',end:'bottom top',scrub:1.2}});
  gsap.fromTo('.postcard-scribble',{y:12},{y:-10,ease:'none',scrollTrigger:{trigger:'#tomorrow-postcard',start:'top bottom',end:'bottom top',scrub:1}});
 }};
})();
