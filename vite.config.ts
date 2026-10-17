import { defineConfig } from "vite-plus";
import { format } from "vite-plus/fmt";
import { readFile, writeFile } from "node:fs/promises";

export default defineConfig({
  pack: {
    // 输入
    entry: "global-extend-script.ts",

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
  },
});
