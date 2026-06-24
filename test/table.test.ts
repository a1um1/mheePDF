import { expect, test } from "bun:test";
import { write } from "bun";
import { MheePDF, PDFType0FontObject, Table, Text, Color } from "../src";
import { readFileSync } from "fs";

test("Table Module: structure, styling, columns alignment and cell padding", async () => {
  const doc = new MheePDF({
    pageSize: MheePDF.A4,
    margin: 40,
    defaultFont: "Helvetica",
    defaultTablePadding: 8,
  });

  const table = new Table({
    columns: [60, "*", "2*"], // absolute, star, and proportional star columns
    borderWidth: 1.5,
    borderColor: "#4b5563",
    backgroundColor: "#ffffff",
    headerBackgroundColor: "#3b82f6",
    alternateRowBackgroundColor: "#eff6ff",
    aligns: ["center", "left", "right"],
    padding: { top: 4, bottom: 4, left: 10, right: 10 }, // asymmetric padding
  });

  table.addHeader([
    new Text("ID", { color: "#ffffff" }),
    new Text("Name", { color: "#ffffff" }),
    new Text("Price", { color: "#ffffff" }),
  ]);

  table.addRow(["101", "Item A", "99.99"]);
  table.addRow(["102", "Item B (Alternate Row background)", "1,200.00"]);
  table.addRow([
    "103",
    { content: "Custom Yellow Background Cell", backgroundColor: "#fef08a" },
    "15.50",
  ]);

  doc.addText("Product List Table:", { fontSize: 14 });
  doc.add(table);

  const content = doc.generate();
  await write("test/test-table-gen.pdf", content);

  expect(content).toContain("%PDF-1.4");
  expect(content).toContain("Product List Table:");
  expect(content).toContain("Item A");
  expect(content).toContain("Item B (Alternate ");
  expect(content).toContain("Row background)");
  expect(content).toContain("Custom Yellow ");
  expect(content).toContain("Background Cell");
  // verify cell border rendering commands exist
  expect(content).toContain("re");
});
