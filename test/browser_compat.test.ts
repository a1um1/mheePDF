import { expect, test } from "bun:test";
import { ensureBuffer } from "../src/utils/buffer";
import { MheePDF } from "../src";
import { Buffer } from "buffer";

test("ensureBuffer utility handles diverse types", () => {
  // Test Buffer
  const buf1 = Buffer.from("hello", "utf-8");
  const res1 = ensureBuffer(buf1);
  expect(Buffer.isBuffer(res1)).toBe(true);
  expect(res1.toString("utf-8")).toBe("hello");

  // Test Uint8Array
  const u8 = new Uint8Array([104, 101, 108, 108, 111]);
  const res2 = ensureBuffer(u8);
  expect(Buffer.isBuffer(res2)).toBe(true);
  expect(res2.toString("utf-8")).toBe("hello");

  // Test ArrayBuffer
  const ab = u8.buffer;
  const res3 = ensureBuffer(ab);
  expect(Buffer.isBuffer(res3)).toBe(true);
  expect(res3.toString("utf-8")).toBe("hello");

  // Test SharedArrayBuffer (if supported in the environment)
  if (typeof SharedArrayBuffer !== "undefined") {
    const sab = new SharedArrayBuffer(5);
    const view = new Uint8Array(sab);
    view.set([104, 101, 108, 108, 111]);
    const res4 = ensureBuffer(sab);
    expect(Buffer.isBuffer(res4)).toBe(true);
    expect(res4.toString("utf-8")).toBe("hello");
  }

  // Test string (assumed utf-8)
  const res5 = ensureBuffer("hello");
  expect(Buffer.isBuffer(res5)).toBe(true);
  expect(res5.toString("utf-8")).toBe("hello");
});

test("MheePDF initializes and builds basic doc with custom configurations", () => {
  const doc = new MheePDF({
    pageSize: MheePDF.A4,
    compress: true,
  });

  doc.addPage(MheePDF.A4, (page) => {
    page.setFont("Helvetica", 12);
    page.drawText("Browser compatibility test", 50, 700);
  });

  const pdfBuffer = doc.generate();
  expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
  expect(pdfBuffer.length).toBeGreaterThan(0);
});
