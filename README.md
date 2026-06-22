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

## Shots MVP

For a direct front-end MVP, add config before `base.js`:

```html
<script>
  window.ShotsConfig = {
    baseUrl: "https://alex.slateapp.com/api/v1",
    accessToken: "SHOTS_ACCESS_TOKEN"
  };
</script>
```

Single work binding:

```html
<div data-shots-work="221">
  <h2 data-shots-title></h2>
  <img data-shots-poster alt="">
  <video data-shots-video controls playsinline></video>
</div>
```

Showreel binding:

```html
<div data-shots-showreel="33">
  <article data-shots-template>
    <h2 data-shots-title></h2>
    <img data-shots-poster alt="">
    <video data-shots-video muted loop playsinline data-shots-autoplay></video>
  </article>
</div>
```

Security note: without a backend or edge proxy, the access token is public in Webflow. That is only acceptable if Shots confirms the token is read-only and safe to expose. For production, prefer a cached Cloudflare Worker or static JSON mirror so the browser never receives the token.
