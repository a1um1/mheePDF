import { mkdirSync } from "fs";

// Ensure target directory exists
mkdirSync("docs/public/examples", { recursive: true });

console.log("--- Generating MheePDF Examples ---");

const files = ["basic.ts", "thai.ts", "table.ts", "image.ts", "invoice.ts"];

for (const file of files) {
  try {
    console.log(`Running docs/examples/src/${file}...`);
    // Dynamic import to execute the script
    await import(`../docs/examples/src/${file}`);
  } catch (error) {
    console.error(`Failed to generate example ${file}:`, error);
    process.exit(1);
  }
}

console.log("--- All Examples Generated Successfully ---");
