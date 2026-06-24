import type { PDFPageWriter } from "./writer";
import type { PDFType0FontObject } from "./object/indirect/fontType0";

export interface LayoutContext {
  defaultFont?: string | PDFType0FontObject;
  defaultFontSize?: number;
  defaultCharSpacing?: number;
  defaultLineHeight?: number;
  defaultTablePadding?: number | { top?: number; bottom?: number; left?: number; right?: number };
  getTextWidth: (text: string, font: string | PDFType0FontObject | undefined, size: number, charSpacing?: number) => number;
}

export interface Component {
  /**
   * Returns the width and height required by this component when rendered within a given width constraint.
   */
  measure(width: number, context: LayoutContext): { width: number; height: number };

  /**
   * Draws the component (or a part of it) on the page.
   *
   * @param writer The page writer to issue commands to.
   * @param x The current relative X coordinate from the left margin.
   * @param y The current relative Y coordinate from the bottom margin (top boundary of the element).
   * @param width The width constraint allocated to this element.
   * @param availableHeight The height constraint representing remaining space on the current page.
   * @param context The layout configuration context.
   * @returns A new Component representing the remainder of this component if it could not finish rendering, or null if it rendered completely.
   */
  draw(
    writer: PDFPageWriter,
    x: number,
    y: number,
    width: number,
    availableHeight: number,
    context: LayoutContext,
  ): Component | null;
}
