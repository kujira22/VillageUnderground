const DIMMED_OPACITY = 0.4;
const ACTIVE_OPACITY = 1;
const HOVER_DURATION = 0.18;

const navStates = new WeakMap();

export function initLinkHover(container = document) {
  container?.querySelectorAll('[data-link-hover]').forEach((nav) => {
    const links = [...nav.querySelectorAll("a[href]")];

    if (links.length < 2 || navStates.has(nav)) {
      return;
    }

    navStates.set(nav, setupNavHover(nav, links));
  });
}

export function destroyLinkHover(container = document) {
  container?.querySelectorAll('[data-link-hover]').forEach((nav) => {
    navStates.get(nav)?.destroy();
    navStates.delete(nav);
  });
}

function setupNavHover(nav, links) {
  const originalOpacities = new Map(links.map((link) => [link, link.style.opacity]));
  let locked = false;
  const onEnter = (event) => {
    if (locked) {
      return;
    }

    const activeLink = event.currentTarget;

    setActiveLink(links, activeLink);
  };
  const onLeave = () => {
    if (locked) {
      return;
    }

    links.forEach((link) => setLinkOpacity(link, ACTIVE_OPACITY));
  };
  const onClick = (event) => {
    locked = true;
    setActiveLink(links, event.currentTarget);
  };

  links.forEach((link) => {
    link.addEventListener("mouseenter", onEnter);
    link.addEventListener("focus", onEnter);
    link.addEventListener("click", onClick);
  });
  nav.addEventListener("mouseleave", onLeave);
  nav.addEventListener("focusout", onLeave);

  return {
    destroy() {
      links.forEach((link) => {
        link.removeEventListener("mouseenter", onEnter);
        link.removeEventListener("focus", onEnter);
        link.removeEventListener("click", onClick);
        setLinkOpacity(link, originalOpacities.get(link) || "", true);
      });
      nav.removeEventListener("mouseleave", onLeave);
      nav.removeEventListener("focusout", onLeave);
    },
  };
}

function setActiveLink(links, activeLink) {
  links.forEach((link) => {
    setLinkOpacity(link, link === activeLink ? ACTIVE_OPACITY : DIMMED_OPACITY);
  });
}

function setLinkOpacity(link, opacity, immediate = false) {
  const gsap = window.gsap;

  if (gsap && !immediate) {
    gsap.to(link, {
      opacity,
      duration: HOVER_DURATION,
      ease: "power2.out",
      overwrite: true,
    });
    return;
  }

  link.style.opacity = opacity;
}
