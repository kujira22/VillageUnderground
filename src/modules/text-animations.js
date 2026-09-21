const TEXT_SELECTOR = [
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "[data-text]",
  "[data-underline-link]",
  ".w-inline-block",
  ".body-large",
  ".body-regular",
  ".body-small",
  ".link_large",
  ".link_small",
  ".nav_link",
  ".heading-1",
  ".heading-2",
  ".heading-3",
  ".heading-4",
  ".heading-5",
  ".heading-6",
].join(",");

const config = {
  load: {
    duration: 0.9,
    ease: "power3.out",
    groupStagger: 0.3,
    lineStagger: 0.045,
  },
  aos: {
    start: "top bottom",
    duration: 0.8,
    ease: "power3.out",
    lineStagger: 0.045,
  },
  out: {
    duration: 0.65,
    ease: "power3.in",
    lineStagger: 0,
  },
  underline: {
    duration: 0.16,
    inEase: "power2.out",
    outEase: "power2.in",
  },
};

const registry = new WeakMap();
const PRELOAD_STYLE_ID = "base-text-preload-style";
const UNDERLINE_STYLE_ID = "base-underline-link-style";
export const TEXT_REVEAL_EVENT = "base:text-reveal";
export const UNDERLINE_REVEAL_EVENT = "base:underline-reveal";
let underlineClickHandlerInstalled = false;

export function installTextPreloadStyles() {
  installUnderlineLinkStyles();

  if (document.getElementById(PRELOAD_STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = PRELOAD_STYLE_ID;
  style.textContent = `
    [data-barba="container"]:not([data-text-ready="true"]) :is(${TEXT_SELECTOR}) {
      opacity: 0 !important;
    }
  `;
  document.head.appendChild(style);
}

function installUnderlineLinkStyles() {
  installUnderlineClickHandler();
  markSafariBrowser();

  if (document.getElementById(UNDERLINE_STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = UNDERLINE_STYLE_ID;
  style.textContent = `
    [data-underline-link] {
      position: relative;
      text-decoration: none;
      --base-underline-thickness: 0.07lh;
      --base-underline-offset: 0.02lh;
    }

    [data-underline-link]::after {
      content: "";
      position: absolute;
      left: 0;
      right: 0;
      bottom: calc(var(--base-underline-offset) * -1);
      height: 0;
      border-bottom: var(--base-underline-thickness) solid currentColor;
      background: transparent;
      transform: scaleX(var(--base-underline-scale, 0));
      transform-origin: var(--base-underline-origin, right center);
      transition: transform 0.24s ease;
      pointer-events: none;
    }

    html.base-safari .w-dyn-item [data-underline-link] {
      display: inline-block;
      vertical-align: top;
      line-height: inherit;
    }


    [data-underline-link="alt"]::after {
      transform-origin: var(--base-underline-origin, left center);
    }

    [data-underline-link=""][data-underline-ready="true"]:hover::after {
      transform: scaleX(1);
      transform-origin: left center;
    }

    [data-underline-link="alt"][data-underline-ready="true"]:hover::after {
      transform: scaleX(0);
      transform-origin: right center;
    }

    [data-underline-link][data-underline-leaving="true"]::after,
    [data-underline-link][data-underline-leaving="true"][data-underline-ready="true"]:hover::after {
      transform: scaleX(var(--base-underline-scale, 0));
      transform-origin: right center;
      transition: none;
      animation: none;
    }

    [data-page-leaving="true"] [data-underline-link="alt"][data-underline-clicked="true"][data-underline-clicked-hovered="true"]::after {
      transform: scaleX(0);
      transform-origin: right center;
      animation: none;
    }

    [data-page-leaving="true"] [data-underline-link="alt"][data-underline-clicked="true"][data-underline-clicked-hovered="false"]::after {
      transform: scaleX(var(--base-underline-scale, 1));
      transform-origin: left center;
      animation: none;
    }

  `;
  document.head.appendChild(style);
}

function markSafariBrowser() {
  document.documentElement.classList.toggle("base-safari", isSafariBrowser());
}

function installUnderlineClickHandler() {
  if (underlineClickHandlerInstalled) {
    return;
  }

  underlineClickHandlerInstalled = true;
  document.addEventListener(
    "pointerdown",
    markUnderlineClicked,
    true,
  );
  document.addEventListener(
    "click",
    markUnderlineClicked,
    true,
  );
}

function markUnderlineClicked(event) {
  document
    .querySelectorAll("[data-underline-clicked='true']")
    .forEach((link) => {
      delete link.dataset.underlineClicked;
      delete link.dataset.underlineClickedHovered;
    });

  const link = event.target?.closest?.("[data-underline-link]");

  if (link) {
    link.dataset.underlineClicked = "true";
    link.dataset.underlineClickedHovered = String(link.matches(":hover"));
  }
}

export function initTextAnimations(container = document, options = {}) {
  const gsap = window.gsap;
  const SplitText = window.SplitText;
  const autoAnimate = options.autoAnimate !== false;

  if (!gsap || !SplitText || !container) {
    if (container?.dataset) {
      container.dataset.textReady = "true";
    }
    container?.querySelectorAll("[data-underline-link]").forEach(revealUnderlineElement);
    return;
  }

  const targets = getTextTargets(container).map((element) => {
    gsap.set(element, { opacity: 0 });

    return prepareText(element, SplitText);
  });

  targets.forEach((state) => {
    gsap.set(state.lines, { yPercent: 110 });
    prepareUnderlineLink(state);

    gsap.set(state.element, { opacity: 1 });
  });

  container.dataset.textReady = "true";

  if (autoAnimate) {
    animateLoadTargets(targets);
    initAosTargets(targets);
  }

}

export function refreshTextAnimations(container = document) {
  resetTextAnimations(container);
  initTextAnimations(container);
}

export function resetTextAnimations(container = document) {
  if (container?.dataset) {
    delete container.dataset.textReady;
  }

  getTextTargets(container).forEach(revertText);
}

export function animateTextOut(container = document) {
  const gsap = window.gsap;

  if (!gsap || !container) {
    return Promise.resolve();
  }

  const states = getTextTargets(container)
    .map((element) => registry.get(element))
    .filter(Boolean);
  const lines = states.flatMap((state) => state.lines);

  if (!lines.length) {
    return Promise.resolve();
  }

  states.forEach(hideTextMasks);

  return Promise.all([
    animateUnderlineLinksOut(states),
    gsap.to(lines, {
      yPercent: -110,
      duration: config.out.duration,
      ease: config.out.ease,
      stagger: config.out.lineStagger,
    }),
  ]);
}

export function animateVisibleTextIn(container = document, options = {}) {
  const gsap = window.gsap;

  if (!gsap || !container) {
    return Promise.resolve();
  }

  const states = getTextTargets(container)
    .filter(isInitialViewportText)
    .map((element) => registry.get(element))
    .filter(Boolean);

  if (!states.length) {
    return Promise.resolve();
  }

  return animateStatesIn(states, {
    delay: options.delay || 0,
    duration: config.aos.duration,
    ease: config.aos.ease,
    stagger: config.aos.lineStagger,
  });
}

export function animateTextIn(container = document, options = {}) {
  const gsap = window.gsap;

  if (!gsap || !container) {
    return Promise.resolve();
  }

  const states = getTextTargets(container)
    .map((element) => registry.get(element))
    .filter(Boolean)
    .filter((state) => options.force || !state.inDone);
  if (!states.length) {
    return Promise.resolve();
  }

  return animateStatesIn(states, {
    duration: options.duration ?? config.aos.duration,
    ease: options.ease || config.aos.ease,
    delay: options.delay || 0,
    stagger: options.stagger ?? config.aos.lineStagger,
  });
}

export function initAosTextAnimations(container = document) {
  const states = getTextTargets(container)
    .map((element) => registry.get(element))
    .filter(Boolean)
    .filter((state) => !state.inDone);

  initAosTargets(states);
}

function animateLoadTargets(states) {
  const gsap = window.gsap;
  const loadStates = states
    .filter((state) => state.loadIndex !== null)
    .sort((a, b) => a.loadIndex - b.loadIndex);

  loadStates.forEach((state) => {
    gsap.to(state.lines, {
      yPercent: 0,
      opacity: 1,
      duration: config.load.duration,
      ease: config.load.ease,
      delay: (state.loadIndex - 1) * config.load.groupStagger,
      stagger: config.load.lineStagger,
      onStart: () => {
        state.inDone = true;
        dispatchTextReveal(state);
      },
      onComplete: () => {
        revealUnderlineLink(state);
      },
    });
  });
}

function animateStatesIn(states, options = {}) {
  const gsap = window.gsap;
  const tweens = states
    .filter((state) => state.lines.length)
    .map((state) => gsap.to(state.lines, {
      yPercent: 0,
      opacity: 1,
      duration: options.duration,
      ease: options.ease,
      delay: options.delay || 0,
      stagger: options.stagger || 0,
      onStart: () => {
        state.inDone = true;
        dispatchTextReveal(state);
      },
      onComplete: () => {
        revealUnderlineLink(state);
      },
    }));

  return Promise.all(tweens);
}

function initAosTargets(states) {
  if (!window.ScrollTrigger) {
    states
      .filter((state) => state.loadIndex === null)
      .forEach(animateStateIn);
    return;
  }

  states
    .filter((state) => state.loadIndex === null)
    .forEach((state) => {
      state.trigger = window.ScrollTrigger.create({
        trigger: state.element,
        start: config.aos.start,
        once: true,
        onEnter: () => animateStateIn(state),
        onRefresh: () => {
          if (isInitialViewportText(state.element)) {
            animateStateIn(state);
          }
        },
      });

      if (isInitialViewportText(state.element)) {
        animateStateIn(state);
      }
    });
}

function animateStateIn(state) {
  const gsap = window.gsap;

  if (!gsap || state.inDone) {
    return;
  }

  state.inDone = true;
  dispatchTextReveal(state);
  gsap.to(state.lines, {
    yPercent: 0,
    opacity: 1,
    duration: config.aos.duration,
    ease: config.aos.ease,
    stagger: config.aos.lineStagger,
    onComplete: () => {
      revealUnderlineLink(state);
    },
  });
}

function isInitialViewportText(element) {
  const rect = element.getBoundingClientRect();
  const top = rect.top - getTranslateY(element.closest("[data-barba='container']"));

  return top < window.innerHeight * 0.95 && rect.bottom > 0;
}

function getTranslateY(element) {
  if (!element) {
    return 0;
  }

  const transform = window.getComputedStyle(element).transform;

  if (!transform || transform === "none") {
    return 0;
  }

  const matrix = new DOMMatrixReadOnly(transform);

  return matrix.m42;
}

function prepareText(element, SplitText) {
  if (registry.has(element)) {
    return registry.get(element);
  }

  const split = new SplitText(element, {
    type: "lines,words",
    linesClass: "text-reveal-line",
  });
  const lines = split.lines.map(wrapLine);
  const loadValue = Number(element.dataset.textLoad);
  const state = {
    element,
    split,
    lines,
    trigger: null,
    inDone: false,
    isUnderlineLink: isUnderlineLink(element),
    loadIndex: Number.isFinite(loadValue) && loadValue > 0 ? loadValue : null,
  };

  element.dataset.textRoot = "";
  registry.set(element, state);
  return state;
}

function revertText(element) {
  const state = registry.get(element);

  if (!state) {
    return;
  }

  state.trigger?.kill();
  window.gsap?.killTweensOf([...state.lines, state.element]);
  state.split?.revert();
  delete element.dataset.textRoot;
  delete element.dataset.textRevealed;
  delete element.dataset.underlineRevealed;
  resetUnderlineLink(state);
  registry.delete(element);
}

function dispatchTextReveal(state) {
  if (!state?.element || state.element.dataset.textRevealed === "true") {
    return;
  }

  state.element.dataset.textRevealed = "true";
  state.element.dispatchEvent(
    new CustomEvent(TEXT_REVEAL_EVENT, {
      bubbles: true,
      detail: { element: state.element },
    }),
  );
}

function prepareUnderlineLink(state) {
  if (!state?.isUnderlineLink) {
    return;
  }

  state.element.dataset.underlineReady = "false";
  state.element.style.setProperty("--base-underline-scale", "0");
  state.element.style.setProperty("--base-underline-origin", "left center");
  state.lines.forEach((line) => setUnderlineLineMaskOverflow(line, "hidden"));
}

function animateUnderlineLinksOut(states) {
  const gsap = window.gsap;
  const underlineStates = states.filter((state) => state?.isUnderlineLink);

  if (!underlineStates.length) {
    return Promise.resolve();
  }

  underlineStates.forEach((state) => {
    const hovered = state.element.matches(":hover");
    const isClickedAlt =
      isAltUnderlineLink(state.element) && state.element.dataset.underlineClicked === "true";

    hideTextMasks(state);

    if (isClickedAlt) {
      state.skipUnderlineOut = true;
      return;
    }

    state.element.dataset.underlineHovered = String(hovered);
    state.element.dataset.underlineLeaving = "true";
    state.element.dataset.underlineReady = "false";
    state.element.style.setProperty("--base-underline-origin", "right center");
    gsap?.killTweensOf(state.element);

    state.skipUnderlineOut = false;

    if (!isAltUnderlineLink(state.element) && hovered) {
      state.element.style.setProperty("--base-underline-scale", "1");
    }
  });

  if (!gsap) {
    underlineStates.forEach(resetUnderlineLink);
    return Promise.resolve();
  }

  return Promise.all(
    underlineStates
      .filter((state) => !state.skipUnderlineOut)
      .map((state) => gsap.to(state.element, {
      "--base-underline-scale": 0,
      duration: config.underline.duration,
      ease: config.underline.outEase,
      overwrite: true,
    })),
  );
}

function revealUnderlineLink(state) {
  const gsap = window.gsap;

  if (!state?.isUnderlineLink) {
    return;
  }

  dispatchUnderlineReveal(state);
  state.lines.forEach((line) => setUnderlineLineMaskOverflow(line, "visible"));
  revealUnderlineElement(state.element);
}

function revealUnderlineElement(element) {
  const gsap = window.gsap;

  if (!element) {
    return;
  }

  delete element.dataset.underlineLeaving;
  element.dataset.underlineReady = "true";
  element.style.setProperty("--base-underline-origin", "left center");

  if (!isAltUnderlineLink(element)) {
    element.style.setProperty("--base-underline-scale", "0");
    return;
  }

  if (!gsap) {
    element.style.setProperty("--base-underline-scale", "1");
    return;
  }

  gsap.to(element, {
    "--base-underline-scale": 1,
    duration: config.underline.duration,
    ease: config.underline.inEase,
    overwrite: true,
  });
}

function dispatchUnderlineReveal(state) {
  if (!state?.element || state.element.dataset.underlineRevealed === "true") {
    return;
  }

  state.element.dataset.underlineRevealed = "true";
  state.element.dispatchEvent(
    new CustomEvent(UNDERLINE_REVEAL_EVENT, {
      bubbles: true,
      detail: { element: state.element },
    }),
  );
}

function resetUnderlineLink(state) {
  if (!state?.isUnderlineLink) {
    return;
  }

  state.element.dataset.underlineReady = "false";
  delete state.element.dataset.underlineLeaving;
  delete state.element.dataset.underlineHovered;
  delete state.element.dataset.underlineClicked;
  delete state.element.dataset.underlineClickedHovered;
  delete state.skipUnderlineOut;
  state.element.style.setProperty("--base-underline-scale", "0");
  state.element.style.setProperty("--base-underline-origin", "left center");
  state.lines.forEach((line) => setUnderlineLineMaskOverflow(line, "hidden"));
}

function hideTextMasks(state) {
  state.lines.forEach((line) => setUnderlineLineMaskOverflow(line, "hidden"));
}

function setUnderlineLineMaskOverflow(line, value) {
  const mask = line.closest(".text-reveal-mask");

  if (mask) {
    mask.style.overflow = value;
  }
}

function wrapLine(line) {
  const wrapper = document.createElement("span");

  wrapper.className = "text-reveal-mask";
  wrapper.style.display = "block";
  wrapper.style.overflow = "hidden";
  wrapper.style.textAlign = "inherit";

  line.style.display = "block";
  line.style.textAlign = "inherit";
  line.parentNode.insertBefore(wrapper, line);
  wrapper.appendChild(line);

  return line;
}

function getTextTargets(container) {
  const elements = [...container.querySelectorAll(TEXT_SELECTOR)].filter((element) => {
    if (element.dataset.textAnimate === "false") {
      return false;
    }

    if (element.closest("[data-text-animate='false'], [hidden]")) {
      return false;
    }

    return element.textContent.trim().length > 0;
  });

  return elements.filter((element) => {
    const underlineAncestor = elements.find(
      (other) => other !== element && isUnderlineLink(other) && other.contains(element),
    );

    if (underlineAncestor) {
      return false;
    }

    if (isUnderlineLink(element)) {
      return true;
    }

    return !elements.some((other) => other !== element && element.contains(other));
  });
}

function isUnderlineLink(element) {
  return element.matches?.("[data-underline-link]");
}

function isAltUnderlineLink(element) {
  return element.getAttribute?.("data-underline-link") === "alt";
}

function isSafariBrowser() {
  return /^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent);
}
