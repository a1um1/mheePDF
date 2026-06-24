import { expect, test } from "bun:test";
import { write } from "bun";
import { MheePDF, PDFType0FontObject, Table } from "../src";
import { readFileSync } from "fs";

test("Document Module: layout flow, auto-height receipts, and pagination", async () => {
  // Test 1: Single-Page Auto-Height Receipt
  const docSingle = new MheePDF({
    pageSize: [300, "auto"],
    margin: 15,
    defaultFont: "Helvetica",
    defaultFontSize: 10,
    defaultLineHeight: 14,
  });

  docSingle.addText("MHEE CAFE", { fontSize: 14, align: "center" });
  docSingle.addText("-------------------------------------", { align: "center" });

  const tableSingle = new Table({
    columns: ["*", 30, 50],
    borderWidth: 0,
    padding: 2,
  });
  tableSingle.addHeader(["Item", "Qty", "Amount"]);
  tableSingle.addRow(["Espresso", "1", "60.00"]);
  tableSingle.addRow(["Croissant", "2", "120.00"]);
  docSingle.add(tableSingle);

  const contentSingle = docSingle.generate();
  await write("test/test-receipt-single-gen.pdf", contentSingle);

  expect(contentSingle).toContain("%PDF-1.4");
  expect(contentSingle).toContain("MHEE CAFE");
  expect(contentSingle).toContain("Espresso");
  expect(contentSingle).toContain("Croissant");

  // Test 2: Multi-Page Auto-Height (Splitting using maxPageHeight)
  const docMulti = new MheePDF({
    pageSize: [300, "auto"],
    maxPageHeight: 250, // Force small maximum height to trigger multiple pages
    margin: 15,
    defaultFont: "Helvetica",
    defaultFontSize: 10,
    defaultLineHeight: 14,
  });

  docMulti.addText("LARGE CATERING RECEIPT", { fontSize: 12, align: "center" });

  const tableMulti = new Table({
    columns: ["*", 30, 40],
    borderWidth: 0.5,
    padding: 3,
    repeatHeader: true,
  });
  tableMulti.addHeader(["Item", "Qty", "Total"]);
  for (let i = 1; i <= 10; i++) {
    tableMulti.addRow([`Bulk Meal Set #${i}`, `${i}`, `${i * 100}`]);
  }
  docMulti.add(tableMulti);

  const contentMulti = docMulti.generate();
  await write("test/test-receipt-multi-gen.pdf", contentMulti);

  expect(contentMulti).toContain("%PDF-1.4");
  expect(contentMulti).toContain("LARGE CATERING RECEIPT");
  expect(contentMulti).toContain("Bulk Meal Set #1");
  expect(contentMulti).toContain("Bulk Meal Set #10");

  // Test 3: Very-Long-Page Auto-Height (Splitting using maxPageHeight)
  const docVeryLong = new MheePDF({
    pageSize: [300, "auto"],
    margin: 15,
    defaultFont: "Helvetica",
    defaultFontSize: 10,
    defaultLineHeight: 14,
  });

  docVeryLong.addText("VERY LONG CATERING RECEIPT", { fontSize: 12, align: "center" });

  const tableVertyLong = new Table({
    columns: ["*", 30, 40],
    borderWidth: 0.5,
    padding: 3,
    repeatHeader: true,
  });
  tableVertyLong.addHeader(["Item", "Qty", "Total"]);
  for (let i = 1; i <= 100; i++) {
    tableVertyLong.addRow([`Bulk Meal Set #${i}`, `${i}`, `${i * 100}`]);
  }
  docVeryLong.add(tableVertyLong);

  const contentVeryLong = docVeryLong.generate();
  await write("test/test-receipt-very-long-gen.pdf", contentVeryLong);

  expect(contentVeryLong).toContain("%PDF-1.4");
  expect(contentVeryLong).toContain("VERY LONG CATERING RECEIPT");
  expect(contentVeryLong).toContain("Bulk Meal Set #1");
  expect(contentVeryLong).toContain("Bulk Meal Set #10");
});
