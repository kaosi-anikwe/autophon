import path from "path";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    hmr: {
      host: 'new.autophontest.se',
      port: 3000,
      clientPort: 3000,
      protocol: 'wss',
    },
    watch: {
      usePolling: true,
    },
  },
});
