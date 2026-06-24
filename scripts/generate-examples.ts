import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

// Ensure target directories exist
mkdirSync("docs/public/examples", { recursive: true });
mkdirSync("docs/guide/examples", { recursive: true });

console.log("--- Generating MheePDF Examples ---");

const examples = [
  {
    id: "basic",
    file: "basic.ts",
    title: "Basic Hello World",
    description: "Simple PDF document with custom text blocks and automatic word wrapping using standard Helvetica font."
  },
  {
    id: "thai",
    file: "thai.ts",
    title: "Thai Language Support",
    description: "Demonstrates custom TrueType font (TTF) loading, complex Thai shaping, and automatic word-wrapping using Intl.Segmenter."
  },
  {
    id: "table",
    file: "table.ts",
    title: "Table Grid & Styling",
    description: "Renders structured tables with proportional/fixed columns, headers, alternating row colors, custom cell styling, and padding."
  },
  {
    id: "image",
    file: "image.ts",
    title: "Images & SVG Vectors",
    description: "Embedding JPEG photos, transparent PNGs with alpha channel masking (SMask), and inline SVG vector paths."
  },
  {
    id: "invoice",
    file: "invoice.ts",
    title: "Professional Invoice",
    description: "A complete real-world invoice layout featuring company details, billed-to section, line items tables, tax summary, and footer notes."
  }
];

for (const ex of examples) {
  try {
    console.log(`Running docs/examples/src/${ex.file}...`);
    // Dynamic import to execute the script and generate PDF
    await import(`../docs/examples/src/${ex.file}`);

    // Read the TS source file content
    const tsCode = readFileSync(join("docs/examples/src", ex.file), "utf-8");

    // Construct the markdown content
    const mdContent = `---
title: ${ex.title}
editLink: false
aside: false
---

# ${ex.title}

${ex.description}

<ExampleViewer active="${ex.id}">
<template #code>

\`\`\`typescript
${tsCode}
\`\`\`

</template>
</ExampleViewer>
`;

    // Write the markdown file
    const mdPath = join("docs/guide/examples", `${ex.id}.md`);
    writeFileSync(mdPath, mdContent, "utf-8");
    console.log(`Generated ${mdPath} successfully!`);
  } catch (error) {
    console.error(`Failed to generate example ${ex.id}:`, error);
    process.exit(1);
  }
}

console.log("--- All Examples and Markdown Pages Generated Successfully ---");
