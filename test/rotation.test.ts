import { expect, test } from "bun:test";
import { write } from "bun";
import { MheePDF } from "../src";

test("Page Rotation: document options default rotation", async () => {
  const doc = new MheePDF({
    pageSize: [300, 200],
    rotate: 90,
    margin: 15,
    defaultFont: "Helvetica",
    defaultFontSize: 10,
    compress: false,
  });

  doc.addText("Rotated 90 degrees");

  const pdfBuf = doc.generate();
  await write("test/test-rotation-doc-90.pdf", pdfBuf);
  const pdfString = pdfBuf.toString("binary");

  expect(pdfString).toContain("%PDF-1.4");
  // Check for Rotate entry in PDF page dictionary
  expect(pdfString).toContain("/Rotate 90");
});

test("Page Rotation: manual page-specific rotation", async () => {
  const doc = new MheePDF({
    pageSize: [300, 200],
    margin: 15,
    defaultFont: "Helvetica",
    defaultFontSize: 10,
    compress: false,
  });

  doc.addPage([300, 200], (page) => {
    page.setFont("Helvetica", 10);
    page.drawText("Manual 180 page", { x: 50, y: 100 });
  }, { rotate: 180 });

  const pdfBuf = doc.generate();
  await write("test/test-rotation-manual-180.pdf", pdfBuf);
  const pdfString = pdfBuf.toString("binary");

  expect(pdfString).toContain("%PDF-1.4");
  expect(pdfString).toContain("/Rotate 180");
});

test("Page Rotation: normalization logic", () => {
  // Test 450 degrees is normalized to 90 degrees
  const doc1 = new MheePDF({
    pageSize: [300, 200],
    compress: false,
  });
  doc1.addPage([300, 200], () => {}, { rotate: 450 as any });
  const pdfString1 = doc1.generate().toString("binary");
  expect(pdfString1).toContain("/Rotate 90");

  // Test -90 degrees is normalized to 270 degrees
  const doc2 = new MheePDF({
    pageSize: [300, 200],
    compress: false,
  });
  doc2.addPage([300, 200], () => {}, { rotate: -90 as any });
  const pdfString2 = doc2.generate().toString("binary");
  expect(pdfString2).toContain("/Rotate 270");
});

test("Page Rotation: invalid values error out", () => {
  expect(() => {
    const doc = new MheePDF({
      pageSize: [300, 200],
      compress: false,
    });
    doc.addPage([300, 200], () => {}, { rotate: 45 as any });
    doc.generate();
  }).toThrow("Page rotation must be a multiple of 90");
});

test("TypeScript Generic Type: template type validation", () => {
  interface MyTemplate {
    studentName: string;
    score: number;
  }

  // Creating an instance with template type annotations
  const doc = new MheePDF<MyTemplate>({
    pageSize: [300, 200],
    compress: false,
  });

  doc.addText("Name: {{ studentName }}");
  doc.addText("Score: {{ score }}");

  // Valid generation
  const pdfBuf = doc.generate({
    studentName: "Alice",
    score: 95,
  });
  expect(pdfBuf).toBeInstanceOf(Buffer);

  // Type assertions would fail compile if invalid type was used, but we can verify it at runtime as well
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const checkType: (data: MyTemplate | MyTemplate[]) => void = doc.generate.bind(doc);
  expect(checkType).toBeDefined();
});
