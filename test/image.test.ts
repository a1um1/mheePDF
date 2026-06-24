import { expect, test } from "bun:test";
import { write } from "bun";
import { MheePDF, PDFType0FontObject } from "../src";
import { readFileSync } from "fs";
const fontBuffer = readFileSync("test/resources/fonts/GoogleSans_17pt-Regular.ttf");

test("Image Module: JPEG, transparent PNG, SVG vector graphics and alignment", async () => {
  const font = new PDFType0FontObject(fontBuffer);

  const doc = new MheePDF({
    pageSize: MheePDF.A4,
    margin: 40,
    defaultFont: font,
    fonts: [font],
    compress: false,
  });

  doc.addText("JPEG Image Left-aligned", { fontSize: 12 });
  doc.addImage("test/resources/images/test-cat.jpg", { width: 100, align: "left" });

  doc.addText("JPEG Image Center-aligned", { fontSize: 12 });
  doc.addImage("test/resources/images/test-cat.jpg", { width: 150, align: "center" });

  doc.addText("Transparent PNG (with SMask)", { fontSize: 12 });
  doc.addImage("test/resources/images/test-rgba.png", { width: 120, align: "right" });

  doc.addText("SVG Vector Graphic (crisp shapes)", { fontSize: 12 });
  const svgString = readFileSync("test/resources/images/test-svg.svg");
  doc.addImage(svgString, { width: 150, align: "center" });

  const contentBuf = doc.generate();
  await write("test/test-image-gen.pdf", contentBuf);
  const content = contentBuf.toString("binary");

  expect(content).toContain("%PDF-1.4");
  // verify JPEG decoding format exists
  expect(content).toContain("/DCTDecode");
  // verify PNG FlateDecode format exists
  expect(content).toContain("/FlateDecode");
  // verify SMask dictionary is linked for transparent PNG
  expect(content).toContain("/SMask");
});
