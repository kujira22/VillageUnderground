# Audio Image Workbench

Single-page WebGL audio distortion workbench.

- `index.html` is the only page.
- `img/8back.jpg` is the static background layer.
- `img/8.png` is the foreground texture passed through the active shader.
- `js/demo.js` owns the audio startup, mute control, and experiment switcher.
- `shaders/` contains the fragment shaders used by the eight experiment profiles.

Click anywhere on the page to start the audio context. Use the numbered controls to switch experiments.
