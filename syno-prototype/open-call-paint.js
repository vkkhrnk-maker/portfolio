/* Syno / living paint. Shared by the homepage and motion study. No dependencies.
   The original colour texture is warped, never reconstructed from flat dots.
   Pointer energy has a short memory and rendering stops after it settles. */
(() => {
  'use strict';
  const VERTEX = `
    attribute vec2 a_position;
    varying vec2 v_uv;
    void main() {
      v_uv = vec2(a_position.x * .5 + .5, .5 - a_position.y * .5);
      gl_Position = vec4(a_position, 0., 1.);
    }`;
  const FRAGMENT = `
    precision highp float;
    uniform sampler2D u_image;
    uniform sampler2D u_mask;
    uniform sampler2D u_flow;
    uniform vec2 u_view;
    uniform vec2 u_size;
    uniform vec2 u_offset;
    uniform float u_intro;
    uniform float u_assembly;
    uniform float u_brush;
    uniform float u_portrait;
    uniform vec4 u_open_box;
    uniform vec4 u_call_box;
    uniform float u_split;
    uniform vec2 u_hint;
    uniform float u_liquid;
    uniform float u_flow_range;
    varying vec2 v_uv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
    float noise(vec2 p) {
      vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
      return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);
    }
    void main() {
      vec2 uv = (v_uv * u_view - u_offset) / u_size;
      if (uv.x < 0. || uv.y < 0. || uv.x > 1. || uv.y > 1.) {
        gl_FragColor = vec4(vec3(28. / 255.), 1.); return;
      }
      vec2 flow = (texture2D(u_flow, v_uv).rg * 255. - 128.) / 127. * u_flow_range;
      float pointerEnergy = length(flow);
      // A single autonomous touch hints at interactivity, without a fake cursor.
      if (u_hint.x >= 0.) {
        float along = mix(uv.x, (uv.y - .36) * 1.45, u_portrait);
        float centre = mix(.04, .96, u_hint.x);
        float band = exp(-pow((along - centre) / .18, 2.));
        float envelope = sin(u_hint.x * 3.14159265) * u_hint.y;
        float inkZone = smoothstep(u_open_box.y - .06, u_open_box.y, uv.y)
          * (1. - smoothstep(u_call_box.w, u_call_box.w + .06, uv.y));
        vec2 hintPull = mix(vec2(5., -12.), vec2(26., -64.), u_liquid);
        hintPull *= 1. - u_liquid * u_portrait * .45;
        flow += hintPull * band * envelope * inkZone;
      }
      float grain = noise(uv * vec2(82., 34.));
      float bristle = sin(uv.y * u_size.y * 1.4 + grain * 6.28);
      // Tangential pull carries the real impasto and its internal highlights.
      vec2 warped = uv - flow / u_size;
      warped += vec2(bristle, -bristle * .35) * length(flow) * .055 / u_size * (1. - u_liquid);
      vec3 paint = texture2D(u_image, clamp(warped, 0., 1.)).rgb;
      // A soft optical fringe belongs only to the two Supersolid-inspired studies.
      if (u_liquid > .5) {
        vec2 fringe = flow * .018 / u_size;
        paint.r = texture2D(u_image, clamp(warped + fringe, 0., 1.)).r;
        paint.b = texture2D(u_image, clamp(warped - fringe, 0., 1.)).b;
      }
      vec2 mask = texture2D(u_mask, warped).rg;
      vec3 plate = vec3(28. / 255. + (noise(uv * 360.) - .5) * .003);
      float sweep = clamp((u_intro * 1.28 - uv.x * .58 - grain * .16) / .25, 0., 1.);
      sweep = sweep * sweep * (3. - 2. * sweep);
      float edgeSettle = mask.g * smoothstep(.52,.74,grain) * (1. - u_intro);
      float reveal = mix(1. - edgeSettle * .86, sweep, u_assembly);
      vec3 colour = mix(plate, paint, reveal);
      if (u_brush > .5) {
        float second = step(u_split, mix(uv.x, uv.y, u_portrait));
        vec4 bounds = mix(u_open_box, u_call_box, second);
        vec2 local = (uv - bounds.xy) / max(bounds.zw - bounds.xy, vec2(.01));
        float phase = clamp((u_intro - second * .34) / mix(.64, .66, second), 0., 1.);
        float eased = phase * phase * (3. - 2. * phase);
        // One angled, bristled leading edge per word; no flying entrance chips.
        float bristles = (noise(vec2(uv.y * u_size.y * .6, 7.)) - .5) * .035;
        bristles += sin(uv.y * u_size.y * 1.6) * .007;
        float edge = local.x + (local.y - .5) * .10 + bristles;
        float tip = mix(-.16, 1.16, eased);
        float stroke = 1. - smoothstep(tip - .018, tip + .008, edge);
        // Keep the dark surface stable, erasing only the foreground pigment.
        float pigment = smoothstep(0., .10, mask.r);
        colour = mix(paint, plate, pigment * (1. - stroke));
      }
      // A trace of blue is exposed by motion; the whole canvas never glows.
      float blueTrace = min(pointerEnergy / 26., 1.) * mask.r * .11 * (1. - u_liquid);
      colour = mix(colour, vec3(.20,.47,.66), blueTrace);
      gl_FragColor = vec4(colour, 1.);
    }`;

  window.createSynoPaint = function ({host, canvas, fallback, mode = 'alive', onActivity = () => {}, onHintState = () => {}}) {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const fine = matchMedia('(hover: hover) and (pointer: fine)');
    const liquid = mode === 'fluid' || mode === 'type';
    const typeArtwork = mode === 'type' ? host.querySelector('.open-call-type-art') : null;
    const flowRange = liquid ? 96 : 32;
    const hintDuration = liquid ? 2200 : 1600;
    const strokeEntrance = mode === 'brush' || mode === 'brush-auto';
    const immediateEntrance = mode === 'alive' || mode === 'still' || liquid;
    const automaticHint = mode === 'alive' || mode === 'brush-auto' || liquid;
    const duration = strokeEntrance ? 1050 : mode === 'assembly' ? 1450 : 800;
    host.classList.toggle('paint-brush', strokeEntrance);
    host.classList.toggle('paint-enter-pending', strokeEntrance && !reduced.matches);
    const gridW = 100, gridH = 56;
    const flowX = new Float32Array(gridW * gridH);
    const flowY = new Float32Array(gridW * gridH);
    const flowData = new Uint8Array(gridW * gridH * 4);
    const source = new Image();
    const dust = document.createElement('canvas');
    dust.className = 'open-call-motion-canvas open-call-motion-dust';
    dust.setAttribute('aria-hidden', 'true');
    canvas.after(dust);
    const dc = dust.getContext('2d');
    const sample = document.createElement('canvas');
    const sc = sample.getContext('2d', {willReadFrequently: true});
    const atlas = document.createElement('canvas');
    atlas.width = atlas.height = 512;
    const ac = atlas.getContext('2d', {willReadFrequently: true});
    let gl, program, textures, uniforms;
    let active = false, prepared = false, broken = false, destroyed = false;
    let raf = 0, lastAt = 0, introAt = -Infinity, played = false, framing = false;
    let lastPointer = null, lastInteraction = -Infinity, lastEmit = -Infinity;
    let width = 1, height = 1, scale = 1, ox = 0, oy = 0, dpr = 1;
    let maskPixels, maskWidth = 1, maskHeight = 1, chips = [], flying = [];
    let introChips = false, activity = false, demoAt = -Infinity;
    let interactionCount = 0;
    let openBox = [0, 0, .5, 1], callBox = [.5, 0, 1, 1], wordSplit = .5;
    let hintTimer = 0, hintAt = -Infinity, hintCancelAt = -Infinity;
    let hintProgress = -1, hintGain = 1;
    let manualHint = false;
    let typeSourceKey = '', fontsReady = !typeArtwork;
    const listeners = [];
    const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
    const noise = (i, salt) => { const v = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453; return v - Math.floor(v); };
    const listen = (el, name, fn, options) => { el.addEventListener(name, fn, options); listeners.push(() => el.removeEventListener(name, fn, options)); };
    const setActivity = value => {
      if (activity === value) return;
      activity = value;
      onActivity(value);
    };
    const setState = state => { canvas.dataset.motionState = state; };
    const setHintState = state => {canvas.dataset.motionHint = state; onHintState(state);};

    function compile(type, code) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, code); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const error = gl.getShaderInfoLog(shader); gl.deleteShader(shader); throw new Error(error);
      }
      return shader;
    }
    function initGL() {
      gl = canvas.getContext('webgl', {alpha: false, antialias: false, depth: false, powerPreference: 'low-power'});
      if (!gl) throw new Error('WebGL unavailable');
      const vs = compile(gl.VERTEX_SHADER, VERTEX), fs = compile(gl.FRAGMENT_SHADER, FRAGMENT);
      program = gl.createProgram(); gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program);
      gl.deleteShader(vs); gl.deleteShader(fs);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
      gl.useProgram(program);
      const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
      const attr = gl.getAttribLocation(program, 'a_position');
      gl.enableVertexAttribArray(attr); gl.vertexAttribPointer(attr, 2, gl.FLOAT, false, 0, 0);
      textures = ['u_image','u_mask','u_flow'].map((name, i) => {
        const texture = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.uniform1i(gl.getUniformLocation(program, name), i);
        return texture;
      });
      uniforms = Object.fromEntries(['u_view','u_size','u_offset','u_intro','u_assembly','u_brush','u_portrait','u_open_box','u_call_box','u_split','u_hint','u_liquid','u_flow_range'].map(name => [name, gl.getUniformLocation(program, name)]));
    }
    function fail(error) {
      broken = true; prepared = false; cancelAnimationFrame(raf); raf = 0;
      cancelHint(); setHintState('unavailable'); host.classList.remove('paint-enter-pending');
      canvas.classList.remove('is-ready'); dust.classList.remove('is-ready');
      setActivity(false); setState('static-fallback');
      console.warn('Syno paint: using the static artwork.', error.message || error);
    }

    function prepare() {
      if (destroyed || broken || !source.naturalWidth) return;
      try {
        if (!gl) initGL();
        maskWidth = Math.min(836, source.naturalWidth);
        maskHeight = Math.round(maskWidth * source.naturalHeight / source.naturalWidth);
        sample.width = maskWidth; sample.height = maskHeight;
        sc.drawImage(source, 0, 0, maskWidth, maskHeight);
        const pixels = sc.getImageData(0, 0, maskWidth, maskHeight);
        maskPixels = new Uint8Array(maskWidth * maskHeight);
        for (let i = 0; i < maskPixels.length; i++) {
          const p = i * 4;
          const light = pixels.data[p] * .2126 + pixels.data[p+1] * .7152 + pixels.data[p+2] * .0722;
          maskPixels[i] = Math.round(clamp((light - 40) / 90) * 255);
        }
        // Word bounds come from each actual desktop/portrait texture.
        const portrait = source.naturalHeight > source.naturalWidth;
        wordSplit = portrait ? .69 : .505;
        const boxes = [[1,1,0,0],[1,1,0,0]];
        for (let y = 0; y < maskHeight; y++) for (let x = 0; x < maskWidth; x++) {
          if (maskPixels[y * maskWidth + x] < 180) continue;
          const nx = x / maskWidth, ny = y / maskHeight;
          const b = boxes[(portrait ? ny : nx) >= wordSplit ? 1 : 0];
          b[0] = Math.min(b[0], nx); b[1] = Math.min(b[1], ny);
          b[2] = Math.max(b[2], nx); b[3] = Math.max(b[3], ny);
        }
        [openBox, callBox] = boxes.map(b => b[2] > b[0] ? b : [0,0,1,1]);
        const mask = sc.createImageData(maskWidth, maskHeight);
        const candidates = [];
        for (let y = 0; y < maskHeight; y++) for (let x = 0; x < maskWidth; x++) {
          const i = y * maskWidth + x;
          let low = 255, high = 0;
          for (const [dx,dy] of [[-3,0],[3,0],[0,-3],[0,3]]) {
            const a = maskPixels[clamp(y+dy,0,maskHeight-1)*maskWidth+clamp(x+dx,0,maskWidth-1)];
            low = Math.min(low,a); high = Math.max(high,a);
          }
          const edge = high - low;
          mask.data[i*4] = maskPixels[i]; mask.data[i*4+1] = edge; mask.data[i*4+3] = 255;
          if (x % 3 === 0 && y % 3 === 0 && maskPixels[i] > 150 && edge > 90) candidates.push({x,y});
        }
        sc.putImageData(mask,0,0);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,textures[0]);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D,textures[1]);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,sample);
        // Atlas chips retain the source bristles, paint colours and lighting.
        ac.clearRect(0,0,512,512);
        chips = [];
        const sourceRatio = source.naturalWidth / maskWidth;
        for (let i = 0; i < Math.min(192,candidates.length); i++) {
          const p = candidates[Math.floor(noise(i,4)*candidates.length)];
          const x = p.x * sourceRatio, y = p.y * sourceRatio;
          const w = (9+noise(i,7)*19)*sourceRatio, h = (4+noise(i,9)*9)*sourceRatio;
          const ax = (i%16)*32, ay = Math.floor(i/16)*32;
          ac.drawImage(source,x-w/2,y-h/2,w,h,ax,ay,32,32);
          chips.push({x,y,w,h,ax,ay,seed:i});
        }
        const atlasPixels = ac.getImageData(0,0,512,512);
        for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
          const i = (y*512+x)*4;
          const light = atlasPixels.data[i]*.2126+atlasPixels.data[i+1]*.7152+atlasPixels.data[i+2]*.0722;
          const nx = ((x%32)+.5)/16-1, ny = ((y%32)+.5)/16-1;
          atlasPixels.data[i+3] *= clamp((light-38)/75) * clamp((1-Math.hypot(nx,ny))/.28);
        }
        ac.putImageData(atlasPixels,0,0);
        gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D,textures[2]);
        for (let i=0;i<flowData.length;i+=4) {flowData[i]=flowData[i+1]=128;flowData[i+3]=255;}
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gridW,gridH,0,gl.RGBA,gl.UNSIGNED_BYTE,flowData);
        prepared = true;
        resize();
        if (active) play();
        else host.classList.remove('paint-enter-pending');
      } catch(error) { fail(error); }
    }

    function resize() {
      width = Math.max(1,host.clientWidth); height = Math.max(1,host.clientHeight);
      dpr = Math.min(devicePixelRatio || 1,1.75);
      canvas.width = dust.width = Math.round(width*dpr);
      canvas.height = dust.height = Math.round(height*dpr);
      scale = Math.min(width / (source.naturalWidth || 1), height / (source.naturalHeight || 1));
      ox = (width-source.naturalWidth*scale)/2; oy = (height-source.naturalHeight*scale)/2;
      if (prepared && !broken) {gl.viewport(0,0,canvas.width,canvas.height); draw(1);}
    }
    function draw(intro) {
      if (!prepared || broken) return;
      gl.uniform2f(uniforms.u_view,width,height);
      gl.uniform2f(uniforms.u_size,source.naturalWidth*scale,source.naturalHeight*scale);
      gl.uniform2f(uniforms.u_offset,ox,oy);
      gl.uniform1f(uniforms.u_intro,intro);
      gl.uniform1f(uniforms.u_assembly,mode==='assembly' ? 1 : 0);
      gl.uniform1f(uniforms.u_brush,strokeEntrance ? 1 : 0);
      gl.uniform1f(uniforms.u_portrait,source.naturalHeight > source.naturalWidth ? 1 : 0);
      gl.uniform4f(uniforms.u_open_box,...openBox);
      gl.uniform4f(uniforms.u_call_box,...callBox);
      gl.uniform1f(uniforms.u_split,wordSplit);
      gl.uniform2f(uniforms.u_hint,hintProgress,hintGain);
      gl.uniform1f(uniforms.u_liquid,liquid ? 1 : 0);
      gl.uniform1f(uniforms.u_flow_range,flowRange);
      gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D,textures[2]);
      gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,gridW,gridH,gl.RGBA,gl.UNSIGNED_BYTE,flowData);
      gl.drawArrays(gl.TRIANGLES,0,6);
    }
    function frame(now) {
      raf=0;
      if (!active || !prepared || broken || reduced.matches || document.hidden) return;
      framing=true;
      if (hintAt !== -Infinity) {
        hintProgress = clamp((now - hintAt) / hintDuration);
        hintGain = hintCancelAt === -Infinity ? 1 : clamp(1 - (now - hintCancelAt) / 180);
        if (hintProgress >= 1 || hintGain === 0) {
          hintAt = -Infinity; hintProgress = -1; manualHint = false;
          setHintState(hintGain === 0 ? 'cancelled' : 'complete');
        }
      }
      const dt = Math.min(48,now-(lastAt || now-16)); lastAt=now;
      const demoTime=clamp((now-demoAt)/1400);
      let demoPoint=null;
      if(demoTime>=0 && demoTime<1) {
        const t=.5-Math.cos(demoTime*Math.PI)*.5;
        const x=ox+source.naturalWidth*scale*(.16+t*.70);
        const y=oy+source.naturalHeight*scale*((source.naturalHeight>source.naturalWidth?.62:.52)+Math.sin(t*Math.PI*2)*.06);
        brush(x,y,now); demoPoint={x,y};
      }
      const decay = Math.exp(-dt/(liquid ? 320 : 145));
      let energy=0;
      for (let i=0;i<flowX.length;i++) {
        flowX[i]*=decay; flowY[i]*=decay;
        energy=Math.max(energy,Math.abs(flowX[i]),Math.abs(flowY[i]));
        flowData[i*4]=Math.round(128+clamp(flowX[i]/flowRange,-1,1)*127);
        flowData[i*4+1]=Math.round(128+clamp(flowY[i]/flowRange,-1,1)*127);
      }
      const intro = immediateEntrance ? 1 : clamp((now-introAt)/duration);
      draw(intro);
      dc.setTransform(dpr,0,0,dpr,0,0); dc.clearRect(0,0,width,height);
      if (introChips && intro<1) {
        const count = mode==='assembly' ? chips.length : Math.min(44,chips.length);
        for (let i=0;i<count;i++) {
          const chip=chips[i], delay=(chip.x/source.naturalWidth)*.17+noise(i,11)*.06;
          const t=clamp((intro-delay)/(1-delay));
          const travel=Math.pow(1-t,3);
          const angle=(noise(i,12)-.5)*1.7;
          const reach=mode==='assembly' ? 100+noise(i,13)*170 : 18+noise(i,13)*42;
          const x=ox+chip.x*scale+Math.cos(angle)*reach*travel;
          const y=oy+chip.y*scale+Math.sin(angle)*reach*travel;
          drawChip(chip,x,y,angle*travel,Math.sin(Math.PI*t)*.88);
        }
      }
      flying=flying.filter(p=>now-p.at<680);
      for (const p of flying) {
        const t=clamp((now-p.at)/680), travel=Math.sin(Math.PI*t)*Math.pow(1-t,.5);
        drawChip(p.chip,ox+p.chip.x*scale+p.dx*travel,oy+p.chip.y*scale+p.dy*travel,p.spin*travel,Math.sin(Math.PI*t)*.8);
      }
      if (activity && now-lastInteraction>680) setActivity(false);
      if(demoPoint && !liquid) {
        dc.beginPath();dc.arc(demoPoint.x,demoPoint.y,7,0,Math.PI*2);
        dc.strokeStyle='rgba(255,255,255,.9)';dc.lineWidth=1;dc.stroke();
      }
      if (intro<1 || energy>.06 || flying.length || activity || demoPoint || hintProgress >= 0) {
        setState(intro<1 ? 'entering' : hintProgress >= 0 ? 'hint' : 'reacting'); raf=requestAnimationFrame(frame);
      } else {
        flowX.fill(0); flowY.fill(0);
        for (let i=0;i<flowData.length;i+=4) flowData[i]=flowData[i+1]=128;
        draw(1); introChips=false; lastAt=0; setState('rest');
      }
      framing=false;
    }
    function drawChip(chip,x,y,angle,alpha) {
      if (alpha<.01) return;
      dc.save(); dc.translate(x,y); dc.rotate(angle); dc.globalAlpha=alpha;
      dc.drawImage(atlas,chip.ax,chip.ay,32,32,-chip.w*scale/2,-chip.h*scale/2,chip.w*scale,chip.h*scale);
      dc.restore();
    }
    function wake() {
      if (!raf && !framing && active && prepared && !reduced.matches && !document.hidden && !broken) raf=requestAnimationFrame(frame);
    }
    function cancelHint(soft = false) {
      if (hintTimer || hintAt !== -Infinity) setHintState('cancelled');
      clearTimeout(hintTimer); hintTimer = 0;
      if (soft && hintAt !== -Infinity) {
        if (hintCancelAt === -Infinity) hintCancelAt = performance.now();
        wake();
      } else {hintAt = -Infinity; hintProgress = -1; hintGain = 1; manualHint = false;}
    }
    function startHint(manual = false) {
      if (!active || !prepared || broken || destroyed || reduced.matches || document.hidden) return;
      manualHint = manual;
      hintAt = performance.now(); hintCancelAt = -Infinity; hintProgress = 0; hintGain = 1;
      setHintState('playing'); setState('hint'); wake();
    }
    function scheduleHint() {
      if (!automaticHint || reduced.matches) return;
      setHintState('waiting');
      // No animation frames run during this pause. One hint, never an idle loop.
      hintTimer = setTimeout(() => {
        hintTimer = 0;
        startHint();
      }, (immediateEntrance ? 0 : duration) + 1100);
    }
    function hit(x,y) {
      const mx=Math.round((x-ox)/(source.naturalWidth*scale)*maskWidth);
      const my=Math.round((y-oy)/(source.naturalHeight*scale)*maskHeight);
      // Expanded contour: movement can be discovered just before touching paint.
      const reach=Math.max(2,Math.round(12/scale*maskWidth/source.naturalWidth));
      for (const [dx,dy] of [[0,0],[reach,0],[-reach,0],[0,reach],[0,-reach]]) {
        const xx=mx+dx, yy=my+dy;
        if(xx>=0&&yy>=0&&xx<maskWidth&&yy<maskHeight&&maskPixels[yy*maskWidth+xx]>80) return true;
      }
      return false;
    }
    function pointerMove(event) {
      if (!active || !prepared || broken || reduced.matches || !fine.matches || event.pointerType==='touch') return;
      // Explicit replay owns this short preview; merely moving the mouse must
      // not cancel the action the user just requested. Native links still work.
      if (manualHint) return;
      if(event.target.closest('.hero-copy')) {lastPointer=null; return;}
      const rect=canvas.getBoundingClientRect();
      const x=(event.clientX-rect.left)/rect.width*width, y=(event.clientY-rect.top)/rect.height*height;
      if (hit(x,y)) cancelHint(true);
      brush(x,y,performance.now());
    }
    function brush(x,y,now) {
      const prev=lastPointer;
      lastPointer={x,y,at:now};
      if(!prev || now-prev.at>120 || !hit(x,y)) return;
      const dx=x-prev.x, dy=y-prev.y, distance=Math.hypot(dx,dy);
      if(distance<.25) return;
      const speed=distance/Math.max(8,now-prev.at);
      const strength=liquid ? Math.min(42,9+speed*12) : Math.min(15,3+speed*5.5);
      const radius=liquid ? Math.min(160,Math.max(76,height*.22)) : Math.min(84,Math.max(46,height*.105));
      // Inject along the complete segment, avoiding gaps on quick gestures.
      const steps=Math.min(10,Math.max(1,Math.ceil(distance/16)));
      for(let n=1;n<=steps;n++) {
        const px=prev.x+dx*n/steps, py=prev.y+dy*n/steps;
        const minX=Math.max(0,Math.floor((px-radius)/width*gridW)), maxX=Math.min(gridW-1,Math.ceil((px+radius)/width*gridW));
        const minY=Math.max(0,Math.floor((py-radius)/height*gridH)), maxY=Math.min(gridH-1,Math.ceil((py+radius)/height*gridH));
        for(let gy=minY;gy<=maxY;gy++) for(let gx=minX;gx<=maxX;gx++) {
          const rx=(gx+.5)/gridW*width-px, ry=(gy+.5)/gridH*height-py;
          const d=Math.hypot(rx,ry), influence=Math.pow(Math.max(0,1-d/radius),2);
          const i=gy*gridW+gx;
          const pullX=(dx/distance*.8+rx/Math.max(1,d)*.2)*strength*influence;
          const pullY=(dy/distance*.8+ry/Math.max(1,d)*.2)*strength*influence;
          const limit=liquid ? 68 : 24;
          flowX[i]=clamp(flowX[i]+pullX*.6,-limit,limit); flowY[i]=clamp(flowY[i]+pullY*.6,-limit,limit);
        }
      }
      if(!liquid && speed>.7 && now-lastEmit>65) {
        lastEmit=now;
        let emitted=0;
        for(const chip of chips) {
          if(emitted===4 || flying.length>=32) break;
          if(Math.hypot(ox+chip.x*scale-x,oy+chip.y*scale-y)>radius*.75) continue;
          flying.push({chip,at:now,dx:dx/distance*(14+noise(chip.seed,1)*30),dy:dy/distance*28-8,spin:(noise(chip.seed,2)-.5)*.5});
          emitted++;
        }
      }
      lastInteraction=now; setActivity(true);
      canvas.dataset.motionInteractions=String(++interactionCount);
      wake();
    }
    function reset() {
      cancelHint();
      cancelAnimationFrame(raf); raf=0; lastAt=0; lastPointer=null; flying=[]; demoAt=-Infinity;
      flowX.fill(0); flowY.fill(0);
      for(let i=0;i<flowData.length;i+=4) flowData[i]=flowData[i+1]=128;
      dc.clearRect(0,0,dust.width,dust.height); setActivity(false);
    }
    function play(replay=false) {
      if (!prepared || broken) return;
      if(reduced.matches) {
        reset(); host.classList.remove('paint-enter-pending'); canvas.classList.remove('is-ready'); dust.classList.remove('is-ready'); setState('reduced-motion'); return;
      }
      const enter=replay||!played;
      if(enter) {reset();introAt=immediateEntrance?-Infinity:performance.now();introChips=!strokeEntrance&&!immediateEntrance;played=true;scheduleHint();}
      draw(enter&&!immediateEntrance?0:1); canvas.classList.add('is-ready');dust.classList.add('is-ready'); wake();
      host.classList.remove('paint-enter-pending');
    }
    function sync(value) {
      const next=Boolean(value);
      if(active===next)return;
      active=next;
      if(active) play();
      else {reset();introAt=-Infinity; if(prepared)draw(1); setState('inactive');}
    }
    function loadSource() {
      if (typeArtwork) {
        if (!fontsReady || destroyed || broken || !host.clientWidth || !host.clientHeight) return;
        const key=host.clientWidth+'x'+host.clientHeight;
        if (key===typeSourceKey) return;
        typeSourceKey=key;
        // Rasterise our live Schengen typesetting for the shader. The DOM remains
        // underneath as the immediate, reduced-motion and graphics-error fallback.
        const plate=document.createElement('canvas');
        const ratio=Math.min(devicePixelRatio||1,1.75,2048/host.clientWidth);
        plate.width=Math.round(host.clientWidth*ratio);plate.height=Math.round(host.clientHeight*ratio);
        const ctx=plate.getContext('2d');
        ctx.scale(ratio,ratio);ctx.fillStyle='#1c1c1c';ctx.fillRect(0,0,host.clientWidth,host.clientHeight);
        const origin=host.getBoundingClientRect();
        for (const word of typeArtwork.children) {
          const style=getComputedStyle(word), box=word.getBoundingClientRect();
          ctx.font=style.fontWeight+' '+style.fontSize+' '+style.fontFamily;
          ctx.fillStyle=style.color;ctx.textBaseline='alphabetic';
          ctx.letterSpacing=style.letterSpacing;
          const metrics=ctx.measureText(word.textContent);
          const ascent=metrics.fontBoundingBoxAscent ?? parseFloat(style.fontSize)*.8;
          const descent=metrics.fontBoundingBoxDescent ?? parseFloat(style.fontSize)*.2;
          const leading=(parseFloat(style.lineHeight)-ascent-descent)/2;
          ctx.fillText(word.textContent,box.left-origin.left,box.top-origin.top+leading+ascent);
        }
        reset();prepared=false;canvas.classList.remove('is-ready');dust.classList.remove('is-ready');
        source.src=plate.toDataURL();
        return;
      }
      const url=fallback.currentSrc||fallback.src;
      if(!url||source.src===url||destroyed) return;
      reset(); prepared=false; canvas.classList.remove('is-ready');dust.classList.remove('is-ready');
      source.src=url;
    }
    listen(source,'load',prepare);
    listen(source,'error',()=>fail(new Error('Artwork unavailable')));
    listen(fallback,'load',loadSource);
    listen(host,'pointermove',pointerMove,{passive:true});
    listen(host,'pointerleave',()=>{lastPointer=null;});
    listen(reduced,'change',()=>{if(active)play();});
    listen(fine,'change',()=>{reset();if(prepared)draw(1);});
    listen(canvas,'webglcontextlost',event=>{event.preventDefault();fail(new Error('Graphics context lost'));});
    const resizeObserver=new ResizeObserver(()=>{resize();loadSource();});resizeObserver.observe(host);
    if (typeArtwork) document.fonts.load('500 100px "Schengen Core"').then(()=>{
      fontsReady=true;loadSource();
    }).catch(error=>fail(error));
    loadSource();
    return {
      sync,
      stop:()=>sync(false),
      replay:()=>{
        if(!active||!prepared||broken||reduced.matches||destroyed)return;
        if(mode!=='alive'&&!liquid) {play(true);return;}
        reset();introAt=-Infinity;introChips=false;played=true;
        startHint(true);draw(1);
      },
      demonstrate:()=>{
        if(!active||!prepared||reduced.matches||broken)return;
        cancelHint(true);
        introAt=-Infinity;lastPointer=null;demoAt=performance.now();wake();
      },
      destroy:()=>{destroyed=true;reset();host.classList.remove('paint-enter-pending');resizeObserver.disconnect();listeners.forEach(off=>off());dust.remove();},
    };
  };
})();
