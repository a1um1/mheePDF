import type { Component, LayoutContext } from "../layout";
import type { PDFPageWriter } from "../writer";
import { Text } from "./text";
import { Color } from "../color";

export type CellContent =
  | Component
  | string
  | number
  | TableCell
  | { content: Component | string | number | TableCell; backgroundColor?: string | Color };

export class TableCell implements Component {
  public content: Component;
  public backgroundColor?: string | Color;

  constructor(content: Component, options?: { backgroundColor?: string | Color }) {
    this.content = content;
    this.backgroundColor = options?.backgroundColor;
  }

  measure(width: number, context: LayoutContext): { width: number; height: number } {
    return this.content.measure(width, context);
  }

  draw(
    writer: PDFPageWriter,
    x: number,
    y: number,
    width: number,
    availableHeight: number,
    context: LayoutContext,
  ): Component | null {
    const remainder = this.content.draw(writer, x, y, width, availableHeight, context);
    if (remainder) {
      return new TableCell(remainder, { backgroundColor: this.backgroundColor });
    }
    return null;
  }
}

export class Table implements Component {
  public columns: (number | string)[];
  public rows: TableCell[][] = [];
  public headers: TableCell[] = [];
  public borderWidth: number;
  public borderColor: string | Color;
  public backgroundColor?: string | Color;
  public headerBackgroundColor?: string | Color;
  public alternateRowBackgroundColor?: string | Color;
  public padding?: number | { top?: number; bottom?: number; left?: number; right?: number };
  public repeatHeader: boolean;
  public aligns?: ("left" | "center" | "right")[];

  constructor(options: {
    columns: (number | string)[];
    borderWidth?: number;
    borderColor?: string | Color;
    backgroundColor?: string | Color;
    headerBackgroundColor?: string | Color;
    alternateRowBackgroundColor?: string | Color;
    padding?: number | { top?: number; bottom?: number; left?: number; right?: number };
    repeatHeader?: boolean;
    aligns?: ("left" | "center" | "right")[];
  }) {
    this.columns = options.columns;
    this.borderWidth = options.borderWidth ?? 1;
    this.borderColor = options.borderColor ?? Color.rgb(0, 0, 0, 0); // Default to black stroke
    this.backgroundColor = options.backgroundColor;
    this.headerBackgroundColor = options.headerBackgroundColor;
    this.alternateRowBackgroundColor = options.alternateRowBackgroundColor;
    this.repeatHeader = options.repeatHeader ?? true;
    this.padding = options.padding;
    this.aligns = options.aligns;
  }

  private getPadding(context: LayoutContext): {
    top: number;
    bottom: number;
    left: number;
    right: number;
  } {
    const p =
      this.padding !== undefined
        ? this.padding
        : context.defaultTablePadding !== undefined
          ? context.defaultTablePadding
          : 4;
    if (typeof p === "number") {
      return { top: p, bottom: p, left: p, right: p };
    }
    return {
      top: p.top ?? 4,
      bottom: p.bottom ?? 4,
      left: p.left ?? 4,
      right: p.right ?? 4,
    };
  }

  addHeader(row: CellContent[]): this {
    this.headers = row.map((cell, colIdx) => this.getCellComponent(cell, colIdx));
    return this;
  }

  addRow(row: CellContent[]): this {
    this.rows.push(row.map((cell, colIdx) => this.getCellComponent(cell, colIdx)));
    return this;
  }

  private getRowHeight(
    row: TableCell[],
    colWidths: number[],
    padding: any,
    cellContext: any,
  ): number {
    let maxCellHeight = 0;
    for (let i = 0; i < row.length; i++) {
      const cell = row[i]!;
      const cellWidth = colWidths[i]! - padding.left - padding.right;
      const measured = cell.measure(Math.max(1, cellWidth), cellContext);
      maxCellHeight = Math.max(maxCellHeight, measured.height);
    }
    return maxCellHeight + padding.top + padding.bottom;
  }

  public getHeaderHeight(width: number, context: LayoutContext): number {
    if (this.headers.length === 0) return 0;
    const colWidths = this.resolveColumnWidths(width);
    const padding = this.getPadding(context);
    const cellContext = { ...context, snug: true };
    return this.getRowHeight(this.headers, colWidths, padding, cellContext);
  }

  measure(width: number, context: LayoutContext): { width: number; height: number } {
    const colWidths = this.resolveColumnWidths(width);
    let totalHeight = 0;

    const padding = this.getPadding(context);
    const cellContext = { ...context, snug: true };

    if (this.headers.length > 0) {
      totalHeight += this.getHeaderHeight(width, context);
    }

    for (const row of this.rows) {
      totalHeight += this.getRowHeight(row, colWidths, padding, cellContext);
    }

    return {
      width,
      height: totalHeight,
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
    const colWidths = this.resolveColumnWidths(width);

    const headerRow = this.headers.length > 0 ? this.headers : null;
    const rows = this.rows;
    const padding = this.getPadding(context);
    const cellContext = { ...context, snug: true };

    const headerHeight = this.getHeaderHeight(width, context);

    // Check if the header itself fits. If not, draw nothing on this page.
    if (headerRow && headerHeight > availableHeight) {
      return this;
    }

    let remainingHeight = availableHeight;
    if (headerRow) {
      remainingHeight -= headerHeight;
    }

    const rowsToDraw: TableCell[][] = [];
    const rowHeights: number[] = [];
    let drawnRowsCount = 0;

    for (let r = 0; r < rows.length; r++) {
      const row = rows[r]!;
      const rowHeight = this.getRowHeight(row, colWidths, padding, cellContext);

      if (rowHeight <= remainingHeight) {
        rowsToDraw.push(row);
        rowHeights.push(rowHeight);
        remainingHeight -= rowHeight;
        drawnRowsCount++;
      } else {
        break;
      }
    }

    // If there were rows to draw, but not even one row could fit (along with the header),
    // and we have remaining room on the page (but not enough for this row),
    // we return `this` to push the entire table to a fresh page.
    if (rows.length > 0 && drawnRowsCount === 0) {
      return this;
    }

    // Now, render the elements we collected
    let drawY = y;

    const drawRow = (row: TableCell[], height: number, rowIndex?: number, isHeader?: boolean) => {
      let cellX = x;
      for (let i = 0; i < row.length; i++) {
        const cell = row[i]!;
        const cellWidth = colWidths[i]! - padding.left - padding.right;
        const cellHeight = height - padding.top - padding.bottom;

        // Resolve background color
        let fillColor: string | Color | undefined = cell.backgroundColor;
        if (!fillColor) {
          if (isHeader) {
            fillColor = this.headerBackgroundColor;
          } else if (
            rowIndex !== undefined &&
            rowIndex % 2 === 1 &&
            this.alternateRowBackgroundColor
          ) {
            fillColor = this.alternateRowBackgroundColor;
          } else {
            fillColor = this.backgroundColor;
          }
        }

        // Draw cell background and borders
        writer.drawRect(
          cellX,
          drawY - height,
          colWidths[i]!,
          height,
          this.borderWidth,
          this.borderColor,
          fillColor,
        );

        // Draw cell contents inside
        cell.draw(
          writer,
          cellX + padding.left,
          drawY - padding.top,
          Math.max(1, cellWidth),
          Math.max(1, cellHeight),
          cellContext,
        );

        cellX += colWidths[i]!;
      }
      drawY -= height;
    };

    // Draw header row
    if (headerRow) {
      drawRow(headerRow, headerHeight, undefined, true);
    }

    // Draw row data
    for (let r = 0; r < rowsToDraw.length; r++) {
      drawRow(rowsToDraw[r]!, rowHeights[r]!, r, false);
    }

    // If there are rows left, return a remainder Table
    if (drawnRowsCount < this.rows.length) {
      const remainingTable = new Table({
        columns: this.columns,
        borderWidth: this.borderWidth,
        borderColor: this.borderColor,
        backgroundColor: this.backgroundColor,
        headerBackgroundColor: this.headerBackgroundColor,
        alternateRowBackgroundColor: this.alternateRowBackgroundColor,
        padding: this.padding,
        repeatHeader: this.repeatHeader,
        aligns: this.aligns,
      });

      if (this.repeatHeader) {
        remainingTable.headers = this.headers;
      }
      remainingTable.rows = this.rows.slice(drawnRowsCount);
      return remainingTable;
    }

    return null;
  }

  private resolveColumnWidths(totalWidth: number): number[] {
    const widths: number[] = new Array<number>(this.columns.length).fill(0);
    let absoluteSum = 0;
    let starShares = 0;

    for (let i = 0; i < this.columns.length; i++) {
      const col = this.columns[i];
      if (typeof col === "number") {
        widths[i] = col;
        absoluteSum += col;
      } else if (typeof col === "string") {
        if (col === "*") {
          starShares += 1;
        } else if (col.endsWith("*")) {
          const val = parseFloat(col.slice(0, -1));
          starShares += isNaN(val) ? 1 : val;
        } else {
          const val = parseFloat(col);
          widths[i] = isNaN(val) ? 0 : val;
          absoluteSum += widths[i];
        }
      }
    }

    const remainingWidth = Math.max(0, totalWidth - absoluteSum);
    if (starShares > 0 && remainingWidth > 0) {
      const shareValue = remainingWidth / starShares;
      for (let i = 0; i < this.columns.length; i++) {
        const col = this.columns[i];
        if (typeof col === "string" && (col === "*" || col.endsWith("*"))) {
          const val = col === "*" ? 1 : parseFloat(col.slice(0, -1));
          widths[i] = (isNaN(val) ? 1 : val) * shareValue;
        }
      }
    }

    return widths;
  }

  private getCellComponent(cell: CellContent, colIdx: number): TableCell {
    if (cell instanceof TableCell) {
      return cell;
    }

    if (cell && typeof cell === "object" && "content" in cell) {
      const innerComp = this.toComponent(cell.content, colIdx);
      return new TableCell(innerComp, { backgroundColor: cell.backgroundColor });
    }

    return new TableCell(this.toComponent(cell, colIdx));
  }

  private toComponent(val: any, colIdx: number): Component {
    if (val instanceof TableCell) {
      return val.content;
    }
    if (typeof val === "string" || typeof val === "number") {
      const align = this.aligns?.[colIdx] || "left";
      return new Text(val.toString(), { align });
    }
    if (val instanceof Text && val.align === undefined) {
      val.align = this.aligns?.[colIdx];
    }
    return val;
  }
}
