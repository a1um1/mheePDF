import { Buffer } from "buffer";
import { deflateSync } from "fflate";
import { PNG } from "pngjs";
import type { Component, LayoutContext } from "../layout";
import type { PDFPageWriter } from "../writer";
import { PDFIndirectStreamObject } from "../object/indirect/stream";
import { ensureBuffer } from "../utils";

let fs: any = null;
let ResvgClass: any = null;

if (typeof window === "undefined") {
  try {
    fs = await import(/* @vite-ignore */ "fs");
  } catch (e) {}
  try {
    const resvgModule = await import(/* @vite-ignore */ "@resvg/resvg-js");
    ResvgClass = resvgModule.Resvg;
  } catch (e) {}
}

export type ImageOptions = {
  width?: number;
  height?: number;
  align?: "left" | "center" | "right";
};

export class Image implements Component {
  public source: any;
  public width?: number;
  public height?: number;
  public align?: "left" | "center" | "right";

  private format!: "jpeg" | "png";
  private buffer!: Buffer;
  private imgWidth!: number;
  private imgHeight!: number;

  // Cached XObject reference for raster images (JPEG/PNG) to avoid duplicate PDF objects
  private cachedXObjectRef: any = null;

  constructor(source: any, options?: ImageOptions) {
    this.source = source;
    this.width = options?.width;
    this.height = options?.height;
    this.align = options?.align || "left";

    if (!(typeof this.source === "string" && this.source.includes("{{"))) {
      this.loadAndParse();
    }
  }

  private loadAndParse(): void {
    if (typeof this.source === "string") {
      const trimmed = this.source.trim();
      if (trimmed.startsWith("<svg") || trimmed.startsWith("<?xml") || trimmed.includes("<svg")) {
        this.buffer = Buffer.from(trimmed, "utf-8");
      } else {
        if (fs && fs.existsSync && fs.existsSync(trimmed)) {
          this.buffer = Buffer.from(fs.readFileSync(trimmed));
        } else {
          throw new Error(`File not found or filesystem unavailable: ${trimmed}`);
        }
      }
    } else {
      this.buffer = ensureBuffer(this.source);
    }

    // Detect format
    if (this.buffer[0] === 0xff && this.buffer[1] === 0xd8) {
      this.format = "jpeg";
      const info = this.parseJPEG(this.buffer);
      this.imgWidth = info.width;
      this.imgHeight = info.height;
    } else if (
      this.buffer[0] === 0x89 &&
      this.buffer[1] === 0x50 &&
      this.buffer[2] === 0x4e &&
      this.buffer[3] === 0x47
    ) {
      this.format = "png";
      const png = PNG.sync.read(this.buffer);
      this.imgWidth = png.width;
      this.imgHeight = png.height;
    } else {
      const text = this.buffer.toString("utf-8").trim();
      if (text.startsWith("<svg") || text.includes("<svg") || text.startsWith("<?xml")) {
        if (!ResvgClass) {
          throw new Error(
            "SVG rendering requires '@resvg/resvg-js' to be installed and supported in your environment."
          );
        }
        const resvg = new ResvgClass(text);
        const originalWidth = resvg.width;
        const originalHeight = resvg.height;

        // Render at 4x the original SVG size for crispness in PDF
        const scaleFactor = 4;
        const renderWidth = originalWidth * scaleFactor;
        const rendered = new ResvgClass(text, {
          fitTo: {
            mode: "width",
            value: renderWidth,
          },
        });

        this.buffer = Buffer.from(rendered.render().asPng());
        this.format = "png";
        this.imgWidth = originalWidth;
        this.imgHeight = originalHeight;
      } else {
        throw new Error("Unsupported image format. Only JPEG, PNG, and SVG are supported.");
      }
    }
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
      const marker = buf[offset + 1];
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

  private getDimensions(containerWidth: number): { w: number; h: number } {
    let w = this.width;
    let h = this.height;

    if (w === undefined && h === undefined) {
      w = this.imgWidth;
      h = this.imgHeight;
    } else if (w !== undefined && h === undefined) {
      w = Math.min(w, containerWidth);
      h = this.imgHeight * (w / this.imgWidth);
    } else if (w === undefined && h !== undefined) {
      w = this.imgWidth * (h / this.imgHeight);
    }

    if (w > containerWidth) {
      const ratio = containerWidth / w;
      w = containerWidth;
      h = h * ratio;
    }

    return { w, h };
  }

  measure(width: number, context: LayoutContext): { width: number; height: number } {
    const { w, h } = this.getDimensions(width);
    return { width: w, height: h };
  }

  draw(
    writer: PDFPageWriter,
    x: number,
    y: number,
    width: number,
    availableHeight: number,
    context: LayoutContext,
  ): Component | null {
    const { w: drawWidth, h: drawHeight } = this.getDimensions(width);

    // Page-break check
    const pageHeight = writer.getPageHeight();
    const printableHeight = pageHeight - writer.margin.top - writer.margin.bottom;
    if (availableHeight < printableHeight - 5 && drawHeight > availableHeight) {
      return this;
    }

    // Alignment shifting
    let xShift = 0;
    if (this.align === "center") {
      xShift = (width - drawWidth) / 2;
    } else if (this.align === "right") {
      xShift = width - drawWidth;
    }

    const renderX = x + xShift;
    const renderY = y - drawHeight;

    if (this.format === "jpeg") {
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
    } else if (this.format === "png") {
      if (!this.cachedXObjectRef) {
        const png = PNG.sync.read(this.buffer);
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

        const compressedRGB = Buffer.from(deflateSync(rgbData));

        let smaskRef: any = null;
        if (alphaData) {
          const compressedAlpha = Buffer.from(deflateSync(alphaData));
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
          new PDFIndirectStreamObject({
            value: compressedRGB,
            extraDict,
          }),
        );
        this.cachedXObjectRef = imageStream;
      }

      const imageKey = writer.registerXObject(this.cachedXObjectRef);
      writer.drawImage(imageKey, renderX, renderY, drawWidth, drawHeight);
    }

    return null;
  }
}
