/**
 * Build script for mheepdf npm package.
 * Compiles src/index.ts → dist/index.js (ESM, Node 20+)
 * with all heavy deps (WASM/native) marked external.
 *
 * Run: bun run build.ts
 */

import { rmSync, mkdirSync } from "fs";
import { execSync } from "child_process";

// Clean dist/
rmSync("dist", { recursive: true, force: true });
mkdirSync("dist", { recursive: true });

// External packages that cannot be bundled (WASM / native bindings)
const external = ["harfbuzzjs", "opentype.js", "@resvg/resvg-js", "pngjs", "@colordx/core"];

console.log("▶ Building dist/index.js (ESM) …");
const result = await Bun.build({
  entrypoints: ["./src/index.ts"],
  outdir: "./dist",
  format: "esm",
  target: "node",
  minify: false,
  sourcemap: "external",
  external,
  naming: {
    entry: "index.js",
  },
});

if (!result.success) {
  console.error("✗ Build failed:");
  for (const log of result.logs) {
    console.error(" ", log.message);
  }
  process.exit(1);
}
console.log("✓ dist/index.js written");

// Emit TypeScript declarations via tsc
console.log("▶ Generating TypeScript declarations …");
try {
  execSync("npx tsc -p tsconfig.build.json --pretty", { stdio: "inherit" });
  console.log("✓ dist/index.d.ts written");
} catch {
  console.error("✗ tsc declaration emit failed");
  process.exit(1);
}

console.log("\n✅ Build complete → dist/");
