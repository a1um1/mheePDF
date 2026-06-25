import { Buffer } from "buffer";
import { zlibSync, unzlibSync } from "fflate";
import type { Component, LayoutContext } from "../layout";
import type { PDFPageWriter } from "../writer";
import { PDFIndirectStreamObject } from "../object/indirect/stream";
import { ensureBuffer } from "../utils/buffer";
import { Svg } from "./svg";

let fs: any = null;

if (typeof window === "undefined") {
  try {
    fs = await import(/* @vite-ignore */ "fs");
  } catch (e) {}
}

export type ImageOptions = {
  width?: number;
  height?: number;
  align?: "left" | "center" | "right";
};

// ---------------------------------------------------------------------------
// PNG helpers
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

function decodePNG(buffer: Uint8Array) {
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
      buffer[offset + 7]!,
    );
    offset += 8;

    if (offset + length > buffer.length) break;
    const data = buffer.subarray(offset, offset + length);
    offset += length;
    offset += 4; // Skip CRC

    if (type === "IHDR") {
      width = ((data[0]! << 24) | (data[1]! << 16) | (data[2]! << 8) | data[3]!) >>> 0;
      height = ((data[4]! << 24) | (data[5]! << 16) | (data[6]! << 8) | data[7]!) >>> 0;
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
  for (const chunk of idatChunks) {
    totalLength += chunk.length;
  }
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

    const lineData = decompressed.subarray(decompressedOffset, decompressedOffset + width * bpp);
    decompressedOffset += width * bpp;

    for (let i = 0; i < lineData.length; i++) {
      const x = lineData[i]!;
      const a = i >= bpp ? currLine[i - bpp]! : 0;
      const b = prevLine[i]! ?? 0;
      const c = i >= bpp ? (prevLine[i - bpp]! ?? 0) : 0;

      let val = 0;
      if (filter === 0) {
        val = x;
      } else if (filter === 1) {
        val = (x + a) & 0xff;
      } else if (filter === 2) {
        val = (x + b) & 0xff;
      } else if (filter === 3) {
        val = (x + Math.floor((a + b) / 2)) & 0xff;
      } else if (filter === 4) {
        val = (x + paethPredictor(a, b, c)) & 0xff;
      } else {
        throw new Error(`Unknown PNG filter type: ${filter}`);
      }
      currLine[i] = val;
    }

    const pixelLineOffset = y * width * 4;
    for (let x = 0; x < width; x++) {
      const destIdx = pixelLineOffset + x * 4;
      const srcIdx = x * bpp;

      if (colorType === 0) {
        const g = currLine[srcIdx]!;
        let a = 255;
        if (trns && trns.length >= 2) {
          const transVal = trns[1]!;
          if (g === transVal) a = 0;
        }
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
          const transR = trns[1]!;
          const transG = trns[3]!;
          const transB = trns[5]!;
          if (r === transR && g === transG && b === transB) a = 0;
        }
        pixels[destIdx] = r;
        pixels[destIdx + 1] = g;
        pixels[destIdx + 2] = b;
        pixels[destIdx + 3] = a;
      } else if (colorType === 3) {
        if (!palette) throw new Error("Missing PLTE chunk in indexed PNG");
        const idx = currLine[srcIdx]!;
        let a = 255;
        if (trns && idx < trns.length) {
          a = trns[idx]!;
        }
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
      if (pixels[i]! < 255) {
        foundTrans = true;
        break;
      }
    }
    hasAlpha = foundTrans;
  }

  return { width, height, data: pixels, alpha: hasAlpha, hasAlpha };
}

// ---------------------------------------------------------------------------
// Shared layout helpers
// ---------------------------------------------------------------------------

function resolveBuffer(source: any): Buffer {
  if (typeof source === "string") {
    const trimmed = source.trim();
    if (fs && fs.existsSync && fs.existsSync(trimmed)) {
      return Buffer.from(fs.readFileSync(trimmed));
    }
    throw new Error(`File not found or filesystem unavailable: ${trimmed}`);
  }
  return ensureBuffer(source);
}

function computeDimensions(
  imgWidth: number,
  imgHeight: number,
  optWidth: number | undefined,
  optHeight: number | undefined,
  containerWidth: number,
): { w: number; h: number } {
  let w = optWidth;
  let h = optHeight;

  if (w === undefined && h === undefined) {
    w = imgWidth;
    h = imgHeight;
  } else if (w !== undefined && h === undefined) {
    w = Math.min(w, containerWidth);
    h = imgHeight * (w / imgWidth);
  } else if (w === undefined && h !== undefined) {
    w = imgWidth * (h / imgHeight);
  }

  if (w! > containerWidth) {
    const ratio = containerWidth / w!;
    w = containerWidth;
    h = h! * ratio;
  }

  return { w: w!, h: h! };
}

function xOffset(
  align: "left" | "center" | "right",
  containerWidth: number,
  drawWidth: number,
): number {
  if (align === "center") return (containerWidth - drawWidth) / 2;
  if (align === "right") return containerWidth - drawWidth;
  return 0;
}

// ---------------------------------------------------------------------------
// JpegImage
// ---------------------------------------------------------------------------

export class JpegImage implements Component {
  public source: any;
  public width?: number;
  public height?: number;
  public align: "left" | "center" | "right";

  private buffer!: Buffer;
  private imgWidth!: number;
  private imgHeight!: number;
  private cachedXObjectRef: any = null;

  constructor(source: any, options?: ImageOptions) {
    this.source = source;
    this.width = options?.width;
    this.height = options?.height;
    this.align = options?.align ?? "left";

    if (!(typeof this.source === "string" && this.source.includes("{{"))) {
      this.load();
    }
  }

  private load(): void {
    this.buffer = resolveBuffer(this.source);
    if (this.buffer[0] !== 0xff || this.buffer[1] !== 0xd8) {
      throw new Error("Buffer does not contain a valid JPEG image.");
    }
    const info = this.parseJPEG(this.buffer);
    this.imgWidth = info.width;
    this.imgHeight = info.height;
  }

  private parseJPEG(buf: Uint8Array): {
    width: number;
    height: number;
    precision: number;
    components: number;
  } {
    let offset = 2;
    while (offset < buf.length) {
      if (buf[offset] !== 0xff) {
        offset++;
        continue;
      }
      const marker = buf[offset + 1]!;
      offset += 2;
      if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
        continue;
      }
      if (offset + 2 > buf.length) break;
      const length = (buf[offset]! << 8) | buf[offset + 1]!;
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xcc) {
        if (offset + length > buf.length) break;
        const precision = buf[offset + 2]!;
        const height = (buf[offset + 3]! << 8) | buf[offset + 4]!;
        const width = (buf[offset + 5]! << 8) | buf[offset + 6]!;
        const components = buf[offset + 7]!;
        return { width, height, precision, components };
      }
      offset += length;
    }
    throw new Error("SOF marker not found in JPEG");
  }

  measure(_width: number, _context: LayoutContext): { width: number; height: number } {
    const { w, h } = computeDimensions(
      this.imgWidth,
      this.imgHeight,
      this.width,
      this.height,
      _width,
    );
    return { width: w, height: h };
  }

  draw(
    writer: PDFPageWriter,
    x: number,
    y: number,
    width: number,
    availableHeight: number,
    _context: LayoutContext,
  ): Component | null {
    const { w: drawWidth, h: drawHeight } = computeDimensions(
      this.imgWidth,
      this.imgHeight,
      this.width,
      this.height,
      width,
    );

    const pageHeight = writer.getPageHeight();
    const printableHeight = pageHeight - writer.margin.top - writer.margin.bottom;
    if (availableHeight < printableHeight - 5 && drawHeight > availableHeight) {
      return this;
    }

    const renderX = x + xOffset(this.align, width, drawWidth);
    const renderY = y - drawHeight;

    if (!this.cachedXObjectRef) {
      const imageStream = writer.pdf.addObject(
        new PDFIndirectStreamObject({
          value: this.buffer,
          extraDict: {
            Type: "/XObject",
            Subtype: "/Image",
            Width: this.imgWidth,
            Height: this.imgHeight,
            ColorSpace: "/DeviceRGB",
            BitsPerComponent: 8,
            Filter: "/DCTDecode",
          },
        }),
      );
      this.cachedXObjectRef = imageStream;
    }

    const imageKey = writer.registerXObject(this.cachedXObjectRef);
    writer.drawImage(imageKey, renderX, renderY, drawWidth, drawHeight);
    return null;
  }
}

// ---------------------------------------------------------------------------
// PngImage
// ---------------------------------------------------------------------------

export class PngImage implements Component {
  public source: any;
  public width?: number;
  public height?: number;
  public align: "left" | "center" | "right";

  private buffer!: Buffer;
  private imgWidth!: number;
  private imgHeight!: number;
  private cachedXObjectRef: any = null;

  constructor(source: any, options?: ImageOptions) {
    this.source = source;
    this.width = options?.width;
    this.height = options?.height;
    this.align = options?.align ?? "left";

    if (!(typeof this.source === "string" && this.source.includes("{{"))) {
      this.load();
    }
  }

  private load(): void {
    this.buffer = resolveBuffer(this.source);
    if (
      this.buffer[0] !== 0x89 ||
      this.buffer[1] !== 0x50 ||
      this.buffer[2] !== 0x4e ||
      this.buffer[3] !== 0x47
    ) {
      throw new Error("Buffer does not contain a valid PNG image.");
    }
    const png = decodePNG(this.buffer);
    this.imgWidth = png.width;
    this.imgHeight = png.height;
  }

  measure(_width: number, _context: LayoutContext): { width: number; height: number } {
    const { w, h } = computeDimensions(
      this.imgWidth,
      this.imgHeight,
      this.width,
      this.height,
      _width,
    );
    return { width: w, height: h };
  }

  draw(
    writer: PDFPageWriter,
    x: number,
    y: number,
    width: number,
    availableHeight: number,
    _context: LayoutContext,
  ): Component | null {
    const { w: drawWidth, h: drawHeight } = computeDimensions(
      this.imgWidth,
      this.imgHeight,
      this.width,
      this.height,
      width,
    );

    const pageHeight = writer.getPageHeight();
    const printableHeight = pageHeight - writer.margin.top - writer.margin.bottom;
    if (availableHeight < printableHeight - 5 && drawHeight > availableHeight) {
      return this;
    }

    const renderX = x + xOffset(this.align, width, drawWidth);
    const renderY = y - drawHeight;

    if (!this.cachedXObjectRef) {
      const png = decodePNG(this.buffer);
      const pixelCount = png.width * png.height;
      const rgbData = new Uint8Array(pixelCount * 3);
      const alphaData = png.alpha ? new Uint8Array(pixelCount) : null;

      for (let i = 0; i < pixelCount; i++) {
        rgbData[i * 3] = png.data[i * 4]!;
        rgbData[i * 3 + 1] = png.data[i * 4 + 1]!;
        rgbData[i * 3 + 2] = png.data[i * 4 + 2]!;
        if (alphaData) {
          alphaData[i] = png.data[i * 4 + 3]!;
        }
      }

      const compressedRGB = Buffer.from(zlibSync(rgbData));

      let smaskRef: any = null;
      if (alphaData) {
        const compressedAlpha = Buffer.from(zlibSync(alphaData));
        const smaskStream = writer.pdf.addObject(
          new PDFIndirectStreamObject({
            value: compressedAlpha,
            extraDict: {
              Type: "/XObject",
              Subtype: "/Image",
              Width: png.width,
              Height: png.height,
              ColorSpace: "/DeviceGray",
              BitsPerComponent: 8,
              Filter: "/FlateDecode",
            },
          }),
        );
        smaskRef = smaskStream.toRef();
      }

      const extraDict: any = {
        Type: "/XObject",
        Subtype: "/Image",
        Width: png.width,
        Height: png.height,
        ColorSpace: "/DeviceRGB",
        BitsPerComponent: 8,
        Filter: "/FlateDecode",
      };

      if (smaskRef) {
        extraDict.SMask = smaskRef;
      }

      const imageStream = writer.pdf.addObject(
        new PDFIndirectStreamObject({ value: compressedRGB, extraDict }),
      );
      this.cachedXObjectRef = imageStream;
    }

    const imageKey = writer.registerXObject(this.cachedXObjectRef);
    writer.drawImage(imageKey, renderX, renderY, drawWidth, drawHeight);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Image — auto-detect factory wrapper (backward-compatible)
// ---------------------------------------------------------------------------

/**
 * Auto-detecting image component. Accepts JPEG, PNG, or SVG source and
 * delegates to the appropriate typed class internally.
 *
 * For explicit typing, use {@link JpegImage}, {@link PngImage}, or {@link Svg}.
 */
export class Image implements Component {
  public source: any;
  public width?: number;
  public height?: number;
  public align?: "left" | "center" | "right";

  private delegate!: Component;

  constructor(source: any, options?: ImageOptions) {
    this.source = source;
    this.width = options?.width;
    this.height = options?.height;
    this.align = options?.align ?? "left";

    if (!(typeof this.source === "string" && this.source.includes("{{"))) {
      this.delegate = Image.detect(source, options);
    }
  }

  /** Detect image type and return the appropriate typed component. */
  static detect(source: any, options?: ImageOptions): Component {
    // SVG string
    if (typeof source === "string") {
      const trimmed = source.trim();
      if (trimmed.startsWith("<svg") || trimmed.startsWith("<?xml") || trimmed.includes("<svg")) {
        return new Svg(source, options);
      }
    }

    // Load raw buffer
    let buf: Buffer;
    if (typeof source === "string") {
      const trimmed = source.trim();
      if (fs && fs.existsSync && fs.existsSync(trimmed)) {
        buf = Buffer.from(fs.readFileSync(trimmed));
      } else {
        throw new Error(`File not found or filesystem unavailable: ${trimmed}`);
      }
    } else {
      buf = ensureBuffer(source);
    }

    // JPEG
    if (buf[0] === 0xff && buf[1] === 0xd8) {
      return new JpegImage(buf, options);
    }

    // PNG
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
      return new PngImage(buf, options);
    }

    // SVG from buffer
    const text = buf.toString("utf-8").trim();
    if (text.startsWith("<svg") || text.includes("<svg") || text.startsWith("<?xml")) {
      return new Svg(buf, options);
    }

    throw new Error("Unsupported image format. Only JPEG, PNG, and SVG are supported.");
  }

  measure(width: number, context: LayoutContext): { width: number; height: number } {
    return this.delegate.measure(width, context);
  }

  draw(
    writer: PDFPageWriter,
    x: number,
    y: number,
    width: number,
    availableHeight: number,
    context: LayoutContext,
  ): Component | null {
    return this.delegate.draw(writer, x, y, width, availableHeight, context);
  }
}
