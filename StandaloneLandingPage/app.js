(() => {
  const signup = document.querySelector('#signup-form');
  const signupField = document.querySelector('#signup-field');
  const signupEmail = document.querySelector('#signup-email');
  const signupShapeText = document.querySelector('#signup-shape-text');
  const signupStatus = document.querySelector('#signup-status');
  const signupButton = signup.querySelector('button[type="submit"]');
  const signupButtonSvg = signupButton.querySelector('svg');
  const signupButtonText = signupButtonSvg.querySelector('text');
  const textMeasure = document.createElement('canvas').getContext('2d');

  function updateSignupShape() {
    const style = getComputedStyle(signupEmail);
    const text = signupEmail.value || signupEmail.placeholder;
    textMeasure.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const metrics = textMeasure.measureText(text);
    const fontSize = parseFloat(style.fontSize);
    const padding = fontSize * 0.7;
    signupField.style.width = `${Math.ceil(metrics.width + padding * 2 + 3)}px`;
    signupShapeText.textContent = text;
    signupShapeText.setAttribute('x', padding - signupEmail.scrollLeft);
    signupShapeText.setAttribute('y', signupField.clientHeight / 2 + ((metrics.actualBoundingBoxAscent || fontSize * 0.7) - (metrics.actualBoundingBoxDescent || fontSize * 0.2)) / 2);
  }

  signupEmail.addEventListener('input', () => { signupStatus.textContent = ''; updateSignupShape(); });
  signupEmail.addEventListener('scroll', updateSignupShape);
  window.addEventListener('resize', updateSignupShape);
  document.fonts.ready.then(updateSignupShape);
  updateSignupShape();

  function setSignupButtonLabel(label) {
    signupButtonText.textContent = label;
    signupButton.setAttribute('aria-label', label);
    const viewWidth = Math.max(310, Math.ceil(signupButtonText.getComputedTextLength() + 90));
    signupButtonSvg.setAttribute('viewBox', `${120 - viewWidth / 2} -40 ${viewWidth} 185`);
    signupButton.style.width = `calc(var(--signup-font-size) * ${viewWidth * 5.4 / 310})`;
  }

  signup.addEventListener('submit', (event) => {
    event.preventDefault();
    if (signupButton.disabled) return;

    const url = new URL(signup.action);
    url.pathname = url.pathname.replace(/\/post\/?$/, '/post-json');
    for (const [name, value] of new FormData(signup)) url.searchParams.set(name, value);
    const callback = `mailchimpSignup_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    url.searchParams.set('c', callback);
    const request = document.createElement('script');
    let timeout;
    let finished = false;
    const finish = (result) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      request.remove();
      delete window[callback];
      if (result && result.result === 'success') {
        signupField.hidden = true;
        signupButton.classList.add('is-complete');
        setSignupButtonLabel('Thank you!');
        signupStatus.textContent = /confirm|check your email/i.test(result.msg || '')
          ? 'Please check your email to confirm your signup.'
          : '';
      } else {
        signupButton.disabled = false;
        setSignupButtonLabel('Sign up');
        signupStatus.textContent = 'Sorry, we couldn’t complete your signup. Please try again.';
      }
    };
    window[callback] = finish;
    request.onerror = () => finish(null);
    timeout = setTimeout(() => finish(null), 15000);
    signupButton.disabled = true;
    setSignupButtonLabel('Signing up…');
    signupStatus.textContent = '';
    request.src = url.href;
    document.head.append(request);
  });

  const canvas = document.querySelector('#poster-canvas');
  const image = document.querySelector('#poster-image');
  const playButton = document.querySelector('#play-button');
  const audioFile = document.querySelector('#audio-file');
  const volume = document.querySelector('#volume');
  const strength = document.querySelector('#strength');
  const threshold = document.querySelector('#threshold');
  const status = document.querySelector('#audio-status');
  const playerTrack = document.querySelector('#player-track');
  const playerNext = document.querySelector('#player-next');
  const playerMute = document.querySelector('#player-mute');
  // Add tracks here when new files and their artist/title details are supplied.
  const playlist = [
    { src: 'audio/01VirginiaPlain (1).mp3', artist: 'Unknown artist', title: 'Virginia Plain' },
    { src: 'audio/Going Up.mp3', artist: 'Unknown artist', title: 'Going Up' },
  ];
  let trackIndex = 0;
  let isMuted = true;
  let bassPeak = 0.15;
  const audio = new Audio(playlist[trackIndex].src);
  const displacementMap = new Image();
  displacementMap.src = 'clouds.jpg';
  audio.loop = false;
  audio.muted = true;
  audio.volume = Number(volume.value);
  let context, analyser, outputGain, bins, objectUrl, raf, gl, program, uniforms;
  let level = 0;

  function shader(type, source) {
    const result = gl.createShader(type);
    gl.shaderSource(result, source);
    gl.compileShader(result);
    if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(result));
    return result;
  }

  function initWebGL() {
    gl = canvas.getContext('webgl', { alpha: true, antialias: false });
    if (!gl) throw new Error('WebGL is unavailable');
    const vertex = shader(gl.VERTEX_SHADER, 'attribute vec2 p; void main(){gl_Position=vec4(p,0.,1.);}');
    const fragment = shader(gl.FRAGMENT_SHADER, `
      precision highp float;
      uniform sampler2D image, displacementMap;
      uniform vec2 resolution;
      uniform float posterLeft, posterWidth, posterTop, posterHeight, amount;
      void main() {
        vec2 pixel = vec2(gl_FragCoord.x, resolution.y - gl_FragCoord.y);
        vec2 uv = vec2((pixel.x - posterLeft) / posterWidth, (pixel.y - posterTop) / posterHeight);
        if (uv.y < 0.0 || uv.y > 1.0) discard;
        vec2 mapUV = fract((uv - 0.5) * 2.4 + 0.5);
        vec3 mapColor = texture2D(displacementMap, mapUV).rgb;
        float mapVariation = dot(mapColor, vec3(0.333));
        float edge = smoothstep(0.0, 0.05, uv.x) * smoothstep(0.0, 0.05, 1.0 - uv.x) *
                     smoothstep(0.0, 0.035, uv.y) * smoothstep(0.0, 0.035, 1.0 - uv.y);
        // Keep the map's local peaks distinct instead of moving the whole poster
        // outward by a similar amount, which reads as a single bulge.
        float peaks = smoothstep(0.25, 0.75, mapVariation);
        peaks *= peaks;
        float displacement = amount * 0.035 * peaks;
        vec2 headlineCenter = vec2(0.5, 0.208);
        float aspect = posterHeight / posterWidth;
        vec2 fromCenter = (uv - headlineCenter) * vec2(1.0, aspect);
        vec2 direction = fromCenter / sqrt(dot(fromCenter, fromCenter) + 0.0025);
        uv -= direction * vec2(1.0, 1.0 / aspect) * displacement * edge;
        gl_FragColor = texture2D(image, clamp(uv, 0.0, 1.0));
      }
    `);
    program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'p');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    const textureScale = Math.min(1, maxTextureSize / Math.max(image.naturalWidth, image.naturalHeight));
    let posterTexture = image;
    if (textureScale < 1) {
      posterTexture = document.createElement('canvas');
      posterTexture.width = Math.max(1, Math.floor(image.naturalWidth * textureScale));
      posterTexture.height = Math.max(1, Math.floor(image.naturalHeight * textureScale));
      posterTexture.getContext('2d').drawImage(image, 0, 0, posterTexture.width, posterTexture.height);
    }
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, posterTexture);
    gl.uniform1i(gl.getUniformLocation(program, 'image'), 0);
    const mapTexture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, mapTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, displacementMap);
    gl.uniform1i(gl.getUniformLocation(program, 'displacementMap'), 1);
    uniforms = Object.fromEntries(['resolution', 'posterLeft', 'posterWidth', 'posterTop', 'posterHeight', 'amount'].map(name => [name, gl.getUniformLocation(program, name)]));
  }

  function draw(time) {
    const ratio = devicePixelRatio || 1;
    const width = Math.round(innerWidth * ratio), height = Math.round(innerHeight * ratio);
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    const rect = image.getBoundingClientRect();
    let target;
    if (analyser && context.state === 'running' && !audio.paused) {
      analyser.getByteFrequencyData(bins);
      const bassEnd = Math.max(1, Math.ceil(200 / (context.sampleRate / analyser.fftSize)));
      let sum = 0;
      for (let i = 1; i < bassEnd; i++) sum += bins[i];
      const rawBass = sum / Math.max(1, bassEnd - 1) / 255;
      // Adapt to track loudness so the threshold remains useful across tracks.
      bassPeak = Math.max(0.15, rawBass, bassPeak * 0.9995);
      const bass = Math.min(1, rawBass / bassPeak) * Number(volume.value);
      const gate = Number(threshold.value);
      target = Math.max(0, (bass - gate) / (1 - gate)) * Number(strength.value);
    } else {
      target = 0;
    }
    if (isMuted) target = 0;
    level += (target - level) * (target > level ? 0.3 : 0.1);
    gl.uniform2f(uniforms.resolution, width, height);
    gl.uniform1f(uniforms.posterLeft, rect.left * ratio);
    gl.uniform1f(uniforms.posterWidth, rect.width * ratio);
    gl.uniform1f(uniforms.posterTop, rect.top * ratio);
    gl.uniform1f(uniforms.posterHeight, rect.height * ratio);
    gl.uniform1f(uniforms.amount, level);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    raf = requestAnimationFrame(draw);
  }

  const visualsReady = (async () => {
    try {
      await Promise.all([image.decode(), displacementMap.decode()]);
      initWebGL();
      canvas.classList.add('is-active');
      raf = requestAnimationFrame(draw);
    } catch (error) {
      console.error(error);
      status.textContent = 'Could not start WebGL. Try using a local web server.';
    }
  })();
  // Muted autoplay may be permitted before a user gesture.
  audio.play().catch(() => {});

  async function play() {
    try {
      if (!context) {
        context = new AudioContext();
        const source = context.createMediaElementSource(audio);
        analyser = context.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.7;
        bins = new Uint8Array(analyser.frequencyBinCount);
        outputGain = context.createGain();
        outputGain.gain.value = isMuted ? 0 : 1;
        source.connect(analyser);
        source.connect(outputGain);
        outputGain.connect(context.destination);
      }
      audio.muted = false;
      const resume = context.resume();
      const playback = audio.play();
      await Promise.all([resume, playback, visualsReady]);
      playButton.textContent = 'Pause audio';
      status.textContent = `Playing ${playerTrack.textContent}`;
    } catch (error) {
      console.error(error);
      status.textContent = 'Could not start audio or WebGL. Try using a local web server.';
    }
  }
  playButton.addEventListener('click', () => {
    if (audio.paused || !context) play();
    else { audio.pause(); playButton.textContent = 'Play audio'; status.textContent = 'Paused'; }
  });
  volume.addEventListener('input', () => { audio.volume = Number(volume.value); });
  function playNextTrack(automatic = false) {
    trackIndex = (trackIndex + 1) % playlist.length;
    audio.pause();
    bassPeak = 0.15;
    audioFile.value = '';
    if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null; }
    const track = playlist[trackIndex];
    playerTrack.textContent = `${track.artist} — ${track.title}`;
    audio.src = track.src;
    if (automatic && !context) audio.play().catch(() => {});
    else play();
  }
  playerNext.addEventListener('click', () => playNextTrack());
  audio.addEventListener('ended', () => playNextTrack(true));
  playerMute.addEventListener('click', () => {
    isMuted = !isMuted;
    playerMute.textContent = isMuted ? 'Unmute' : 'Mute';
    playerMute.setAttribute('aria-pressed', String(isMuted));
    if (outputGain) outputGain.gain.value = isMuted ? 0 : 1;
    if (!context || audio.paused) play();
  });
  audioFile.addEventListener('change', () => {
    const file = audioFile.files[0];
    if (!file) return;
    audio.pause();
    bassPeak = 0.15;
    playerTrack.textContent = file.name;
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = URL.createObjectURL(file);
    audio.src = objectUrl;
    play();
  });
})();
