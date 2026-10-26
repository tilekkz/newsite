(() => {
  'use strict';
  const journey=document.querySelector('.garden-journey');
  if(!journey || !window.MoonGarden)return;
  const camera=journey.querySelector('.garden-camera'),world=journey.querySelector('.garden-world');
  const intro=world.querySelector('#blue-hour'),section=world.querySelector('#blue-memories');
  const track=section.querySelector('.ribbon-track'),photos=[...track.querySelectorAll('.ribbon-photo')];
  const backPlants=track.querySelector('.ribbon-overgrowth-back'),frontPlants=track.querySelector('.ribbon-overgrowth-front');
  const progress=section.querySelector('.ribbon-progress i'),hint=section.querySelector('#ribbon-hint');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const ns='http://www.w3.org/2000/svg';
  const svg=document.createElementNS(ns,'svg');svg.classList.add('garden-spine');svg.setAttribute('aria-hidden','true');
  const connectors=document.createElement('div');connectors.className='garden-connector-plants';connectors.setAttribute('aria-hidden','true');
  const air=document.createElement('div');air.className='garden-atmosphere';air.setAttribute('aria-hidden','true');
  world.prepend(air,svg,connectors);
  const grown=new Set();
  let tween,rememberedOffset=0,drawingFrame=0,drawnWidth=0,drawnHeight=0,visible=false,segments=[],growth=[],lastReach=0;
  const distance=()=>Math.max(0,world.offsetWidth-camera.clientWidth);
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
  function makePlant(kind,container,extraClass){
    const plant=document.createElement('div');plant.className='garden-plant '+extraClass;
    const reveal=document.createElement('div');reveal.className='garden-reveal';
    const sway=document.createElement('div');sway.className='garden-sway';
    sway.append(MoonGarden.createImage(kind));reveal.append(sway);plant.append(reveal);container.append(plant);
    MoonGarden.watch(plant);return plant;
  }
  const vines=photos.map(()=>makePlant('vine',backPlants,'garden-vine'));
  const sprays=photos.map(()=>makePlant('spray',frontPlants,'garden-spray'));
  const bridge=Array.from({length:3},()=>makePlant('spray',connectors,'garden-spray'));
  const milestones=[['花开的时候，想起你。',4],['每一刻，都值得珍藏。',8],['未完待续。',11]].map(([text,index])=>{
    const el=document.createElement('p');el.className='garden-milestone';el.textContent=text;world.append(el);return {el,index};
  });
  function place(plant,x,y,width,turn,mirror=1){
    Object.assign(plant.style,{left:n(x)+'px',top:n(y)+'px',width:n(width)+'px'});
    plant.style.setProperty('--plant-turn',turn+'deg');plant.style.setProperty('--plant-mirror',mirror);
    plant.style.setProperty('--breeze-delay',(-x*.008).toFixed(2)+'s');
  }
  function fitY(y,size,turn,mirror,height){
    const sh=size*1199/1312,rad=turn*Math.PI/180;
    const ys=[[0,0],[size,0],[0,sh],[size,sh]].map(([x,y])=>(x-size*.04)*mirror*Math.sin(rad)+(y-sh*.94)*Math.cos(rad));
    return Math.max(28-Math.min(...ys),Math.min(height-38-Math.max(...ys),y));
  }
  function register(el,x,key,delay=.12){
    el.style.setProperty('--growth-delay',delay+'s');
    if(grown.has(key))el.classList.add('is-grown','was-grown');
    growth.push({el,x,key});
  }
  function leaves(x,y,angle,key){
    const group=node('g',{transform:'translate('+n(x)+' '+n(y)+') rotate('+angle+')'},svg);
    const sprout=node('g',{'class':'garden-leaf'},group);
    node('path',{d:'M0 0 C-25 -3 -39 -23 -44 -40 C-16 -39 2 -24 0 0Z',fill:'url(#garden-leaf-light)'},sprout);
    node('path',{d:'M0 0 Q-19 -24 -39 -35',fill:'none',stroke:'#b7c8a8', 'stroke-opacity':'.48','stroke-width':'.65'},sprout);
    register(group,x,key,.12);
  }
  function flower(x,y,scale,key){
    const group=node('g',{transform:'translate('+n(x)+' '+n(y)+') scale('+scale+')'},svg);
    for(let i=0;i<10;i++){
      const turn=node('g',{transform:'rotate('+(i*36)+')'},group);
      node('path',{'class':'garden-petal',d:'M0 1 C-16 -3 -22 -29 -10 -35 C2 -45 16 -28 11 -16 C8 -8 4 -2 0 1Z',fill:'url(#garden-petal-light)',stroke:'#b9ddff','stroke-width':'.45',style:'--petal-delay:'+(i*.035)+'s'},turn);
    }
    const center=node('g',{'class':'garden-flower-center'},group);
    node('circle',{r:5,fill:'#dddeb0'},center);
    for(let i=0;i<7;i++)node('circle',{cx:n(Math.cos(i)*7),cy:n(Math.sin(i)*7),r:1.1,fill:'#f3e8b9'},center);
    register(group,x,key,.38);
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
  function draw(){
    drawingFrame=0;
    world.style.setProperty('--garden-screen',camera.clientWidth+'px');
    const w=world.offsetWidth,h=camera.clientHeight;
    if(w===drawnWidth&&h===drawnHeight)return;
    drawnWidth=w;drawnHeight=h;segments=[];growth=[];
    svg.setAttribute('viewBox','0 0 '+w+' '+h);
    svg.innerHTML='<defs><linearGradient id="garden-stem-light" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#789d85"/><stop offset=".5" stop-color="#4c725e"/><stop offset="1" stop-color="#9cb5a0"/></linearGradient><linearGradient id="garden-leaf-light"><stop stop-color="#294a42"/><stop offset=".58" stop-color="#527b65"/><stop offset="1" stop-color="#729479"/></linearGradient><radialGradient id="garden-petal-light" cx=".48" cy=".75"><stop stop-color="#405bb1"/><stop offset=".58" stop-color="#6c9edc"/><stop offset="1" stop-color="#b8d8ef"/></radialGradient></defs>';
    atmosphere(w,h);
    const mobile=camera.clientWidth<761,origin=layoutPoint(track),gap=photos[1].offsetLeft-photos[0].offsetLeft;
    const anchors=photos.map((photo,i)=>{
      const rise=parseFloat(photo.style.getPropertyValue('--rise'))||0;
      const top=photo.offsetTop+rise,ph=photo.querySelector('.ribbon-print').offsetHeight;
      const size=mobile?160:205+(i%3)*10,turn=i%2?8:-8,mirror=i%2?-1:1;
      const y=fitY(i%2?top+155:top+ph-30,size,turn,mirror,h);
      const x=photo.offsetLeft+(i%2?65:photo.offsetWidth-65);
      place(sprays[i],x,y,size,turn,mirror);register(sprays[i],origin.x+x,'spray-'+i,.27);
      place(vines[i],photo.offsetLeft+photo.offsetWidth*.5,h*.53,Math.min(820,gap*1.36),i%2?3:-3,i%3===1?-1:1);
      register(vines[i],origin.x+photo.offsetLeft,'vine-'+i,.08);
      return {x:origin.x+x,y:origin.y+y};
    });
    const button=world.querySelector('#blue-play'),buttonPoint=layoutPoint(button);
    const rootPoint={x:buttonPoint.x+button.offsetWidth/2,y:buttonPoint.y+button.offsetHeight/2};
    const canopy=world.querySelector('.button-garden'),canopyPoint=layoutPoint(canopy);
    const join={x:rootPoint.x+canopy.offsetWidth*.37,y:canopyPoint.y+canopy.offsetHeight*.81};
    let previous=rootPoint;
    anchors.forEach((a,i)=>{
      const dx=(a.x-previous.x)*.5;
      const d=i===0?'M'+n(previous.x)+' '+n(previous.y)+' C'+n(previous.x)+' '+n(previous.y+90)+' '+n(join.x-70)+' '+n(join.y-25)+' '+n(join.x)+' '+n(join.y)+' C'+n(join.x+160)+' '+n(join.y+70)+' '+n(a.x-240)+' '+n(a.y)+' '+n(a.x)+' '+n(a.y):
        'M'+n(previous.x)+' '+n(previous.y)+' C'+n(previous.x+dx)+' '+n(previous.y)+' '+n(a.x-dx)+' '+n(a.y)+' '+n(a.x)+' '+n(a.y);
      const group=node('g',{'class':'garden-stem-segment','data-segment':i},svg);
      node('path',{'class':'garden-spine-path garden-spine-shadow',d,pathLength:1},group);
      const path=node('path',{'class':'garden-spine-path garden-spine-core',d,pathLength:1},group);
      segments.push({el:group,start:previous.x,end:a.x});
      const length=path.getTotalLength();
      for(let j=80;j<length-35;j+=96){
        const point=path.getPointAtLength(j),next=path.getPointAtLength(Math.min(length,j+2));
        if(i===0&&point.x<join.x-30)continue;
        const angle=Math.atan2(next.y-point.y,next.x-point.x)*180/Math.PI+(j%192?20:175);
        leaves(point.x,point.y,angle,'leaf-'+i+'-'+j);
      }
      if(i===0){
        const count=mobile?1:3,entryX=origin.x+photos[0].offsetLeft-35;
        bridge.forEach((plant,j)=>{
          plant.hidden=j>=count;if(plant.hidden)return;
          const wantedX=join.x+(entryX-join.x)*(j+1)/(count+1);
          let low=0,high=length;
          for(let k=0;k<18;k++){const mid=(low+high)/2;if(path.getPointAtLength(mid).x<wantedX)low=mid;else high=mid;}
          const point=path.getPointAtLength((low+high)/2);
          const size=mobile?105:155,turn=j%2?15:-8,mirror=j%2?-1:1;
          const y=fitY(point.y,size,turn,mirror,h);
          place(plant,point.x,y,size,turn,mirror);register(plant,point.x,'bridge-'+j,.28+j*.08);
        });
      }
      for(let j=0;j<2;j++){
        const point=path.getPointAtLength(length*(j?.72:.34));
        if(i===0&&point.x<join.x)continue;
        flower(point.x,point.y,(mobile?.48:.65)+(j*.12),'flower-'+i+'-'+j);
      }
      previous=a;
    });
    milestones.forEach(({el,index})=>{el.style.left=(origin.x+photos[index].offsetLeft)+'px'});
    updateGrowth();
  }
  function offset(){return tween?Math.max(0,-Number(window.gsap.getProperty(world,'x'))):camera.scrollLeft;}
  function updateGrowth(){
    if(!document.documentElement.classList.contains('garden-awake')||document.documentElement.classList.contains('theme-shifting'))return;
    if(!visible&&!reduced.matches)return;
    const reach=reduced.matches?Infinity:offset()+camera.clientWidth+Math.min(220,camera.clientWidth*.3);
    lastReach=Math.max(lastReach,reach);
    segments.forEach(({el,start,end})=>el.style.setProperty('--remaining',1-Math.min(1,Math.max(0,(lastReach-start)/Math.max(1,end-start)))));
    growth.forEach(({el,x,key})=>{
      if(x<lastReach&&!grown.has(key)){grown.add(key);el.classList.add('is-grown');}
    });
  }
  function scheduleDraw(){drawnWidth=0;if(!drawingFrame)drawingFrame=requestAnimationFrame(draw);}
  new ResizeObserver(scheduleDraw).observe(camera);
  new ResizeObserver(scheduleDraw).observe(intro.querySelector('.blue-invitation-inner'));
  document.fonts?.ready.then(scheduleDraw);
  const observer=new IntersectionObserver(entries=>{
    visible=entries[0].isIntersecting&&entries[0].intersectionRatio>.35;
    if(visible){MoonGarden.prepare();updateGrowth();}
  },{threshold:[0,.4,1]});observer.observe(camera);
  new MutationObserver(()=>{
    if(!document.documentElement.classList.contains('theme-shifting'))updateGrowth();
  }).observe(document.documentElement,{attributes:true,attributeFilter:['class']});
  document.addEventListener('garden:theme',({detail})=>{
    if(!detail.blue){
      lastReach=0;grown.clear();growth.forEach(({el})=>el.classList.remove('is-grown','was-grown'));
      segments.forEach(({el})=>el.style.setProperty('--remaining',1));
    } else updateGrowth();
  });
  function syncHint(){hint.textContent=tween?'慢慢滚动，和花一起向前。':'向右滑动，沿着花枝看回忆。';}
  camera.addEventListener('scroll',()=>{
    if(!tween){progress.style.transform='scaleX('+(distance()?camera.scrollLeft/distance():1)+')';updateGrowth();}
  },{passive:true});
  camera.addEventListener('keydown',event=>{
    if(!['ArrowRight','ArrowLeft','Home','End'].includes(event.key)||event.target.closest('button,a,input'))return;
    event.preventDefault();
    const step=photos[1].offsetLeft-photos[0].offsetLeft;
    const next=event.key==='Home'?0:event.key==='End'?distance():Math.max(0,Math.min(distance(),offset()+(event.key==='ArrowRight'?step:-step)));
    if(tween){const st=tween.scrollTrigger;scrollTo({top:st.start+next,behavior:'instant'});}
    else camera.scrollTo({left:next,behavior:reduced.matches?'instant':'smooth'});
  });
  function scrollTarget(target){
    if(!tween||!target||!world.contains(target))return null;
    const x=target===intro?0:target===section?section.offsetLeft:layoutPoint(target).x;
    return tween.scrollTrigger.start+Math.max(0,Math.min(distance(),x));
  }
  // Anchors inside a horizontal scene need a horizontal position, including on touch devices.
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
    animate({gsap,ScrollTrigger}){
      const nativeOffset=camera.scrollLeft;
      journey.classList.add('is-linked');camera.scrollLeft=0;draw();
      tween=gsap.to(world,{
        x:()=>-distance(),ease:'none',
        onUpdate(){if(!reduced.matches)rememberedOffset=this.progress()*distance();progress.style.transform='scaleX('+this.progress()+')';updateGrowth();},
        scrollTrigger:{id:'memory-ribbon',trigger:camera,start:'top top',end:()=>'+='+Math.max(1,distance()),pin:true,pinSpacing:true,scrub:.3,invalidateOnRefresh:true,anticipatePin:1,onRefresh:draw}
      });
      syncHint();
      if(nativeOffset>0)requestAnimationFrame(()=>{if(tween)scrollTo({top:tween.scrollTrigger.start+Math.min(nativeOffset,distance()),behavior:'instant'});});
      else if(['#blue-hour','#blue-memories'].includes(location.hash))requestAnimationFrame(()=>{
        if(!tween)return;
        const target=document.querySelector(location.hash);
        scrollTo({top:scrollTarget(target),behavior:'instant'});
      });
      return ()=>{
        const previousOffset=rememberedOffset;
        tween=null;journey.classList.remove('is-linked');progress.style.transform='scaleX(0)';syncHint();
        requestAnimationFrame(()=>{if(!tween&&reduced.matches)camera.scrollLeft=previousOffset;updateGrowth();});
      };
    }
  };
  reduced.addEventListener('change',()=>requestAnimationFrame(()=>{syncHint();updateGrowth();}));
  syncHint();scheduleDraw();
})();
