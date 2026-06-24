import { MheePDF } from "mheepdf";
import { write } from "bun";
import { readFileSync } from "fs";

// 1. Initialize MheePDF Document
const pdf = new MheePDF({
  pageSize: MheePDF.A4,
  margin: 50,
  defaultFont: "Helvetica",
  defaultFontSize: 12,
  compress: false,
});

// 2. Add Title
pdf.addText("Embedding Images & Vector Graphics", { fontSize: 22, align: "center" });
pdf.addText("\n");
pdf.addText("MheePDF supports embedding JPEG/JPG files, transparent PNG files (with alpha channel/SMask support), and inline SVG vector graphics.");
pdf.addText("\n");

// 3. Add Left-aligned JPEG Image
pdf.addText("1. JPEG Image (Left aligned, 120pt width):", { fontSize: 14 });
pdf.addImage("test/resources/images/test-cat.jpg", { width: 120, align: "left" });
pdf.addText("\n");

// 4. Add Center-aligned PNG Image with Transparency
pdf.addText("2. PNG with Alpha Transparency (Center aligned, 140pt width):", { fontSize: 14 });
pdf.addImage("test/resources/images/test-rgba.png", { width: 140, align: "center" });
pdf.addText("\n");

// 5. Add Right-aligned SVG Graphic
pdf.addText("3. Inline SVG Vector Graphic (Center aligned, scales crisp):", { fontSize: 14 });
const svgString = readFileSync("test/resources/images/test-svg.svg");
pdf.addImage(svgString, { align: "center" });

// 6. Generate and save PDF
const pdfBuffer = pdf.generate();
await write("docs/public/examples/image.pdf", pdfBuffer);
console.log("Generated image.pdf successfully!");
