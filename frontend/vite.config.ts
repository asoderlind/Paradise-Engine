import { defineConfig } from "vite";
import glsl from "vite-plugin-glsl";
import topLevelAwait from "vite-plugin-top-level-await";
import path from "path";

export default defineConfig({
  root: "src",
  publicDir: "../static",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      Components: path.resolve(__dirname, "./src/Components"),
      static: path.resolve(__dirname, "./static"),
    },
  },
  plugins: [
    glsl(),
    topLevelAwait({
      // The export name of top-level await promise for each chunk module
      promiseExportName: "__tla",
      // The function to generate import names of top-level await promise in each chunk module
      promiseImportName: (i) => `__tla_${i}`,
    }),
  ],
});
