import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const BACKEND = process.env.HERMES_DASHBOARD_URL ?? "http://127.0.0.1:8801";

/**
 * In production the Python server injects a one-shot session token into
 * index.html. The Vite dev server serves its own index.html, so unless we
 * forward that token, every protected /api/* call 401s. This plugin scrapes
 * the running dashboard's token on each dev page load and re-injects it.
 * No-op in production builds.
 */
function homeDevToken(): Plugin {
  const TOKEN_RE = /window\.__HERMES_SESSION_TOKEN__\s*=\s*"([^"]+)"/;
  return {
    name: "home:dev-session-token",
    apply: "serve",
    async transformIndexHtml() {
      try {
        const res = await fetch(BACKEND, { headers: { accept: "text/html" } });
        const html = await res.text();
        const match = html.match(TOKEN_RE);
        if (!match) {
          console.warn(
            `[jizhi] No session token in ${BACKEND} — is the backend running? /api calls will 401.`,
          );
          return;
        }
        return [
          {
            tag: "script",
            injectTo: "head",
            children: `window.__HERMES_SESSION_TOKEN__="${match[1]}";`,
          },
        ];
      } catch (err) {
        console.warn(
          `[jizhi] Backend at ${BACKEND} unreachable — start it or set HERMES_DASHBOARD_URL. (${(err as Error).message})`,
        );
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), homeDevToken()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    port: 8801,
    proxy: {
      "/api": {
        target: BACKEND,
        ws: true,
      },
    },
  },
});
