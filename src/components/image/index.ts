import { Buffer } from "buffer";
import { ensureBuffer } from "../../utils/buffer";
import type { Component, LayoutContext } from "../../layout";
import type { PDFPageWriter } from "../../writer";
import { Svg } from "../svg";
import { type ImageOptions, fs } from "./utils";
import { JpegImage } from "./jpeg";
import { PngImage } from "./png";

export type { ImageOptions } from "./utils";
export { JpegImage } from "./jpeg";
export { PngImage } from "./png";

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
    if (buf[0] === 0xff && buf[1] === 0xd8) return new JpegImage(buf, options);

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
