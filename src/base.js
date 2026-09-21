import { initBarba } from "./modules/barba.js";
import {
  animateVisibleTextIn,
  initAosTextAnimations,
  initTextAnimations,
  installTextPreloadStyles,
  resetTextAnimations,
} from "./modules/text-animations.js";
import { initThreeScene } from "./modules/three-scene.js";
import { destroyLinkHover, initLinkHover } from "./modules/link-hover.js";
import { withLoadIndicator } from "./modules/load-indicator.js";
import { domReady } from "./utils/dom-ready.js";

const app = { three: null, barba: null, lenis: null };
installTextPreloadStyles();

async function boot() {
  await domReady();
  initSmoothScroll();
  // This mount lives outside Barba's container and survives every navigation.
  app.three = initThreeScene({ mount: document.querySelector("[data-three-canvas]") });
  app.barba = initBarba({
    onEnter: runPageSetup,
    onLeave: runPageTeardown,
    onTransitionStart: () => {
      app.lenis?.stop();
      app.three?.animateToProgress(0, 0.55);
    },
    onTransitionComplete: () => {
      app.lenis?.scrollTo(0, { immediate: true });
      app.lenis?.start();
      app.three?.animateToProgress(1, 1.2);
    },
  });

  if (!app.barba) {
    const container = document.querySelector("[data-barba='container']");
    await runPageSetup({ container });
  }
}

async function runPageSetup({ container, namespace, transition = false }) {
  if (!container) return;
  const pageNamespace = String(namespace || container.dataset.barbaNamespace || "page").toLowerCase();
  const setup = async () => {
    container.dataset.pageActive = "true";
    document.body.dataset.page = pageNamespace;
    const Webflow = window.Webflow;
    Webflow?.destroy?.();
    Webflow?.ready?.();
    Webflow?.require?.("ix2")?.init?.();
    await document.fonts?.ready;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    resetTextAnimations(container);
    initTextAnimations(container, { autoAnimate: false });
    initLinkHover(container);
    container.querySelectorAll("[data-year]").forEach((element) => {
      element.textContent = String(new Date().getFullYear());
    });
    await app.three?.ready;
  };

  if (transition) {
    await setup();
  } else {
    await withLoadIndicator(setup, { label: `initial:${pageNamespace}`, noOverlay: true });
    await animateVisibleTextIn(container);
    initAosTextAnimations(container);
    window.ScrollTrigger?.refresh();
  }
}

function runPageTeardown({ container }) {
  if (!container) return;
  resetTextAnimations(container);
  destroyLinkHover(container);
  delete container.dataset.pageActive;
}

function initSmoothScroll() {
  if (!window.Lenis) return;
  app.lenis = new window.Lenis({
    duration: 1.1,
    easing: (t) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
    direction: "vertical",
    smooth: true,
    infinite: false,
    smoothTouch: false,
    touchMultiplier: 1.5,
  });
  const tick = (time) => {
    app.lenis.raf(time);
    window.ScrollTrigger?.update();
  };
  if (window.gsap) {
    window.gsap.ticker.add((time) => tick(time * 1000));
    window.gsap.ticker.lagSmoothing(0);
  } else {
    const raf = (time) => { tick(time); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }
}

boot().catch((error) => {
  document.querySelectorAll("[data-barba='container']").forEach((container) => {
    resetTextAnimations(container);
    container.dataset.textReady = "true";
  });
  console.error("[base] Setup failed.", error);
});

export { app };
