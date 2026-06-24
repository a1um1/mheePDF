import { MheePDF } from "mheepdf";
import { write } from "bun";

// 1. Initialize MheePDF Document with A4 size and standard Helvetica font
const pdf = new MheePDF({
  pageSize: MheePDF.A4,
  margin: 50,
  defaultFont: "Helvetica",
  defaultFontSize: 14,
  compress: false,
});

// 2. Add content (Header and Body)
pdf.addText("MheePDF Basic Example", { fontSize: 24, align: "center" });
pdf.addText("\n");
pdf.addText("Hello World!", { fontSize: 18, align: "left" });
pdf.addText("\n");
pdf.addText("This is a simple PDF document generated using MheePDF. Out of the box, MheePDF supports automatic text layout, margins, and standard page sizing. We can write paragraph text that flows naturally within the boundaries, and it will wrap lines automatically.");
pdf.addText("\n");
pdf.addText("Features demonstrated here:", { fontSize: 16 });
pdf.addText("- Page margins and A4 layout");
pdf.addText("- Title centering and typography styling");
pdf.addText("- Automatic paragraph flow and wrapping");
pdf.addText("- Standard Helvetica font support");

// 3. Generate the PDF bytes
const pdfBuffer = pdf.generate();

// 4. Save the generated PDF file
await write("docs/public/examples/basic.pdf", pdfBuffer);
console.log("Generated basic.pdf successfully!");
