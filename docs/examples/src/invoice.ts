import { MheePDF, Table, Text, PDFType0FontObject } from "mheepdf";
import { write } from "bun";
import { readFileSync } from "fs";

// 1. Load GoogleSans and THSarabunNew Bold fonts for professional layout
const fontRegularBuffer = readFileSync("test/resources/fonts/GoogleSans_17pt-Regular.ttf");
const fontBoldBuffer = readFileSync("test/resources/fonts/THSarabunNew Bold.ttf");
const fontRegular = new PDFType0FontObject(fontRegularBuffer);
const fontBold = new PDFType0FontObject(fontBoldBuffer);

// 2. Initialize MheePDF Document
const pdf = new MheePDF({
  pageSize: MheePDF.A4,
  margin: 40,
  defaultFont: fontRegular,
  fonts: [fontRegular, fontBold],
  defaultFontSize: 11,
  defaultLineHeight: 16,
  compress: false,
});

// 3. Add Invoice Header
pdf.addText("MheePDF Technologies Co., Ltd.", { font: fontBold, fontSize: 20 });
pdf.addText("123 Innovation Street, Cyber Tower, Bangkok 10110");
pdf.addText("Contact: contact@mheepdf.org | Tax ID: 0123456789012");
pdf.addText("\n");

// 4. Create Metadata / Billing Information table
const metaTable = new Table({
  columns: ["*", "*"],
  borderWidth: 0,
  padding: 2,
});
metaTable.addRow([
  new Text("BILLED TO:\nAcme Corporation\n456 Enterprise Road, Unit 12B\nBangkok 10330", { lineHeight: 14 }),
  new Text("INVOICE DETAILS:\nInvoice No: INV-2026-0042\nDate: 2026-06-25\nDue Date: 2026-07-25", { lineHeight: 14, align: "right" }),
]);
pdf.add(metaTable);
pdf.addText("\n");

// 5. Add Line Items Table
const itemsTable = new Table({
  columns: ["*", 50, 80, 80],
  borderWidth: 1,
  borderColor: "#e2e8f0",
  headerBackgroundColor: "#3b82f6", // Blue Accent
  alternateRowBackgroundColor: "#f8fafc",
  aligns: ["left", "center", "right", "right"],
  padding: 6,
});

// Headers
itemsTable.addHeader([
  new Text("Description", { color: "#ffffff" }),
  new Text("Qty", { color: "#ffffff", align: "center" }),
  new Text("Unit Price", { color: "#ffffff", align: "right" }),
  new Text("Amount", { color: "#ffffff", align: "right" }),
]);

// Rows
itemsTable.addRow(["MheePDF Enterprise License - 1 Year Subscription", "1", "$899.00", "$899.00"]);
itemsTable.addRow(["Premium Thai Typography Setup & Integration Support", "2", "$150.00", "$300.00"]);
itemsTable.addRow(["Custom Font Optimization & Glyphs Subsetting", "1", "$250.00", "$250.00"]);

pdf.add(itemsTable);
pdf.addText("\n");

// 6. Summary / Total Table
const summaryTable = new Table({
  columns: ["*", 120, 80],
  borderWidth: 0,
  padding: 4,
  aligns: ["left", "right", "right"],
});
summaryTable.addRow(["", "Subtotal:", "$1,449.00"]);
summaryTable.addRow(["", "VAT (7%):", "$101.43"]);
summaryTable.addRow([
  "",
  new Text("Total Amount Due:", { font: fontBold, fontSize: 13 }),
  new Text("$1,550.43", { font: fontBold, fontSize: 13 }),
]);
pdf.add(summaryTable);

pdf.addText("\n\n");
pdf.addText("Thank you for your business!", { align: "center", font: fontBold });
pdf.addText("For payment queries, please reach out to billing@mheepdf.org.", { align: "center", color: "#64748b", fontSize: 9 });

// 7. Generate and save PDF
const pdfBuffer = pdf.generate();
await write("docs/public/examples/invoice.pdf", pdfBuffer);
console.log("Generated invoice.pdf successfully!");
