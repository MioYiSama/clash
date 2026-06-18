import { defineConfig } from "tsdown";

export default defineConfig({
  entry: "src/global-extend-script.ts",
  outDir: "outputs",
  treeshake: false,
  sourcemap: false,
  dts: false,
  minify: false,
  format: "cjs",
  clean: false,
});
