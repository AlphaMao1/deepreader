import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "foliate-js": path.resolve(__dirname, "../foliate-js"),
    },
  },
  server: {
    port: 5174,
    strictPort: false,
  },
});
