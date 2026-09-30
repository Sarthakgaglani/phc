// Phase 0 budget: initial JS gzipped must stay under 200KB (CLAUDE.md
// low-bandwidth requirement). Uses only Node built-ins — no extra
// dependency for something this small.
import { gzipSync } from "node:zlib";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const BUDGET_BYTES = 200 * 1024;
const ASSETS_DIR = join(import.meta.dirname, "..", "dist", "assets");

function collectJsFiles(dir) {
  return readdirSync(dir)
    .filter((name) => name.endsWith(".js"))
    .map((name) => join(dir, name))
    .filter((path) => statSync(path).isFile());
}

let totalGzipped = 0;
for (const file of collectJsFiles(ASSETS_DIR)) {
  const gzipped = gzipSync(readFileSync(file)).length;
  totalGzipped += gzipped;
  console.log(`${file.split(/[\\/]/).pop()}: ${(gzipped / 1024).toFixed(1)} KB gzipped`);
}

const totalKb = (totalGzipped / 1024).toFixed(1);
console.log(`\nTotal initial JS (gzipped): ${totalKb} KB (budget: ${BUDGET_BYTES / 1024} KB)`);

if (totalGzipped > BUDGET_BYTES) {
  console.error("Bundle size budget exceeded.");
  process.exit(1);
}
