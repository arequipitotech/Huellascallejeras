import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const rootDirectory = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(rootDirectory, "index.html"),
        donations: resolve(rootDirectory, "donaciones/donaciones.html"),
        admin: resolve(rootDirectory, "admin/index.html")
      }
    }
  },
  server: {
    proxy: {
      "/api": "http://localhost:3001",
      "/uploads": "http://localhost:3001"
    }
  }
});
