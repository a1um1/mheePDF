import { expect, test } from "bun:test";
import { write } from "bun";
import {
  MheePDF,
  PDFEngine,
  PDFCatalogObject,
  PDFFontObject,
  PDFIndirectStreamObject,
  PDFPageObject,
  PDFPagesObject,
  serialize,
  Text,
} from "../src/index";

test("Serialize Boolean", () => {
  expect(serialize(false)).toBe("false");
  expect(serialize(true)).toBe("true");
});

test("Serialize Names and Strings", () => {
  expect(serialize("/Font")).toBe("/Font");
  expect(serialize("Hello")).toBe("(Hello)");
});

test("Serialize Array", () => {
  expect(serialize([1, 2, 3])).toBe("[1 2 3]");
});

test("Object Pages", () => {
  const font = new PDFFontObject({
    id: 3,
    generation: 0,
    fontName: "F1",
  });
  const pages = new PDFPagesObject({
    id: 1,
    generation: 0,
    pages: [],
  });

  const text = new PDFIndirectStreamObject({
    id: 4,
    generation: 0,
    value: "BT /F1 12 Tf 100 700 Td (Hello, World!) Tj ET",
  });
  const page = new PDFPageObject({
    id: 2,
    generation: 0,
    pageSize: [612, 792],
    resources: font,
    Parent: pages,
    Contents: [text],
  });
  pages.addPage(page);
  console.log(page.toString(), pages.toString());
});

test("Generate PDF file with auto-generated IDs", async () => {
  const pdf = new PDFEngine();

  const pages = pdf.addObject(
    new PDFPagesObject({
      pages: [],
    }),
  );

  const font = pdf.addObject(
    new PDFFontObject({
      fontName: "F1",
    }),
  );

  const text = pdf.addObject(
    new PDFIndirectStreamObject({
      value: "BT /F1 12 Tf 100 700 Td (Hello, Auto-ID World!) Tj ET",
    }),
  );

  const page = pdf.addObject(
    new PDFPageObject({
      pageSize: [612, 792],
      resources: font,
      Parent: pages,
      Contents: [text],
    }),
  );

  pages.addPage(page);

  const catalog = pdf.addObject(
    new PDFCatalogObject({
      Base: pages,
    }),
  );

  const contentBuf = pdf.generatePDFcontent();
  console.log("--- Generated PDF (Auto-ID) ---");
  console.log(contentBuf);
  console.log("--------------------------------");

  await write("test/test-auto.pdf", contentBuf);
  const content = contentBuf.toString("binary");

  expect(pages.id).toBe(1);
  expect(font.id).toBe(2);
  expect(text.id).toBe(3);
  expect(page.id).toBe(4);
  expect(catalog.id).toBe(5);

  expect(content).toContain("%PDF-1.4");
  expect(content).toContain("xref");
  expect(content).toContain("trailer");
  expect(content).toContain("startxref");
  expect(content).toContain("%%EOF");
});

test("Generate PDF using high-level MheePDF API", async () => {
  const doc = new MheePDF({ compress: false });

  doc.addPage(
    [612, 792],
    (page) => {
      page
        .setFont("Arial", 12)
        .drawText("Hello Fluent World!", { x: 0, y: 700 })
        .drawText(
          "This is a very long line of text that should wrap automatically because we have margins configured on this page and the text exceeds the page width bounds.",
          { x: 0, y: 650 },
        );
    },
    { margin: 50 },
  );

  const contentBuf = doc.generate();
  console.log("--- Fluent Generated PDF ---");
  console.log(contentBuf);
  console.log("----------------------------");
  const content = contentBuf.toString("binary");

  expect(content).toContain("%PDF-1.4");
  expect(content).toContain("/BaseFont /Helvetica");
  expect(content).toContain("Hello Fluent World!");
  expect(content).toContain("This is a very long");
  expect(content).toContain("because");
  expect(content).toContain("we have margins");
  expect(content).toContain("xref");
  expect(content).toContain("trailer");
});

test("Proportional line height scaling when font size changes", () => {
  const context = {
    defaultFontSize: 12,
    defaultLineHeight: 20,
    getTextWidth: () => 10,
  };

  const contextSnug = {
    defaultFontSize: 12,
    defaultLineHeight: 20,
    getTextWidth: () => 10,
    snug: true,
  };

  // --- Default Mode (Main Document Flow) ---
  // Stacks components with standard line-height boundaries (lines.length * lh).

  // Test 1: Single line, font size 12, default line height 20 -> height = 20
  const text1Single = new Text("Hello");
  expect(text1Single.measure(100, context).height).toBe(20);

  // Test 2: Single line, font size 18, scaled line height (20 * 18/12 = 30) -> height = 30
  const text2Single = new Text("Hello", { fontSize: 18 });
  expect(text2Single.measure(100, context).height).toBe(30);

  // Test 3: Multi-line, font size 12, default line height 20 -> lines=2 -> height = 40
  const text1Multi = new Text("Hello\nWorld");
  expect(text1Multi.measure(100, context).height).toBe(40);

  // Test 4: Multi-line, font size 18, scaled line height (20 * 18/12 = 30) -> lines=2 -> height = 60
  const text2Multi = new Text("Hello\nWorld", { fontSize: 18 });
  expect(text2Multi.measure(100, context).height).toBe(60);

  // --- Snug Mode (Inside Table Cells) ---
  // Subtracts extra line height space from the final line ((lines.length - 1) * lh + size).

  // Test 5: Single line, font size 12, snug -> height = 12
  expect(text1Single.measure(100, contextSnug).height).toBe(12);

  // Test 6: Single line, font size 18, snug -> height = 18
  expect(text2Single.measure(100, contextSnug).height).toBe(18);

  // Test 7: Multi-line, font size 12, snug -> (2-1)*20 + 12 = 32
  expect(text1Multi.measure(100, contextSnug).height).toBe(32);

  // Test 8: Multi-line, font size 18, snug -> (2-1)*30 + 18 = 48
  expect(text2Multi.measure(100, contextSnug).height).toBe(48);

  // Test 9: Explicit override on Text component -> absolute line height override (25)
  // lh = 25. lines = 2 -> snug -> (2-1)*25 + 18 = 43
  const text3Multi = new Text("Hello\nWorld", { fontSize: 18, lineHeight: 25 });
  expect(text3Multi.measure(100, contextSnug).height).toBe(43);

  // Test 10: Default line height is undefined, fallback to 1.2 * size (1.2 * 20 = 24)
  // lh = 24. lines = 2 -> snug -> (2-1)*24 + 20 = 44
  const contextNoLH = {
    defaultFontSize: 12,
    getTextWidth: () => 10,
    snug: true,
  };
  const text4Multi = new Text("Hello\nWorld", { fontSize: 20 });
  expect(text4Multi.measure(100, contextNoLH).height).toBe(44);
});

test("Thai word wrapping using Intl.Segmenter", () => {
  const context = {
    defaultFontSize: 12,
    defaultLineHeight: 20,
    getTextWidth: (text: string) => text.length * 10,
  };

  // "ตาราง" is 5 chars (50 units).
  // "ตัวอย่าง" is 8 chars (80 units).
  // The full string is "ตารางตัวอย่าง" (13 chars, 130 units).
  const text = new Text("ตารางตัวอย่าง");

  // With maxWidth = 70:
  // - Old algorithm would split char-by-char: "ตารางตั" (7 chars = 70 units) -> ["ตารางตั", "วอย่าง"] (2 lines, height = 40).
  // - New segmenter algorithm keeps "ตาราง" intact on line 1, wraps "ตัวอย่าง" to line 2,
  //   and since "ตัวอย่าง" (80) > 70, it splits "ตัวอย่าง" to ["ตัวอย่", "าง"].
  //   Resulting in: ["ตาราง", "ตัวอย่", "าง"] (3 lines, height = 60).
  const measure = text.measure(70, context);
  expect(measure.height).toBe(60);
});
