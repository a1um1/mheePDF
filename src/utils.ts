import { Buffer } from "buffer";

/**
 * Normalizes input of various binary/string types (Buffer, Uint8Array, ArrayBuffer,
 * SharedArrayBuffer, or string) into a unified Buffer representation.
 */
export function ensureBuffer(input: any): Buffer {
  if (input === null || input === undefined) {
    throw new Error("Input to ensureBuffer cannot be null or undefined");
  }

  if (Buffer.isBuffer(input)) {
    return input;
  }

  if (input instanceof Uint8Array) {
    return Buffer.from(input.buffer, input.byteOffset, input.byteLength);
  }

  if (input instanceof ArrayBuffer || (typeof SharedArrayBuffer !== "undefined" && input instanceof SharedArrayBuffer)) {
    return Buffer.from(input);
  }

  if (typeof input === "string") {
    return Buffer.from(input, "utf-8");
  }

  // Fallback check for typed array / buffer-like objects
  if (input.buffer && (input.buffer instanceof ArrayBuffer || (typeof SharedArrayBuffer !== "undefined" && input.buffer instanceof SharedArrayBuffer))) {
    return Buffer.from(input.buffer, input.byteOffset || 0, input.byteLength || input.length);
  }

  throw new Error(
    `Unsupported input type for PDF generation. Must be Buffer, Uint8Array, ArrayBuffer, SharedArrayBuffer, or string. Got: ${typeof input}`
  );
}
