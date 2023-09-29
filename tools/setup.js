/** Converts our styles into tsc files */
const fs = require("fs");
const postcss = require("postcss");
const selector = require("postcss-selector-parser")();

// Convert styles.module.css into a ts.d file
const contents = fs.readFileSync("src/styles.module.css");
const css = postcss.parse(contents, { from: "src/styles.module.css" });

const rules = new Set();
css.walkRules(rule => selector.astSync(rule.selector).walkClasses(x => rules.add(x.value)));

const out = Array.from(rules).map(x => `export const ${x}: string;\n`).join("");
fs.writeFileSync("src/styles.module.css.d.ts", out);

const pathExport = `declare const path: string;
export default path;`;

// Copy several files to the build directories
fs.mkdirSync("dist", { recursive: true });
fs.mkdirSync("dist/files", { recursive: true });
fs.copyFileSync("node_modules/gif.js/dist/gif.worker.js", "dist/files/gif.worker.js");
fs.copyFileSync("src/styles.module.css", "dist/styles.module.css");
fs.copyFileSync("src/styles.module.css.d.ts", "dist/styles.module.css.d.ts");

for (const path of ["src/files/gif.worker", "dist/files/gif.worker", "assets/term_font.png", "assets/term_font_hd.png"]) {
  fs.writeFileSync(`${path}.d.ts`, pathExport);
}

// We just ignore everything in .gitignore.
fs.copyFileSync(".gitignore", ".eslintignore");
