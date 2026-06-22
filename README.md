# Webflow Three Barba Starter

Minimal Vite starter for Webflow builds that need a bundled JavaScript layer with Three.js and Barba.js.

## Scripts

```bash
npm install
npm run dev
npm run build
```

`npm run build` outputs a single Webflow-friendly bundle at:

```text
dist/base.js
```

## Webflow Usage

Keep the HTML and CSS in Webflow. Add the bundle before the closing `</body>` tag:

```html
<script src="https://your-cdn-or-host/base.js"></script>
```

For Barba, Webflow pages need this shape:

```html
<div data-barba="wrapper">
  <main data-barba="container" data-barba-namespace="home">
    ...
  </main>
</div>
```

For the Three.js canvas, add a mount element anywhere on the page:

```html
<div data-three-canvas></div>
```

Style that element in Webflow. For a fixed fullscreen background canvas, use:

```css
[data-three-canvas] {
  position: fixed;
  inset: 0;
  z-index: -1;
}
```
