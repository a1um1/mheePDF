import type { PDFPageObject } from "./object/indirect/page";
import { PDFIndirectStreamObject } from "./object/indirect/stream";
import { PDFType0FontObject } from "./object/indirect/fontType0";
import { PDFFontObject } from "./object/indirect/font";
import { Color } from "./color";
import * as hb from "harfbuzzjs";
import { getStandardFontTextWidth } from "./standardFonts";
import type { PDFEngine } from "./engine";
import { escapePDFString } from "./object/serialize";

export class PDFPageWriter {
  public pdf: PDFEngine;
  private page: PDFPageObject;
  public contentStream: PDFIndirectStreamObject;
  private commands: string[] = [];

  /** Returns the page height in user units (from MediaBox). */
  public getPageHeight(): number {
    return this.page.value.MediaBox[3] as number;
  }

  private currentFontKey?: string;
  private currentFontSize?: number;
  private activeFontObject: PDFType0FontObject | null = null;

  // ponytail: Expose margins (x/y draw calls offset automatically, wrapping defaults to margins)
  public margin = { top: 0, bottom: 0, left: 0, right: 0 };

  constructor(pdf: PDFEngine, page: PDFPageObject) {
    this.pdf = pdf;
    this.page = page;

    this.contentStream = this.pdf.addObject(new PDFIndirectStreamObject({ value: "" }));
    this.page.value.Contents.push(this.contentStream.toRef());
  }

  private getOrCreateResources(): any {
    let resourcesRef = this.page.value.Resources;
    let resourcesObj: any;

    if (!resourcesRef) {
      resourcesObj = this.pdf.addObject(new PDFFontObject({}));
      this.page.value.Resources = resourcesObj.toRef();
    } else {
      resourcesObj = (this.pdf as any).objects.find((obj: any) => obj.id === resourcesRef.id);
      if (!resourcesObj) {
        resourcesObj = this.pdf.addObject(new PDFFontObject({}));
        this.page.value.Resources = resourcesObj.toRef();
      }
    }
    return resourcesObj;
  }

  public applyColorOpacity(color: Color, type: "fill" | "stroke"): void {
    const alpha = color.getAlpha();
    if (alpha < 1) {
      const alphaKey = `GS_Opacity_${alpha.toFixed(2).replace(".", "_")}`;
      const resourcesObj = this.getOrCreateResources();

      resourcesObj.addExtGState(alphaKey, {
        Type: "/ExtGState",
        ca: alpha, // non-stroke opacity
        CA: alpha, // stroke opacity
      });

      this.commands.push(`/${alphaKey} gs`);
    }
  }

  setFont(font: string | PDFType0FontObject, size: number): this {
    const resourcesObj = this.getOrCreateResources();

    let fontKey = "";
    if (font instanceof PDFType0FontObject) {
      fontKey = font.fontName;
      resourcesObj.addFont(fontKey, font);
      this.activeFontObject = font;
    } else if (typeof font === "string") {
      fontKey = font;
      this.activeFontObject = null;
      // ponytail: Map Arial / Helvetica / F1 standard string keys to Helvetica font dictionary if not present
      if (!resourcesObj.value.Font[fontKey]) {
        const isTimes = fontKey === "Times" || fontKey === "F1-Times";
        resourcesObj.addFont(fontKey, {
          Type: "/Font",
          BaseFont: isTimes ? "/Times-Italic" : "/Helvetica",
          Subtype: "/Type1",
        });
      }
    } else {
      throw new Error(
        "Invalid font parameter. Must be a string (e.g. 'F1') or a PDFType0FontObject.",
      );
    }

    this.currentFontKey = fontKey;
    this.currentFontSize = size;

    this.commands.push(`/${fontKey} ${size} Tf`);
    this.updateStreamValue();
    return this;
  }

  drawText(
    text: string,
    options: {
      x: number;
      y: number;
      maxWidth?: number;
      lineHeight?: number;
      color?: Color | string;
      charSpacing?: number;
    },
  ): this {
    if (!this.currentFontKey || !this.currentFontSize) {
      throw new Error("Font must be set using setFont() before drawing text.");
    }

    const pageWidth = this.page.value.MediaBox[2];
    const leftMargin = this.margin.left;
    const rightMargin = this.margin.right;
    const bottomMargin = this.margin.bottom;

    const x_actual = options.x + leftMargin;
    const y_actual = options.y + bottomMargin;

    // ponytail: Default to remaining width inside margins
    const maxW = options.maxWidth ?? pageWidth - leftMargin - rightMargin - options.x;
    const shouldWrap = options.maxWidth !== undefined || leftMargin !== 0 || rightMargin !== 0;

    const coercedColor = options.color ? Color.coerce(options.color) : undefined;
    const charSpacing = options.charSpacing ?? 0;

    if (shouldWrap && maxW > 0) {
      const lineHeight = options.lineHeight || this.currentFontSize * 1.2;
      const lines = this.wrapText(text, maxW, charSpacing);
      let currentY = y_actual;
      for (const line of lines) {
        this.drawSingleLineText(line, x_actual, currentY, coercedColor, charSpacing);
        currentY -= lineHeight;
      }
    } else {
      this.drawSingleLineText(text, x_actual, y_actual, coercedColor, charSpacing);
    }

    this.updateStreamValue();
    return this;
  }

  private drawSingleLineText(
    text: string,
    x: number,
    y: number,
    color?: Color,
    charSpacing?: number,
  ): void {
    let textStr = "";
    if (this.activeFontObject) {
      const { commands } = getPDFTextCommands(
        text,
        this.activeFontObject,
        this.currentFontSize || 12,
        charSpacing,
      );
      textStr = commands;
    } else {
      textStr = `(${escapePDFString(text)}) Tj`;
    }

    this.commands.push("q"); // Push graphics state to localize color and opacity
    if (color) {
      this.applyColorOpacity(color, "fill");
      this.commands.push(color.toPDFFill());
    }
    this.commands.push("BT");
    if (!this.activeFontObject && charSpacing !== undefined && charSpacing !== 0) {
      this.commands.push(`${charSpacing} Tc`);
    }
    this.commands.push(`${x} ${y} Td`);
    this.commands.push(textStr);
    this.commands.push("ET");
    this.commands.push("Q"); // Pop graphics state to restore previous state
  }

  private wrapText(text: string, maxWidth: number, charSpacing: number = 0): string[] {
    if (!text) return [];
    const lines: string[] = [];
    const paragraphs = text.split("\n");

    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i]!;
      if (paragraph === "") {
        if (i === paragraphs.length - 1 && text.endsWith("\n") && paragraphs.length > 1) {
          continue;
        }
        lines.push("");
        continue;
      }
      const words = paragraph.split(" ");
      let currentLine = "";

      for (const word of words) {
        if (this.getTextWidth(word, charSpacing) > maxWidth) {
          // ponytail: If word itself exceeds bounds, split character by character (handles Thai)
          if (currentLine) {
            lines.push(currentLine);
            currentLine = "";
          }
          let tempLine = "";
          for (let i = 0; i < word.length; i++) {
            const char = word[i]!;
            const testLine = tempLine + char;
            if (this.getTextWidth(testLine, charSpacing) > maxWidth) {
              if (tempLine) lines.push(tempLine);
              tempLine = char;
            } else {
              tempLine = testLine;
            }
          }
          currentLine = tempLine;
        } else {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          if (this.getTextWidth(testLine, charSpacing) > maxWidth) {
            lines.push(currentLine);
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }
      }
      if (currentLine) {
        lines.push(currentLine);
      }
    }
    return lines;
  }

  getTextWidth(text: string, charSpacing: number = 0): number {
    if (!this.currentFontSize) {
      throw new Error("Font must be set using setFont() to calculate text width.");
    }
    if (!this.activeFontObject) {
      const fontName = this.currentFontKey || "Helvetica";
      return getStandardFontTextWidth(text, fontName, this.currentFontSize, charSpacing);
    }
    const { width } = getPDFTextCommands(
      text,
      this.activeFontObject,
      this.currentFontSize,
      charSpacing,
    );
    return width;
  }

  drawTextLine(
    text: string,
    x: number,
    y: number,
    color?: Color | string,
    charSpacing?: number,
  ): this {
    const leftMargin = this.margin.left;
    const bottomMargin = this.margin.bottom;
    const x_actual = x + leftMargin;
    const y_actual = y + bottomMargin;

    const coercedColor = color ? Color.coerce(color) : undefined;
    this.drawSingleLineText(text, x_actual, y_actual, coercedColor, charSpacing);
    this.updateStreamValue();
    return this;
  }

  drawRect(
    x: number,
    y: number,
    width: number,
    height: number,
    strokeWidth: number = 1,
    strokeColor: Color | string = "0 G",
    fillColor?: Color | string,
  ): this {
    const x_actual = x + this.margin.left;
    const y_actual = y + this.margin.bottom;

    this.commands.push("q"); // push graphics state
    this.commands.push(`${strokeWidth} w`);

    const strokeColorObj = Color.coerce(strokeColor);
    this.applyColorOpacity(strokeColorObj, "stroke");
    this.commands.push(strokeColorObj.toPDFStroke());

    if (fillColor) {
      const fillColorObj = Color.coerce(fillColor);
      this.applyColorOpacity(fillColorObj, "fill");
      this.commands.push(fillColorObj.toPDFFill());

      this.commands.push(`${x_actual} ${y_actual} ${width} ${height} re`);
      this.commands.push("B"); // fill and stroke
    } else {
      this.commands.push(`${x_actual} ${y_actual} ${width} ${height} re`);
      this.commands.push("S"); // stroke only
    }
    this.commands.push("Q"); // pop graphics state
    this.updateStreamValue();
    return this;
  }

  drawLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    strokeWidth: number = 1,
    strokeColor: Color | string = "0 G",
    dashPattern?: number[],
    dashPhase: number = 0,
  ): this {
    const x1_actual = x1 + this.margin.left;
    const y1_actual = y1 + this.margin.bottom;
    const x2_actual = x2 + this.margin.left;
    const y2_actual = y2 + this.margin.bottom;

    this.commands.push("q");
    this.commands.push(`${strokeWidth} w`);

    const strokeColorObj = Color.coerce(strokeColor);
    this.applyColorOpacity(strokeColorObj, "stroke");
    this.commands.push(strokeColorObj.toPDFStroke());

    if (dashPattern && dashPattern.length > 0) {
      this.commands.push(`[${dashPattern.join(" ")}] ${dashPhase} d`);
    }

    this.commands.push(`${x1_actual} ${y1_actual} m`);
    this.commands.push(`${x2_actual} ${y2_actual} l`);
    this.commands.push("S");
    this.commands.push("Q");
    this.updateStreamValue();
    return this;
  }

  registerXObject(xObject: any): string {
    const resourcesObj = this.getOrCreateResources();
    if (!resourcesObj.value.XObject) {
      resourcesObj.value.XObject = {};
    }
    const xRef = xObject.toRef();
    const existingKey = Object.keys(resourcesObj.value.XObject).find((key) => {
      const ref = resourcesObj.value.XObject[key];
      return ref.id === xRef.id;
    });
    if (existingKey) {
      return existingKey;
    }
    const key = `Im${Object.keys(resourcesObj.value.XObject).length + 1}`;
    resourcesObj.addXObject(key, xObject);
    return key;
  }

  drawImage(imageKey: string, x: number, y: number, width: number, height: number): this {
    const x_actual = x + this.margin.left;
    const y_actual = y + this.margin.bottom;

    this.commands.push("q");
    this.commands.push(
      `${width.toFixed(4)} 0 0 ${height.toFixed(4)} ${x_actual.toFixed(4)} ${y_actual.toFixed(4)} cm`,
    );
    this.commands.push(`/${imageKey} Do`);
    this.commands.push("Q");
    this.updateStreamValue();
    return this;
  }

  writeCommands(cmds: string[]): this {
    this.commands.push(...cmds);
    this.updateStreamValue();
    return this;
  }

  private updateStreamValue(): void {
    this.contentStream.value.value = this.commands.join("\n");
  }
}

export function getPDFTextCommands(
  text: string,
  fontObj: PDFType0FontObject,
  fontSize: number,
  charSpacing: number = 0,
): { commands: string; width: number } {
  const font = fontObj.font;
  const hbFont = fontObj.hbFont;
  const scale = 1000 / font.unitsPerEm;

  const buffer = new hb.Buffer();
  buffer.addText(text);
  buffer.guessSegmentProperties();
  hb.shape(hbFont, buffer);

  const glyphs = buffer.getGlyphInfosAndPositions();

  interface GlyphGroup {
    rise: number;
    tjElements: (string | number)[];
  }

  const groups: GlyphGroup[] = [];
  let currentGroup: GlyphGroup | null = null;
  let totalWidth = 0;

  for (let idx = 0; idx < glyphs.length; idx++) {
    const item = glyphs[idx]!;
    const gid = item.codepoint;
    const xOffset = Math.round(item.xOffset * scale);
    const xAdvance = Math.round(item.xAdvance * scale);

    const glyph = font.glyphs.get(gid);
    const W_i = glyph ? Math.round((glyph.advanceWidth || 0) * scale) : 0;

    const nextItem = idx < glyphs.length - 1 ? glyphs[idx + 1] : null;
    const isClusterEnd = !nextItem || nextItem.xAdvance > 0;
    const applySpacing = charSpacing !== 0 && isClusterEnd;

    totalWidth += (item.xAdvance / font.unitsPerEm) * fontSize + (applySpacing ? charSpacing : 0);

    const rise = (item.yOffset / font.unitsPerEm) * fontSize;
    const riseTolerance = 0.001;

    if (!currentGroup || Math.abs(currentGroup.rise - rise) > riseTolerance) {
      if (currentGroup) {
        groups.push(currentGroup);
      }
      currentGroup = {
        rise: Math.abs(rise) < riseTolerance ? 0 : rise,
        tjElements: [],
      };
    }

    const gidHex = gid.toString(16).padStart(4, "0").toUpperCase();

    const charSpacingInThousandths = applySpacing ? Math.round((charSpacing / fontSize) * 1000) : 0;

    if (xOffset !== 0) {
      currentGroup.tjElements.push(-xOffset);
      const len = currentGroup.tjElements.length;
      if (len > 0 && typeof currentGroup.tjElements[len - 1] === "string") {
        currentGroup.tjElements[len - 1] += gidHex;
      } else {
        currentGroup.tjElements.push(gidHex);
      }

      const correction = W_i + xOffset - xAdvance - charSpacingInThousandths;
      if (correction !== 0) {
        currentGroup.tjElements.push(correction);
      }
    } else {
      const len = currentGroup.tjElements.length;
      if (len > 0 && typeof currentGroup.tjElements[len - 1] === "string") {
        currentGroup.tjElements[len - 1] += gidHex;
      } else {
        currentGroup.tjElements.push(gidHex);
      }

      const correction = W_i - xAdvance - charSpacingInThousandths;
      if (correction !== 0) {
        currentGroup.tjElements.push(correction);
      }
    }
  }

  if (currentGroup) {
    groups.push(currentGroup);
  }

  let pdfStr = "";
  let activeRise = 0;

  for (const g of groups) {
    if (Math.abs(g.rise - activeRise) > 0.001) {
      pdfStr += `${g.rise.toFixed(2)} Ts\n`;
      activeRise = g.rise;
    }

    let tjStr = "[";
    for (const el of g.tjElements) {
      if (typeof el === "string") {
        tjStr += `<${el}> `;
      } else {
        tjStr += `${el} `;
      }
    }
    tjStr = tjStr.trim() + "] TJ";
    pdfStr += tjStr + "\n";
  }

  if (Math.abs(activeRise) > 0.001) {
    pdfStr += "0 Ts\n";
  }

  return {
    commands: pdfStr.trim(),
    width: totalWidth,
  };
}
