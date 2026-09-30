import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:8000",
      "/ws": {
        target: "ws://localhost:8000",
        ws: true,
        configure: (proxy) => {
          proxy.on("error", (err) => {
            // Suppress connection reset/aborted noise in dev console when WS socket drops or reconnects
            const code = (err as { code?: string }).code;
            if (code === "ECONNRESET" || code === "ECONNABORTED") return;
            console.error("[vite] ws proxy error:", err);
          });
        },
      },
    },
  },
});
