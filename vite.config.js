import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
   resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    target: "esnext", //browsers can handle the latest ES features
  },
  base: "/",
});
