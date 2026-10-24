(() => {
  'use strict';
  const { gsap } = window;
  const scene = document.querySelector('#bloom-scene');
  if (!scene || !gsap) return;
  const camera = scene.querySelector('.bouquet-drift');
  const image = camera.querySelector('.bloom-bouquet');
  const petals = scene.querySelector('.bloom-petals');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(pointer: fine)');
  const canvas = document.createElement('canvas');
  canvas.className = 'living-bouquet';
  canvas.setAttribute('aria-hidden', 'true');
  camera.append(canvas);
  const atmosphere = document.createElement('div');
  atmosphere.className = 'rose-atmosphere';
  atmosphere.setAttribute('aria-hidden', 'true');
  atmosphere.innerHTML = '<span class="rose-warmth"></span><span class="rose-halo"></span><span class="rose-dust"></span>';
  scene.prepend(atmosphere);
  for (let i = 0; i < 16; i++) {
    const mote = document.createElement('i');
    mote.style.cssText = `--x:${8 + i * 37 % 84}%;--y:${8 + i * 23 % 70}%;--delay:${i * -.73}s`;
    atmosphere.lastElementChild.append(mote);
  }
  const satellites = [[8,24,82,-24],[88,15,58,25],[5,63,52,14],[91,54,90,-18],[18,79,39,-12]].map(([x,y,w,r],i) => {
    const flower = document.createElement('span');
    flower.className = 'floating-rose';
    flower.style.cssText = `--rose-x:${x}%;--rose-y:${y}%;--rose-size:${w}px`;
    const img = document.createElement('img');
    img.src = 'assets/rose-floating-v1.webp'; img.alt = ''; img.draggable = false;
    flower.append(img); atmosphere.append(flower);
    return { element:flower, r, i };
  });
  let gl, program, uniforms, gpu = false;
  let active = false, visible = false, ticking = false, reveal, pulse;
  let clock = 0, lastDrop = 0, lastFrame = 0, sceneWidth = 800, sceneHeight = 800;
  const state = { x:0, y:0, pulse:0, arrival:0 };
  const follow = {
    x:gsap.quickTo(state,'x',{duration:.85,ease:'power3.out'}),
    y:gsap.quickTo(state,'y',{duration:.85,ease:'power3.out'})
  };
  const particles = [];
  function shader(type, source) {
    const item = gl.createShader(type);
    gl.shaderSource(item, source); gl.compileShader(item);
    if (!gl.getShaderParameter(item, gl.COMPILE_STATUS)) throw Error('Flower shader unavailable');
    return item;
  }
  function initMesh() {
    try {
      gl = canvas.getContext('webgl', {alpha:true,antialias:true,premultipliedAlpha:true,powerPreference:'low-power'});
      if (!gl) return;
      const vertex = shader(gl.VERTEX_SHADER, `
        attribute vec2 uv; varying vec2 tex;
        uniform float time; uniform float motion; uniform float pulse;
        uniform vec2 pointer;
        void main(){
          tex=uv; vec2 p=uv;
          float crown=1.0-smoothstep(.56,.88,uv.y);
          float side=abs(uv.x-.5)*2.0;
          float sway=sin(time*.66+uv.x*7.0+uv.y*2.0);
          p.x+=crown*(sway*.0055*motion+pointer.x*(.009+side*.007));
          p.y+=crown*(cos(time*.83+uv.x*9.0)*.0028*motion+pointer.y*.006);
          vec2 center=uv-vec2(.51,.37);
          float depth=exp(-dot(center*2.5,center*2.5));
          p+=center*pulse*.032*crown;
          p+=pointer*depth*.009;
          gl_Position=vec4((p.x-.5)*1.88,(.5-p.y)*1.88,0.0,1.0);
        }`);
      const fragment = shader(gl.FRAGMENT_SHADER, `
        precision mediump float; varying vec2 tex; uniform sampler2D bouquet;
        void main(){ gl_FragColor=texture2D(bouquet,tex); }`);
      program = gl.createProgram(); gl.attachShader(program,vertex); gl.attachShader(program,fragment); gl.linkProgram(program);
      if (!gl.getProgramParameter(program,gl.LINK_STATUS)) throw Error('Flower renderer unavailable');
      gl.deleteShader(vertex); gl.deleteShader(fragment); gl.useProgram(program);
      const vertices=[];
      for(let y=0;y<28;y++) for(let x=0;x<24;x++) {
        const l=x/24,r=(x+1)/24,t=y/28,b=(y+1)/28;
        vertices.push(l,t,r,t,l,b,l,b,r,t,r,b);
      }
      const buffer=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);
      const location=gl.getAttribLocation(program,'uv'); gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location,2,gl.FLOAT,false,0,0);
      const texture=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      uniforms=Object.fromEntries(['time','motion','pulse','pointer'].map(n=>[n,gl.getUniformLocation(program,n)]));
      gpu=true; measure(); render(); camera.classList.add('has-living-mesh');
      scene.dataset.renderer='mesh';
    } catch { gpu=false; scene.dataset.renderer='image'; }
  }
  // A detailed textured mesh bends the original roses. No duplicate bloom layers or blur.
  const ready=image.decode().then(initMesh).catch(()=>{ scene.dataset.renderer='image'; });
  canvas.addEventListener('webglcontextlost',event=>{
    event.preventDefault();gpu=false;camera.classList.remove('has-living-mesh');scene.dataset.renderer='image';
  });
  canvas.addEventListener('webglcontextrestored',initMesh);
  function measure(){
    sceneWidth=scene.clientWidth||800;sceneHeight=scene.clientHeight||800;
    // Allocate once to native asset resolution, never resize through the reveal scale.
    if(gpu){
      if(canvas.width!==image.naturalWidth)canvas.width=image.naturalWidth;
      if(canvas.height!==image.naturalHeight)canvas.height=image.naturalHeight;
      gl.viewport(0,0,canvas.width,canvas.height);
    }
    if(active)render();
  }
  new ResizeObserver(measure).observe(scene);
  function render(){
    const moving=!reduced.matches;
    const breath=moving?Math.sin(clock*.65)*.003:0;
    camera.style.transform=`perspective(1300px) rotateY(${state.x*5}deg) rotateX(${-state.y*3}deg) rotate(${moving?Math.sin(clock*.42)*.55:0}deg) scale(${1+breath+state.pulse*.012})`;
    if(gpu){
      gl.useProgram(program);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(uniforms.time,clock);gl.uniform1f(uniforms.motion,moving?1:0);
      gl.uniform1f(uniforms.pulse,state.pulse);gl.uniform2f(uniforms.pointer,state.x,state.y);
      gl.drawArrays(gl.TRIANGLES,0,24*28*6);
    }
    for(const flower of satellites){
      const phase=clock*.58+flower.i*1.7;
      const dx=moving?Math.sin(phase)*7+state.x*(9+flower.i*2):0;
      const dy=moving?Math.cos(phase*.8)*10+state.y*6:0;
      flower.element.style.transform=`translate(-50%,-50%) translate(${dx}px,${dy+(1-state.arrival)*30}px) rotate(${flower.r+(moving?Math.sin(phase)*5:0)}deg) scale(${.7+state.arrival*.3})`;
    }
  }
  function clearParticles(){for(const p of particles)p.element.remove();particles.length=0;petals.replaceChildren();}
  function drop(burst=false){
    if(particles.length>=28)return;
    const el=document.createElement('i');el.className='rose-petal';
    const x=sceneWidth*(burst?.32+Math.random()*.36:.12+Math.random()*.76);
    const y=sceneHeight*(burst?.18+Math.random()*.3:.04+Math.random()*.08);
    const size=6+Math.random()*8;
    el.style.cssText=`width:${size}px;height:${size*1.45}px;--petal-hue:${Math.random()>.55?'#ec829e':'#af244f'}`;
    petals.append(el);
    particles.push({element:el,x,y,life:0,ttl:6+Math.random()*3,speed:35+Math.random()*28,vx:(Math.random()-.5)*(burst?65:14),rotation:Math.random()*360,seed:Math.random()*8});
  }
  function tick(time,delta){
    const dt=Math.min(delta/1000,.05);clock+=dt;
    if(time-lastFrame>1/45){render();lastFrame=time;}
    if(clock-lastDrop>.48){drop();lastDrop=clock;}
    for(let i=particles.length-1;i>=0;i--){
      const p=particles[i];p.life+=dt;p.x+=p.vx*dt;p.y+=p.speed*dt;p.rotation+=dt*27;
      const opacity=Math.min(p.life*2,1,Math.max(0,(p.ttl-p.life)*1.3))*.68;
      p.element.style.opacity=String(opacity);
      p.element.style.transform=`translate3d(${p.x+Math.sin(p.life*1.5+p.seed)*17}px,${p.y}px,0) rotate(${p.rotation}deg) rotateY(${p.life*90+p.seed}deg)`;
      if(p.life>p.ttl||p.y>sceneHeight+20){p.element.remove();particles.splice(i,1);}
    }
  }
  function updateRunning(){
    const run=active&&visible&&!document.hidden&&!reduced.matches;
    scene.classList.toggle('bouquet-awake',run);
    if(run&&!ticking){gsap.ticker.add(tick);ticking=true;}
    if(!run&&ticking){gsap.ticker.remove(tick);ticking=false;clearParticles();}
    if(!run&&active){center(true);}
  }
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;updateRunning();},{rootMargin:'0px'}).observe(scene);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){reveal?.progress(1);pulse?.progress(1);}updateRunning();});
  function settle(){state.arrival=1;scene.dataset.bouquetPhase='opened';render();updateRunning();}
  function open({instant=false}={}){
    active=true;clock=0;lastDrop=0;state.arrival=0;reveal?.kill();pulse?.kill();
    scene.dataset.bouquetPhase='presenting';scene.classList.add('bouquet-open');
    gsap.set(atmosphere,{opacity:0});measure();
    if(instant||reduced.matches){gsap.set(atmosphere,{opacity:1});settle();return;}
    reveal=gsap.timeline({onComplete:settle})
      .to(atmosphere,{opacity:1,duration:1.3,ease:'sine.out'},.55)
      .to(state,{arrival:1,duration:1.4,ease:'power2.out'},.6)
      .call(()=>burst(),[],1.15);
    updateRunning();
  }
  function burst(){if(!active||!visible||reduced.matches||document.hidden)return;for(let i=0;i<10;i++)drop(true);}
  function touch(){
    if(!active||reduced.matches)return;
    pulse?.kill();pulse=gsap.timeline().to(state,{pulse:1,duration:.2,ease:'power2.out'}).to(state,{pulse:0,duration:.85,ease:'sine.out'});
    burst();
  }
  function pointer(x,y){if(active&&!reduced.matches&&fine.matches){follow.x(x);follow.y(y);}}
  function center(instant=false){
    follow.x(0);follow.y(0);
    if(instant||reduced.matches){follow.x.tween.pause();follow.y.tween.pause();state.x=state.y=0;render();}
  }
  function reset(){
    active=false;reveal?.kill();pulse?.kill();state.pulse=state.arrival=0;
    if(ticking){gsap.ticker.remove(tick);ticking=false;}
    clearParticles();center(true);gsap.set(atmosphere,{opacity:0});
    scene.classList.remove('bouquet-open','bouquet-awake');scene.dataset.bouquetPhase='waiting';
  }
  reduced.addEventListener('change',()=>{
    if(reduced.matches){reveal?.progress(1);pulse?.kill();state.pulse=0;clearParticles();center(true);if(active)settle();}
    updateRunning();
  });
  window.BouquetDepth={ready,open,touch,burst,center,pointer,reset};
  reset();
})();
