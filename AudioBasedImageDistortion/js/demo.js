const sketch = (p) => {
	const designWidth = 2000;
	const designHeight = 1125;
	const canvasFontFamily = 'GararaCanvas';
	const spiralText = 'Alewya, Ady Suleiman, Batu, Bushbaby, Channel One Sound System, Conducta, Crawlers, Distruction Boyz, Ella Knight, Faster Horses, Ghostly Kisses, girli, Grace Cummings, Honestav, Jembaa Groove, Kraak & Smaak, Lido Pimienta, MF Robots, MGNA Crrrta, Naomi Scott, Nick Hakim, Pigeon, PlayPiem, Riria, Romare, Skream, Stone Foundation, Thaiboy Digital, TWOFACED, Young Marco';
	const defaultTrackName = '01VirginiaPlain.mp3';
	const defaultTrackPath = `audio/${defaultTrackName}`;
	const backingVersions = {
		purple: {
			label: 'Purple',
			image: 'img/8back.jpg',
			textColor: '#DDFF00',
		},
		red: {
			label: 'Red',
			image: 'img/8back2.jpg',
			textColor: '#A4E4FF',
		},
		blue: {
			label: 'Blue',
			image: 'img/8back3.jpg',
			textColor: '#000000',
		},
	};
	const textureUniforms = {
		texture: 'u_texture',
		image: 'img',
	};

	const experiments = {
		1: {
			shader: 'd1',
			textureUniform: textureUniforms.texture,
			resolutionUniform: 'u_tResolution',
			mapBands: ({ bass, treble, mid }) => ({
				u_bass: p.map(bass, 0, 255, 10, 15),
				u_tremble: p.map(treble, 0, 255, 0, 0),
				u_mid: p.map(mid, 0, 255, 0, 0.1),
				u_time: p.frameCount / 20,
			}),
		},
		2: {
			shader: 'd2',
			textureUniform: textureUniforms.image,
			resolutionUniform: 'texRes',
			usesDisplacementMap: true,
			mapBands: ({ bass, highMid, mid }) => ({
				u_bass: p.map(bass, 0, 255, 0, 0.04),
				u_mid: p.map(highMid, 0, 30, 0, 0.8),
				u_lowmid: p.map(mid, 0, 60, 0, 0.4),
				u_time: 1,
			}),
		},
		3: {
			shader: 'd3',
			textureUniform: textureUniforms.texture,
			resolutionUniform: 'u_tResolution',
			mapBands: ({ bass, treble, mid }) => ({
				u_bass: p.map(bass, 0, 255, 0, 15),
				u_tremble: p.map(treble, 0, 255, 0, 0),
				u_mid: p.map(mid, 0, 255, 0, 0.2),
				u_time: p.frameCount / 20,
			}),
		},
		4: {
			shader: 'd4',
			textureUniform: textureUniforms.image,
			resolutionUniform: 'u_tResolution',
			usesDisplacementMap: true,
			usesPathMask: true,
			mapBands: ({ bass, mid }) => ({
				u_bass: p.map(bass, 0, 255, 0, 0.01),
				u_mid: p.map(mid, 0, 70, 0, 10.001),
				u_noise_scale: noiseScale,
				u_path_progress: getPathProgress(),
				u_path_window: pathWindow,
				u_time: 2,
			}),
		},
		5: {
			shader: 'd5',
			textureUniform: textureUniforms.texture,
			resolutionUniform: 'u_tResolution',
			mapBands: ({ bass, treble, mid }) => ({
				u_bass: p.map(bass, 0, 150, 0, 13),
				u_tremble: p.map(treble, 0, 255, 0, 0.5),
				u_mid: p.map(mid, 0, 255, 0, 0.1),
				u_time: p.frameCount / 8,
			}),
		},
		6: {
			shader: 'd6',
			textureUniform: textureUniforms.texture,
			resolutionUniform: 'u_tResolution',
			mapBands: ({ bass, treble, mid }) => ({
				u_bass: p.map(bass, 0, 255, 10, 15),
				u_tremble: p.map(treble, 0, 255, 0, 0),
				u_mid: p.map(mid, 0, 255, 0, 0.1),
				u_time: p.frameCount / 20,
			}),
		},
		7: {
			shader: 'd3',
			textureUniform: textureUniforms.texture,
			resolutionUniform: 'u_tResolution',
			mapBands: ({ bass, mid }) => ({
				u_bass: p.map(bass, 0, 255, 0, 2),
				u_mid: p.map(mid, 0, 255, 0, 0.05),
				u_time: p.frameCount / 20,
			}),
		},
		8: {
			shader: 'd8',
			textureUniform: textureUniforms.texture,
			resolutionUniform: 'u_tResolution',
			mapBands: ({ bass, treble, mid }) => ({
				u_bass: p.map(bass, 0, 255, 5, 10),
				u_tremble: p.map(treble, 0, 255, 0, 0),
				u_mid: p.map(mid, 0, 255, 0, 0.1),
				u_time: p.frameCount / 20,
			}),
		},
	};

	let audio;
	let fft;
	let foreground;
	let fallbackForeground;
	let textLayer;
	let textPath;
	let pathMask;
	let pathCenter = { x: 0.5, y: 0.5 };
	let pathSamples = [];
	let textFontSize = 0;
	let displacementMap;
	let activeExperimentId = '4';
	let activeBackingId = 'purple';
	let currentTextColor = backingVersions.purple.textColor;
	let hasStarted = false;
	let isMuted = false;
	let volumeLevel = 1;
	let effectMultiplier = 5.0;
	let audioThreshold = 0.55;
	let noiseScale = 2.4;
	let pathSpeed = -0.01;
	let pathWindow = 0.5;
	let fieldWidth = 2.85;
	let fieldOffset = 32;
	let falloffCurve = 'soft';
	let textSpeed = -0.005;
	let textOffsetProgress = 0;
	let shouldRenderTextTexture = false;
	let textGlyphs = [];
	let glyphSprites = new Map();
	let textFrameCacheStatus = 'waiting';
	let previousFrameStart = performance.now();
	let averageFps = 0;
	let averageLoad = 0;
	let lastPerformanceUpdate = 0;
	let droppedTrackUrl = null;
	const shaders = {};
	const meterBars = {};
	const gui = {};

	p.preload = () => {
		audio = p.loadSound(defaultTrackPath);
		fallbackForeground = p.loadImage('img/8.png');
		displacementMap = p.loadImage('img/clouds.jpg');

		Object.values(experiments).forEach((experiment) => {
			if (!shaders[experiment.shader]) {
				shaders[experiment.shader] = p.loadShader('shaders/base.vert', `shaders/${experiment.shader}.frag`);
			}
		});
	};

	p.setup = () => {
		p.pixelDensity(1);
		p.setAttributes('alpha', true);
		p.createCanvas(p.windowWidth, p.windowHeight, p.WEBGL);
		preloadBackingImages();

		fft = new p5.FFT();
		fft.setInput(audio);
		foreground = fallbackForeground;
		bindControls();
		setTrackName(defaultTrackName);
		syncSettingsToGui();
		setActiveExperiment(activeExperimentId);
		buildTextTexture();
	};

	p.draw = () => {
		const frameStart = performance.now();
		const activeExperiment = experiments[activeExperimentId];
		const activeShader = shaders[activeExperiment.shader];
		const meterSpectrum = getSpectrum();
		const shaderSpectrum = applyEffectMultiplier(meterSpectrum);
		const uniforms = activeExperiment.mapBands(shaderSpectrum);

		p.clear();
		p.shader(activeShader);
		updateMeters(meterSpectrum);
		updateTextTexture();
		updatePathMask();

		Object.entries(uniforms).forEach(([name, value]) => {
			activeShader.setUniform(name, value);
		});

		if (activeExperiment.usesPathMask && pathMask) {
			activeShader.setUniform('u_path_mask', pathMask);
			activeShader.setUniform('u_spiral_center', [pathCenter.x / designWidth, pathCenter.y / designHeight]);
		}

		p.rect(0, 0, p.width, p.height);
		updatePerformanceReadout(frameStart, performance.now());
	};

	p.windowResized = () => {
		p.resizeCanvas(p.windowWidth, p.windowHeight);
		setActiveExperiment(activeExperimentId);
	};

	function bindControls() {
		const switcher = document.querySelector('#experiment-switcher');
		gui.backingSwitcher = document.querySelector('#backing-switcher');
		gui.stageBackground = document.querySelector('#stage-background');
		gui.toggleBtn = document.querySelector('#toggle-btn');
		gui.trackName = document.querySelector('#track-name');
		gui.volumeSlider = document.querySelector('#volume-slider');
		gui.volumeValue = document.querySelector('#volume-value');
		gui.fpsValue = document.querySelector('#fps-value');
		gui.loadValue = document.querySelector('#load-value');
		gui.textCacheValue = document.querySelector('#text-cache-value');
		gui.effectMultiplierSlider = document.querySelector('#effect-multiplier-slider');
		gui.effectMultiplierValue = document.querySelector('#effect-multiplier-value');
		gui.audioThresholdSlider = document.querySelector('#audio-threshold-slider');
		gui.audioThresholdValue = document.querySelector('#audio-threshold-value');
		gui.noiseScaleSlider = document.querySelector('#noise-scale-slider');
		gui.noiseScaleValue = document.querySelector('#noise-scale-value');
		gui.pathSpeedSlider = document.querySelector('#path-speed-slider');
		gui.pathSpeedValue = document.querySelector('#path-speed-value');
		gui.pathWindowSlider = document.querySelector('#path-window-slider');
		gui.pathWindowValue = document.querySelector('#path-window-value');
		gui.fieldWidthSlider = document.querySelector('#field-width-slider');
		gui.fieldWidthValue = document.querySelector('#field-width-value');
		gui.fieldOffsetSlider = document.querySelector('#field-offset-slider');
		gui.fieldOffsetValue = document.querySelector('#field-offset-value');
		gui.falloffCurveSelect = document.querySelector('#falloff-curve-select');
		gui.textSpeedSlider = document.querySelector('#text-speed-slider');
		gui.textSpeedValue = document.querySelector('#text-speed-value');
		gui.exportSettingsBtn = document.querySelector('#export-settings-btn');
		gui.importSettingsInput = document.querySelector('#import-settings-input');
		gui.settingsStatus = document.querySelector('#settings-status');

		document.querySelectorAll('[data-meter]').forEach((meter) => {
			meterBars[meter.dataset.meter] = meter;
		});

		document.addEventListener('pointerdown', startAudio, { once: true });
		window.addEventListener('dragenter', handleDragEnter);
		window.addEventListener('dragover', handleDragOver);
		window.addEventListener('dragleave', handleDragLeave);
		window.addEventListener('drop', handleDrop);

		switcher.addEventListener('click', (event) => {
			const button = event.target.closest('[data-experiment]');

			if (!button) {
				return;
			}

			setActiveExperiment(button.dataset.experiment);
		});

		gui.backingSwitcher.addEventListener('click', (event) => {
			const button = event.target.closest('[data-backing]');

			if (!button) {
				return;
			}

			setBackingVersion(button.dataset.backing);
		});

		gui.volumeSlider.addEventListener('input', () => {
			volumeLevel = Number(gui.volumeSlider.value);
			isMuted = volumeLevel === 0;
			applyVolume();
		});

		gui.effectMultiplierSlider.addEventListener('input', () => {
			effectMultiplier = Number(gui.effectMultiplierSlider.value);
			updateEffectMultiplierValue();
		});

		gui.audioThresholdSlider.addEventListener('input', () => {
			audioThreshold = Number(gui.audioThresholdSlider.value);
			updateAudioThresholdValue();
		});

		gui.noiseScaleSlider.addEventListener('input', () => {
			noiseScale = Number(gui.noiseScaleSlider.value);
			updateNoiseScaleValue();
		});

		gui.pathSpeedSlider.addEventListener('input', () => {
			pathSpeed = Number(gui.pathSpeedSlider.value);
			updatePathControlValues();
		});

		gui.pathWindowSlider.addEventListener('input', () => {
			pathWindow = Number(gui.pathWindowSlider.value);
			updatePathControlValues();
		});

		gui.fieldWidthSlider.addEventListener('input', () => {
			fieldWidth = Number(gui.fieldWidthSlider.value);
			updatePathControlValues();
		});

		gui.fieldOffsetSlider.addEventListener('input', () => {
			fieldOffset = Number(gui.fieldOffsetSlider.value);
			updatePathControlValues();
		});

		gui.falloffCurveSelect.addEventListener('change', () => {
			falloffCurve = gui.falloffCurveSelect.value;
		});

		gui.textSpeedSlider.addEventListener('input', () => {
			textSpeed = Number(gui.textSpeedSlider.value);
			updateTextControlValues();
			shouldRenderTextTexture = true;
		});

		gui.exportSettingsBtn.addEventListener('click', exportSettings);
		gui.importSettingsInput.addEventListener('change', importSettings);

		gui.toggleBtn.addEventListener('click', () => {
			if (!hasStarted) {
				startAudio();
			}

			isMuted = !isMuted;
			applyVolume();
		});
	}

	function startAudio() {
		if (hasStarted) {
			return;
		}

		hasStarted = true;
		applyVolume();
		audio.loop();
	}

	function preloadBackingImages() {
		Object.values(backingVersions).forEach((backing) => {
			const image = new Image();
			image.src = backing.image;
		});
	}

	function handleDragEnter(event) {
		event.preventDefault();
		document.body.classList.add('is-dragging-audio');
	}

	function handleDragOver(event) {
		event.preventDefault();
	}

	function handleDragLeave(event) {
		if (event.relatedTarget) {
			return;
		}

		document.body.classList.remove('is-dragging-audio');
	}

	function handleDrop(event) {
		event.preventDefault();
		document.body.classList.remove('is-dragging-audio');

		const file = [...event.dataTransfer.files].find((item) => {
			return item.type === 'audio/mpeg' || item.name.toLowerCase().endsWith('.mp3');
		});

		if (!file) {
			setTrackName('Drop an MP3 file');
			return;
		}

		loadDroppedTrack(file);
	}

	function loadDroppedTrack(file) {
		const nextTrackUrl = URL.createObjectURL(file);
		const shouldPlay = hasStarted;

		setTrackName(`Loading ${file.name}`);

		p.loadSound(
			nextTrackUrl,
			(nextAudio) => {
				if (audio && audio.isPlaying()) {
					audio.stop();
				}

				if (droppedTrackUrl) {
					URL.revokeObjectURL(droppedTrackUrl);
				}

				audio = nextAudio;
				droppedTrackUrl = nextTrackUrl;
				fft.setInput(audio);
				setTrackName(file.name);
				applyVolume();

				if (shouldPlay || !hasStarted) {
					hasStarted = true;
					audio.loop();
				}
			},
			() => {
				URL.revokeObjectURL(nextTrackUrl);
				setTrackName('Could not load MP3');
			}
		);
	}

	function applyVolume() {
		const audibleVolume = isMuted ? 0 : volumeLevel;

		if (audio) {
			audio.setVolume(audibleVolume);
		}

		gui.toggleBtn.classList.toggle('is-muted', isMuted);
		gui.toggleBtn.setAttribute('aria-pressed', String(isMuted));
		gui.toggleBtn.textContent = isMuted ? 'Muted' : 'Mute';
		gui.volumeValue.textContent = `${Math.round(volumeLevel * 100)}%`;
	}

	function updateNoiseScaleValue() {
		gui.noiseScaleValue.textContent = noiseScale.toFixed(2);
	}

	function updateEffectMultiplierValue() {
		gui.effectMultiplierValue.textContent = `${effectMultiplier.toFixed(1)}x`;
	}

	function updateAudioThresholdValue() {
		gui.audioThresholdValue.textContent = `${Math.round(audioThreshold * 100)}%`;
	}

	function updatePathControlValues() {
		gui.pathSpeedValue.textContent = pathSpeed.toFixed(3);
		gui.pathWindowValue.textContent = `${Math.round(pathWindow * 100)}%`;
		gui.fieldWidthValue.textContent = fieldWidth.toFixed(2);
		gui.fieldOffsetValue.textContent = `${Math.round(fieldOffset)}px`;
	}

	function updateTextControlValues() {
		gui.textSpeedValue.textContent = textSpeed.toFixed(3);
	}

	function exportSettings() {
		const settings = getSettings();
		const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

		link.href = url;
		link.download = `audio-shader-settings-${timestamp}.json`;
		document.body.append(link);
		link.click();
		link.remove();
		URL.revokeObjectURL(url);
		setSettingsStatus('Exported settings');
	}

	function importSettings(event) {
		const [file] = event.target.files || [];

		if (!file) {
			return;
		}

		const reader = new FileReader();

		reader.addEventListener('load', () => {
			try {
				const settings = JSON.parse(reader.result);
				applySettings(settings);
				setSettingsStatus(`Imported ${file.name}`);
			} catch (error) {
				console.warn('Could not import settings:', error);
				setSettingsStatus('Could not import settings');
			} finally {
				gui.importSettingsInput.value = '';
			}
		});

		reader.addEventListener('error', () => {
			setSettingsStatus('Could not read settings file');
			gui.importSettingsInput.value = '';
		});

		reader.readAsText(file);
	}

	function getSettings() {
		return {
			version: 1,
			experiment: activeExperimentId,
			backing: activeBackingId,
			volume: volumeLevel,
			muted: isMuted,
			effectMultiplier,
			audioThreshold,
			noiseScale,
			pathSpeed,
			pathWindow,
			fieldWidth,
			fieldOffset,
			falloffCurve,
			textSpeed,
		};
	}

	function applySettings(settings) {
		if (!settings || typeof settings !== 'object') {
			throw new Error('Settings file must contain a JSON object');
		}

		const nextExperiment = String(settings.experiment ?? activeExperimentId);

		if (experiments[nextExperiment]) {
			setActiveExperiment(nextExperiment);
		}

		if (typeof settings.backing === 'string' && backingVersions[settings.backing]) {
			setBackingVersion(settings.backing);
		}

		volumeLevel = clampSetting(settings.volume, 0, 1, volumeLevel);
		isMuted = Boolean(settings.muted) || volumeLevel === 0;
		effectMultiplier = clampSetting(settings.effectMultiplier, 0, 10, effectMultiplier);
		audioThreshold = clampSetting(settings.audioThreshold, 0, 0.95, audioThreshold);
		noiseScale = clampSetting(settings.noiseScale, 0.05, 20, noiseScale);
		pathSpeed = clampSetting(settings.pathSpeed, -0.3, 0.3, pathSpeed);
		pathWindow = clampSetting(settings.pathWindow, 0.01, 0.5, pathWindow);
		fieldWidth = clampSetting(settings.fieldWidth, 0.2, 4, fieldWidth);
		fieldOffset = clampSetting(settings.fieldOffset, -160, 160, fieldOffset);
		falloffCurve = ['smooth', 'soft', 'long', 'hard'].includes(settings.falloffCurve)
			? settings.falloffCurve
			: falloffCurve;
		textSpeed = clampSetting(settings.textSpeed, -0.3, 0.3, textSpeed);
		shouldRenderTextTexture = true;

		syncSettingsToGui();
	}

	function syncSettingsToGui() {
		gui.volumeSlider.value = volumeLevel;
		gui.effectMultiplierSlider.value = effectMultiplier;
		gui.audioThresholdSlider.value = audioThreshold;
		gui.noiseScaleSlider.value = noiseScale;
		gui.pathSpeedSlider.value = pathSpeed;
		gui.pathWindowSlider.value = pathWindow;
		gui.fieldWidthSlider.value = fieldWidth;
		gui.fieldOffsetSlider.value = fieldOffset;
		gui.falloffCurveSelect.value = falloffCurve;
		gui.textSpeedSlider.value = textSpeed;

		setBackingVersion(activeBackingId);
		applyVolume();
		updateEffectMultiplierValue();
		updateAudioThresholdValue();
		updateNoiseScaleValue();
		updatePathControlValues();
		updateTextControlValues();
	}

	function clampSetting(value, min, max, fallback) {
		const number = Number(value);

		if (!Number.isFinite(number)) {
			return fallback;
		}

		return Math.min(Math.max(number, min), max);
	}

	function setSettingsStatus(message) {
		if (!gui.settingsStatus) {
			return;
		}

		gui.settingsStatus.textContent = message;
	}

	function setBackingVersion(backingId) {
		const backing = backingVersions[backingId];

		if (!backing) {
			return;
		}

		activeBackingId = backingId;
		currentTextColor = backing.textColor;

		if (gui.stageBackground && gui.stageBackground.getAttribute('src') !== backing.image) {
			gui.stageBackground.src = backing.image;
		}

		document.querySelectorAll('[data-backing]').forEach((button) => {
			button.classList.toggle('is-active', button.dataset.backing === activeBackingId);
		});

		if (textLayer && textPath) {
			buildGlyphSprites(textLayer.drawingContext);
			drawTextOnPath(
				textLayer.drawingContext,
				textPath,
				pathCenter,
				textOffsetProgress * textPath.totalLength
			);
			shouldRenderTextTexture = false;
		}
	}

	function setActiveExperiment(experimentId) {
		const activeExperiment = experiments[experimentId];

		if (!activeExperiment) {
			return;
		}

		activeExperimentId = experimentId;

		const activeShader = shaders[activeExperiment.shader];
		p.shader(activeShader);
		activeShader.setUniform('u_resolution', [p.windowWidth, p.windowHeight]);
		activeShader.setUniform(activeExperiment.textureUniform, foreground);
		activeShader.setUniform(activeExperiment.resolutionUniform, getForegroundResolution());

		if (activeExperiment.usesDisplacementMap) {
			activeShader.setUniform('d_map', displacementMap);
		}

		if (activeExperiment.usesPathMask && pathMask) {
			activeShader.setUniform('u_path_mask', pathMask);
			activeShader.setUniform('u_spiral_center', [pathCenter.x / designWidth, pathCenter.y / designHeight]);
		}

		document.querySelectorAll('[data-experiment]').forEach((button) => {
			button.classList.toggle('is-active', button.dataset.experiment === activeExperimentId);
		});

		document.querySelector('#active-experiment-label').textContent = activeExperimentId.padStart(2, '0');
	}

	function getSpectrum() {
		fft.analyze();
		const effectAmount = isMuted ? 0 : volumeLevel;

		return {
			bass: fft.getEnergy('bass') * effectAmount,
			treble: fft.getEnergy('treble') * effectAmount,
			mid: fft.getEnergy('mid') * effectAmount,
			highMid: fft.getEnergy('highMid') * effectAmount,
		};
	}

	function applyEffectMultiplier(spectrum) {
		return {
			bass: applyShaderThreshold(spectrum.bass) * effectMultiplier,
			treble: applyShaderThreshold(spectrum.treble) * effectMultiplier,
			mid: applyShaderThreshold(spectrum.mid) * effectMultiplier,
			highMid: applyShaderThreshold(spectrum.highMid) * effectMultiplier,
		};
	}

	function applyShaderThreshold(value) {
		const thresholdValue = audioThreshold * 255;

		if (thresholdValue <= 0) {
			return value;
		}

		if (value <= thresholdValue) {
			return 0;
		}

		return p.map(value, thresholdValue, 255, 0, 255, true);
	}

	function updateMeters({ bass, treble, mid }) {
		const values = { bass, treble, mid };

		Object.entries(meterBars).forEach(([name, meter]) => {
			meter.style.width = `${p.map(values[name] || 0, 0, 255, 0, 100)}%`;
		});
	}

	function updatePerformanceReadout(frameStart, frameEnd) {
		const frameInterval = Math.max(frameStart - previousFrameStart, 1);
		const drawDuration = Math.max(frameEnd - frameStart, 0);
		const fps = 1000 / frameInterval;
		const load = (drawDuration / frameInterval) * 100;

		previousFrameStart = frameStart;
		averageFps = averageFps === 0 ? fps : averageFps * 0.88 + fps * 0.12;
		averageLoad = averageLoad === 0 ? load : averageLoad * 0.88 + load * 0.12;

		if (frameEnd - lastPerformanceUpdate < 250) {
			return;
		}

		lastPerformanceUpdate = frameEnd;

		if (gui.fpsValue) {
			gui.fpsValue.textContent = Math.round(averageFps);
		}

		if (gui.loadValue) {
			gui.loadValue.textContent = `${Math.round(averageLoad)}%`;
		}

		if (gui.textCacheValue) {
			gui.textCacheValue.textContent = textFrameCacheStatus;
		}
	}

	function updateTextTexture() {
		if (!textLayer || !textPath) {
			return;
		}

		if (textSpeed !== 0) {
			const deltaSeconds = Math.min(p.deltaTime || 16.67, 100) / 1000;
			textOffsetProgress = wrapUnit(textOffsetProgress + deltaSeconds * textSpeed);
			shouldRenderTextTexture = true;
		}

		if (!shouldRenderTextTexture) {
			return;
		}

		drawTextOnPath(
			textLayer.drawingContext,
			textPath,
			pathCenter,
			textOffsetProgress * textPath.totalLength
		);
		textFrameCacheStatus = textSpeed === 0 ? 'static' : 'live';
		shouldRenderTextTexture = false;
	}

	function getPathProgress() {
		const progress = (p.millis() / 1000) * pathSpeed;

		return wrapUnit(progress);
	}

	function updatePathMask() {
		if (!pathMask || activeExperimentId !== '4' || pathSamples.length === 0) {
			return;
		}

		const context = pathMask.drawingContext;
		const ranges = getActivePathRanges();
		const coreWidth = textFontSize * fieldWidth;
		const featherWidth = coreWidth * 2.4;
		const steps = 14;

		context.clearRect(0, 0, designWidth, designHeight);
		context.save();
		context.lineCap = 'round';
		context.lineJoin = 'round';
		context.globalCompositeOperation = 'source-over';

		for (let index = steps; index >= 0; index -= 1) {
			const featherAmount = index / steps;
			const alpha = getFalloffAlpha(featherAmount);
			const width = coreWidth + featherWidth * featherAmount;

			if (alpha <= 0) {
				continue;
			}

			context.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
			context.lineWidth = width;
			ranges.forEach((range) => drawPathRange(context, range));
		}

		context.restore();
	}

	function getFalloffAlpha(featherAmount) {
		const t = 1 - featherAmount;

		if (falloffCurve === 'smooth') {
			return t * t * (3 - 2 * t);
		}

		if (falloffCurve === 'long') {
			return Math.pow(t, 0.55);
		}

		if (falloffCurve === 'hard') {
			return Math.pow(t, 3.0);
		}

		return Math.pow(t, 1.15);
	}

	function getActivePathRanges() {
		const progress = getPathProgress();
		const halfWindow = Math.max(pathWindow * 0.5, 0.001);
		const start = ((progress - halfWindow) % 1 + 1) % 1;
		const end = ((progress + halfWindow) % 1 + 1) % 1;

		if (start <= end) {
			return [pathSamples.filter((sample) => sample.progress >= start && sample.progress <= end)];
		}

		return [
			pathSamples.filter((sample) => sample.progress >= start),
			pathSamples.filter((sample) => sample.progress <= end),
		];
	}

	function drawPathRange(context, range) {
		if (range.length < 2) {
			return;
		}

		context.beginPath();
		const firstPoint = getOffsetPathPoint(range[0]);
		context.moveTo(firstPoint.x, firstPoint.y);

		for (let index = 1; index < range.length; index += 1) {
			const point = getOffsetPathPoint(range[index]);
			context.lineTo(point.x, point.y);
		}

		context.stroke();
	}

	function getOffsetPathPoint(sample) {
		return {
			x: sample.x + sample.outward.x * fieldOffset,
			y: sample.y + sample.outward.y * fieldOffset,
		};
	}

	function setTrackName(name) {
		if (gui.trackName) {
			gui.trackName.textContent = name;
			gui.trackName.title = name;
		}
	}

	async function buildTextTexture() {
		try {
			await loadGararaFont();
			const path = await loadSpiralPath();
			textPath = path;
			textLayer = p.createGraphics(designWidth, designHeight);
			pathMask = p.createGraphics(designWidth, designHeight);
			textLayer.pixelDensity(1);
			pathMask.pixelDensity(1);
			pathCenter = getPathCenter(path);
			pathSamples = buildPathSamples(path, pathCenter);
			buildTextLayout(textLayer.drawingContext, path);
			drawTextOnPath(textLayer.drawingContext, path, pathCenter, 0);
			textLayer.elt.remove();
			pathMask.elt.remove();
			foreground = textLayer;
			textFrameCacheStatus = 'static';
			setActiveExperiment(activeExperimentId);
		} catch (error) {
			console.warn('Falling back to image foreground:', error);
			foreground = fallbackForeground;
			textLayer = null;
			textPath = null;
			textGlyphs = [];
			glyphSprites = new Map();
			textFrameCacheStatus = 'fallback';
			pathMask = null;
			pathSamples = [];
			setActiveExperiment(activeExperimentId);
		}
	}

	async function loadGararaFont() {
		const fontDeclaration = `16px "${canvasFontFamily}"`;
		const hasLoadedCanvasFont = Array.from(document.fonts).some(
			(font) => font.family === canvasFontFamily && font.status === 'loaded'
		);

		if (!hasLoadedCanvasFont) {
			const font = new FontFace(canvasFontFamily, 'url(fonts/Garara-Medium.woff2)', {
				style: 'normal',
				weight: '500',
			});
			await font.load();
			document.fonts.add(font);
		}

		await document.fonts.load(fontDeclaration, spiralText);
		await document.fonts.ready;
		await new Promise((resolve) => requestAnimationFrame(resolve));
	}

	async function loadSpiralPath() {
		const response = await fetch('img/Path.svg');
		const svgText = await response.text();
		const documentSvg = new DOMParser().parseFromString(svgText, 'image/svg+xml');
		const sourcePath = documentSvg.querySelector('path');

		if (!sourcePath) {
			throw new Error('Path.svg does not contain a path element');
		}

		const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		svg.setAttribute('viewBox', `0 0 ${designWidth} ${designHeight}`);
		path.setAttribute('d', sourcePath.getAttribute('d'));
		svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none;';
		svg.append(path);
		document.body.append(svg);

		const totalLength = path.getTotalLength();

		return {
			totalLength,
			pointAt(distance) {
				const clampedDistance = p.constrain(totalLength - distance, 0, totalLength);
				const point = path.getPointAtLength(clampedDistance);

				return { x: point.x, y: point.y };
			},
			dispose() {
				svg.remove();
			},
		};
	}

	function drawTextOnPath(context, path, center, offsetDistance = 0) {
		if (textGlyphs.length === 0) {
			buildTextLayout(context, path);
		}

		context.clearRect(0, 0, designWidth, designHeight);
		context.fillStyle = currentTextColor;
		context.font = `${textFontSize}px "${canvasFontFamily}"`;
		context.textAlign = 'center';
		context.textBaseline = 'alphabetic';
		context.imageSmoothingEnabled = true;

		for (const glyph of textGlyphs) {
			const distance = wrapDistance(glyph.distance + offsetDistance, path.totalLength);
			const sample = getPathSampleAtDistance(distance, path.totalLength);
			const point = sample.point;
			const tangent = sample.tangent;
			let angle = Math.atan2(tangent.y, tangent.x);
			const outward = sample.outward;
			const textUp = {
				x: Math.cos(angle - Math.PI / 2),
				y: Math.sin(angle - Math.PI / 2),
			};

			if (dot(textUp, outward) < 0) {
				angle += Math.PI;
			}

			if (glyph.character !== ' ') {
				const sprite = glyphSprites.get(glyph.character);

				context.save();
				context.translate(point.x, point.y);
				context.rotate(angle);
				if (sprite) {
					context.drawImage(sprite.canvas, -sprite.centerX, -sprite.baseline);
				} else {
					context.fillText(glyph.character, 0, 0);
				}
				context.restore();
			}
		}
	}

	function wrapDistance(distance, totalLength) {
		return ((distance % totalLength) + totalLength) % totalLength;
	}

	function buildTextLayout(context, path) {
		textFontSize = fitFontSizeToPath(context, path.totalLength);
		context.font = `${textFontSize}px "${canvasFontFamily}"`;

		const tracking = textFontSize * 0.03;
		let cursor = textFontSize * 0.15;

		textGlyphs = Array.from(spiralText).map((character) => {
			const width = context.measureText(character).width;
			const advance = width + tracking;
			const glyph = {
				character,
				distance: cursor + advance * 0.5,
			};

			cursor += advance;
			return glyph;
		});

		buildGlyphSprites(context);
	}

	function buildGlyphSprites(context) {
		glyphSprites = new Map();
		context.font = `${textFontSize}px "${canvasFontFamily}"`;
		context.textAlign = 'left';
		context.textBaseline = 'alphabetic';

		Array.from(new Set(Array.from(spiralText).filter((character) => character !== ' '))).forEach((character) => {
			const metrics = context.measureText(character);
			const ascent = metrics.actualBoundingBoxAscent || textFontSize * 0.82;
			const descent = metrics.actualBoundingBoxDescent || textFontSize * 0.22;
			const left = Math.max(metrics.actualBoundingBoxLeft || 0, 0);
			const right = metrics.actualBoundingBoxRight || metrics.width;
			const padding = Math.ceil(textFontSize * 0.28);
			const width = Math.ceil(left + right + padding * 2);
			const height = Math.ceil(ascent + descent + padding * 2);
			const canvas = document.createElement('canvas');
			const spriteContext = canvas.getContext('2d');
			const baseline = padding + ascent;

			canvas.width = width;
			canvas.height = height;
			spriteContext.fillStyle = currentTextColor;
			spriteContext.font = `${textFontSize}px "${canvasFontFamily}"`;
			spriteContext.textAlign = 'left';
			spriteContext.textBaseline = 'alphabetic';
			spriteContext.imageSmoothingEnabled = true;
			spriteContext.fillText(character, padding + left, baseline);

			glyphSprites.set(character, {
				canvas,
				centerX: padding + left + metrics.width * 0.5,
				baseline,
			});
		});
	}

	function buildPathSamples(path, center) {
		const step = 3;
		const samples = [];

		for (let distance = 0; distance <= path.totalLength; distance += step) {
			const point = path.pointAt(distance);
			const outward = normalize({
				x: point.x - center.x,
				y: point.y - center.y,
			});

			samples.push({
				x: point.x,
				y: point.y,
				distance,
				progress: distance / path.totalLength,
				outward,
				tangent: { x: 1, y: 0 },
			});
		}

		samples.forEach((sample, index) => {
			const before = samples[Math.max(index - 1, 0)];
			const after = samples[Math.min(index + 1, samples.length - 1)];
			sample.tangent = normalize({
				x: after.x - before.x,
				y: after.y - before.y,
			});
		});

		return samples;
	}

	function getPathSampleAtDistance(distance, totalLength) {
		if (pathSamples.length === 0) {
			return {
				point: { x: pathCenter.x, y: pathCenter.y },
				tangent: { x: 1, y: 0 },
				outward: { x: 0, y: -1 },
			};
		}

		const wrappedDistance = wrapDistance(distance, totalLength);
		const scaledIndex = (wrappedDistance / totalLength) * (pathSamples.length - 1);
		const index = Math.floor(scaledIndex);
		const nextIndex = Math.min(index + 1, pathSamples.length - 1);
		const amount = scaledIndex - index;
		const current = pathSamples[index];
		const next = pathSamples[nextIndex];

		return {
			point: {
				x: lerp(current.x, next.x, amount),
				y: lerp(current.y, next.y, amount),
			},
			tangent: normalize({
				x: lerp(current.tangent.x, next.tangent.x, amount),
				y: lerp(current.tangent.y, next.tangent.y, amount),
			}),
			outward: normalize({
				x: lerp(current.outward.x, next.outward.x, amount),
				y: lerp(current.outward.y, next.outward.y, amount),
			}),
		};
	}

	function lerp(start, end, amount) {
		return start + (end - start) * amount;
	}

	function fitFontSizeToPath(context, pathLength) {
		let min = 10;
		let max = 96;
		let result = 48;

		for (let index = 0; index < 12; index += 1) {
			const fontSize = (min + max) / 2;
			context.font = `${fontSize}px "${canvasFontFamily}"`;
			const textWidth = context.measureText(spiralText).width + spiralText.length * fontSize * 0.03;

			if (textWidth < pathLength * 0.99) {
				result = fontSize;
				min = fontSize;
			} else {
				max = fontSize;
			}
		}

		return result;
	}

	function getPathCenter(path) {
		const samples = 160;
		let minX = Infinity;
		let minY = Infinity;
		let maxX = -Infinity;
		let maxY = -Infinity;

		for (let index = 0; index <= samples; index += 1) {
			const point = path.pointAt((path.totalLength / samples) * index);
			minX = Math.min(minX, point.x);
			minY = Math.min(minY, point.y);
			maxX = Math.max(maxX, point.x);
			maxY = Math.max(maxY, point.y);
		}

		return {
			x: (minX + maxX) * 0.5,
			y: (minY + maxY) * 0.5,
		};
	}

	function getTangent(path, distance) {
		const before = path.pointAt(Math.max(distance - 1, 0));
		const after = path.pointAt(Math.min(distance + 1, path.totalLength));

		return normalize({
			x: after.x - before.x,
			y: after.y - before.y,
		});
	}

	function normalize(vector) {
		const length = Math.hypot(vector.x, vector.y) || 1;

		return {
			x: vector.x / length,
			y: vector.y / length,
		};
	}

	function dot(first, second) {
		return first.x * second.x + first.y * second.y;
	}

	function wrapUnit(value) {
		return ((value % 1) + 1) % 1;
	}

	function getForegroundResolution() {
		if (foreground?.width && foreground?.height) {
			return [foreground.width, foreground.height];
		}

		return [designWidth, designHeight];
	}
};

new p5(sketch);
