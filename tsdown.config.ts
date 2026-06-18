import { defineConfig } from "tsdown";
import { format } from "oxfmt";
import { readFile, writeFile } from "node:fs/promises";

export default defineConfig({
  // 输入
  entry: "src/global-extend-script.ts",
  inputOptions: {
    experimental: {
      attachDebugInfo: "none",
    },
  },

  // 处理
  treeshake: false,
  minify: false,

  // 输出
  outDir: "outputs",
  format: "cjs",
  sourcemap: false,
  dts: false,
  clean: false,
  outputOptions: {
    banner: "// GitHub: https://github.com/MioYiSama/clash",
  },
  hooks: {
    "build:done": async () => {
      const file = "outputs/global-extend-script.cjs";
      const { code } = await format(file, await readFile(file, { encoding: "utf-8" }));
      await writeFile(file, code);
    },
  },
});
