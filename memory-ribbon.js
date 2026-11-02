(() => {
  'use strict';
  const journey=document.querySelector('.garden-journey');
  if(!journey || !window.MoonGarden || !window.SiteLogic)return;
  const camera=journey.querySelector('.garden-camera'),world=journey.querySelector('.garden-world');
  const intro=world.querySelector('#blue-hour'),section=world.querySelector('#blue-memories');
  const track=section.querySelector('.ribbon-track'),photos=[...track.querySelectorAll('.ribbon-photo')];
  const descent=world.querySelector('.garden-descent'),falling=[...descent.querySelectorAll('.descent-photo')];
  const progress=section.querySelector('.ribbon-progress i'),hint=section.querySelector('#ribbon-hint');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const {pathLength,pointAlong}=window.SiteLogic;
  const ns='http://www.w3.org/2000/svg';
  const svg=document.createElementNS(ns,'svg');svg.classList.add('garden-spine');svg.setAttribute('aria-hidden','true');
  const air=document.createElement('div');air.className='garden-atmosphere';air.setAttribute('aria-hidden','true');
  world.prepend(air,svg);
  // The camera's route: top-left corners of the view in world pixels. Horizontal, then 45 degrees down, then straight down.
  let tween,route=[{x:0,y:0}],travelled=0,drawingFrame=0,drawnWidth=0,drawnHeight=0;
  const distance=()=>Math.max(0,world.offsetWidth-camera.clientWidth);
  const total=()=>pathLength(route);
  const n=value=>Number(value.toFixed(2));
  function node(tag,attrs,parent){
    const el=document.createElementNS(ns,tag);
    Object.entries(attrs).forEach(([key,value])=>el.setAttribute(key,value));
    parent?.append(el);return el;
  }
  function layoutPoint(el){
    const rect=el.getBoundingClientRect(),scene=world.getBoundingClientRect();
    return {x:rect.left-scene.left,y:rect.top-scene.top};
  }
  const milestones=[['花开的时候，想起你。',4],['每一刻，都值得珍藏。',8],['未完待续。',11]].map(([text,index])=>{
    const el=document.createElement('p');el.className='garden-milestone';el.textContent=text;world.append(el);return {el,index};
  });
  const downward=document.createElement('p');downward.className='garden-milestone';downward.textContent='往下走，还有我们。';descent.append(downward);
  function fitY(y,size,turn,mirror,height){
    const sh=size*1199/1312,rad=turn*Math.PI/180;
    const ys=[[0,0],[size,0],[0,sh],[size,sh]].map(([x,y])=>(x-size*.04)*mirror*Math.sin(rad)+(y-sh*.94)*Math.cos(rad));
    return Math.max(28-Math.min(...ys),Math.min(height-38-Math.max(...ys),y));
  }
  function atmosphere(width,height){
    air.replaceChildren();
    for(let x=100;x<width;x+=1050){
      const light=document.createElement('i');light.className='garden-landlight';light.style.left=x+'px';air.append(light);
    }
    for(let i=0;i<72;i++){
      const star=document.createElement('i');star.className='garden-star';star.style.left=((i*149.7)%width)+'px';star.style.top=(8+(i*31)%83)+'%';air.append(star);
    }
  }
  // Ten more photos after the ribbon: four slide down a 45-degree diagonal, the rest fall in gentle waves.
  // Without the travelling camera (reduced motion) they simply continue the row.
  function placeDescent(){
    const vw=camera.clientWidth,vh=camera.clientHeight,mobile=vw<761,linked=journey.classList.contains('is-linked');
    const card=falling[0].offsetWidth||300;
    if(!linked){
      const gap=card+(mobile?90:160);
      falling.forEach((photo,i)=>{photo.style.left=n(gap*(i+.5)+40)+'px';photo.style.top='50%';});
      descent.style.width=n(gap*falling.length+80)+'px';
      downward.style.cssText='left:40px;top:64px';
      route=[{x:0,y:0}];
      return;
    }
    const diagonal=4,unit=(mobile?400:560)/Math.SQRT2,drop=vh*(mobile?.84:.8),wave=vw*(mobile?.14:.2);
    falling.forEach((photo,i)=>{
      let x,y;
      if(i<diagonal){
        // Alternate either side of the diagonal (perpendicular to it is (1,-1)).
        const t=i+.75,side=(i%2?1:-1)*wave*.7/Math.SQRT2;
        x=vw*.5+t*unit+side;y=vh*.5+t*unit-side;
      }else{
        const k=i-diagonal;
        x=vw*.5+diagonal*unit+Math.sin(k*1.45+.5)*wave;y=vh*.5+diagonal*unit+(k+.75)*drop;
      }
      photo.style.left=n(x)+'px';photo.style.top=n(y)+'px';
    });
    descent.style.width=n(diagonal*unit+vw+card*.5)+'px';
    downward.style.cssText='left:'+n(vw*.08)+'px;top:64px';
    const start=descent.offsetLeft,steps=falling.length-diagonal;
    route=[{x:0,y:0},{x:start,y:0},{x:start+diagonal*unit,y:diagonal*unit},{x:start+diagonal*unit,y:diagonal*unit+(steps-1+.75)*drop}];
  }
  function draw(){
    drawingFrame=0;
    world.style.setProperty('--garden-screen',camera.clientWidth+'px');
    placeDescent();
    const w=world.offsetWidth,h=camera.clientHeight;
    if(w===drawnWidth&&h===drawnHeight)return;
    drawnWidth=w;drawnHeight=h;
    svg.setAttribute('viewBox','0 0 '+w+' '+h);
    svg.replaceChildren();
    atmosphere(w,h);
    const mobile=camera.clientWidth<761,origin=layoutPoint(track);
    const anchors=photos.map((photo,i)=>{
      const rise=parseFloat(photo.style.getPropertyValue('--rise'))||0;
      const top=photo.offsetTop+rise,ph=photo.querySelector('.ribbon-print').offsetHeight;
      const size=mobile?160:205+(i%3)*10,turn=i%2?8:-8,mirror=i%2?-1:1;
      const y=fitY(i%2?top+155:top+ph-30,size,turn,mirror,h);
      const x=photo.offsetLeft+(i%2?65:photo.offsetWidth-65);
      return {x:origin.x+x,y:origin.y+y};
    });
    // The vine keeps going beside each falling photo.
    falling.forEach((photo,i)=>{
      const print=photo.querySelector('.ribbon-print'),at=layoutPoint(print);
      // On a phone the photo nearly fills the width, so the vine hugs the frame instead of running off screen.
      const reach=mobile?-14:50;
      anchors.push({x:at.x+(i%2?-reach:print.offsetWidth+reach),y:at.y+print.offsetHeight*.65});
    });
    const button=world.querySelector('#blue-play'),buttonPoint=layoutPoint(button);
    const rootPoint={x:buttonPoint.x+button.offsetWidth/2,y:buttonPoint.y+button.offsetHeight/2};
    const canopy=world.querySelector('.button-garden'),canopyPoint=layoutPoint(canopy);
    const join={x:rootPoint.x+canopy.offsetWidth*.37,y:canopyPoint.y+canopy.offsetHeight*.81};
    let previous=rootPoint;
    const paths=anchors.map((a,i)=>{
      const dx=(a.x-previous.x)*.5,dy=(a.y-previous.y)*.5,falls=Math.abs(dy)>Math.abs(dx);
      // Mostly sideways segments leave horizontally; falling ones leave downwards, so the vine bends the way it travels.
      const d=i===0?'M'+n(previous.x)+' '+n(previous.y)+' C'+n(previous.x)+' '+n(previous.y+90)+' '+n(join.x-70)+' '+n(join.y-25)+' '+n(join.x)+' '+n(join.y)+' C'+n(join.x+160)+' '+n(join.y+70)+' '+n(a.x-240)+' '+n(a.y)+' '+n(a.x)+' '+n(a.y):
        falls?'M'+n(previous.x)+' '+n(previous.y)+' C'+n(previous.x)+' '+n(previous.y+dy)+' '+n(a.x)+' '+n(a.y-dy)+' '+n(a.x)+' '+n(a.y):
        'M'+n(previous.x)+' '+n(previous.y)+' C'+n(previous.x+dx)+' '+n(previous.y)+' '+n(a.x-dx)+' '+n(a.y)+' '+n(a.x)+' '+n(a.y);
      previous=a;
      return node('path',{'class':'garden-spine-path garden-spine-core',d},svg);
    });
    milestones.forEach(({el,index})=>{el.style.left=(origin.x+photos[index].offsetLeft)+'px'});
    // The living garden draws from this geometry: the vine's paths, each photo's frame, and where the ground ends, in world pixels.
    const frames=[...photos,...falling].map(photo=>{const print=photo.querySelector('.ribbon-print'),at=layoutPoint(print);return {x:at.x,y:at.y,w:print.offsetWidth,h:print.offsetHeight};});
    document.dispatchEvent(new CustomEvent('garden:layout',{detail:{width:w,height:h,paths,photos:frames,ground:route.length>1?descent.offsetLeft+camera.clientWidth:w}}));
  }
  function apply(d){
    travelled=d;
    const at=pointAlong(route,d);
    world.style.transform='translate3d('+n(-at.x)+'px,'+n(-at.y)+'px,0)';
    progress.style.transform='scaleX('+(total()?d/total():1)+')';
  }
  function scheduleDraw(){drawnWidth=0;if(!drawingFrame)drawingFrame=requestAnimationFrame(draw);}
  new ResizeObserver(scheduleDraw).observe(camera);
  new ResizeObserver(scheduleDraw).observe(intro.querySelector('.blue-invitation-inner'));
  document.fonts?.ready.then(scheduleDraw);
  new IntersectionObserver(entries=>{if(entries.at(-1).isIntersecting)MoonGarden.prepare();}).observe(camera);
  function syncHint(){hint.textContent=tween?'慢慢滚动，和花一起向前。':'向右滑动，沿着花枝看回忆。';}
  camera.addEventListener('scroll',()=>{
    if(!tween)progress.style.transform='scaleX('+(distance()?camera.scrollLeft/distance():1)+')';
  },{passive:true});
  camera.addEventListener('keydown',event=>{
    if(!['ArrowRight','ArrowLeft','ArrowDown','ArrowUp','Home','End'].includes(event.key)||event.target.closest('button,a,input'))return;
    event.preventDefault();
    const step=photos[1].offsetLeft-photos[0].offsetLeft,forward=['ArrowRight','ArrowDown'].includes(event.key);
    if(tween){
      const next=event.key==='Home'?0:event.key==='End'?total():Math.max(0,Math.min(total(),travelled+(forward?step:-step)));
      scrollTo({top:tween.scrollTrigger.start+next,behavior:'instant'});
    }else{
      const next=event.key==='Home'?0:event.key==='End'?distance():Math.max(0,Math.min(distance(),camera.scrollLeft+(forward?step:-step)));
      camera.scrollTo({left:next,behavior:reduced.matches?'instant':'smooth'});
    }
  });
  // Places inside the ribbon sit on its horizontal first stretch, so their distance along the route is their x.
  function scrollTarget(target){
    if(!tween||!target||!world.contains(target))return null;
    const x=target===intro?0:target===section?section.offsetLeft:layoutPoint(target).x;
    return tween.scrollTrigger.start+Math.max(0,Math.min(route[1]?.x??0,x));
  }
  // Anchors inside a horizontal scene need a position along the route, including on touch devices.
  document.addEventListener('click',event=>{
    if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    const link=event.target.closest('a[href="#blue-memories"],a[href="#blue-hour"]');
    if(!link||!tween||document.documentElement.classList.contains('motion-smooth'))return;
    const hash=link.getAttribute('href'),target=document.querySelector(hash);
    event.preventDefault();history.pushState(null,'',hash);
    scrollTo({top:scrollTarget(target),behavior:'instant'});
  });
  window.addEventListener('hashchange',()=>{
    const target=document.getElementById(location.hash.slice(1));
    if(!tween||!target||!world.contains(target)||document.documentElement.classList.contains('motion-smooth'))return;
    camera.scrollLeft=0;
    scrollTo({top:scrollTarget(target),behavior:'instant'});
  });
  window.MemoryRibbon={
    scrollTarget,
    animate({gsap}){
      const nativeOffset=camera.scrollLeft;
      journey.classList.add('is-linked');camera.scrollLeft=0;drawnWidth=0;draw();
      const state={d:0};
      tween=gsap.fromTo(state,{d:0},{
        d:()=>total(),ease:'none',onUpdate(){apply(state.d);},
        scrollTrigger:{id:'memory-ribbon',trigger:camera,start:'top top',end:()=>'+='+Math.max(1,total()),pin:true,pinSpacing:true,scrub:.3,invalidateOnRefresh:true,anticipatePin:1,onRefresh:draw}
      });
      syncHint();
      if(nativeOffset>0)requestAnimationFrame(()=>{if(tween)scrollTo({top:tween.scrollTrigger.start+Math.min(nativeOffset,route[1]?.x??0),behavior:'instant'});});
      else if(['#blue-hour','#blue-memories'].includes(location.hash))requestAnimationFrame(()=>{
        if(!tween)return;
        scrollTo({top:scrollTarget(document.querySelector(location.hash)),behavior:'instant'});
      });
      return ()=>{
        const previousOffset=Math.min(travelled,route[1]?.x??0);
        tween=null;journey.classList.remove('is-linked');world.style.transform='';progress.style.transform='scaleX(0)';syncHint();scheduleDraw();
        requestAnimationFrame(()=>{if(!tween&&reduced.matches)camera.scrollLeft=previousOffset;});
      };
    }
  };
  reduced.addEventListener('change',()=>requestAnimationFrame(syncHint));
  syncHint();scheduleDraw();
})();
