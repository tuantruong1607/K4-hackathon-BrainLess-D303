import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve("./src"),
    },
  },
  server: {
    host: "127.0.0.1",
    port: 4173,
    proxy: {
      "/api": {
        target: "http://localhost:8200",
        changeOrigin: true,
      },
    },
  },
});
