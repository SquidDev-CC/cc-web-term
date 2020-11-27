import commonjs from "@rollup/plugin-commonjs";
import postcss from "rollup-plugin-postcss";
import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import url from "@rollup/plugin-url";
import { promises as fs } from "fs";

export default {
  input: "index.tsx",
  output: {
    dir: "out",
    format: "iife"
  },
  context: "window",

  plugins: [
    typescript(),
    postcss({
      extract: true,
      namedExports: true,
      modules: true,
    }),
    url({
      limit: 1024,
      fileName: "[name]-[hash][extname]",
      include: ["**/*.worker.js", "../assets/**/*.png"], // Terrible bodge to include files in ../assets
    }),

    resolve({ browser: true, }),
    commonjs(),

    {
      name: "copy",
      buildEnd: async () => {
        // Who needs fancy copy plugins anyway?
        await fs.copyFile("index.html", "out/index.html");
      },
    },
  ],
};
