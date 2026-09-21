import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import { varlockVitePlugin } from "@varlock/vite-integration";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  server: {
    port: 3001,
  },
  resolve: {
    tsconfigPaths: true,
  },
  // MapLibre ships its worker as a separate ESM module. Let the browser load
  // the package instead of asking Vite's dependency optimizer to prebundle it.
  optimizeDeps: {
    exclude: ["maplibre-gl"],
  },
  plugins: [
    varlockVitePlugin({ ssrInjectMode: "auto-load" }),
    tailwindcss(),
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
    }),
    react(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      registerType: "autoUpdate",
      injectManifest: { globPatterns: ["**/*.{js,css,html,png,svg,ico}"] },
      manifest: {
        name: "collective",
        short_name: "collective",
        description: "collective - PWA Application",
        theme_color: "#0c0c0c",
      },
      pwaAssets: { disabled: false, config: true },
      // Keep the service worker out of Vite development; stale workers can
      // intercept document navigations while routes and the API are changing.
      devOptions: { enabled: false },
    }),
  ],
});
