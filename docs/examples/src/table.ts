import { MheePDF, Table, Text } from "mheepdf";
import { write } from "bun";

// 1. Initialize MheePDF Document
const pdf = new MheePDF({
  pageSize: MheePDF.A4,
  margin: 50,
  defaultFont: "Helvetica",
  defaultFontSize: 12,
  compress: false,
});

// 2. Add Title
pdf.addText("Table Component Styling & Layout", { fontSize: 22, align: "center" });
pdf.addText("\n");
pdf.addText("MheePDF includes a powerful Table component that automates column sizing, cell height calculation, background color styling, borders, cell padding, and alignment.");
pdf.addText("\n");

// 3. Define Table
// Columns use "*" and "2*" for proportional width allocation, and numbers for fixed pt widths
const table = new Table({
  columns: [60, "*", 80, 80],
  borderWidth: 1,
  borderColor: "#cbd5e1", // Light gray border
  backgroundColor: "#ffffff",
  headerBackgroundColor: "#1e293b", // Dark slate header
  alternateRowBackgroundColor: "#f8fafc", // Very light gray alternate rows
  aligns: ["center", "left", "right", "right"],
  padding: { top: 6, bottom: 6, left: 8, right: 8 },
});

// 4. Add Headers (Use White text for dark headers)
table.addHeader([
  new Text("ID", { color: "#ffffff", align: "center" }),
  new Text("Description", { color: "#ffffff" }),
  new Text("Unit Price", { color: "#ffffff", align: "right" }),
  new Text("Total", { color: "#ffffff", align: "right" }),
]);

// 5. Add Rows
table.addRow(["1001", "Developer Laptop 16-inch", "$1,499.00", "$1,499.00"]);
table.addRow(["1002", "Ergonomic Office Chair (Alternate row color)", "$299.50", "$599.00"]);
table.addRow([
  "1003",
  { content: "Custom Yellow Highlighted Cell", backgroundColor: "#fef08a" },
  "$45.00",
  "$45.00",
]);
table.addRow(["1004", "UltraWide 34-inch USB-C Monitor", "$449.00", "$449.00"]);
table.addRow(["1005", "Mechanical Keyboard & Mouse Combo", "$120.00", "$240.00"]);

// 6. Add Table to document
pdf.add(table);

pdf.addText("\n");
pdf.addText("The table automatically splits across pages if it exceeds the page height, and when repeatHeader is enabled (default: true), the header columns are automatically drawn at the top of each page.");

// 7. Generate and save PDF
const pdfBuffer = pdf.generate();
await write("docs/public/examples/table.pdf", pdfBuffer);
console.log("Generated table.pdf successfully!");
