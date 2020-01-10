import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import postcss from 'rollup-plugin-postcss';

export default {
  input: "build/example/main.js",
  output: {
    file: "example/main.js",
    format: "iife"
  },
  context: "window",

  plugins: [
    postcss({
      extract: true,
      namedExports: name => name.replace(/-/g, '_'),
      modules: true,
    }),

    resolve({ browser: true, }),
    commonjs(),
  ],
};
