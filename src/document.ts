import { PDFPagesObject } from "./object/indirect/pages";
import { PDFCatalogObject } from "./object/indirect/catalog";
import { PDFPageObject } from "./object/indirect/page";
import { PDFPageWriter, getPDFTextCommands } from "./writer";
import { PDFEngine } from "./engine";
import { PDFType0FontObject } from "./object/indirect/fontType0";
import type { Component, LayoutContext } from "./layout";
import { Text, type TextOptions } from "./components/text";
import { Image, type ImageOptions } from "./components/image/index";
import { Table } from "./components/table";
import { Line, type LineOptions } from "./components/line";
import { Svg, type SvgOptions } from "./components/svg";
import { PDFInfoObject } from "./object/indirect/info";
import { PDFEncryptObject } from "./object/indirect/encrypt";
import { getStandardFontTextWidth } from "./standardFonts";

import { Buffer } from "buffer";
import { randomBytes } from "./crypto";
import { computeOValue, computeEncryptionKey, computeUValue } from "./crypto";

export interface PDFEncryptionOptions {
  userPassword?: string;
  ownerPassword?: string;
  permissions?: {
    print?: "none" | "low" | "high";
    modify?: boolean;
    copy?: boolean;
    annot?: boolean;
  };
}

export interface MheePDFOptions {
  pageSize?: [number, number | "auto"];
  rotate?: 0 | 90 | 180 | 270;
  margin?: number | { top?: number; bottom?: number; left?: number; right?: number };
  defaultFont?: string | PDFType0FontObject;
  defaultFontSize?: number;
  defaultCharSpacing?: number;
  defaultLineHeight?: number;
  defaultTablePadding?: number | { top?: number; bottom?: number; left?: number; right?: number };
  fonts?: PDFType0FontObject[];
  maxPageHeight?: number;
  compress?: boolean;
  info?: {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string;
    creator?: string;
    producer?: string;
    creationDate?: Date;
    modDate?: Date;
  };
  encrypt?: PDFEncryptionOptions;
  backgroundImage?: string | Buffer | Uint8Array | ArrayBuffer | SharedArrayBuffer;
}

export class MheePDF<T = any> {
  private pdf = new PDFEngine();
  private pages = this.pdf.addObject(new PDFPagesObject({ pages: [] }));
  private catalog = this.pdf.addObject(new PDFCatalogObject({ Base: this.pages }));
  public options: MheePDFOptions;
  private components: Component[] = [];

  public static readonly A4: [number, number] = [595.27, 841.89];

  constructor(options?: MheePDFOptions) {
    this.options = options || {};

    // Configure stream compression on this engine instance (not global)
    this.pdf.compress = this.options.compress !== false;

    if (this.options.defaultFont && this.options.defaultFont instanceof PDFType0FontObject) {
      this.pdf.addObject(this.options.defaultFont);
    }
    if (this.options.fonts) {
      for (const font of this.options.fonts) {
        this.pdf.addObject(font);
      }
    }

    // Configure document metadata Info object
    if (this.options.info) {
      const infoObj = new PDFInfoObject({
        info: {
          Title: this.options.info.title,
          Author: this.options.info.author,
          Subject: this.options.info.subject,
          Keywords: this.options.info.keywords,
          Creator: this.options.info.creator,
          Producer: this.options.info.producer,
          CreationDate: this.options.info.creationDate,
          ModDate: this.options.info.modDate,
        },
      });
      this.pdf.infoObject = this.pdf.addObject(infoObj);
    }

    // Configure document encryption/security
    if (this.options.encrypt) {
      const documentId = randomBytes(16);
      this.pdf.documentId = documentId;

      let p = -4; // All permissions allowed by default
      if (this.options.encrypt.permissions) {
        const perm = this.options.encrypt.permissions;
        let val = 0xfffffffc;
        if (perm.print === "none") {
          val &= ~(1 << 2);
        }
        if (perm.modify === false) {
          val &= ~(1 << 3);
        }
        if (perm.copy === false) {
          val &= ~(1 << 4);
        }
        if (perm.annot === false) {
          val &= ~(1 << 5);
        }
        p = val;
      }

      const userPwd = this.options.encrypt.userPassword || "";
      const ownerPwd = this.options.encrypt.ownerPassword || "";
      const oValue = computeOValue(userPwd, ownerPwd);
      const encKey = computeEncryptionKey(userPwd, oValue, p, documentId);
      const uValue = computeUValue(encKey, documentId);

      this.pdf.encryptionKey = encKey;

      const encryptObj = new PDFEncryptObject({
        O: oValue,
        U: uValue,
        P: p,
      });
      this.pdf.encryptObject = this.pdf.addObject(encryptObj);
    }
  }

  addPage(
    size: [number, number],
    build: (page: PDFPageWriter) => void,
    options?: {
      margin?: number | { top?: number; bottom?: number; left?: number; right?: number };
      rotate?: 0 | 90 | 180 | 270;
    },
  ): this {
    const pageObj = this.pdf.addObject(
      new PDFPageObject({
        pageSize: size,
        Parent: this.pages,
        rotate: options?.rotate,
      }),
    );
    this.pages.addPage(pageObj);
    const writer = new PDFPageWriter(this.pdf, pageObj);
    if (options?.margin !== undefined) {
      if (typeof options.margin === "number") {
        writer.margin = {
          top: options.margin,
          bottom: options.margin,
          left: options.margin,
          right: options.margin,
        };
      } else {
        writer.margin = {
          top: options.margin.top ?? 0,
          bottom: options.margin.bottom ?? 0,
          left: options.margin.left ?? 0,
          right: options.margin.right ?? 0,
        };
      }
    }
    build(writer);
    return this;
  }

  addObject<T>(obj: T): T {
    return this.pdf.addObject(obj as any);
  }

  add(component: Component): this {
    this.components.push(component);
    return this;
  }
  addText(text: string, options?: TextOptions): this {
    this.components.push(new Text(text, options));
    return this;
  }
  addImage(source: string | Buffer, options?: ImageOptions): this {
    this.components.push(new Image(source, options));
    return this;
  }
  addLine(options?: LineOptions): this {
    this.components.push(new Line(options));
    return this;
  }
  addSvg(source: string | Buffer, options?: SvgOptions): this {
    this.components.push(new Svg(source, options));
    return this;
  }
  addTemplateLoop(arrayPath: string, templateComponents: Component[]): this {
    this.components.push(new TemplateLoopComponent(arrayPath, templateComponents));
    return this;
  }

  generate(data?: T | T[]): Buffer {
    if (data !== undefined) {
      if (Array.isArray(data)) {
        for (const item of data) {
          const compiled = this.getCompiledComponents(item);
          if (compiled.length > 0) {
            const bgImageSource = typeof this.options.backgroundImage === "string"
              ? interpolate(this.options.backgroundImage, data, item)
              : this.options.backgroundImage;
            this.layoutComponents(compiled, bgImageSource);
          }
        }
      } else {
        const compiled = this.getCompiledComponents(data as T);
        if (compiled.length > 0) {
          const bgImageSource = typeof this.options.backgroundImage === "string"
            ? interpolate(this.options.backgroundImage, data)
            : this.options.backgroundImage;
          this.layoutComponents(compiled, bgImageSource);
        }
      }
    } else {
      if (this.components.length > 0) {
        this.layoutComponents(this.components, this.options.backgroundImage);
      }
    }
    return this.pdf.generatePDFcontent();
  }

  generatePDFcontent(data?: T | T[]): Buffer {
    return this.generate(data);
  }

  private getCompiledComponents(globalData: T): Component[] {
    const list: Component[] = [];
    for (const comp of this.components) {
      if (comp instanceof TemplateLoopComponent) {
        const parts = comp.arrayPath.split(".");
        let arr = globalData;
        for (const part of parts) {
          if (arr === null || arr === undefined) break;
          arr = arr[part];
        }
        if (Array.isArray(arr)) {
          for (const item of arr) {
            for (const child of comp.templateComponents) {
              list.push(compileComponent(child, globalData, item));
            }
          }
        }
      } else {
        list.push(compileComponent(comp, globalData));
      }
    }
    return list;
  }

  private layoutComponents(
    components: Component[],
    bgImageSource?: string | Buffer | Uint8Array | ArrayBuffer | SharedArrayBuffer,
  ): void {
    const pageSize = this.options.pageSize || MheePDF.A4;
    const margin = this.options.margin ?? 50;
    const resolvedMargin =
      typeof margin === "number"
        ? {
            top: margin,
            bottom: margin,
            left: margin,
            right: margin,
          }
        : {
            top: margin.top ?? 50,
            bottom: margin.bottom ?? 50,
            left: margin.left ?? 50,
            right: margin.right ?? 50,
          };

    const contentWidth = pageSize[0] - resolvedMargin.left - resolvedMargin.right;
    const isAutoHeight = pageSize[1] === "auto";
    const maxPageHeight = this.options.maxPageHeight ?? 14400;
    const maxContentHeight = maxPageHeight - resolvedMargin.top - resolvedMargin.bottom;
    const contentHeight = isAutoHeight
      ? maxContentHeight
      : (pageSize[1] as number) - resolvedMargin.top - resolvedMargin.bottom;

    const context: LayoutContext = {
      defaultFont: this.options.defaultFont,
      defaultFontSize: this.options.defaultFontSize ?? 12,
      defaultCharSpacing: this.options.defaultCharSpacing,
      defaultLineHeight: this.options.defaultLineHeight,
      defaultTablePadding: this.options.defaultTablePadding,
      getTextWidth: (text, font, size, charSpacing = 0) => {
        const activeFont = font || this.options.defaultFont;
        const activeSize = size || this.options.defaultFontSize || 12;
        if (activeFont instanceof PDFType0FontObject) {
          return getPDFTextCommands(text, activeFont, activeSize, charSpacing).width;
        }
        const fontName = typeof activeFont === "string" ? activeFont : "Helvetica";
        return getStandardFontTextWidth(text, fontName, activeSize, charSpacing);
      },
    };

    if (isAutoHeight) {
      // Phase 1: Partition & Compute Heights
      const queue = [...components];

      interface PageLayoutInfo {
        pageHeight: number;
        components: { component: Component; height: number }[];
      }
      const pagesLayoutInfo: PageLayoutInfo[] = [];

      let currentPageComponents: PageLayoutInfo["components"] = [];
      let currentPageContentHeight = 0;

      // Single dummy writer for dry runs to check splits
      const dummyEngine = new PDFEngine();
      const dummyPages = dummyEngine.addObject(new PDFPagesObject({ pages: [] }));
      const dummyPage = dummyEngine.addObject(
        new PDFPageObject({
          pageSize: [pageSize[0], maxPageHeight],
          Parent: dummyPages,
        }),
      );
      const dummyWriter = new PDFPageWriter(dummyEngine, dummyPage);
      dummyWriter.margin = resolvedMargin;

      while (queue.length > 0) {
        const component = queue.shift()!;
        const measured = component.measure(contentWidth, context);
        const availableHeight = maxContentHeight - currentPageContentHeight;

        if (measured.height <= availableHeight) {
          // Fits completely on the current page
          currentPageComponents.push({ component, height: measured.height });
          currentPageContentHeight += measured.height;
        } else {
          // Does not fit completely.
          if (currentPageContentHeight === 0) {
            // Empty page. Must split or draw as much as possible to avoid infinite loops.
            const remainder = component.draw(
              dummyWriter,
              0,
              maxContentHeight,
              contentWidth,
              maxContentHeight,
              context,
            );

            if (remainder === null) {
              currentPageComponents.push({ component, height: measured.height });
              currentPageContentHeight += measured.height;
            } else if (remainder === component) {
              // Unbreakable but doesn't fit on an empty page. Force draw it.
              currentPageComponents.push({ component, height: measured.height });
              currentPageContentHeight += measured.height;
            } else {
              // Split succeeded. Calculate height of drawn part
              let drawnHeight = measured.height - remainder.measure(contentWidth, context).height;
              if (component instanceof Table && component.repeatHeader) {
                drawnHeight += component.getHeaderHeight(contentWidth, context);
              }
              drawnHeight = Math.max(0, drawnHeight);

              currentPageComponents.push({ component, height: drawnHeight });
              currentPageContentHeight += drawnHeight;
              queue.unshift(remainder);

              pagesLayoutInfo.push({
                pageHeight: currentPageContentHeight + resolvedMargin.top + resolvedMargin.bottom,
                components: currentPageComponents,
              });
              currentPageComponents = [];
              currentPageContentHeight = 0;
            }
          } else {
            // Page is not empty. Let's try drawing to split it.
            const remainder = component.draw(
              dummyWriter,
              0,
              availableHeight,
              contentWidth,
              availableHeight,
              context,
            );

            if (remainder === component) {
              // Nothing was drawn. Push component back to queue, finish current page, start new page.
              queue.unshift(component);
              pagesLayoutInfo.push({
                pageHeight: currentPageContentHeight + resolvedMargin.top + resolvedMargin.bottom,
                components: currentPageComponents,
              });
              currentPageComponents = [];
              currentPageContentHeight = 0;
            } else {
              // Something was drawn.
              let drawnHeight = 0;
              if (remainder === null) {
                drawnHeight = measured.height;
              } else {
                drawnHeight = measured.height - remainder.measure(contentWidth, context).height;
                if (component instanceof Table && component.repeatHeader) {
                  drawnHeight += component.getHeaderHeight(contentWidth, context);
                }
                drawnHeight = Math.max(0, drawnHeight);
                queue.unshift(remainder);
              }

              currentPageComponents.push({ component, height: drawnHeight });
              currentPageContentHeight += drawnHeight;

              pagesLayoutInfo.push({
                pageHeight: currentPageContentHeight + resolvedMargin.top + resolvedMargin.bottom,
                components: currentPageComponents,
              });
              currentPageComponents = [];
              currentPageContentHeight = 0;
            }
          }
        }
      }

      if (currentPageComponents.length > 0) {
        pagesLayoutInfo.push({
          pageHeight: currentPageContentHeight + resolvedMargin.top + resolvedMargin.bottom,
          components: currentPageComponents,
        });
      }

      // Phase 2: Actual Page Drawing
      const bgImage = bgImageSource ? new Image(bgImageSource) : null;
      for (const pageInfo of pagesLayoutInfo) {
        let currentPageWriter: PDFPageWriter | null = null;
        this.addPage(
          [pageSize[0], pageInfo.pageHeight],
          (writer) => {
            currentPageWriter = writer;
          },
          { margin: resolvedMargin, rotate: this.options.rotate },
        );

        if (bgImage) {
          bgImage.width = pageSize[0];
          bgImage.height = pageInfo.pageHeight;
          const savedMargin = { ...currentPageWriter!.margin };
          currentPageWriter!.margin = { top: 0, bottom: 0, left: 0, right: 0 };
          bgImage.draw(currentPageWriter!, 0, pageInfo.pageHeight, pageSize[0], pageInfo.pageHeight, context);
          currentPageWriter!.margin = savedMargin;
        }

        let currentY = pageInfo.pageHeight - resolvedMargin.top - resolvedMargin.bottom;
        for (const compInfo of pageInfo.components) {
          compInfo.component.draw(currentPageWriter!, 0, currentY, contentWidth, currentY, context);
          currentY -= compInfo.height;
        }
      }
    } else {
      // Existing fixed height layout logic
      const fixedHeight = pageSize[1] as number;
      let currentPageWriter: PDFPageWriter | null = null;
      let currentY = contentHeight;

      const bgImage = bgImageSource ? new Image(bgImageSource) : null;
      const createNewPage = () => {
        this.addPage(
          [pageSize[0], fixedHeight],
          (writer) => {
            currentPageWriter = writer;
          },
          { margin: resolvedMargin, rotate: this.options.rotate },
        );

        if (bgImage) {
          bgImage.width = pageSize[0];
          bgImage.height = fixedHeight;
          const savedMargin = { ...currentPageWriter!.margin };
          currentPageWriter!.margin = { top: 0, bottom: 0, left: 0, right: 0 };
          bgImage.draw(currentPageWriter!, 0, fixedHeight, pageSize[0], fixedHeight, context);
          currentPageWriter!.margin = savedMargin;
        }

        currentY = contentHeight;
      };

      createNewPage();

      const queue = [...components];

      while (queue.length > 0) {
        const component = queue.shift()!;
        const measured = component.measure(contentWidth, context);
        const availableHeight = currentY;

        if (measured.height <= availableHeight) {
          const remainder = component.draw(
            currentPageWriter!,
            0,
            currentY,
            contentWidth,
            availableHeight,
            context,
          );
          if (remainder === null) {
            currentY -= measured.height;
          } else {
            queue.unshift(remainder);
            createNewPage();
          }
        } else {
          const remainder = component.draw(
            currentPageWriter!,
            0,
            currentY,
            contentWidth,
            availableHeight,
            context,
          );
          if (remainder === null) {
            currentY = 0;
          } else if (remainder === component) {
            if (currentY === contentHeight) {
              // Force drawing to prevent infinite loops if an element exceeds a full page
              component.draw(
                currentPageWriter!,
                0,
                currentY,
                contentWidth,
                Math.max(measured.height, availableHeight),
                context,
              );
              currentY = 0;
            } else {
              queue.unshift(component);
              createNewPage();
            }
          } else {
            queue.unshift(remainder);
            createNewPage();
          }
        }
      }
    }
  }
}

export class TemplateLoopComponent implements Component {
  constructor(
    public arrayPath: string,
    public templateComponents: Component[],
  ) {}

  measure(width: number, context: LayoutContext): { width: number; height: number } {
    return { width: 0, height: 0 };
  }

  draw(
    writer: PDFPageWriter,
    x: number,
    y: number,
    width: number,
    availableHeight: number,
    context: LayoutContext,
  ): Component | null {
    return null;
  }
}

export function interpolate(str: string, data: any, itemData?: any): string {
  if (typeof str !== "string") return str;
  return str.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const trimmedPath = path.trim();
    // 1. If path starts with "item.", look up in itemData
    if (itemData && (trimmedPath === "item" || trimmedPath.startsWith("item."))) {
      if (trimmedPath === "item") return itemData;
      const parts = trimmedPath.substring(5).split(".");
      let val = itemData;
      for (const part of parts) {
        if (val === null || val === undefined) break;
        val = val[part];
      }
      if (val !== undefined && val !== null) return String(val);
    }
    // 2. Otherwise, look up in itemData (without prefix)
    if (itemData) {
      const parts = trimmedPath.split(".");
      let val = itemData;
      for (const part of parts) {
        if (val === null || val === undefined) break;
        val = val[part];
      }
      if (val !== undefined && val !== null) return String(val);
    }
    // 3. Fallback to global data
    const parts = trimmedPath.split(".");
    let val = data;
    for (const part of parts) {
      if (val === null || val === undefined) break;
      val = val[part];
    }
    return val !== undefined && val !== null ? String(val) : "";
  });
}

import { TableCell, type CellContent } from "./components/table";

export function compileComponent(component: Component, globalData: any, itemData?: any): Component {
  if (component instanceof Text) {
    return new Text(interpolate(component.text, globalData, itemData), {
      font: component.font,
      fontSize: component.fontSize,
      lineHeight: component.lineHeight,
      color: typeof component.color === "string" ? interpolate(component.color, globalData, itemData) : component.color,
      charSpacing: component.charSpacing,
      align: component.align,
    });
  }
  if (component instanceof Image) {
    const resolvedSource = typeof component.source === "string"
      ? interpolate(component.source, globalData, itemData)
      : component.source;
    return new Image(resolvedSource, {
      width: component.width,
      height: component.height,
      align: component.align,
    });
  }
  if (component instanceof Line) {
    return new Line({
      color: typeof component.color === "string" ? interpolate(component.color, globalData, itemData) : component.color,
      thickness: component.thickness,
      dash: component.dash,
      dashPhase: component.dashPhase,
      height: component.height,
    });
  }
  if (component instanceof Table) {
    const compiledTable = new Table({
      columns: component.columns,
      borderWidth: component.borderWidth,
      borderColor: component.borderColor,
      backgroundColor: component.backgroundColor,
      headerBackgroundColor: component.headerBackgroundColor,
      alternateRowBackgroundColor: component.alternateRowBackgroundColor,
      padding: component.padding,
      repeatHeader: component.repeatHeader,
      aligns: component.aligns,
      valign: component.valign,
      valigns: component.valigns,
    });

    // Copy and compile headers
    if (component.headers && component.headers.length > 0) {
      compiledTable.headers = component.headers.map(cell => {
        return new TableCell(compileComponent(cell.content, globalData, itemData), {
          backgroundColor: cell.backgroundColor,
          valign: cell.valign,
        });
      });
    }

    // Compile rows: first, copy and compile the existing static rows
    for (const row of component.rows) {
      compiledTable.rows.push(row.map(cell => {
        return new TableCell(compileComponent(cell.content, globalData, itemData), {
          backgroundColor: cell.backgroundColor,
          valign: cell.valign,
        });
      }));
    }

    // Now, expand the template rows
    const templateRows = (component as any).templateRows || [];
    for (const tempRow of templateRows) {
      const parts = tempRow.arrayPath.split(".");
      let arr = globalData;
      for (const part of parts) {
        if (arr === null || arr === undefined) break;
        arr = arr[part];
      }
      if (Array.isArray(arr)) {
        for (const item of arr) {
          const compiledRow = tempRow.cells.map((cell: any) => {
            if (cell instanceof TableCell) {
              return new TableCell(compileComponent(cell.content, globalData, item), {
                backgroundColor: cell.backgroundColor,
                valign: cell.valign,
              });
            }
            if (cell && typeof cell === "object" && "content" in cell) {
              const contentComp = cell.content instanceof TableCell
                ? cell.content.content
                : (typeof cell.content === "string" || typeof cell.content === "number"
                    ? new Text(cell.content.toString())
                    : cell.content);
              return new TableCell(compileComponent(contentComp, globalData, item), {
                backgroundColor: cell.backgroundColor,
                valign: cell.valign,
              });
            }
            const comp = typeof cell === "string" || typeof cell === "number"
              ? new Text(cell.toString())
              : cell;
            return new TableCell(compileComponent(comp, globalData, item));
          });
          compiledTable.rows.push(compiledRow);
        }
      }
    }

    return compiledTable;
  }

  return component;
}

