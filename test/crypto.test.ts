import { expect, test } from "bun:test";
import { md5, randomBytes } from "../src/crypto";
import { createHash } from "crypto";
import { Buffer } from "buffer";

test("Custom md5 matches native node crypto md5", () => {
  const testCases = [
    "",
    "Hello",
    "Hello World!",
    "a".repeat(100),
    "a".repeat(1000),
    "ไทย", // Thai characters
    "MheePDF is isomorphic!",
  ];

  for (const tc of testCases) {
    const data = Buffer.from(tc, "utf-8");
    const customHash = md5(data);
    const nativeHash = createHash("md5").update(data).digest();
    expect(customHash.toString("hex")).toBe(nativeHash.toString("hex"));
  }
});

test("Custom randomBytes generates expected number of bytes", () => {
  const sizes = [0, 1, 8, 16, 32, 100];
  for (const size of sizes) {
    const bytes = randomBytes(size);
    expect(Buffer.isBuffer(bytes)).toBe(true);
    expect(bytes.length).toBe(size);
  }
});
