import { Buffer } from "buffer";
import { ensureBuffer } from "../../utils";

export type ImageOptions = {
  width?: number;
  height?: number;
  align?: "left" | "center" | "right";
};

// ---------------------------------------------------------------------------
// Lazy fs loader (Node.js only — undefined in browser)
// ---------------------------------------------------------------------------

let fs: any = null;

if (typeof window === "undefined") {
  try {
    fs = await import(/* @vite-ignore */ "fs");
  } catch (e) {}
}

/**
 * Resolve a source (file path string or raw buffer/Uint8Array) into a Buffer.
 * Throws if the path cannot be found or the filesystem is unavailable.
 */
export function resolveBuffer(source: any): Buffer {
  if (typeof source === "string") {
    const trimmed = source.trim();
    if (fs && fs.existsSync && fs.existsSync(trimmed)) {
      return Buffer.from(fs.readFileSync(trimmed));
    }
    throw new Error(`File not found or filesystem unavailable: ${trimmed}`);
  }
  return ensureBuffer(source);
}

/** Expose the lazily-loaded fs module for format detection in the index. */
export { fs };

// ---------------------------------------------------------------------------
// Layout helpers
// ---------------------------------------------------------------------------

/**
 * Compute the rendered (w, h) for an image given its natural size, user-supplied
 * override dimensions, and the available container width.
 */
export function computeDimensions(
  imgWidth: number,
  imgHeight: number,
  optWidth: number | undefined,
  optHeight: number | undefined,
  containerWidth: number
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

/** Return the x-axis shift needed to apply the requested alignment. */
export function xOffset(
  align: "left" | "center" | "right",
  containerWidth: number,
  drawWidth: number
): number {
  if (align === "center") return (containerWidth - drawWidth) / 2;
  if (align === "right") return containerWidth - drawWidth;
  return 0;
}
