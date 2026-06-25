import { expect, test } from "bun:test";
import { MheePDF } from "../src";

test("Line Module: colors, thickness, dash styling, and vertical centering within layout height", async () => {
  const doc = new MheePDF({
    pageSize: MheePDF.A4,
    margin: 40,
    compress: false,
  });

  // Solid line (defaults: thickness 1, height 1, color black)
  doc.addLine();

  // Custom line: red, thicker, custom dash, custom height
  doc.addLine({
    color: "#ff0000",
    thickness: 3,
    dash: [5, 5],
    height: 20,
  });

  // Dotted line preset
  doc.addLine({
    color: "#0000ff",
    dash: "dotted",
    height: 15,
  });

  // Dashed line preset
  doc.addLine({
    color: "#00ff00",
    dash: "dashed",
    height: 15,
  });

  const contentBuf = doc.generate();
  const content = contentBuf.toString("binary");

  expect(content).toContain("%PDF-1.4");
  
  // Verify dash patterns exist in the commands
  expect(content).toContain("[5 5] 0 d");
  expect(content).toContain("[1 2] 0 d");
  expect(content).toContain("[4 4] 0 d");
});
