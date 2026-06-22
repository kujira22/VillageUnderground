import barba from "@barba/core";
import { transition } from "./transition.js";

export function initBarba({ onEnter, onTransitionStart } = {}) {
  if (!document.querySelector("[data-barba='wrapper']")) {
    return null;
  }

  barba.init({
    debug: import.meta.env.DEV,
    preventRunning: true,
    transitions: [transition({ onStart: onTransitionStart })],
    hooks: {
      once(data) {
        onEnter?.(getPageContext(data.next));
      },
      afterEnter(data) {
        onEnter?.(getPageContext(data.next));
      },
    },
  });

  return barba;
}

function getPageContext(page) {
  return {
    container: page.container,
    namespace: normalizeNamespace(page.namespace),
    rawNamespace: page.namespace,
  };
}

function normalizeNamespace(namespace) {
  return String(namespace || "page").trim().toLowerCase();
}
