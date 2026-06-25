import type { Component, LayoutContext } from "../layout";
import type { PDFPageWriter } from "../writer";
import { Color } from "../color";

export type LineOptions = {
  color?: string | Color;
  thickness?: number;
  dash?: "solid" | "dashed" | "dotted" | number[];
  dashPhase?: number;
  height?: number;
};

export class Line implements Component {
  public color?: string | Color;
  public thickness?: number;
  public dash?: "solid" | "dashed" | "dotted" | number[];
  public dashPhase?: number;
  public height?: number;

  constructor(options?: LineOptions) {
    this.color = options?.color;
    this.thickness = options?.thickness;
    this.dash = options?.dash;
    this.dashPhase = options?.dashPhase;
    this.height = options?.height;
  }

  measure(width: number, context: LayoutContext): { width: number; height: number } {
    const thickness = this.thickness !== undefined ? this.thickness : 1;
    const height = this.height !== undefined ? this.height : thickness;
    return { width, height };
  }

  draw(
    writer: PDFPageWriter,
    x: number,
    y: number,
    width: number,
    availableHeight: number,
    context: LayoutContext,
  ): Component | null {
    const thickness = this.thickness !== undefined ? this.thickness : 1;
    const height = this.height !== undefined ? this.height : thickness;

    // Check page break: if the line doesn't fit on this page, and we have already drawn something on this page, push to next page.
    if (availableHeight < height) {
      const pageHeight = writer.getPageHeight();
      const printableHeight = pageHeight - writer.margin.top - writer.margin.bottom;
      if (availableHeight < printableHeight - 5) {
        return this;
      }
    }

    // Centering the line vertically within the layout height box.
    const centerY = y - height / 2;

    // Resolve dash pattern
    let dashPattern: number[] | undefined;
    if (this.dash === "dashed") {
      dashPattern = [4, 4];
    } else if (this.dash === "dotted") {
      dashPattern = [1, 2];
    } else if (Array.isArray(this.dash)) {
      dashPattern = this.dash;
    }

    writer.drawLine(
      x,
      centerY,
      x + width,
      centerY,
      thickness,
      this.color || "0 G",
      dashPattern,
      this.dashPhase || 0,
    );

    return null;
  }
}
