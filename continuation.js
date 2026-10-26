(() => {
 'use strict';
 const turn=document.querySelector('#postcard-turn');
 if(!turn)return;
 const gsap=window.gsap,preference=matchMedia('(prefers-reduced-motion: reduce)');
 const reduced=()=>preference.matches;
 function label(button,zh,en){const small=document.createElement('small');small.lang='en';small.textContent=en;button.replaceChildren(document.createTextNode(zh),small)}
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
  if(!reduced())return;
  flipTween?.progress(1);stampTween?.progress(1);
 });
 window.ContinuationScenes={animate({gsap}){
  gsap.fromTo('.postcard-scribble',{y:12},{y:-10,ease:'none',scrollTrigger:{trigger:'#tomorrow-postcard',start:'top bottom',end:'bottom top',scrub:.4}});
 }};
})();
