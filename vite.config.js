import { defineConfig } from "vite";
import fs from "node:fs";
import path from "node:path";

function webflowCleanUrls() {
  return {
    name: "webflow-clean-urls",
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (!req.url) {
          next();
          return;
        }

        const [pathname, query = ""] = req.url.split("?");

        if (
          pathname === "/" ||
          pathname.includes(".") ||
          pathname.startsWith("/@") ||
          pathname.startsWith("/src/") ||
          pathname.startsWith("/node_modules/")
        ) {
          next();
          return;
        }

        const htmlPath = path.join(server.config.root, `${pathname}.html`);

        if (fs.existsSync(htmlPath)) {
          req.url = `${pathname}.html${query ? `?${query}` : ""}`;
        }

        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [webflowCleanUrls()],
  publicDir: false,
  build: {
    emptyOutDir: true,
    outDir: "public",
    sourcemap: true,
    lib: {
      entry: "src/base.js",
      name: "WebflowThreeBarbaStarter",
      formats: ["iife"],
      fileName: () => "base.js",
    },
    rollupOptions: {
      output: {
        assetFileNames: "assets/[name][extname]",
      },
    },
  },
});
