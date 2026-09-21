# Village Underground base

Two Webflow pages (`index.html` and `about.html`) with a shared Three.js canvas, Barba transitions, loading indicators, split-text animation, and animated link underlines.

```sh
npm install
npm run dev
npm run build
```

The development server serves `/` and `/about`. The build produces `public/base.js` and its source map. This is a JavaScript library build; `npm run preview` serves the bundle, not the HTML pages.

## Webflow structure

Keep the single canvas outside the page container so its renderer and model persist during navigation:

```html
<body data-barba="wrapper">
  <div data-three-canvas class="webgl"></div>
  <section data-barba="container" data-barba-namespace="home">
    <a href="/about" data-underline-link>About</a>
    <h1>Home</h1>
  </section>
</body>
```

Webflow owns the layout and canvas dimensions. Each page needs the same wrapper/canvas structure and a unique namespace. The local HTML loads `/src/base.js`; in Webflow, load the hosted `base.js` once after GSAP, SplitText, ScrollTrigger, and Lenis. The base owns the Lenis instance and animation loop.

## Model setup

The default is neutral placeholder geometry, with no project-specific model request. Add `data-three-model="https://your-host/model.glb"` to the canvas mount to load a GLB. The initial loader waits for model preparation and fonts; failed model requests fall back to the placeholder.

The model system retains mouse-driven camera movement, first-clip reveal animation, hover/rest/click animation progress, transition out/in animation, and optional black/white depth-mask materials. Other model materials are preserved. Add `data-three-control` to a wrapping element to use it as the hover/click target. An optional `data-three-reveal="#footer-link"` selector can synchronize model reveal with an animated underline; that trigger should also live outside the swapped page container.

## Text and links

- Headings, paragraphs, `[data-text]`, `[data-underline-link]`, and the existing generic typography classes use split-line animation.
- `data-text-animate="false"` excludes an element and its descendants.
- `data-underline-link` reveals an underline on hover; `data-underline-link="alt"` starts underlined and removes the underline on hover.
- `[data-link-hover]` enables optional sibling-link dimming within a navigation group.
- `[data-year]` is filled with the current year.
- `base:text-reveal` and `base:underline-reveal` bubble from animated elements for future integrations.

Transitions preserve the incoming rotated rectangle mask, scale and text timing, outgoing text and underlines, delayed loading indicator, font/layout readiness, scroll reset, and animation teardown. The canvas remains mounted across navigation. Shots, project logos, maps, client spinners, mobile navigation, and page-specific media behavior have been removed.
