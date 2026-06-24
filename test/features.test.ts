import { expect, test } from "bun:test";
import { write } from "bun";
import { MheePDF } from "../src";
import { rc4, deriveObjectKey } from "../src/crypto";

test("Features: Document Metadata (Info dictionary)", () => {
  const doc = new MheePDF({
    pageSize: MheePDF.A4,
    margin: 50,
    compress: false,
    info: {
      title: "My Secure Document",
      author: "A1UM1",
      subject: "PDF Testing",
      keywords: "test, metadata, pdf",
    },
  });

  doc.addText("Document metadata test.");
  const content = doc.generate().toString("binary");

  // Verify the PDF header is present
  expect(content).toContain("%PDF-1.4");

  // Verify the Info dictionary is referenced in the trailer
  expect(content).toContain("/Info ");

  // Verify custom metadata fields exist in the serialized output
  expect(content).toContain("/Title (My Secure Document)");
  expect(content).toContain("/Author (A1UM1)");
  expect(content).toContain("/Subject (PDF Testing)");
  expect(content).toContain("/Keywords (test, metadata, pdf)");
  expect(content).toContain("/Creator (MheePDF)");
  expect(content).toContain("/Producer (MheePDF)");
  expect(content).toContain("/CreationDate ");
  expect(content).toContain("/ModDate ");
});

test("Features: Zlib Stream Compression (FlateDecode)", async () => {
  const textContent = "A".repeat(5000); // 5000 chars of highly compressible text

  // 1. Create compressed PDF (Default behavior)
  const docCompressed = new MheePDF({
    pageSize: MheePDF.A4,
    margin: 50,
    compress: true,
  });
  docCompressed.addText(textContent);
  const pdfCompressed = docCompressed.generate();

  // 2. Create uncompressed PDF
  const docUncompressed = new MheePDF({
    pageSize: MheePDF.A4,
    margin: 50,
    compress: false,
  });
  docUncompressed.addText(textContent);
  const pdfUncompressed = docUncompressed.generate();

  // Assertions
  expect(pdfCompressed.toString("binary")).toContain("/FlateDecode");
  expect(pdfUncompressed.toString("binary")).not.toContain("/FlateDecode");

  // Compressed version should be significantly smaller than uncompressed
  expect(pdfCompressed.length).toBeLessThan(pdfUncompressed.length);

  await write("test/test-compressed.pdf", pdfCompressed);
  await write("test/test-uncompressed.pdf", pdfUncompressed);
});

test("Features: PDF Encryption (Password Protection & Permissions)", async () => {
  const doc = new MheePDF({
    pageSize: MheePDF.A4,
    margin: 50,
    compress: false,
    encrypt: {
      userPassword: "user123",
      ownerPassword: "owner123",
      permissions: {
        print: "none",
        copy: false,
      },
    },
    info: {
      title: "Classified Title",
    },
  });

  doc.addText("Secret plaintext content.");

  const pdfBuf = doc.generate();
  const pdfStr = pdfBuf.toString("binary");

  await write("test/test-encrypted.pdf", pdfBuf);

  // Verify encryption dictionary references
  expect(pdfStr).toContain("/Encrypt ");
  expect(pdfStr).toContain("/ID ");

  // Verify encryption parameters
  expect(pdfStr).toContain("/Filter /Standard");
  expect(pdfStr).toContain("/V 2");
  expect(pdfStr).toContain("/R 3");
  expect(pdfStr).toContain("/Length 128");

  // Verify text content is NOT present in plaintext (it must be encrypted)
  expect(pdfStr).not.toContain("Secret plaintext content.");
  expect(pdfStr).not.toContain("Classified Title");

  // Let's verify object decryption
  // We locate the encrypt object to get /O, /U, /P, /ID
  const idMatch = pdfStr.match(/\/ID\s*\[\s*<([0-9A-F]+)>\s*<([0-9A-F]+)>\s*\]/i);
  expect(idMatch).not.toBeNull();
  const docId = Buffer.from(idMatch![1], "hex");

  // Locate the Page Content Stream object to show it was successfully encrypted
  // The content stream contains "Secret plaintext content."
  // Since we know the plaintext and we have the encryption key, we can verify
  // that decrypting the page content stream recovers the layout commands.
  const encryptKey = doc["pdf"]["encryptionKey"];
  expect(encryptKey).not.toBeUndefined();

  // Find the page object in the engine's objects registry
  const pageObj = doc["pdf"]["objects"].find((obj: any) => obj._type === "page");
  expect(pageObj).not.toBeUndefined();

  // Find the content stream object of the page
  const contentRef = pageObj.value.Contents[0];
  const contentStreamObj = doc["pdf"]["objects"].find((obj: any) => obj.id === contentRef.id);
  expect(contentStreamObj).not.toBeUndefined();

  const objId = contentStreamObj.id;
  const objGen = contentStreamObj.generation || 0;

  // Deriving the key for the content stream object
  const objKey = deriveObjectKey(encryptKey, objId, objGen);

  // Read raw stream bytes from the generated PDF
  const streamStart = pdfStr.indexOf("stream\n", pdfStr.indexOf(`${objId} ${objGen} obj`)) + 7;
  const streamEnd = pdfStr.indexOf("\nendstream", streamStart);
  const encryptedStreamData = pdfBuf.subarray(streamStart, streamEnd);

  const decrypted = rc4(objKey, encryptedStreamData).toString("utf-8");
  expect(decrypted).toContain("Secret plaintext content.");
});
