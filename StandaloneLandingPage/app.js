(() => {
  const canvas = document.querySelector('#poster-canvas');
  const image = document.querySelector('#poster-image');
  const playButton = document.querySelector('#play-button');
  const audioFile = document.querySelector('#audio-file');
  const volume = document.querySelector('#volume');
  const strength = document.querySelector('#strength');
  const threshold = document.querySelector('#threshold');
  const status = document.querySelector('#audio-status');
  const audio = new Audio('audio/TwinPeaks.mp3');
  const displacementMap = new Image();
  displacementMap.src = 'clouds.jpg';
  audio.loop = true;
  audio.volume = Number(volume.value);
  let context, analyser, bins, objectUrl, raf, gl, program, uniforms;
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
      uniform float posterTop, posterHeight, amount;
      void main() {
        vec2 pixel = vec2(gl_FragCoord.x, resolution.y - gl_FragCoord.y);
        vec2 uv = vec2(pixel.x / resolution.x, (pixel.y - posterTop) / posterHeight);
        if (uv.y < 0.0 || uv.y > 1.0) discard;
        vec2 mapUV = fract((uv - 0.5) * 2.4 + 0.5);
        vec3 mapColor = texture2D(displacementMap, mapUV).rgb;
        float mapVariation = dot(mapColor, vec3(0.333));
        float edge = smoothstep(0.0, 0.05, uv.x) * smoothstep(0.0, 0.05, 1.0 - uv.x) *
                     smoothstep(0.0, 0.035, uv.y) * smoothstep(0.0, 0.035, 1.0 - uv.y);
        float displacement = amount * 0.01 * mix(0.55, 1.35, mapVariation);
        uv.y -= displacement * edge;
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
    uniforms = Object.fromEntries(['resolution', 'posterTop', 'posterHeight', 'amount'].map(name => [name, gl.getUniformLocation(program, name)]));
  }

  function draw(time) {
    if (audio.paused) return;
    const ratio = devicePixelRatio || 1;
    const width = Math.round(innerWidth * ratio), height = Math.round(innerHeight * ratio);
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    const rect = image.getBoundingClientRect();
    analyser.getByteFrequencyData(bins);
    const bassEnd = Math.max(1, Math.ceil(200 / (context.sampleRate / analyser.fftSize)));
    let sum = 0;
    for (let i = 1; i < bassEnd; i++) sum += bins[i];
    const bass = sum / Math.max(1, bassEnd - 1) / 255 * Number(volume.value);
    const gate = Number(threshold.value);
    const target = Math.max(0, (bass - gate) / (1 - gate)) * Number(strength.value);
    level += (target - level) * (target > level ? 0.3 : 0.1);
    gl.uniform2f(uniforms.resolution, width, height);
    gl.uniform1f(uniforms.posterTop, rect.top * ratio);
    gl.uniform1f(uniforms.posterHeight, rect.height * ratio);
    gl.uniform1f(uniforms.amount, level);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    raf = requestAnimationFrame(draw);
  }

  async function play() {
    try {
      if (!image.complete || !image.naturalWidth) await image.decode();
      if (!displacementMap.complete || !displacementMap.naturalWidth) await displacementMap.decode();
      if (!gl) initWebGL();
      if (!context) {
        context = new AudioContext();
        const source = context.createMediaElementSource(audio);
        analyser = context.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.7;
        bins = new Uint8Array(analyser.frequencyBinCount);
        source.connect(analyser);
        analyser.connect(context.destination);
      }
      await context.resume();
      await audio.play();
      canvas.classList.add('is-active');
      playButton.textContent = 'Pause audio';
      status.textContent = audioFile.files[0]?.name || 'Playing sample audio';
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(draw);
    } catch (error) {
      console.error(error);
      status.textContent = 'Could not start audio or WebGL. Try using a local web server.';
    }
  }
  playButton.addEventListener('click', () => {
    if (audio.paused) play();
    else { audio.pause(); canvas.classList.remove('is-active'); playButton.textContent = 'Play audio'; status.textContent = 'Paused'; }
  });
  volume.addEventListener('input', () => { audio.volume = Number(volume.value); });
  audioFile.addEventListener('change', () => {
    const file = audioFile.files[0];
    if (!file) return;
    audio.pause();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = URL.createObjectURL(file);
    audio.src = objectUrl;
    play();
  });
})();
