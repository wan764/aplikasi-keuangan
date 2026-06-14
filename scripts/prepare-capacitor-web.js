const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const webDir = path.join(root, "www");
const files = [
  "index.html",
  "app.js",
  "styles.css",
  "manifest.webmanifest",
  "service-worker.js",
];

function copyRecursive(source, target) {
  const stats = fs.statSync(source);
  if (stats.isDirectory()) {
    fs.mkdirSync(target, { recursive: true });
    for (const entry of fs.readdirSync(source)) {
      copyRecursive(path.join(source, entry), path.join(target, entry));
    }
    return;
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

fs.rmSync(webDir, { recursive: true, force: true });
fs.mkdirSync(webDir, { recursive: true });

for (const file of files) {
  copyRecursive(path.join(root, file), path.join(webDir, file));
}

copyRecursive(path.join(root, "icons"), path.join(webDir, "icons"));
console.log("Prepared Capacitor web assets in www/");
