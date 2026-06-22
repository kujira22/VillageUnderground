const DURATION = 0.8;

export function transition({ onStart } = {}) {
  return {
    name: "transition",
    sync: true,
    before({ current, next }) {
      onStart?.();
      stackContainers(current.container, next.container);
      addOverlay(current.container);
      prepareNext(next.container);
    },
    leave({ current }) {
      return animateCurrent(current.container);
    },
    enter({ next }) {
      return animateNext(next.container);
    },
    after({ current, next }) {
      removeOverlay(current.container);
      resetContainer(current.container);
      resetContainer(next.container);
    },
  };
}

function animateCurrent(container) {
  const gsap = window.gsap;
  const overlay = getOverlay(container);

  if (!gsap || !overlay) {
    return Promise.resolve();
  }

  return gsap.to(overlay, {
    opacity: 0.2,
    duration: DURATION,
    ease: "power2.inOut",
  });
}

function animateNext(container) {
  const gsap = window.gsap;

  if (!gsap) {
    return Promise.resolve();
  }

  return gsap.to(container, {
    y: "0vh",
    duration: DURATION,
    ease: "power2.inOut",
  });
}

function stackContainers(current, next) {
  [current, next].forEach((container) => {
    container.style.position = "fixed";
    container.style.inset = "0";
    container.style.width = "100%";
  });

  current.style.zIndex = "";
  next.style.zIndex = "";
}

function prepareNext(container) {
  const gsap = window.gsap;

  if (gsap) {
    gsap.set(container, { y: "100vh" });
    return;
  }

  container.style.transform = "translateY(100vh)";
}

function resetContainer(container) {
  const gsap = window.gsap;

  if (gsap) {
    gsap.set(container, { clearProps: "position,inset,width,zIndex,transform" });
    return;
  }

  container.style.position = "";
  container.style.inset = "";
  container.style.width = "";
  container.style.zIndex = "";
  container.style.transform = "";
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
}

function removeOverlay(container) {
  getOverlay(container)?.remove();
}

function getOverlay(container) {
  return container.querySelector("[data-transition-overlay]");
}
