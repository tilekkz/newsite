(() => {
  'use strict';
  const board = document.querySelector('.sky-board');
  const stage = document.querySelector('#keepsake-stage');
  if (!board || !stage) return;
  const gsap = window.gsap;
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const reduced = () => motionPreference.matches;
  const stars = [...board.querySelectorAll('[data-star]')];
  const connections = board.querySelector('.sky-connections');
  const guides = board.querySelector('.sky-guides');
  const svg = board.querySelector('svg');
  const dust = board.querySelector('.sky-dust');
  const haze = board.querySelector('.sky-haze');
  const moon = board.querySelector('.sky-moon');
  const note = document.querySelector('.sky-note');
  const count = document.querySelector('#sky-progress');
  const complete = document.querySelector('.sky-complete');
  const reset = document.querySelector('#sky-reset');
  const seen = new Set();
  const edges = [];
  const positions = stars.map(()=>({x:0,y:0,dx:0,dy:0}));
  const drift = {x:0,y:0,phase:0,engagement:0};
  const skySize = {width:1,height:1};
  const thoughts = [
    ['你的笑。','Your laugh.','有些声音，只要想起，就会忍不住微笑。','Some sounds make me smile just by remembering them. Yours is one of them.'],
    ['平凡的一天。','Ordinary days.','不必每一天都特别。能和你分享小事，就已经很好。','Every day does not have to be extraordinary. The little things are lovely when I can share them with you.'],
    ['同一首歌。','Our little song.','有些旋律一响起，心里就有了一个温柔的位置。','Some melodies feel like a place to come back to. A little softer. A little closer.'],
    ['一点勇气。','A little courage.','愿你一直有勇气，做那个最真实的自己。','I hope you always have the courage to be wonderfully, honestly yourself.'],
    ['温柔的光。','A softer light.','愿每个平凡的夜晚，都有一点温柔陪着你。','May even the quietest evening hold a little warmth for you.'],
    ['留一会儿。','Stay a little.','不用急着赶路。这里总有一小片安静，留给你。','You do not have to hurry. There is a quiet little corner here, kept for you.'],
    ['小小的愿望。','A little wish.','愿你心里的小小愿望，都能慢慢开花。','I hope the little wishes you carry find their own gentle way to bloom.'],
    ['明天见。','See you tomorrow.','希望明天也有温柔的小事，在等着你。','I hope tomorrow has a few gentle surprises waiting for you. And one more reason to smile.']
  ];
  let noteTween, sparkTween, ringTween, completeTween;
  let lastStar = null;
  let visible = false;
  let running = false;
  let dirty = true;
  const markDirty = () => { dirty = true; };
  const element = (tag,css) => {
    const node = document.createElementNS('http://www.w3.org/2000/svg',tag);
    node.setAttribute('class',css);
    return node;
  };
  const guidePaths = stars.slice(1).map(()=>{
    const path = element('path','sky-guide'); guides.append(path); return path;
  });
  // A small deterministic field: no random layout jumps after reload or resize.
  for(let i=0;i<25;i++) {
    const mote=document.createElement('i');
    mote.style.cssText=`left:${4+(i*37%92)}%;top:${5+(i*29%90)}%;--twinkle:${4+i%5}s;--delay:-${i*.71}s;--mote:${i%4===0?3:1.5}px`;
    dust.append(mote);
  }
  const idle = gsap?.to(drift,{phase:Math.PI*2,duration:34,repeat:-1,ease:'none',paused:true,onUpdate:markDirty});
  const xTo = gsap?.quickTo(drift,'x',{duration:1.15,ease:'power3.out',onUpdate:markDirty});
  const yTo = gsap?.quickTo(drift,'y',{duration:1.15,ease:'power3.out',onUpdate:markDirty});
  const engagementTo = gsap?.quickTo(drift,'engagement',{duration:.75,ease:'power2.out',onUpdate:markDirty});

  function frameScene(target) {
    const event = new CustomEvent('site:frame-scene',{cancelable:true,detail:{target}});
    if(document.dispatchEvent(event)) scrollTo({top:scrollY+target.getBoundingClientRect().top-innerHeight*.04,behavior:reduced()?'instant':'smooth'});
  }
  function geometry(from,to) {
    const a=positions[from],b=positions[to];
    const x=a.x+a.dx,y=a.y+a.dy,ex=b.x+b.dx,ey=b.y+b.dy;
    const length=Math.hypot(ex-x,ey-y)||1;
    const bend=(from%2?1:-1)*Math.min(15,length*.065);
    return {x,y,ex,ey,cx:(x+ex)/2-(ey-y)/length*bend,cy:(y+ey)/2+(ex-x)/length*bend};
  }
  function drawEdge(edge) {
    const g=geometry(edge.from,edge.to),t=edge.progress;
    const d=`M ${g.x} ${g.y} Q ${g.cx} ${g.cy} ${g.ex} ${g.ey}`;
    edge.path.setAttribute('d',d); edge.glow.setAttribute('d',d);
    edge.path.style.strokeDashoffset=edge.glow.style.strokeDashoffset=String(1-t);
    edge.traveler.setAttribute('cx',(1-t)**2*g.x+2*(1-t)*t*g.cx+t*t*g.ex);
    edge.traveler.setAttribute('cy',(1-t)**2*g.y+2*(1-t)*t*g.cy+t*t*g.ey);
    edge.traveler.style.opacity=t>0&&t<1?String(Math.min(1,t*8,(1-t)*8)):'0';
  }
  function paintSky(force=false) {
    if(!dirty&&force!==true) return;
    dirty=false;
    const moving=running&&!reduced();
    positions.forEach((p,i)=>{
      const depth=Number(stars[i].dataset.depth);
      // Repel from the resting anchor, so a star never chases its own displacement.
      const awayX=p.x-(drift.x+1)*skySize.width*.5;
      const awayY=p.y-(drift.y+1)*skySize.height*.5;
      const distance=Math.hypot(awayX,awayY);
      const reach=Math.min(210,skySize.width*.48);
      const force=Math.pow(Math.max(0,1-distance/reach),1.6)*(20+depth*.45)*drift.engagement;
      const ux=distance>.5?awayX/distance:Math.cos(i*2.4+.4);
      const uy=distance>.5?awayY/distance:Math.sin(i*2.4+.4);
      p.dx=moving?ux*force+Math.sin(drift.phase+i*1.7)*2.4:0;
      p.dy=moving?uy*force+Math.cos(drift.phase+i*1.3)*2:0;
      stars[i].style.transform=`translate(calc(-50% + ${p.dx.toFixed(3)}px),calc(-50% + ${p.dy.toFixed(3)}px))`;
    });
    guidePaths.forEach((path,i)=>{const g=geometry(i,i+1);path.setAttribute('d',`M ${g.x} ${g.y} Q ${g.cx} ${g.cy} ${g.ex} ${g.ey}`)});
    edges.forEach(drawEdge);
    haze.style.transform=`translate(${moving?-drift.x*9:0}px,${moving?-drift.y*6:0}px)`;
    dust.style.transform=`translate(${moving?-drift.x*5:0}px,${moving?-drift.y*4:0}px)`;
    moon.style.transform=`translate(${moving?drift.x*7:0}px,${moving?drift.y*4:0}px)`;
  }
  function drawSky() {
    skySize.width=board.clientWidth;skySize.height=board.clientHeight;
    svg.setAttribute('viewBox',`0 0 ${board.clientWidth} ${board.clientHeight}`);
    stars.forEach((star,i)=>{positions[i].x=star.offsetLeft;positions[i].y=star.offsetTop});
    dirty=true; paintSky(true);
  }
  function syncSkyMotion() {
    const active=Boolean(gsap)&&visible&&!document.hidden&&!reduced();
    board.classList.toggle('is-sky-live',active);
    if(active===running) return;
    running=active;
    if(active){idle.resume();gsap.ticker.add(paintSky)}
    else {
      idle?.pause();gsap?.ticker.remove(paintSky);
      xTo?.tween.pause();yTo?.tween.pause();engagementTo?.tween.pause();drift.x=drift.y=drift.engagement=0;
      dirty=true;paintSky(true);
    }
  }
  function moveSky(event) {
    if(!running||!finePointer.matches||event.pointerType==='touch') return;
    const r=board.getBoundingClientRect();
    engagementTo(1);
    xTo(Math.max(-1,Math.min(1,(event.clientX-r.left)/r.width*2-1)));
    yTo(Math.max(-1,Math.min(1,(event.clientY-r.top)/r.height*2-1)));
  }
  board.addEventListener('pointermove',moveSky,{passive:true});
  board.addEventListener('pointerleave',()=>{if(running){engagementTo(0);xTo(0);yTo(0)}});
  finePointer.addEventListener('change',()=>{if(!finePointer.matches){engagementTo?.(0);xTo?.(0);yTo?.(0)}});
  document.addEventListener('visibilitychange',syncSkyMotion);
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;syncSkyMotion()},{threshold:.01}).observe(board);
  new ResizeObserver(drawSky).observe(board);

  function traceEdge(from,to,replay=false) {
    let edge=edges.find(e=>(e.from===from&&e.to===to)||(e.from===to&&e.to===from));
    if(!edge){
      const glow=element('path','sky-filament'),path=element('path','sky-segment is-lit'),traveler=element('circle','sky-traveler');
      [path,glow].forEach(p=>p.setAttribute('pathLength','1'));
      traveler.setAttribute('r','2.2');connections.append(glow,path,traveler);
      edge={from,to,path,glow,traveler,progress:0,tween:null};edges.push(edge);
    }else if(!replay) return;
    edge.tween?.kill();edge.progress=0;
    if(gsap&&!reduced()) edge.tween=gsap.to(edge,{progress:1,duration:1.05,ease:'power2.inOut',onUpdate:()=>{if(running)dirty=true;else drawEdge(edge)},onComplete:()=>drawEdge(edge)});
    else edge.progress=1;
    drawEdge(edge);
  }
  function renderNote(index) {
    const thought=index===null?['小小的瞬间。','Little things. Big feelings.','有些心意，藏在微小的光里。','Some feelings live in the smallest lights.']:thoughts[index];
    document.querySelector('#sky-note-index').textContent=index===null?'♡':`${String(index+1).padStart(2,'0')} / ${String(stars.length).padStart(2,'0')}`;
    const english=document.createElement('em');english.lang='en';english.textContent=thought[1];
    document.querySelector('#sky-note-title').replaceChildren(document.createTextNode(thought[0]),english);
    document.querySelector('#sky-note-zh').textContent=thought[2];document.querySelector('#sky-note-en').textContent=thought[3];
  }
  function updateSky(index) {
    const fresh=index!==null&&!seen.has(index);
    if(index!==null){
      if(fresh&&lastStar!==null) traceEdge(lastStar,index);
      else if(!fresh){const edge=edges.findLast(e=>e.from===index||e.to===index);if(edge)traceEdge(edge.from,edge.to,true)}
      seen.add(index);lastStar=index;
    }
    stars.forEach((star,i)=>{star.setAttribute('aria-pressed',String(i===index));star.classList.toggle('is-seen',seen.has(i))});
    const separator=document.createElement('i');separator.textContent='/';
    count.replaceChildren(document.createTextNode(String(seen.size)+' '),separator,document.createTextNode(' '+stars.length));
    count.setAttribute('aria-label',`已点亮 ${seen.size} 颗星 / ${seen.size} of ${stars.length} stars lit`);
    reset.hidden=seen.size===0;
    const wasComplete=!complete.hidden;complete.hidden=seen.size!==stars.length;
    board.classList.toggle('is-constellation-complete',!complete.hidden);
    noteTween?.kill();sparkTween?.kill();ringTween?.kill();
    if(gsap){gsap.set('.sky-star-mark',{clearProps:'transform'});gsap.set('.sky-click-ring',{autoAlpha:0})}
    renderNote(index);
    if(gsap&&!reduced()){
      noteTween=gsap.fromTo(note,{y:7,autoAlpha:0},{y:0,autoAlpha:1,duration:.4,ease:'power2.out',clearProps:'transform,opacity,visibility'});
      if(index!==null){
        sparkTween=gsap.fromTo(stars[index].querySelector('.sky-star-mark'),{scale:.86},{scale:1.16,duration:.24,yoyo:true,repeat:1,ease:'sine.out',onComplete:()=>gsap.set('.sky-star-mark',{clearProps:'transform'})});
        ringTween=gsap.fromTo(stars[index].querySelector('.sky-click-ring'),{scale:.45,autoAlpha:.8},{scale:2.15,autoAlpha:0,duration:1,ease:'power2.out'});
      }
      if(!wasComplete&&!complete.hidden){completeTween?.kill();completeTween=gsap.fromTo(complete,{y:8,autoAlpha:0},{y:0,autoAlpha:1,delay:.65,duration:.8,clearProps:'transform,opacity,visibility'})}
    }
  }
  stars.forEach((star,index)=>star.addEventListener('click',()=>updateSky(index)));
  reset.addEventListener('click',()=>{
    edges.forEach(edge=>edge.tween?.kill());edges.length=0;connections.replaceChildren();
    completeTween?.kill();
    if(gsap) gsap.set(complete,{clearProps:'transform,opacity,visibility'});
    seen.clear();lastStar=null;updateSky(null);stars[0].focus({preventScroll:true});
  });
  motionPreference.addEventListener('change',()=>{
    if(reduced()){
      edges.forEach(edge=>{edge.tween?.kill();edge.progress=1;drawEdge(edge)});
      completeTween?.progress(1);
    }
    syncSkyMotion();
  });
  drawSky();

  const envelope = stage.querySelector('.keepsake-envelope');
  const object = stage.querySelector('.keepsake-object');
  const paper = stage.querySelector('.keepsake-paper');
  const flap = stage.querySelector('.envelope-flap');
  const seal = stage.querySelector('.keepsake-seal');
  const ground = stage.querySelector('.envelope-ground-shadow');
  const mouth = stage.querySelector('.envelope-mouth');
  const fold = document.querySelector('#keepsake-close');
  const hint = document.querySelector('#keepsake-hint');
  let letterOpen = false;
  let letterBusy = false;
  let letterTween;
  let previousAnchor;
  function holdLetterAnchor(){
    const style=document.documentElement.style;
    if(previousAnchor===undefined)previousAnchor={value:style.getPropertyValue('overflow-anchor'),priority:style.getPropertyPriority('overflow-anchor')};
    style.setProperty('overflow-anchor','none');
  }
  function releaseLetterAnchor(){
    if(previousAnchor===undefined)return;
    const style=document.documentElement.style;
    if(previousAnchor.value)style.setProperty('overflow-anchor',previousAnchor.value,previousAnchor.priority);
    else style.removeProperty('overflow-anchor');
    previousAnchor=undefined;
  }
  stage.classList.add('keepsake-ready');
  stage.dataset.letterState='closed';
  paper.inert = true;
  try {
    const name = sessionStorage.getItem('520am-name')?.trim().slice(0,24);
    if(name) document.querySelector('#keepsake-recipient').textContent=`给 ${name} / FOR ${name}`;
  }catch{ /* The letter works without storage. */ }

  const closedHeight=()=>innerWidth<=760?325:410;
  const openHeight=()=>Math.ceil(paper.offsetHeight+envelope.offsetHeight*.78+120);
  const paperRise=()=>-(paper.offsetHeight-envelope.offsetHeight*.2);
  const tiltX=gsap?.quickTo(object,'rotationX',{duration:.75,ease:'power2.out'});
  const tiltY=gsap?.quickTo(object,'rotationY',{duration:.75,ease:'power2.out'});
  const lift=gsap?.quickTo(object,'y',{duration:.75,ease:'power2.out'});
  function pauseTilt(){tiltX?.tween.pause();tiltY?.tween.pause();lift?.tween.pause()}
  function settleLetter(){
    letterBusy=false;
    stage.dataset.letterState=letterOpen?'open':'closed';
    const open=letterOpen;
    if(gsap){
      gsap.set(stage,{height:open?openHeight():closedHeight()});
      gsap.set(object,{y:0,rotationX:open||reduced()?0:7,rotationY:open||reduced()?0:-7,rotation:open?0:-2,transformPerspective:1200});
      gsap.set(paper,{y:open?paperRise():18,rotation:open?-.6:1.2,autoAlpha:open?1:0,'--paper-glow':open ? .08 : .3});
      gsap.set(flap,{rotationX:open?-178:0,zIndex:open?1:5});
      gsap.set(seal,{z:5,autoAlpha:open?0:1,scale:open ? .72 : 1,rotation:open?12:0});
      gsap.set(ground,{scaleX:open?1.08:1,scaleY:open ? .75 : 1,opacity:open ? .5 : .65});
      gsap.set(mouth,{opacity:open?1:0});
    }else{
      stage.style.height=`${open?openHeight():closedHeight()}px`;
      Object.assign(object.style,{transform:open?'none':'rotate(-2deg)'});
      Object.assign(paper.style,{transform:open?`translateY(${paperRise()}px) rotate(-.6deg)`:'translateY(18px)',opacity:open?'1':'0',visibility:open?'visible':'hidden'});
      Object.assign(flap.style,{transform:open?'rotateX(-178deg)':'none',zIndex:open?'1':'5'});
      Object.assign(seal.style,{opacity:open?'0':'1',visibility:open?'hidden':'visible'});
    }
  }
  function setLetter(open){
    if(open===letterOpen)return;
    letterTween?.kill();pauseTilt();holdLetterAnchor();
    letterOpen=open;letterBusy=true;
    stage.dataset.letterState=open?'opening':'closing';
    stage.classList.toggle('is-open',open);
    seal.setAttribute('aria-expanded',String(open));seal.disabled=open;
    paper.inert=!open;fold.hidden=!open;hint.hidden=open;
    document.querySelector('#keepsake-status').textContent=open?'这封信，留给你。 / A little letter, just for you.':'';
    const finish=()=>{
      settleLetter();
      releaseLetterAnchor();
      if(open&&(document.activeElement===seal||document.activeElement===document.body))document.querySelector('#keepsake-paper-title').focus({preventScroll:true});
      if(!open)seal.focus({preventScroll:true});
      window.ScrollTrigger?.refresh();
    };
    if(!gsap||reduced()){
      finish();if(open)frameScene(stage);return;
    }
    letterTween=gsap.timeline({onComplete:finish,defaults:{ease:'power2.inOut'}});
    if(open){
      if(getComputedStyle(paper).visibility==='hidden')gsap.set(paper,{y:18,rotation:1.2});
      letterTween.addLabel('unseal',0)
        .to(seal,{scale:.86,duration:.13},'unseal')
        .to(seal,{autoAlpha:0,scale:.72,rotation:12,duration:.24},.13)
        .to(object,{y:-7,rotationX:0,rotationY:0,rotation:-.6,duration:.65},0)
        .to(ground,{scaleX:1.12,scaleY:.65,opacity:.4,duration:.65},0)
        .addLabel('unfold',.15)
        .to(flap,{rotationX:-178,duration:.68,ease:'power2.inOut'},'unfold')
        .set(flap,{zIndex:1},.49)
        .to(mouth,{opacity:1,duration:.3},.4)
        .to(stage,{height:openHeight(),duration:1.15,ease:'power3.inOut'},.2)
        .set(paper,{autoAlpha:1},.48)
        .addLabel('letter',.57)
        .to(paper,{y:paperRise(),rotation:-.6,duration:1.12,ease:'power3.inOut'},'letter')
        .to(paper,{'--paper-glow':.08,duration:.85},'letter')
        .to(object,{y:0,rotation:0,duration:.85,ease:'sine.out'},.85)
        .to(ground,{scaleX:1.08,scaleY:.75,opacity:.5,duration:.65},1);
      frameScene(stage);
    }else{
      letterTween.addLabel('tuck',0)
        .to(paper,{y:18,rotation:1.2,duration:.8},'tuck')
        .to(stage,{height:closedHeight(),duration:.9,ease:'power3.inOut'},.18)
        .set(flap,{zIndex:5},.8)
        .addLabel('fold',.8)
        .to(flap,{rotationX:0,duration:.58},'fold')
        .to(mouth,{opacity:0,duration:.3},1)
        .to(object,{y:0,rotationX:7,rotationY:-7,rotation:-2,duration:.65},.9)
        .to(ground,{scaleX:1,scaleY:1,opacity:.65,duration:.65},.9)
        .to(seal,{autoAlpha:1,scale:1,rotation:0,duration:.3,ease:'back.out(1.2)'},1.18)
        .set(paper,{autoAlpha:0},1.4);
    }
  }
  envelope.addEventListener('pointermove',event=>{
    if(!gsap||reduced()||letterOpen||letterBusy||!finePointer.matches||event.pointerType==='touch')return;
    const r=envelope.getBoundingClientRect();
    const x=Math.max(-1,Math.min(1,(event.clientX-r.left)/r.width*2-1));
    const y=Math.max(-1,Math.min(1,(event.clientY-r.top)/r.height*2-1));
    tiltX(5-y*3);tiltY(-4+x*6);lift(-5);
  },{passive:true});
  function restEnvelope(){if(!gsap||letterBusy||letterOpen)return;tiltX(reduced()?0:7);tiltY(reduced()?0:-7);lift(0)}
  envelope.addEventListener('pointerleave',restEnvelope);
  finePointer.addEventListener('change',()=>{if(!finePointer.matches)restEnvelope()});
  seal.addEventListener('click',()=>setLetter(true));
  fold.addEventListener('click',()=>setLetter(false));
  new ResizeObserver(()=>{
    if(letterBusy)return;
    settleLetter();
    if(letterOpen)window.ScrollTrigger?.refresh();
  }).observe(paper);
  motionPreference.addEventListener('change',()=>{
    if(!reduced())return;
    noteTween?.progress(1);sparkTween?.progress(1);ringTween?.progress(1);
    pauseTilt();
    if(letterBusy)letterTween?.progress(1);else settleLetter();
  });
  settleLetter();

  window.Afterglow = {
    animate({gsap,desktop}) {
      gsap.fromTo('.sky-moon-depth',{y:desktop?24:10},{y:desktop?-28:-12,ease:'none',scrollTrigger:{trigger:'#starlight',start:'top bottom',end:'bottom top',scrub:1}});
      gsap.fromTo('.sky-ambient',{y:desktop?35:15},{y:desktop?-35:-15,ease:'none',scrollTrigger:{trigger:'#starlight',start:'top bottom',end:'bottom top',scrub:1.2}});
      gsap.fromTo('.keepsake-annotation',{y:14},{y:-12,ease:'none',scrollTrigger:{trigger:'#last-letter',start:'top bottom',end:'bottom top',scrub:1}});
    }
  };
})();
