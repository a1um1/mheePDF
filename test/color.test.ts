import { expect, test } from "bun:test";
import { write } from "bun";
import { MheePDF, Color } from "../src";

test("Color Module: parsing, conversion and transparency", async () => {
  const doc = new MheePDF({
    pageSize: MheePDF.A4,
    margin: 50,
    defaultFont: "Helvetica",
    compress: false,
  });

  // Test static constructors and color conversions
  const red = Color.coerce("red");
  expect(red.toPDFFill()).toBe("1.000 0.000 0.000 rg");

  const green = Color.coerce("rgb(34, 139, 34)");
  expect(green.toPDFFill()).toBe("0.133 0.545 0.133 rg");

  const blue = Color.coerce("#1e3a8a");
  expect(blue.toPDFFill()).toBe("0.118 0.227 0.541 rg");

  const hsl = Color.coerce("hsl(30, 100%, 50%)");
  expect(hsl.toPDFFill()).toBe("1.000 0.502 0.000 rg");

  const oklab = Color.oklab(0.6, 0.15, -0.1);
  expect(oklab.toPDFFill()).toContain("rg");

  // Check grayscale optimization
  const gray = Color.coerce("#7f7f7f");
  expect(gray.isGrayscale()).toBe(true);
  expect(gray.toPDFFill()).toContain("g"); // grayscaled uses 'g' instead of 'rg'

  // Alpha transparency
  const transparentColor = Color.rgb(255, 0, 0, 0.7);
  expect(transparentColor.getAlpha()).toBe(0.7);

  // Add text with various colors to the document
  doc.addText("Hex Blue Title", { color: "#1e3a8a", fontSize: 20 });
  doc.addText("Named CSS Red Text", { color: "red", fontSize: 12 });
  doc.addText("RGB Forest Green Text", { color: "rgb(34, 139, 34)", fontSize: 12 });
  doc.addText("HSL Orange Text", { color: "hsl(30, 100%, 50%)", fontSize: 12 });
  doc.addText("Oklab Text", { color: oklab, fontSize: 12 });
  doc.addText("Transparent Red Text (70% opacity)", { color: transparentColor, fontSize: 12 });

  const contentBuf = doc.generate();
  await write("test/test-color-gen.pdf", contentBuf);
  const content = contentBuf.toString("binary");

  expect(content).toContain("%PDF-1.4");
  expect(content).toContain("Hex Blue Title");
  expect(content).toContain("Named CSS Red Text");
  expect(content).toContain("RGB Forest Green Text");
  expect(content).toContain("HSL Orange Text");
  expect(content).toContain("Transparent Red Text");
  // verify ExtGState for transparency was generated
  expect(content).toContain("/ExtGState");
  expect(content).toContain("GS_Opacity_0_70");
});
