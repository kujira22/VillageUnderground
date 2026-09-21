import barba from "@barba/core";
import { transition } from "./transition.js";

const LOG_PREFIX = "[base lifecycle]";

export function initBarba({ onEnter, onLeave, onTransitionStart, onTransitionComplete } = {}) {
  if (!document.querySelector("[data-barba='wrapper']")) {
    console.log(LOG_PREFIX, "barba skipped -> no wrapper");
    return null;
  }

  console.log(LOG_PREFIX, "barba init");
  if ("scrollRestoration" in window.history) {
    window.history.scrollRestoration = "manual";
  }

  barba.init({
    debug: import.meta.env.DEV,
    preventRunning: true,
    transitions: [
      transition({
        onEnter,
        onLeave,
        onStart: onTransitionStart,
        onComplete: onTransitionComplete,
      }),
    ],
  });

  initLinkRouter();

  return barba;
}

function initLinkRouter() {
  if (window.__baseBarbaLinkRouterInit) {
    return;
  }

  window.__baseBarbaLinkRouterInit = true;

  document.addEventListener(
    "click",
    (event) => {
      const link = event.target.closest?.("a[href]");

      if (!link || shouldIgnoreLink(event, link)) {
        return;
      }

      const url = new URL(link.href, window.location.href);

      if (url.href === window.location.href) {
        return;
      }

      console.log(LOG_PREFIX, "link router -> barba.go", {
        href: link.getAttribute("href"),
        url: url.href,
      });

      event.preventDefault();
      event.stopImmediatePropagation();
      if (!barba.transitions.isRunning) {
        barba.go(url.href, link, event);
      }
    },
    true,
  );
}

function shouldIgnoreLink(event, link) {
  if (
    event.defaultPrevented ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    event.button !== 0
  ) {
    return true;
  }

  const href = link.getAttribute("href") || "";

  if (
    href === "" ||
    href.startsWith("#") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:") ||
    (link.target && link.target !== "_self") ||
    link.hasAttribute("download") ||
    link.closest("[data-barba-prevent]")
  ) {
    return true;
  }

  const url = new URL(link.href, window.location.href);

  return url.origin !== window.location.origin ||
    (url.pathname === window.location.pathname && url.search === window.location.search && Boolean(url.hash));
}
