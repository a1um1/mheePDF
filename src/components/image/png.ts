import { Buffer } from "buffer";
import { zlibSync } from "fflate";
import type { Component, LayoutContext } from "../../layout";
import type { PDFPageWriter } from "../../writer";
import { PDFIndirectStreamObject } from "../../object/indirect/stream";
import { type ImageOptions, resolveBuffer, computeDimensions, xOffset } from "./utils";
import { decodePNG } from "./png-decode";

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
      const png = decodePNG(this.buffer);
      const pixelCount = png.width * png.height;
      const rgbData = new Uint8Array(pixelCount * 3);
      const alphaData = png.alpha ? new Uint8Array(pixelCount) : null;

      for (let i = 0; i < pixelCount; i++) {
        rgbData[i * 3] = png.data[i * 4]!;
        rgbData[i * 3 + 1] = png.data[i * 4 + 1]!;
        rgbData[i * 3 + 2] = png.data[i * 4 + 2]!;
        if (alphaData) alphaData[i] = png.data[i * 4 + 3]!;
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
          })
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
      if (smaskRef) extraDict.SMask = smaskRef;

      this.cachedXObjectRef = writer.pdf.addObject(
        new PDFIndirectStreamObject({ value: compressedRGB, extraDict })
      );
    }

    const imageKey = writer.registerXObject(this.cachedXObjectRef);
    writer.drawImage(imageKey, renderX, renderY, drawWidth, drawHeight);
    return null;
  }
}
