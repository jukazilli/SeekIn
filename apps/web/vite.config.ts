import { cloudflare } from "@cloudflare/vite-plugin";
import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";

const isBrowserProof = process.env.SEEKIN_BROWSER_PROOF === "true";

export default defineConfig({
  plugins: [
    !isBrowserProof && cloudflare({ viteEnvironment: { name: "ssr" } }),
    reactRouter(),
  ],
  resolve: {
    tsconfigPaths: true,
  },
});
