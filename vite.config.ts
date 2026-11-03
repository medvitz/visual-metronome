import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// BASE is set by the deploy workflow (e.g. "/visual-metronome/" on GitHub Pages).
export default defineConfig({
  base: process.env.BASE ?? "/",
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/*.png"],
      manifest: {
        name: "Visual Metronome",
        short_name: "Visual Metronome",
        description: "A metronome that lets you see time.",
        theme_color: "#0d0d0f",
        background_color: "#0d0d0f",
        display: "standalone",
        orientation: "portrait",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg}"],
      },
    }),
  ],
});
