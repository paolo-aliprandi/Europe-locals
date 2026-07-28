import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/european-locals-map/",
  plugins: [react()],
});
