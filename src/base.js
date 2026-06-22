import { initBarba } from "./modules/barba.js";
import { initThreeScene } from "./modules/three-scene.js";
import { domReady } from "./utils/dom-ready.js";

const app = {
  three: null,
  barba: null,
};

const pageHooks = {
  home({ namespace }) {
    app.three?.setNamespace(namespace);
  },
};

async function boot() {
  await domReady();

  app.three = initThreeScene({
    mount: document.querySelector("[data-three-canvas]"),
  });

  app.barba = initBarba({
    onEnter: runPageSetup,
    onTransitionStart: () => {
      app.three?.spin();
    },
  });
}

function runPageSetup({ namespace }) {
  document.body.dataset.page = namespace;
  app.three?.setNamespace(namespace);

  pageHooks[namespace]?.({ namespace });
}

boot();

export { app };
