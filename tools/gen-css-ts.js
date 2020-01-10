/** Converts our styles into tsc files */
const fs = require("fs");
const postcss = require("postcss");
const selector = require('postcss-selector-parser')();

const contents = fs.readFileSync("src/styles.css");
const css = postcss.parse(contents, { from: "src/styles.css" });

const rules = new Set();
css.walkRules(rule => selector.astSync(rule.selector).walkClasses(x => rules.add(x.value)));

const out = Array.from(rules).map(x => `export const ${x.replace(/-/g, "_")} : string;\n`).join("");
fs.writeFileSync("src/styles.css.d.ts", out);
