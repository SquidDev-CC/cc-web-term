import builtins from "rollup-plugin-node-builtins";
import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";

export default {
  input: "build/example/main.js",
  output: {
    file: "example/main.js",
    format: "iife"
  },
  context: "window",

  plugins: [
    builtins(),
    resolve({ browser: true, }),
    commonjs(),
  ],
};
