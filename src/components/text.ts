import type { Component, LayoutContext } from "../layout";
import type { PDFType0FontObject } from "../object/indirect/fontType0";
import type { PDFPageWriter } from "../writer";
import { Color } from "../color";

export type TextOptions = {
  font?: string | PDFType0FontObject;
  fontSize?: number;
  lineHeight?: number;
  color?: string | Color;
  charSpacing?: number;
  align?: "left" | "center" | "right";
};

export class Text implements Component {
  public text: string;
  public font?: string | PDFType0FontObject;
  public fontSize?: number;
  public lineHeight?: number;
  public color?: string | Color;
  public charSpacing?: number;
  public align?: "left" | "center" | "right";

  constructor(text: string, options?: TextOptions) {
    this.text = text;
    this.font = options?.font;
    this.fontSize = options?.fontSize;
    this.lineHeight = options?.lineHeight;
    this.color = options?.color;
    this.charSpacing = options?.charSpacing;
    this.align = options?.align;
  }

  private getLineHeight(size: number, context: LayoutContext): number {
    const defaultFontSize = context.defaultFontSize || 12;
    return this.lineHeight !== undefined
      ? this.lineHeight
      : context.defaultLineHeight !== undefined
        ? context.defaultLineHeight * (size / defaultFontSize)
        : size * 1.2;
  }

  measure(width: number, context: LayoutContext): { width: number; height: number } {
    const font = this.font || context.defaultFont;
    const size = this.fontSize || context.defaultFontSize || 12;
    const charSpacing =
      this.charSpacing !== undefined ? this.charSpacing : context.defaultCharSpacing || 0;
    const lh = this.getLineHeight(size, context);

    const lines = this.wrapText(this.text, width, font, size, context, charSpacing);
    const height = (context as any).snug && lines.length > 0
      ? (lines.length - 1) * lh + size
      : lines.length * lh;
    return {
      width,
      height,
    };
  }

  draw(
    writer: PDFPageWriter,
    x: number,
    y: number,
    width: number,
    availableHeight: number,
    context: LayoutContext,
  ): Component | null {
    const font = this.font || context.defaultFont;
    const size = this.fontSize || context.defaultFontSize || 12;
    const charSpacing =
      this.charSpacing !== undefined ? this.charSpacing : context.defaultCharSpacing || 0;
    const lh = this.getLineHeight(size, context);

    if (font) {
      writer.setFont(font, size);
    }

    const lines = this.wrapText(this.text, width, font, size, context, charSpacing);
    const isSnug = (context as any).snug;
    const maxLines = isSnug
      ? (availableHeight >= size ? Math.floor((availableHeight - size) / lh) + 1 : 0)
      : Math.floor(availableHeight / lh);

    if (maxLines <= 0) {
      // Cannot draw even a single line on this page
      return this;
    }

    const linesToDraw = lines.slice(0, maxLines);
    const remainingLines = lines.slice(maxLines);

    let currentY = y - size; // Position the first baseline at (y - size)
    for (const line of linesToDraw) {
      let xShift = 0;
      if (this.align === "center" || this.align === "right") {
        const lineWidth = context.getTextWidth(line, font, size, charSpacing);
        if (this.align === "center") {
          xShift = (width - lineWidth) / 2;
        } else {
          xShift = width - lineWidth;
        }
      }
      writer.drawTextLine(line, x + xShift, currentY, this.color, charSpacing);
      currentY -= lh;
    }

    if (remainingLines.length > 0) {
      return new Text(remainingLines.join("\n"), {
        font: this.font,
        fontSize: this.fontSize,
        lineHeight: this.lineHeight,
        color: this.color,
        charSpacing: this.charSpacing,
        align: this.align,
      });
    }

    return null;
  }

  private wrapText(
    text: string,
    maxWidth: number,
    font: string | PDFType0FontObject | undefined,
    size: number,
    context: LayoutContext,
    charSpacing: number,
  ): string[] {
    if (!text) return [];
    const lines: string[] = [];
    const paragraphs = text.split("\n");
    const segmenter = new Intl.Segmenter("th", { granularity: "word" });

    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i]!;
      if (paragraph === "") {
        if (i === paragraphs.length - 1 && text.endsWith("\n") && paragraphs.length > 1) {
          continue;
        }
        lines.push("");
        continue;
      }
      const segments = Array.from(segmenter.segment(paragraph)).map((s) => s.segment);
      let currentLine = "";

      for (const segment of segments) {
        const testLine = currentLine + segment;
        const testWidth = context.getTextWidth(testLine, font, size, charSpacing);

        if (testWidth <= maxWidth) {
          currentLine = testLine;
        } else {
          if (currentLine) {
            lines.push(currentLine);
            currentLine = "";
          }

          const segmentWidth = context.getTextWidth(segment, font, size, charSpacing);
          if (segmentWidth <= maxWidth) {
            if (segment === " ") {
              continue; // Skip leading spaces on wrapped lines
            }
            currentLine = segment;
          } else {
            // Fallback: character-by-character split for extremely long segments
            let tempLine = "";
            for (let i = 0; i < segment.length; i++) {
              const char = segment[i];
              const charTestLine = tempLine + char;
              if (context.getTextWidth(charTestLine, font, size, charSpacing) > maxWidth) {
                if (tempLine) lines.push(tempLine);
                tempLine = char;
              } else {
                tempLine = charTestLine;
              }
            }
            currentLine = tempLine;
          }
        }
      }
      if (currentLine) {
        lines.push(currentLine);
      }
    }
    return lines;
  }
}
