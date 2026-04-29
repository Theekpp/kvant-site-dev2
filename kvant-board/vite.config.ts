import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  root: path.resolve(import.meta.dirname, "client"),
  base: process.env.BOARD_BASE_PATH || "/board-app/",
  server: {
    allowedHosts: true as any,
  },
  define: {
    "process.env.IS_PREACT": JSON.stringify("false"),
  },
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  optimizeDeps: {
    include: ["@excalidraw/excalidraw", "react", "react-dom"],
  },
});
