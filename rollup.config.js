import commonjs from "@rollup/plugin-commonjs";
import postcss from "rollup-plugin-postcss";
import resolve from "@rollup/plugin-node-resolve";
import url from '@rollup/plugin-url';

export default {
  input: "build/index.js",
  output: {
    file: "dist/index.js",
    format: "esm"
  },
  context: "window",

  plugins: [
    postcss({
      extract: true,
      namedExports: name => name.replace(/-/g, "_"),
      modules: true,
    }),
    url({
      limit: 1024,
      fileName: '[name]-[hash][extname]',
      include: ['**/*.worker.js']
    }),

    resolve({ browser: true, }),
    commonjs(),
  ],
};
