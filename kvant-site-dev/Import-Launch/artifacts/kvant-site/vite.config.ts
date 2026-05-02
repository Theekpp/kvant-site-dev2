import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { metaImagesPlugin } from "./vite-plugin-meta-images";
import browserslist from "browserslist";
import { browserslistToTargets, transform } from "lightningcss";
import type { Plugin } from "vite";

const lcssTargets = browserslistToTargets(
  browserslist("chrome >= 87, firefox >= 78, safari >= 14, edge >= 88, android >= 9"),
);

const lcssOptions = {
  targets: lcssTargets,
  drafts: {
    customMedia: true,
  },
  nonStandard: {
    deepSelectorCombinator: true,
  },
};

function oklchDownlevelPlugin(): Plugin {
  return {
    name: "oklch-downlevel",
    generateBundle(_options, bundle) {
      for (const chunk of Object.values(bundle)) {
        if (chunk.type === "asset" && typeof chunk.fileName === "string" && chunk.fileName.endsWith(".css")) {
          const source = typeof chunk.source === "string" ? chunk.source : chunk.source.toString();
          const result = transform({
            filename: chunk.fileName,
            code: Buffer.from(source),
            minify: false,
            ...lcssOptions,
          });
          chunk.source = result.code.toString();
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    tailwindcss(),
    metaImagesPlugin(),
    oklchDownlevelPlugin(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  css: {
    transformer: "lightningcss",
    lightningcss: lcssOptions,
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    target: ["chrome87", "firefox78", "safari14", "edge88"],
    cssMinify: "lightningcss",
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Core React runtime — always needed
          if (id.includes("node_modules/react/") || id.includes("node_modules/react-dom/")) {
            return "vendor-react";
          }
          // UI library components (heavy, rarely change)
          if (id.includes("node_modules/@radix-ui/")) {
            return "vendor-radix";
          }
          // Animation library
          if (id.includes("node_modules/framer-motion/")) {
            return "vendor-framer";
          }
          // LiveKit (very heavy, only needed on /video route)
          if (
            id.includes("node_modules/livekit-client/") ||
            id.includes("node_modules/@livekit/")
          ) {
            return "vendor-livekit";
          }
          // Charts (only admin)
          if (id.includes("node_modules/recharts/")) {
            return "vendor-recharts";
          }
          // Date/form utilities
          if (
            id.includes("node_modules/date-fns/") ||
            id.includes("node_modules/react-day-picker/") ||
            id.includes("node_modules/react-hook-form/") ||
            id.includes("node_modules/@hookform/")
          ) {
            return "vendor-forms";
          }
          // Routing + query
          if (
            id.includes("node_modules/wouter/") ||
            id.includes("node_modules/@tanstack/")
          ) {
            return "vendor-routing";
          }
          // Everything else from node_modules → generic vendor chunk
          if (id.includes("node_modules/")) {
            return "vendor-misc";
          }
        },
      },
    },
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
