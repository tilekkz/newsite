(() => {
  'use strict';
  const { gsap } = window;
  const section = document.querySelector('#surprise');
  const stage = section?.querySelector('#cat-stage');
  const button = section?.querySelector('#cat-button');
  const image = button?.querySelector('#kitten-image');
  const sprite = image?.parentElement;
  const world = stage?.querySelector('.cat-world');
  if (!gsap || !image || !world) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(pointer: fine)');
  const closed = new Image();
  closed.src = 'assets/kitten-blink-v1.webp';
  const canvas = document.createElement('canvas');
  canvas.className = 'living-kitten';
  canvas.setAttribute('aria-hidden', 'true');
  sprite.append(canvas);

  // Decorative layers never enter the hit-testing or accessibility trees.
  const garden = document.createElement('div');
  garden.className = 'kitten-garden';
  garden.setAttribute('aria-hidden', 'true');
  garden.innerHTML = '<div class="garden-aura"></div><div class="garden-floor-ring"></div><div class="garden-motes"></div><div class="garden-petals"></div><div class="garden-touch-dust"></div>';
  world.prepend(garden);
  const botanical = '<svg viewBox="0 0 100 240" fill="none"><path d="M52 234C18 188 76 148 42 104S48 43 68 8"/><path d="M44 203Q1 198 19 167Q45 170 44 203ZM44 159Q84 159 82 129Q56 131 44 159ZM42 114Q7 103 20 77Q47 84 42 114ZM48 69Q85 63 78 37Q55 43 48 69ZM60 29Q45 12 65 3Q77 16 60 29Z"/></svg>';
  for (let i = 0; i < 2; i++) {
    const sprig = document.createElement('span');
    sprig.className = 'garden-sprig sprig-' + i; sprig.innerHTML = botanical; garden.append(sprig);
    const charm = document.createElement('span');
    charm.className = 'garden-charm charm-' + i;
    charm.innerHTML = '<span class="charm-thread"></span><span class="charm-jewel">' + (i ? '✧' : '♡') + '</span>';
    garden.append(charm);
  }
  [[26,77,62,-23],[77,68,72,24],[19,22,38,12],[82,30,42,-18]].forEach(([x,y,size,rotate],i) => {
    const rose = document.createElement('span'); rose.className = 'garden-rose';
    rose.style.cssText = '--rx:'+x+'%;--ry:'+y+'%;--rs:'+size+'px;--rr:'+rotate+'deg;--delay:'+(-i*2.7)+'s';
    rose.innerHTML = '<img src="assets/rose-floating-v1.webp" alt="" loading="lazy" draggable="false">';
    garden.append(rose);
  });
  const motes = garden.querySelector('.garden-motes');
  for (let i=0;i<28;i++) {
    const mote=document.createElement('i');
    const x = i%2 ? 55+(i*17%37) : 7+(i*13%36);
    mote.style.cssText='--mx:'+x+'%;--my:'+(8+i*29%79)+'%;--delay:'+(-i*.83)+'s;--duration:'+(8+i%6)+'s;--size:'+(i%5===0?3:2)+'px';
    motes.append(mote);
  }
  const petals = garden.querySelector('.garden-petals');
  for (let i=0;i<10;i++) {
    const petal=document.createElement('i');
    petal.style.cssText='--px:'+(5+i*29%90)+'%;--delay:'+(-i*2.1)+'s;--duration:'+(12+i%5*1.7)+'s;--turn:'+(i%2?120:-95)+'deg;--drift:'+(i%2?38:-30)+'px';
    petals.append(petal);
  }

  let gl, program, buffer, textures = [], uniforms, gpu = false, blinkReady = false;
  let visible = false, running = false, clock = 0, lastDraw = 0;
  let nextBlink = 2.5, nextEar = 5, blinkAt = -100, earAt = -100;
  let blinkLength = .48, earSide = 1, doubleAt = Infinity, lastPet = -100;
  let frameWidth = 260, frameHeight = 390;
  const state = { blink:0, earLeft:0, earRight:0, x:0, y:0 };
  const drawn = { blink:NaN, earLeft:NaN, earRight:NaN, x:NaN, y:NaN };
  let gardenX = '', gardenY = '';
  const target = { x:0, y:0 };
  const dust = new Set();
  const random = (min,max) => min + Math.random()*(max-min);
  const resting = () => ['growing','close'].includes(stage.dataset.phase);
  const allowed = () => visible && resting() && !document.hidden && !reduced.matches && !document.querySelector('dialog[open]');
  const smooth = n => { n=Math.max(0,Math.min(1,n));return n*n*(3-2*n); };

  function shader(type,source) {
    const item=gl.createShader(type);gl.shaderSource(item,source);gl.compileShader(item);
    if(!gl.getShaderParameter(item,gl.COMPILE_STATUS)){gl.deleteShader(item);throw Error('Kitten shader unavailable');}
    return item;
  }
  function disposeMesh() {
    if (!gl || gl.isContextLost()) return;
    if(program)gl.deleteProgram(program);if(buffer)gl.deleteBuffer(buffer);
    textures.forEach(t=>gl.deleteTexture(t));textures=[];
  }
  function initMesh() {
    try {
      gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:true,powerPreference:'low-power'});
      if(!gl){button.dataset.renderer='image';return;}
      disposeMesh();
      const vertex=shader(gl.VERTEX_SHADER,`
        attribute vec2 uv; varying vec2 tex;
        uniform vec2 ears; uniform vec2 pointer; uniform vec2 frame;
        vec2 rotateAround(vec2 p,vec2 hinge,float angle){
          vec2 d=(p-hinge)*vec2(1203.0/1307.0,1.0);
          float c=cos(angle),s=sin(angle);
          return hinge+vec2(d.x*c-d.y*s,d.x*s+d.y*c)/vec2(1203.0/1307.0,1.0);
        }
        void main(){
          tex=uv; vec2 p=uv;
          float tip=1.0-smoothstep(.07,.225,uv.y);
          float left=tip*(1.0-smoothstep(.46,.53,uv.x));
          float right=tip*smoothstep(.55,.63,uv.x);
          p+= (rotateAround(uv,vec2(.355,.208),ears.x)-uv)*left;
          p+= (rotateAround(uv,vec2(.715,.205),ears.y)-uv)*right;
          float head=(1.0-smoothstep(.30,.61,uv.y));
          p+=pointer*vec2(.0035,.0018)*head;
          float scale=max(frame.x/1203.0,frame.y/1307.0);
          float width=1203.0*scale, height=1307.0*scale;
          float x=p.x*width-(width-frame.x)*.64;
          float y=p.y*height-(height-frame.y)+8.0;
          gl_Position=vec4(x/frame.x*2.0-1.0,1.0-y/(frame.y+16.0)*2.0,0.0,1.0);
        }`);
      const fragment=shader(gl.FRAGMENT_SHADER,`
        precision highp float;
        varying vec2 tex; uniform sampler2D portrait; uniform sampler2D eyelids;
        uniform float blink;
        vec4 eye(vec4 base, vec2 center, vec2 radius, float slope){
          vec2 q=(tex-center)/radius;
          float patch=1.0-smoothstep(.98,1.42,length(q));
          float amount=smoothstep(0.0,.13,blink)*patch;
          if(amount<=0.0)return base;
          float seam=center.y+(tex.x-center.x)*slope;
          float aperture=1.0-.97*blink;
          vec2 warped=tex;
          warped.y=seam+(tex.y-seam)/aperture;
          float inside=1.0-smoothstep(.80,1.02,length(vec2(q.x,(tex.y-seam)/radius.y/aperture)));
          inside*=1.0-smoothstep(.82,.99,blink);
          vec4 lid=texture2D(eyelids,tex);
          vec4 opening=texture2D(portrait,warped);
          return mix(base,mix(lid,opening,inside),amount);
        }
        void main(){
          vec4 color=texture2D(portrait,tex);
          color=eye(color,vec2(.442,.267),vec2(.064,.049),.16);
          color=eye(color,vec2(.608,.270),vec2(.064,.049),-.15);
          gl_FragColor=color;
        }`);
      program=gl.createProgram();gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);
      gl.deleteShader(vertex);gl.deleteShader(fragment);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Kitten renderer unavailable');
      gl.useProgram(program);
      const vertices=[];
      for(let y=0;y<72;y++)for(let x=0;x<56;x++){
        const l=x/56,r=(x+1)/56,t=y/72,b=(y+1)/72;
        vertices.push(l,t,r,t,l,b,l,b,r,t,r,b);
      }
      buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);
      const location=gl.getAttribLocation(program,'uv');gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,2,gl.FLOAT,false,0,0);
      [image,blinkReady?closed:image].forEach((source,i)=>{
        const texture=gl.createTexture();textures.push(texture);gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,texture);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
        gl.uniform1i(gl.getUniformLocation(program,i?'eyelids':'portrait'),i);
      });
      uniforms=Object.fromEntries(['ears','pointer','frame','blink'].map(n=>[n,gl.getUniformLocation(program,n)]));
      gpu=true;measure();render();sprite.classList.add('has-kitten-mesh');button.dataset.renderer='mesh';
    }catch{
      gpu=false;sprite.classList.remove('has-kitten-mesh');button.dataset.renderer='image';
    }
  }
  const ready=Promise.all([image.decode(),closed.decode().then(()=>{blinkReady=true}).catch(()=>{})])
    .then(()=>{initMesh();updateRunning()}).catch(()=>{button.dataset.renderer='image'});
  function measure(){
    frameWidth=sprite.clientWidth||260;frameHeight=sprite.clientHeight||390;
    if(gpu){
      // Keep the texture sharp even at the final 1.6x approach scale.
      const density=Math.min((devicePixelRatio||1)*1.65,3.2);
      const width=Math.round(frameWidth*density),height=Math.round((frameHeight+16)*density);
      if(canvas.width!==width)canvas.width=width;
      if(canvas.height!==height)canvas.height=height;
      gl.viewport(0,0,canvas.width,canvas.height);render();
    }
  }
  new ResizeObserver(measure).observe(sprite);
  function render(){
    if(!gpu)return;
    gl.useProgram(program);gl.uniform2f(uniforms.ears,state.earLeft,state.earRight);
    gl.uniform2f(uniforms.pointer,state.x,state.y);gl.uniform2f(uniforms.frame,frameWidth,frameHeight);
    gl.uniform1f(uniforms.blink,blinkReady?state.blink:0);
    gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLES,0,56*72*6);
    Object.assign(drawn,state);
  }
  function blink(slow=false){
    if(!running||!blinkReady||clock-blinkAt<1.1)return;
    blinkAt=clock;blinkLength=slow?.72:.48;nextBlink=clock+random(4.8,8.6);
    doubleAt=!slow&&Math.random()<.14?clock+.83:Infinity;
  }
  function twitch(){
    if(!running||clock-earAt<1.4)return;
    earAt=clock;earSide=Math.random()<.5?-1:1;nextEar=clock+random(7,12);
  }
  function clearDust(){
    for(const el of dust){gsap.killTweensOf(el);el.remove()}dust.clear();
  }
  function touchDust(event){
    if(!running||dust.size>=12)return;
    const bounds=stage.getBoundingClientRect();
    const x=event.clientX?event.clientX-bounds.left:bounds.width/2;
    const y=event.clientY?event.clientY-bounds.top:bounds.height*.55;
    for(let i=0;i<4&&dust.size<12;i++){
      const el=document.createElement('i');dust.add(el);garden.querySelector('.garden-touch-dust').append(el);
      gsap.fromTo(el,{x,y,scale:.5,opacity:.7},{x:x+random(-55,55),y:y-random(35,85),scale:0,opacity:0,duration:random(1,1.5),ease:'power2.out',onComplete:()=>{dust.delete(el);el.remove()}});
    }
  }
  function tick(time,delta){
    const dt=Math.min(delta/1000,.05);clock+=dt;
    if(clock>=nextBlink)blink();
    if(clock>=doubleAt){doubleAt=Infinity;blinkAt=clock;blinkLength=.36;}
    if(clock>=nextEar)twitch();
    const age=clock-blinkAt;
    const close=blinkLength*.3,hold=blinkLength*.14,open=blinkLength-close-hold;
    state.blink=age<close?smooth(age/close):age<close+hold?1:1-smooth((age-close-hold)/open);
    const earAge=clock-earAt;
    const ear=earAge<1.2?Math.sin(Math.min(1,earAge/1.2)*Math.PI*2)*Math.exp(-earAge*2.8)*.085:0;
    state.earLeft=earSide<0?ear:ear*.18;state.earRight=earSide>0?-ear:-ear*.18;
    state.x+=(target.x-state.x)*Math.min(1,dt*3);state.y+=(target.y-state.y)*Math.min(1,dt*3);
    const eyeState=state.blink>.96?'closed':state.blink>.02?'blinking':'open';
    if(button.dataset.eyes!==eyeState)button.dataset.eyes=eyeState;
    if(button.dataset.ears!==(Math.abs(ear)>.002?'moving':'rest'))button.dataset.ears=Math.abs(ear)>.002?'moving':'rest';
    const changed=Object.keys(drawn).some(key=>!Number.isFinite(drawn[key])||Math.abs(state[key]-drawn[key])>.00005);
    if(changed&&time-lastDraw>1/50){render();lastDraw=time;}
    const x=(state.x*8).toFixed(2)+'px',y=(state.y*5).toFixed(2)+'px';
    if(x!==gardenX){garden.style.setProperty('--look-x',x);gardenX=x;}
    if(y!==gardenY){garden.style.setProperty('--look-y',y);gardenY=y;}
  }
  function updateRunning(){
    const run=allowed();
    section.classList.toggle('kitten-awake',run);
    button.dataset.awake=String(run);
    if(run&&!running){running=true;nextBlink=clock+random(2.4,4.5);nextEar=clock+random(3.5,6);gsap.ticker.add(tick);}
    if(!run&&running){
      running=false;gsap.ticker.remove(tick);clearDust();doubleAt=Infinity;
      blinkAt=earAt=-100;state.blink=state.earLeft=state.earRight=state.x=state.y=target.x=target.y=0;
      button.dataset.eyes='open';button.dataset.ears='rest';
      garden.style.setProperty('--look-x','0px');garden.style.setProperty('--look-y','0px');gardenX=gardenY='0px';render();
    }
  }
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;updateRunning()},{threshold:.08}).observe(stage);
  new MutationObserver(updateRunning).observe(stage,{attributes:true,attributeFilter:['data-phase']});
  document.addEventListener('visibilitychange',updateRunning);
  for(const type of ['site:modal-open','site:modal-close']) document.addEventListener(type,updateRunning,true);
  reduced.addEventListener('change',updateRunning);
  section.addEventListener('pointermove',event=>{
    if(!running||!fine.matches||event.pointerType==='touch')return;
    const bounds=stage.getBoundingClientRect();
    target.x=Math.max(-1,Math.min(1,(event.clientX-bounds.left)/bounds.width*2-1));
    target.y=Math.max(-1,Math.min(1,(event.clientY-bounds.top)/bounds.height*2-1));
  },{passive:true});
  section.addEventListener('pointerleave',()=>{target.x=target.y=0});
  button.addEventListener('pointerenter',()=>{
    if(!running||!fine.matches||clock-lastPet<3)return;
    lastPet=clock;twitch();
  });
  button.addEventListener('click',event=>{
    if(!running||stage.dataset.clicks==='6')return;
    if(clock-lastPet>1.3){lastPet=clock;blink(true)}
    touchDust(event);
  });
  canvas.addEventListener('webglcontextlost',event=>{
    event.preventDefault();gpu=false;sprite.classList.remove('has-kitten-mesh');button.dataset.renderer='image';
  });
  canvas.addEventListener('webglcontextrestored',initMesh);
  window.KittenLife={ready,blink,twitch};
  updateRunning();
})();

