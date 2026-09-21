import {
  animateTextOut,
  animateVisibleTextIn,
  initAosTextAnimations,
} from "./text-animations.js";
import { withLoadIndicator } from "./load-indicator.js";

const DURATION = 0.8;
const ENTER_DELAY = 0.18;
const TEXT_ENTER_DELAY = ENTER_DELAY + 0.35;
const LOG_PREFIX = "[base lifecycle]";

export function transition({ onEnter, onLeave, onStart, onComplete } = {}) {
  let releaseLeave = () => {};
  let nextReady = Promise.resolve();
  let activeOverlay = null;

  return {
    name: "transition",
    sync: true,
    async once({ next }) {
      console.log(LOG_PREFIX, "transition once -> run setup", getContainerContext(next));
      await onEnter?.(getPageContext(next));
    },
    async before({ current, next }) {
      console.log(LOG_PREFIX, "transition before", getTransitionContext(current, next));
      current.container.dataset.pageLeaving = "true";
      delete next.container.dataset.pageLeaving;
      stackContainers(current.container, next.container);
      window.scrollTo(0, 0);
      activeOverlay = addOverlay(current.container);
      hideNext(next.container);
      nextReady = new Promise((resolve) => {
        releaseLeave = resolve;
      });
    },
    async leave({ current }) {
      console.log(LOG_PREFIX, "transition leave", getContainerContext(current));
      await nextReady;
      onStart?.(getPageContext(current));
      return animateCurrent(current.container);
    },
    async enter({ current, next }) {
      console.log(LOG_PREFIX, "transition enter", getContainerContext(next));
      console.log(LOG_PREFIX, "transition enter -> run setup", getContainerContext(next));

      try {
        await withLoadIndicator(
          () => onEnter?.(getPageContext(next, { transition: true })),
          {
            label: `transition:${getNamespaceFromPage(next)}`,
            container: getOverlay(current.container) || activeOverlay,
            requireContainer: true,
            detachText: true,
            onShow: () => {
              showOverlay(activeOverlay);
            },
          },
        );
        prepareNext(next.container);
      } finally {
        releaseLeave();
      }

      return animateNext(next.container);
    },
    async after({ current, next }) {
      console.log(LOG_PREFIX, "transition after", getTransitionContext(current, next));
      removeOverlay(current.container);
      activeOverlay = null;
      resetContainer(current.container);
      window.scrollTo(0, 0);
      resetContainer(next.container);
      console.log(LOG_PREFIX, "transition after -> run teardown", getContainerContext(current));
      await onLeave?.(getPageContext(current));
      initAosTextAnimations(next.container);
      window.ScrollTrigger?.refresh();
      onComplete?.(getPageContext(next));
    },
  };
}

function animateCurrent(container) {
  const gsap = window.gsap;

  if (!gsap) {
    return animateTextOut(container);
  }


  return Promise.all([
    animateOverlayIn(container, gsap),
    animateTextOut(container),
  ]);
}

function animateOverlayIn(container, gsap) {
  const overlay = getOverlay(container);

  if (!overlay) {
    return Promise.resolve();
  }

  return gsap.to(overlay, {
    opacity: 0.2,
    duration: DURATION,
    ease: "power2.inOut",
  });
}

async function animateNext(container) {
  const gsap = window.gsap;

  if (!gsap) {
    resetContainer(container);
    return animateVisibleTextIn(container);
  }

  const mask = {
    scale: 0,
    rotation: 5,
  };


  return Promise.all([
    gsap.to(container, {
      scale: 1,
      duration: DURATION,
      delay: ENTER_DELAY,
      ease: "power3.inOut",
    }),
    gsap.to(mask, {
      scale: 1.45,
      rotation: 0,
      duration: DURATION,
      delay: ENTER_DELAY,
      ease: "power3.inOut",
      onStart: () => {
        mask.scale = 0.14;
        setContainerMask(container, mask.scale, mask.rotation);
      },
      onUpdate: () => {
        setContainerMask(container, mask.scale, mask.rotation);
      },
    }),
    animateVisibleTextIn(container, { delay: TEXT_ENTER_DELAY }),
  ]);
}

function stackContainers(current, next) {
  const scrollY = window.scrollY || window.pageYOffset || 0;

  current.dataset.transitionScrollY = String(scrollY);
  current.style.position = "fixed";
  current.style.top = `${-scrollY}px`;
  current.style.left = "0";
  current.style.right = "0";
  current.style.width = "100%";

  next.style.position = "fixed";
  next.style.inset = "0";
  next.style.width = "100%";

  current.style.zIndex = "";
  next.style.zIndex = "";
}

function prepareNext(container) {
  const gsap = window.gsap;
  const viewportCenter = getViewportCenter();

  if (gsap) {
    gsap.set(container, {
      opacity: 1,
      scale: 0.5,
      transformOrigin: `${viewportCenter.x}px ${viewportCenter.y}px`,
    });
  } else {
    container.style.opacity = "1";
    return;
  }

  setContainerMask(container, 0, 5);
}

function hideNext(container) {
  container.style.opacity = "0";
}

function resetContainer(container) {
  const gsap = window.gsap;


  if (gsap) {
    gsap.set(container, {
      clearProps:
        "position,inset,top,left,right,width,zIndex,opacity,transform,scale,transformOrigin,clipPath,webkitClipPath",
    });
    delete container.dataset.transitionScrollY;
    return;
  }

  container.style.position = "";
  container.style.inset = "";
  container.style.top = "";
  container.style.left = "";
  container.style.right = "";
  container.style.width = "";
  container.style.zIndex = "";
  container.style.opacity = "";
  container.style.transform = "";
  container.style.scale = "";
  container.style.transformOrigin = "";
  container.style.clipPath = "";
  container.style.webkitClipPath = "";
  delete container.dataset.transitionScrollY;
}

export function setContainerMask(container, scale, rotation) {
  const polygon = getRotatedRectPolygon(scale, rotation);

  container.style.clipPath = polygon;
  container.style.webkitClipPath = polygon;
}

function getRotatedRectPolygon(scale, rotationDegrees) {
  const viewportWidth = Math.max(window.innerWidth, 1);
  const viewportHeight = Math.max(window.innerHeight, 1);
  const width = viewportWidth * scale;
  const height = viewportHeight * scale;
  const center = getViewportCenter();
  const rotation = (rotationDegrees * Math.PI) / 180;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const points = [
    [-width / 2, -height / 2],
    [width / 2, -height / 2],
    [width / 2, height / 2],
    [-width / 2, height / 2],
  ].map(([x, y]) => {
    const rotatedX = x * cos - y * sin + center.x;
    const rotatedY = x * sin + y * cos + center.y;

    return `${rotatedX.toFixed(3)}px ${rotatedY.toFixed(3)}px`;
  });

  return `polygon(${points.join(", ")})`;
}

function getViewportCenter() {
  return {
    x: Math.max(window.innerWidth, 1) / 2,
    y: Math.max(window.innerHeight, 1) / 2,
  };
}

function addOverlay(container) {
  const overlay = document.createElement("div");

  overlay.dataset.transitionOverlay = "";
  overlay.style.position = "absolute";
  overlay.style.inset = "0";
  overlay.style.background = "#000000";
  overlay.style.opacity = "0";
  overlay.style.pointerEvents = "none";
  overlay.style.zIndex = "999";

  container.appendChild(overlay);
  return overlay;
}

function showOverlay(overlay) {
  if (!overlay) {
    return;
  }

  window.gsap?.killTweensOf(overlay);
  if (!window.gsap) {
    overlay.style.opacity = "0.15";
    return;
  }

  window.gsap.to(overlay, {
    opacity: 0.15,
    duration: 0.2,
    ease: "power2.out",
    overwrite: true,
  });
}

function removeOverlay(container) {
  getOverlay(container)?.remove();
}

function getOverlay(container) {
  return container.querySelector("[data-transition-overlay]");
}

function getTransitionContext(current, next) {
  return {
    current: getContainerContext(current),
    next: getContainerContext(next),
  };
}

function getContainerContext(page) {
  return {
    namespace: getNamespaceFromPage(page),
    connected: Boolean(page?.container?.isConnected),
    className: page?.container?.className || "",
  };
}

function getPageContext(page, options = {}) {
  if (!page?.container) {
    return {
      container: null,
      namespace: "page",
      rawNamespace: "",
      transition: Boolean(options.transition),
      settled: Boolean(options.settled),
      deferIntros: Boolean(options.deferIntros),
    };
  }

  return {
    container: page.container,
    namespace: getNamespaceFromPage(page),
    rawNamespace: page.namespace,
    transition: Boolean(options.transition),
    settled: Boolean(options.settled),
    deferIntros: Boolean(options.deferIntros),
  };
}

function getNamespaceFromPage(page) {
  return String(page?.namespace || getNamespaceFromContainer(page?.container) || "page")
    .trim()
    .toLowerCase();
}

function getNamespaceFromContainer(container) {
  return String(container?.dataset?.barbaNamespace || "")
    .trim()
    .toLowerCase();
}
