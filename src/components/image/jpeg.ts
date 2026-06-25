import { Buffer } from "buffer";
import type { Component, LayoutContext } from "../../layout";
import type { PDFPageWriter } from "../../writer";
import { PDFIndirectStreamObject } from "../../object/indirect/stream";
import { type ImageOptions, resolveBuffer, computeDimensions, xOffset } from "./utils";

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
      if (buf[offset] !== 0xff) { offset++; continue; }
      const marker = buf[offset + 1]!;
      offset += 2;
      if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) continue;
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
    const { w, h } = computeDimensions(this.imgWidth, this.imgHeight, this.width, this.height, _width);
    return { width: w, height: h };
  }

  draw(
    writer: PDFPageWriter,
    x: number,
    y: number,
    width: number,
    availableHeight: number,
    _context: LayoutContext
  ): Component | null {
    const { w: drawWidth, h: drawHeight } = computeDimensions(
      this.imgWidth, this.imgHeight, this.width, this.height, width
    );

    const pageHeight = writer.getPageHeight();
    const printableHeight = pageHeight - writer.margin.top - writer.margin.bottom;
    if (availableHeight < printableHeight - 5 && drawHeight > availableHeight) return this;

    const renderX = x + xOffset(this.align, width, drawWidth);
    const renderY = y - drawHeight;

    if (!this.cachedXObjectRef) {
      this.cachedXObjectRef = writer.pdf.addObject(
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
        })
      );
    }

    const imageKey = writer.registerXObject(this.cachedXObjectRef);
    writer.drawImage(imageKey, renderX, renderY, drawWidth, drawHeight);
    return null;
  }
}
