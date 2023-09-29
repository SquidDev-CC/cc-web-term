import * as esbuild from "esbuild"

await esbuild.build({
  entryPoints: ["./index.jsx", "./index.html"],
  bundle: true,
  outdir: "out",

  loader: {
    ".png": "file",
    ".worker.js": "file",
    ".html": "copy",
  }
})
