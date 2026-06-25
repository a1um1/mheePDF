import { expect, test } from "bun:test";
import { write } from "bun";
import { MheePDF } from "../src";
import { readFileSync } from "fs";

test("SVG Module: Native SVG vector graphics parsing and rendering", async () => {
  const doc = new MheePDF({
    pageSize: MheePDF.A4,
    margin: 40,
    compress: false, // Turn off compression to allow plain text content stream checks
  });

  doc.addText("SVG Native Test Card (crisp vector shapes):", { fontSize: 12 });
  
  // Read standard test card svg
  const svgString = readFileSync("test/resources/images/test-svg.svg");
  doc.addSvg(svgString, { align: "center", width: 400 });

  const contentBuf = doc.generate();
  await write("test/test-svg-native-gen.pdf", contentBuf);
  const content = contentBuf.toString("utf-8");

  expect(content).toContain("%PDF-1.4");
  
  // Verify PDF path vector commands (like 'm', 'l', 'c', 'h', 'f') exist in content stream
  expect(content).toContain(" m");
  expect(content).toContain(" l");
  expect(content).toContain(" h");
  expect(content).toContain(" f");
  
  // Verify colors used in test card (like yellow #ff0 -> '1.000 1.000 0.000 rg' or similar)
  expect(content).toContain(" rg");
  
  // Verify text labels in the test card are rendered (e.g. '0.59', '100%', '+0.30')
  expect(content).toContain("(0.59)");
  expect(content).toContain("(100%)");
  expect(content).toContain("(+0.30)");
});

test("Image delegation to Svg: auto routing", async () => {
  const doc = new MheePDF({
    pageSize: MheePDF.A4,
    margin: 40,
    compress: false,
  });

  const svgString = readFileSync("test/resources/images/test-svg.svg");
  // addImage with SVG should automatically delegate to Svg component
  doc.addImage(svgString, { align: "left", width: 300 });

  const contentBuf = doc.generate();
  const content = contentBuf.toString("utf-8");

  // Verify it contains SVG text labels as text operators instead of just raster XObjects
  expect(content).toContain("(0.59)");
  expect(content).toContain("(100%)");
});
