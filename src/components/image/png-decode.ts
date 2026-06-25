import { Buffer } from "buffer";
import { unzlibSync } from "fflate";

// ---------------------------------------------------------------------------
// Paeth predictor (PNG filter type 4)
// ---------------------------------------------------------------------------

function paethPredictor(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

// ---------------------------------------------------------------------------
// PNG decoder
// ---------------------------------------------------------------------------

export interface PNGDecodeResult {
  width: number;
  height: number;
  /** Raw RGBA pixel data (width × height × 4 bytes). */
  data: Uint8Array;
  alpha: boolean;
  hasAlpha: boolean;
}

/**
 * Decode a PNG buffer into raw RGBA pixel data.
 * Supports color types: Grayscale (0), RGB (2), Indexed (3),
 * Grayscale+Alpha (4), RGBA (6). Only 8-bit non-interlaced PNGs.
 */
export function decodePNG(buffer: Uint8Array): PNGDecodeResult {
  if (
    buffer[0] !== 0x89 ||
    buffer[1] !== 0x50 ||
    buffer[2] !== 0x4e ||
    buffer[3] !== 0x47 ||
    buffer[4] !== 0x0d ||
    buffer[5] !== 0x0a ||
    buffer[6] !== 0x1a ||
    buffer[7] !== 0x0a
  ) {
    throw new Error("Invalid PNG signature");
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlaceMethod = 0;

  const idatChunks: Uint8Array[] = [];
  let palette: Uint8Array | null = null;
  let trns: Uint8Array | null = null;

  while (offset < buffer.length) {
    if (offset + 8 > buffer.length) break;
    const length =
      ((buffer[offset]! << 24) |
        (buffer[offset + 1]! << 16) |
        (buffer[offset + 2]! << 8) |
        buffer[offset + 3]!) >>>
      0;
    const type = String.fromCharCode(
      buffer[offset + 4]!,
      buffer[offset + 5]!,
      buffer[offset + 6]!,
      buffer[offset + 7]!
    );
    offset += 8;

    if (offset + length > buffer.length) break;
    const data = buffer.subarray(offset, offset + length);
    offset += length;
    offset += 4; // Skip CRC

    if (type === "IHDR") {
      width =
        ((data[0]! << 24) | (data[1]! << 16) | (data[2]! << 8) | data[3]!) >>> 0;
      height =
        ((data[4]! << 24) | (data[5]! << 16) | (data[6]! << 8) | data[7]!) >>> 0;
      bitDepth = data[8]!;
      colorType = data[9]!;
      interlaceMethod = data[12]!;

      if (bitDepth !== 8) {
        throw new Error(`Only 8-bit PNGs are supported. Found: ${bitDepth}-bit`);
      }
      if (interlaceMethod !== 0) {
        throw new Error("Interlaced PNGs are not supported.");
      }
    } else if (type === "PLTE") {
      palette = data;
    } else if (type === "tRNS") {
      trns = data;
    } else if (type === "IDAT") {
      idatChunks.push(data);
    } else if (type === "IEND") {
      break;
    }
  }

  if (width === 0 || height === 0) {
    throw new Error("Invalid PNG: missing or invalid IHDR chunk");
  }

  let totalLength = 0;
  for (const chunk of idatChunks) totalLength += chunk.length;
  const compressed = new Uint8Array(totalLength);
  let idatOffset = 0;
  for (const chunk of idatChunks) {
    compressed.set(chunk, idatOffset);
    idatOffset += chunk.length;
  }

  const decompressed = unzlibSync(compressed);

  let bpp = 0;
  if (colorType === 0) bpp = 1;
  else if (colorType === 2) bpp = 3;
  else if (colorType === 3) bpp = 1;
  else if (colorType === 4) bpp = 2;
  else if (colorType === 6) bpp = 4;
  else throw new Error(`Unsupported PNG color type: ${colorType}`);

  const pixels = new Uint8Array(width * height * 4);
  let decompressedOffset = 0;
  const prevLine = new Uint8Array(width * bpp);
  const currLine = new Uint8Array(width * bpp);

  for (let y = 0; y < height; y++) {
    if (decompressedOffset >= decompressed.length) break;
    const filter = decompressed[decompressedOffset]!;
    decompressedOffset += 1;

    const lineData = decompressed.subarray(
      decompressedOffset,
      decompressedOffset + width * bpp
    );
    decompressedOffset += width * bpp;

    for (let i = 0; i < lineData.length; i++) {
      const x = lineData[i]!;
      const a = i >= bpp ? currLine[i - bpp]! : 0;
      const b = prevLine[i]! ?? 0;
      const c = i >= bpp ? prevLine[i - bpp]! ?? 0 : 0;

      let val = 0;
      if (filter === 0) val = x;
      else if (filter === 1) val = (x + a) & 0xff;
      else if (filter === 2) val = (x + b) & 0xff;
      else if (filter === 3) val = (x + Math.floor((a + b) / 2)) & 0xff;
      else if (filter === 4) val = (x + paethPredictor(a, b, c)) & 0xff;
      else throw new Error(`Unknown PNG filter type: ${filter}`);

      currLine[i] = val;
    }

    const pixelLineOffset = y * width * 4;
    for (let x = 0; x < width; x++) {
      const destIdx = pixelLineOffset + x * 4;
      const srcIdx = x * bpp;

      if (colorType === 0) {
        const g = currLine[srcIdx]!;
        let a = 255;
        if (trns && trns.length >= 2 && g === trns[1]!) a = 0;
        pixels[destIdx] = g;
        pixels[destIdx + 1] = g;
        pixels[destIdx + 2] = g;
        pixels[destIdx + 3] = a;
      } else if (colorType === 2) {
        const r = currLine[srcIdx]!;
        const g = currLine[srcIdx + 1]!;
        const b = currLine[srcIdx + 2]!;
        let a = 255;
        if (trns && trns.length >= 6) {
          if (r === trns[1]! && g === trns[3]! && b === trns[5]!) a = 0;
        }
        pixels[destIdx] = r;
        pixels[destIdx + 1] = g;
        pixels[destIdx + 2] = b;
        pixels[destIdx + 3] = a;
      } else if (colorType === 3) {
        if (!palette) throw new Error("Missing PLTE chunk in indexed PNG");
        const idx = currLine[srcIdx]!;
        let a = 255;
        if (trns && idx < trns.length) a = trns[idx]!;
        pixels[destIdx] = palette[idx * 3]!;
        pixels[destIdx + 1] = palette[idx * 3 + 1]!;
        pixels[destIdx + 2] = palette[idx * 3 + 2]!;
        pixels[destIdx + 3] = a;
      } else if (colorType === 4) {
        const g = currLine[srcIdx]!;
        const a = currLine[srcIdx + 1]!;
        pixels[destIdx] = g;
        pixels[destIdx + 1] = g;
        pixels[destIdx + 2] = g;
        pixels[destIdx + 3] = a;
      } else if (colorType === 6) {
        pixels[destIdx] = currLine[srcIdx]!;
        pixels[destIdx + 1] = currLine[srcIdx + 1]!;
        pixels[destIdx + 2] = currLine[srcIdx + 2]!;
        pixels[destIdx + 3] = currLine[srcIdx + 3]!;
      }
    }

    prevLine.set(currLine);
  }

  let hasAlpha = colorType === 4 || colorType === 6 || !!trns;
  if (hasAlpha) {
    let foundTrans = false;
    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i]! < 255) { foundTrans = true; break; }
    }
    hasAlpha = foundTrans;
  }

  return { width, height, data: pixels, alpha: hasAlpha, hasAlpha };
}
