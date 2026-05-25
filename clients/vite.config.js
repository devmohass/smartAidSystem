import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";

// The SmartAid backend runs on http://localhost:3000 and serves the API
// under /api. Proxying keeps the browser on a single origin (no CORS) and
// lets the client call relative paths like fetch("/api/auth/login").
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
