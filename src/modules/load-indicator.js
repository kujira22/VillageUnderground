const SHOW_DELAY = 300;
const MIN_VISIBLE = 300;
const FINISH_HOLD = 90;
const FADE_DURATION = 180;
const MAX_WAIT_PROGRESS = 92;
const TEXT_IN_DURATION = 0.2;
const TEXT_OUT_DURATION = 0.2;
const TEXT_IN_EASE = "power4.in";
const TEXT_OUT_EASE = "power4.out";
const LOG_PREFIX = "[base loader]";

export async function withLoadIndicator(work, options = {}) {
  const loader = createLoadIndicator(options);

  try {
    return await Promise.resolve().then(() => (
      typeof work === "function" ? work() : work
    ));
  } finally {
    await loader.finish();
  }
}

export function createLoadIndicator(options = {}) {
  const label = options.label || "loader";
  let indicator = null;
  let frameId = null;
  let progress = 0;
  let startedAt = 0;
  let visible = false;
  let finished = false;

  const showDelay = Number.isFinite(options.showDelay) ? options.showDelay : SHOW_DELAY;

  console.log(LOG_PREFIX, "created", {
    label,
    showDelay,
    noOverlay: Boolean(options.noOverlay),
    detachText: Boolean(options.detachText),
    requireContainer: Boolean(options.requireContainer),
    hasContainer: Boolean(options.container),
  });

  const showTimer = window.setTimeout(() => {
    if (finished) {
      console.log(LOG_PREFIX, "show skipped -> already finished", { label });
      return;
    }

    startedAt = performance.now();
    console.log(LOG_PREFIX, "show timer fired", { label });
    indicator = createIndicator(options.container, {
      detachText: options.detachText,
      noOverlay: options.noOverlay,
      requireContainer: options.requireContainer,
      label,
    });
    visible = Boolean(indicator);

    if (visible) {
      console.log(LOG_PREFIX, "visible", {
        label,
        textConnected: indicator.text.isConnected,
        maskConnected: indicator.mask.isConnected,
      });
      options.onShow?.();
      animateIndicatorIn(indicator);
      tick();
    } else {
      console.log(LOG_PREFIX, "not visible -> no indicator created", { label });
    }
  }, showDelay);

  return {
    async finish() {
      if (finished) {
        return;
      }

      finished = true;
      window.clearTimeout(showTimer);
      console.log(LOG_PREFIX, "finish called", {
        label,
        visible,
        progress: Math.floor(progress),
      });

      if (visible && indicator) {
        window.cancelAnimationFrame(frameId);
        await waitForMinimumVisible(startedAt);
        await finishIndicator(indicator, progress);
      }
    },
  };

  function tick() {
    const elapsed = performance.now() - startedAt;
    const target = Math.min(MAX_WAIT_PROGRESS, Math.floor(elapsed / 24));

    progress += (target - progress) * 0.16;
    setProgress(indicator, Math.floor(progress));
    frameId = window.requestAnimationFrame(tick);
  }
}

function waitForMinimumVisible(startedAt) {
  const elapsed = performance.now() - startedAt;
  const remaining = MIN_VISIBLE - elapsed;

  if (remaining <= 0) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    window.setTimeout(resolve, remaining);
  });
}

function createIndicator(container, options = {}) {
  if (!container && options.requireContainer) {
    console.log(LOG_PREFIX, "create skipped -> missing required container", {
      label: options.label,
    });
    return null;
  }

  const root = container || document.createElement("div");
  const mask = document.createElement("div");
  const text = document.createElement("div");
  const ownsRoot = !container;
  const textRoot = options.detachText || ownsRoot ? document.body : root;

  if (ownsRoot) {
    root.dataset.loadIndicator = "";
    root.style.position = "fixed";
    root.style.inset = "0";
    root.style.zIndex = "999999";
    root.style.pointerEvents = "none";
    root.style.background = options.noOverlay ? "transparent" : "rgba(0, 0, 0, 0.2)";
    root.style.opacity = "1";
    document.body.append(root);
  }

  mask.dataset.loadIndicatorMask = "";
  mask.style.position = options.detachText ? "fixed" : "absolute";
  if (ownsRoot) {
    mask.style.position = "fixed";
  }
  mask.style.left = "50%";
  mask.style.top = "50%";
  mask.style.transform = "translate(-50%, -50%)";
  mask.style.display = "block";
  mask.style.overflow = "hidden";
  mask.style.lineHeight = "1";
  mask.style.mixBlendMode = "difference";
  mask.style.zIndex = options.detachText || ownsRoot ? "2147483647" : "";
  mask.style.pointerEvents = "none";

  text.dataset.loadIndicatorText = "";
  text.setAttribute("aria-label", "0");
  text.style.display = "block";
  text.style.color = "#fff";
  text.style.opacity = "0.8";
  text.style.fontSize = "0.8rem";
  text.style.lineHeight = "1";
  text.style.fontFamily = "inherit";
  text.style.fontVariantNumeric = "tabular-nums";
  text.style.letterSpacing = "0";
  text.style.transform = "translateY(0%)";

  mask.append(text);
  textRoot.append(mask);
  const indicator = { root, mask, text, ownsRoot, value: "" };

  setProgress(indicator, 0, { animate: false });
  console.log(LOG_PREFIX, "dom appended", {
    label: options.label,
    ownsRoot,
    textRoot: textRoot === document.body ? "body" : "container",
    maskConnected: mask.isConnected,
  });
  return indicator;
}

async function finishIndicator(indicator, fromProgress) {
  const start = Math.max(0, Math.floor(fromProgress));
  const startTime = performance.now();

  await new Promise((resolve) => {
    const tick = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(1, elapsed / FINISH_HOLD);
      const value = Math.round(start + (100 - start) * progress);

      setProgress(indicator, value);

      if (progress < 1) {
        window.requestAnimationFrame(tick);
        return;
      }

      resolve();
    };

    tick();
  });

  await animateIndicatorOut(indicator);

  if (indicator.ownsRoot) {
    await fadeOut(indicator.root);
    indicator.root.remove();
    indicator.mask.remove();
    return;
  }

  indicator.mask.remove();
}

function setProgress(indicator, value, options = {}) {
  const nextValue = String(Math.min(100, Math.max(0, value)));

  if (indicator.value === nextValue) {
    return;
  }

  indicator.value = nextValue;
  indicator.text.setAttribute("aria-label", nextValue);
  indicator.text.textContent = nextValue;
}

function fadeOut(element) {
  return new Promise((resolve) => {
    const startTime = performance.now();

    const tick = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(1, elapsed / FADE_DURATION);

      element.style.opacity = String(1 - progress);

      if (progress < 1) {
        window.requestAnimationFrame(tick);
        return;
      }

      resolve();
    };

    tick();
  });
}

function animateIndicatorIn(indicator) {
  const gsap = window.gsap;

  if (!gsap) {
    return;
  }

  gsap.fromTo(
    indicator.text,
    { yPercent: 110 },
    {
      yPercent: 0,
      duration: TEXT_IN_DURATION,
      ease: TEXT_IN_EASE,
      overwrite: true,
    },
  );
}

function animateIndicatorOut(indicator) {
  const gsap = window.gsap;

  if (!gsap) {
    indicator.text.style.transform = "translateY(-110%)";
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    gsap.to(indicator.text, {
      yPercent: -110,
      duration: 0.4,
      ease: "power4.in",
      overwrite: true,
      onComplete: resolve,
    });
  });
}
