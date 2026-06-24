import { expect, test } from "bun:test";
import { write } from "bun";
import { MheePDF, PDFType0FontObject, Text } from "../src";
import { readFileSync } from "fs";

const fontBuffer = readFileSync("test/resources/fonts/GoogleSans_17pt-Regular.ttf");
test("Text Module: alignments, line heights, character spacing, wrapping, and Thai segmenter", async () => {
  const font = new PDFType0FontObject(fontBuffer);

  const doc = new MheePDF({
    pageSize: MheePDF.A4,
    margin: 40,
    defaultFont: font,
    fonts: [font],
    defaultCharSpacing: 1.5,
    defaultLineHeight: 20,
  });

  // Test alignment options
  doc.addText("Left aligned header", { align: "left", fontSize: 16 });
  doc.addText("Center aligned title", { align: "center", fontSize: 20 });
  doc.addText("Right aligned metadata", { align: "right", fontSize: 10 });

  // Test local overrides
  doc.addText("Text with normal character spacing (0)", { charSpacing: 0 });
  doc.addText("Text with wide character spacing (4)", { charSpacing: 4 });
  doc.addText("Text with tight line height (12)", { lineHeight: 12 });
  doc.addText("Text with spacious line height (30)", { lineHeight: 30 });

  // Test Thai word wrapping and segmenter
  doc.addText(
    "ยินดีต้อนรับสู่ระบบ MheePDF ที่มีระบบตัดคำภาษาไทยอัตโนมัติด้วย Intl.Segmenter การตัดคำจะแยกคำภาษาไทยตามพจนานุกรมอย่างสมบูรณ์แบบ",
    { fontSize: 12 },
  );

  const content = doc.generate();
  await write("test/test-text-gen.pdf", content);

  expect(content).toContain("%PDF-1.4");
  expect(content).toContain("xref");
  expect(content).toContain("trailer");
  expect(content).toContain("startxref");
  expect(content).toContain("%%EOF");
});
