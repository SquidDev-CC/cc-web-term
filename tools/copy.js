// Cross platform copy script
const fs = require('fs');
const [_node, _file, from, to] = process.argv;

if (!from || !to) {
  console.error("copy.js FROM TO");
  process.exit(1)
}

console.log(from, to);
fs.copyFileSync(from, to);
