import type { Component, LayoutContext } from "../layout";
import type { PDFPageWriter } from "../writer";
import { Color } from "../utils/color";
import { escapePDFString } from "../object/serialize";
import { getPDFTextCommands } from "../writer";
import { Buffer } from "buffer";
import * as fs from "fs";

export interface SvgOptions {
  width?: number;
  height?: number;
  align?: "left" | "center" | "right";
}

interface SVGNode {
  name: string;
  attributes: Record<string, string>;
  children: SVGNode[];
  content?: string;
}

interface SVGStyle {
  fill?: string;
  stroke?: string;
  strokeWidth?: string;
  fontFamily?: string;
  fontSize?: string;
  opacity?: string;
  fillOpacity?: string;
  strokeOpacity?: string;
}

// 1. Custom XML Parser
function parseXML(xmlString: string): SVGNode | null {
  // Strip XML comments, DOCTYPE and processing instructions
  let cleaned = xmlString.replace(/<!--[\s\S]*?-->/g, "");
  cleaned = cleaned.replace(/<![\s\S]*?>/g, "");
  cleaned = cleaned.replace(/<\?[\s\S]*?\?>/g, "");

  let index = 0;

  function skipWhitespace() {
    while (index < cleaned.length && /\s/.test(cleaned[index])) {
      index++;
    }
  }

  function parseAttributes(attrString: string): Record<string, string> {
    const attrs: Record<string, string> = {};
    const regex = /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
    let match;
    while ((match = regex.exec(attrString)) !== null) {
      const name = match[1]!;
      const value = match[2] !== undefined ? match[2] : match[3]!;
      attrs[name] = value;
    }
    return attrs;
  }

  function parseNode(): SVGNode | null {
    skipWhitespace();
    if (index >= cleaned.length) return null;

    if (cleaned[index] !== "<") {
      // Text node
      let nextPos = cleaned.indexOf("<", index);
      if (nextPos === -1) nextPos = cleaned.length;
      const text = cleaned.slice(index, nextPos).trim();
      index = nextPos;
      if (text) {
        return { name: "#text", attributes: {}, children: [], content: text };
      }
      return null;
    }

    // It's a tag
    index++; // skip '<'
    if (cleaned[index] === "/") {
      // Closing tag at top level? Should not happen if well-formed, just skip
      const nextPos = cleaned.indexOf(">", index);
      index = nextPos !== -1 ? nextPos + 1 : cleaned.length;
      return null;
    }

    let endTagPos = cleaned.indexOf(">", index);
    if (endTagPos === -1) return null;

    let tagContent = cleaned.slice(index, endTagPos);
    index = endTagPos + 1;

    const isSelfClosing = tagContent.endsWith("/");
    if (isSelfClosing) {
      tagContent = tagContent.slice(0, -1);
    }

    const tagParts = tagContent.trim().match(/^([^\s]+)([\s\S]*)$/);
    if (!tagParts) return null;

    const name = tagParts[1]!;
    const attributes = parseAttributes(tagParts[2] || "");
    const children: SVGNode[] = [];

    if (!isSelfClosing) {
      while (index < cleaned.length) {
        skipWhitespace();
        if (cleaned.startsWith(`</${name}`, index)) {
          // Closing tag
          const closeEnd = cleaned.indexOf(">", index);
          index = closeEnd !== -1 ? closeEnd + 1 : cleaned.length;
          break;
        }
        const child = parseNode();
        if (child) {
          children.push(child);
        }
      }
    }

    return { name, attributes, children };
  }

  const firstTag = cleaned.indexOf("<");
  if (firstTag !== -1) {
    index = firstTag;
    return parseNode();
  }

  return null;
}

// 2. Transform Parsing and Matrix Operations
function multiplyMatrices(m1: number[], m2: number[]): number[] {
  const [a1, b1, c1, d1, e1, f1] = m1;
  const [a2, b2, c2, d2, e2, f2] = m2;
  return [
    a1 * a2 + c1 * b2, // a
    b1 * a2 + d1 * b2, // b
    a1 * c2 + c1 * d2, // c
    b1 * c2 + d1 * d2, // d
    a1 * e2 + c1 * f2 + e1, // e
    b1 * e2 + d1 * f2 + f1, // f
  ];
}

function parseTransform(transformStr: string): number[] {
  let finalMatrix = [1, 0, 0, 1, 0, 0];
  const regex = /(\w+)\s*\(([^)]*)\)/g;
  let match;
  while ((match = regex.exec(transformStr)) !== null) {
    const type = match[1];
    const args = match[2]!
      .split(/[\s,]+/)
      .map(parseFloat)
      .filter((n) => !isNaN(n));
    let m = [1, 0, 0, 1, 0, 0];

    if (type === "translate") {
      const tx = args[0] || 0;
      const ty = args[1] || 0;
      m = [1, 0, 0, 1, tx, ty];
    } else if (type === "scale") {
      const sx = args[0] || 1;
      const sy = args[1] !== undefined ? args[1] : sx;
      m = [sx, 0, 0, sy, 0, 0];
    } else if (type === "rotate") {
      const angle = args[0] || 0;
      const rad = (angle * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      if (args.length >= 3) {
        const cx = args[1]!;
        const cy = args[2]!;
        m = [cos, sin, -sin, cos, -cx * cos + cy * sin + cx, -cx * sin - cy * cos + cy];
      } else {
        m = [cos, sin, -sin, cos, 0, 0];
      }
    } else if (type === "matrix") {
      if (args.length === 6) {
        m = args;
      }
    }
    finalMatrix = multiplyMatrices(finalMatrix, m);
  }
  return finalMatrix;
}

// 3. Style Attribute Parser
function parseStyleAttribute(styleStr: string): Record<string, string> {
  const styles: Record<string, string> = {};
  if (!styleStr) return styles;
  const parts = styleStr.split(";");
  for (const part of parts) {
    const colonIndex = part.indexOf(":");
    if (colonIndex !== -1) {
      const key = part.substring(0, colonIndex).trim();
      const val = part.substring(colonIndex + 1).trim();
      styles[key] = val;
    }
  }
  return styles;
}

// 4. Path Tokenizer and Command Generator
function tokenizePathData(d: string): (string | number)[] {
  const result: (string | number)[] = [];
  const regex = /([a-df-zA-Z])|(-?\d*\.?\d+(?:[eE][-+]?\d+)?)/g;
  let match;
  while ((match = regex.exec(d)) !== null) {
    if (match[1] !== undefined) {
      result.push(match[1]);
    } else if (match[2] !== undefined) {
      result.push(parseFloat(match[2]));
    }
  }
  return result;
}

function svgPathToPDF(d: string): string {
  const tokens = tokenizePathData(d);
  let i = 0;
  let currX = 0;
  let currY = 0;
  let startX = 0;
  let startY = 0;
  let lastControlX = 0;
  let lastControlY = 0;
  let lastCommand = "";
  const pdfCommands: string[] = [];

  while (i < tokens.length) {
    let token = tokens[i];
    let cmd = "";
    if (typeof token === "string") {
      cmd = token;
      i++;
    } else {
      if (lastCommand === "M" || lastCommand === "m") {
        cmd = lastCommand === "M" ? "L" : "l";
      } else {
        cmd = lastCommand;
      }
    }

    if (!cmd) break;

    const readNum = () => {
      if (i >= tokens.length || typeof tokens[i] !== "number") {
        throw new Error(`Expected number in path data for command ${cmd} at index ${i}`);
      }
      return tokens[i++] as number;
    };

    switch (cmd) {
      case "M": {
        const x = readNum();
        const y = readNum();
        currX = x;
        currY = y;
        startX = currX;
        startY = currY;
        pdfCommands.push(`${currX.toFixed(4)} ${currY.toFixed(4)} m`);
        lastCommand = "M";
        break;
      }
      case "m": {
        const x = readNum();
        const y = readNum();
        currX += x;
        currY += y;
        startX = currX;
        startY = currY;
        pdfCommands.push(`${currX.toFixed(4)} ${currY.toFixed(4)} m`);
        lastCommand = "m";
        break;
      }
      case "L": {
        const x = readNum();
        const y = readNum();
        currX = x;
        currY = y;
        pdfCommands.push(`${currX.toFixed(4)} ${currY.toFixed(4)} l`);
        lastCommand = "L";
        break;
      }
      case "l": {
        const x = readNum();
        const y = readNum();
        currX += x;
        currY += y;
        pdfCommands.push(`${currX.toFixed(4)} ${currY.toFixed(4)} l`);
        lastCommand = "l";
        break;
      }
      case "H": {
        const x = readNum();
        currX = x;
        pdfCommands.push(`${currX.toFixed(4)} ${currY.toFixed(4)} l`);
        lastCommand = "H";
        break;
      }
      case "h": {
        const x = readNum();
        currX += x;
        pdfCommands.push(`${currX.toFixed(4)} ${currY.toFixed(4)} l`);
        lastCommand = "h";
        break;
      }
      case "V": {
        const y = readNum();
        currY = y;
        pdfCommands.push(`${currX.toFixed(4)} ${currY.toFixed(4)} l`);
        lastCommand = "V";
        break;
      }
      case "v": {
        const y = readNum();
        currY += y;
        pdfCommands.push(`${currX.toFixed(4)} ${currY.toFixed(4)} l`);
        lastCommand = "v";
        break;
      }
      case "C": {
        const x1 = readNum();
        const y1 = readNum();
        const x2 = readNum();
        const y2 = readNum();
        const x = readNum();
        const y = readNum();
        pdfCommands.push(
          `${x1.toFixed(4)} ${y1.toFixed(4)} ${x2.toFixed(4)} ${y2.toFixed(4)} ${x.toFixed(4)} ${y.toFixed(4)} c`,
        );
        lastControlX = x2;
        lastControlY = y2;
        currX = x;
        currY = y;
        lastCommand = "C";
        break;
      }
      case "c": {
        const dx1 = readNum();
        const dy1 = readNum();
        const dx2 = readNum();
        const dy2 = readNum();
        const dx = readNum();
        const dy = readNum();
        const x1 = currX + dx1;
        const y1 = currY + dy1;
        const x2 = currX + dx2;
        const y2 = currY + dy2;
        const x = currX + dx;
        const y = currY + dy;
        pdfCommands.push(
          `${x1.toFixed(4)} ${y1.toFixed(4)} ${x2.toFixed(4)} ${y2.toFixed(4)} ${x.toFixed(4)} ${y.toFixed(4)} c`,
        );
        lastControlX = x2;
        lastControlY = y2;
        currX = x;
        currY = y;
        lastCommand = "c";
        break;
      }
      case "S": {
        const x2 = readNum();
        const y2 = readNum();
        const x = readNum();
        const y = readNum();
        let x1 = currX;
        let y1 = currY;
        if (
          lastCommand === "C" ||
          lastCommand === "c" ||
          lastCommand === "S" ||
          lastCommand === "s"
        ) {
          x1 = 2 * currX - lastControlX;
          y1 = 2 * currY - lastControlY;
        }
        pdfCommands.push(
          `${x1.toFixed(4)} ${y1.toFixed(4)} ${x2.toFixed(4)} ${y2.toFixed(4)} ${x.toFixed(4)} ${y.toFixed(4)} c`,
        );
        lastControlX = x2;
        lastControlY = y2;
        currX = x;
        currY = y;
        lastCommand = "S";
        break;
      }
      case "s": {
        const dx2 = readNum();
        const dy2 = readNum();
        const dx = readNum();
        const dy = readNum();
        const x2 = currX + dx2;
        const y2 = currY + dy2;
        const x = currX + dx;
        const y = currY + dy;
        let x1 = currX;
        let y1 = currY;
        if (
          lastCommand === "C" ||
          lastCommand === "c" ||
          lastCommand === "S" ||
          lastCommand === "s"
        ) {
          x1 = 2 * currX - lastControlX;
          y1 = 2 * currY - lastControlY;
        }
        pdfCommands.push(
          `${x1.toFixed(4)} ${y1.toFixed(4)} ${x2.toFixed(4)} ${y2.toFixed(4)} ${x.toFixed(4)} ${y.toFixed(4)} c`,
        );
        lastControlX = x2;
        lastControlY = y2;
        currX = x;
        currY = y;
        lastCommand = "s";
        break;
      }
      case "Q": {
        const x1 = readNum();
        const y1 = readNum();
        const x = readNum();
        const y = readNum();
        const cx1 = currX + (2 / 3) * (x1 - currX);
        const cy1 = currY + (2 / 3) * (y1 - currY);
        const cx2 = x + (2 / 3) * (x1 - x);
        const cy2 = y + (2 / 3) * (y1 - y);
        pdfCommands.push(
          `${cx1.toFixed(4)} ${cy1.toFixed(4)} ${cx2.toFixed(4)} ${cy2.toFixed(4)} ${x.toFixed(4)} ${y.toFixed(4)} c`,
        );
        lastControlX = x1;
        lastControlY = y1;
        currX = x;
        currY = y;
        lastCommand = "Q";
        break;
      }
      case "q": {
        const dx1 = readNum();
        const dy1 = readNum();
        const dx = readNum();
        const dy = readNum();
        const x1 = currX + dx1;
        const y1 = currY + dy1;
        const x = currX + dx;
        const y = currY + dy;
        const cx1 = currX + (2 / 3) * (x1 - currX);
        const cy1 = currY + (2 / 3) * (y1 - currY);
        const cx2 = x + (2 / 3) * (x1 - x);
        const cy2 = y + (2 / 3) * (y1 - y);
        pdfCommands.push(
          `${cx1.toFixed(4)} ${cy1.toFixed(4)} ${cx2.toFixed(4)} ${cy2.toFixed(4)} ${x.toFixed(4)} ${y.toFixed(4)} c`,
        );
        lastControlX = x1;
        lastControlY = y1;
        currX = x;
        currY = y;
        lastCommand = "q";
        break;
      }
      case "T": {
        const x = readNum();
        const y = readNum();
        let x1 = currX;
        let y1 = currY;
        if (
          lastCommand === "Q" ||
          lastCommand === "q" ||
          lastCommand === "T" ||
          lastCommand === "t"
        ) {
          x1 = 2 * currX - lastControlX;
          y1 = 2 * currY - lastControlY;
        }
        const cx1 = currX + (2 / 3) * (x1 - currX);
        const cy1 = currY + (2 / 3) * (y1 - currY);
        const cx2 = x + (2 / 3) * (x1 - x);
        const cy2 = y + (2 / 3) * (y1 - y);
        pdfCommands.push(
          `${cx1.toFixed(4)} ${cy1.toFixed(4)} ${cx2.toFixed(4)} ${cy2.toFixed(4)} ${x.toFixed(4)} ${y.toFixed(4)} c`,
        );
        lastControlX = x1;
        lastControlY = y1;
        currX = x;
        currY = y;
        lastCommand = "T";
        break;
      }
      case "t": {
        const dx = readNum();
        const dy = readNum();
        const x = currX + dx;
        const y = currY + dy;
        let x1 = currX;
        let y1 = currY;
        if (
          lastCommand === "Q" ||
          lastCommand === "q" ||
          lastCommand === "T" ||
          lastCommand === "t"
        ) {
          x1 = 2 * currX - lastControlX;
          y1 = 2 * currY - lastControlY;
        }
        const cx1 = currX + (2 / 3) * (x1 - currX);
        const cy1 = currY + (2 / 3) * (y1 - currY);
        const cx2 = x + (2 / 3) * (x1 - x);
        const cy2 = y + (2 / 3) * (y1 - y);
        pdfCommands.push(
          `${cx1.toFixed(4)} ${cy1.toFixed(4)} ${cx2.toFixed(4)} ${cy2.toFixed(4)} ${x.toFixed(4)} ${y.toFixed(4)} c`,
        );
        lastControlX = x1;
        lastControlY = y1;
        currX = x;
        currY = y;
        lastCommand = "t";
        break;
      }
      case "Z":
      case "z": {
        pdfCommands.push("h");
        currX = startX;
        currY = startY;
        lastCommand = "z";
        break;
      }
      default:
        break;
    }
  }

  return pdfCommands.join(" ");
}

// 5. Shape to Path Conversions
function convertShapeToPath(node: SVGNode): string {
  const attrs = node.attributes;
  const name = node.name;

  if (name === "rect") {
    const x = parseFloat(attrs.x || "0");
    const y = parseFloat(attrs.y || "0");
    const w = parseFloat(attrs.width || "0");
    const h = parseFloat(attrs.height || "0");
    let rx = parseFloat(attrs.rx || attrs.ry || "0");
    let ry = parseFloat(attrs.ry || attrs.rx || "0");
    if (rx > w / 2) rx = w / 2;
    if (ry > h / 2) ry = h / 2;

    if (rx === 0 || ry === 0) {
      return `M ${x} ${y} h ${w} v ${h} h ${-w} z`;
    } else {
      const kappa = 0.5522847498;
      const ox = rx * kappa;
      const oy = ry * kappa;
      return (
        `M ${x + rx} ${y} ` +
        `L ${x + w - rx} ${y} ` +
        `C ${x + w - rx + ox} ${y} ${x + w} ${y + ry - oy} ${x + w} ${y + ry} ` +
        `L ${x + w} ${y + h - ry} ` +
        `C ${x + w} ${y + h - ry + oy} ${x + w - rx + ox} ${y + h} ${x + w - rx} ${y + h} ` +
        `L ${x + rx} ${y + h} ` +
        `C ${x + rx - ox} ${y + h} ${x} ${y + h - ry + oy} ${x} ${y + h - ry} ` +
        `L ${x} ${y + ry} ` +
        `C ${x} ${y + ry - oy} ${x + rx - ox} ${y} ${x + rx} ${y} z`
      );
    }
  }

  if (name === "circle") {
    const cx = parseFloat(attrs.cx || "0");
    const cy = parseFloat(attrs.cy || "0");
    const r = parseFloat(attrs.r || "0");
    const kappa = 0.5522847498;
    const ox = r * kappa;
    const oy = r * kappa;
    return (
      `M ${cx - r} ${cy} ` +
      `C ${cx - r} ${cy - oy} ${cx - ox} ${cy - r} ${cx} ${cy - r} ` +
      `C ${cx + ox} ${cy - r} ${cx + r} ${cy - oy} ${cx + r} ${cy} ` +
      `C ${cx + r} ${cy + oy} ${cx + ox} ${cy + r} ${cx} ${cy + r} ` +
      `C ${cx - ox} ${cy + r} ${cx - r} ${cy + oy} ${cx - r} ${cy} z`
    );
  }

  if (name === "ellipse") {
    const cx = parseFloat(attrs.cx || "0");
    const cy = parseFloat(attrs.cy || "0");
    const rx = parseFloat(attrs.rx || "0");
    const ry = parseFloat(attrs.ry || "0");
    const kappa = 0.5522847498;
    const ox = rx * kappa;
    const oy = ry * kappa;
    return (
      `M ${cx - rx} ${cy} ` +
      `C ${cx - rx} ${cy - oy} ${cx - ox} ${cy - ry} ${cx} ${cy - ry} ` +
      `C ${cx + ox} ${cy - ry} ${cx + rx} ${cy - oy} ${cx + rx} ${cy} ` +
      `C ${cx + rx} ${cy + oy} ${cx + ox} ${cy + ry} ${cx} ${cy + ry} ` +
      `C ${cx - ox} ${cy + ry} ${cx - rx} ${cy + oy} ${cx - rx} ${cy} z`
    );
  }

  if (name === "line") {
    const x1 = attrs.x1 || "0";
    const y1 = attrs.y1 || "0";
    const x2 = attrs.x2 || "0";
    const y2 = attrs.y2 || "0";
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }

  if (name === "polyline" || name === "polygon") {
    const pointsStr = attrs.points || "";
    const coords = pointsStr
      .trim()
      .split(/[\s,]+/)
      .map(parseFloat)
      .filter((n) => !isNaN(n));
    if (coords.length >= 2) {
      let path = `M ${coords[0]} ${coords[1]}`;
      for (let j = 2; j < coords.length; j += 2) {
        path += ` L ${coords[j]} ${coords[j + 1]}`;
      }
      if (name === "polygon") {
        path += " z";
      }
      return path;
    }
  }

  return "";
}

// 6. SVG Component
export class Svg implements Component {
  public source: string | Buffer;
  public width?: number;
  public height?: number;
  public align?: "left" | "center" | "right";

  private svgWidth!: number;
  private svgHeight!: number;
  private rootNode!: SVGNode;
  private defsMap = new Map<string, SVGNode>();

  constructor(source: string | Buffer, options?: SvgOptions) {
    this.source = source;
    this.width = options?.width;
    this.height = options?.height;
    this.align = options?.align || "left";

    this.parseSvg();
  }

  private parseSvg(): void {
    let svgString = "";
    if (typeof this.source === "string") {
      const trimmed = this.source.trim();
      if (trimmed.startsWith("<svg") || trimmed.startsWith("<?xml") || trimmed.includes("<svg")) {
        svgString = trimmed;
      } else {
        if (fs && fs.existsSync && fs.existsSync(trimmed)) {
          svgString = fs.readFileSync(trimmed, "utf-8");
        } else {
          throw new Error(`File not found or filesystem unavailable: ${trimmed}`);
        }
      }
    } else {
      svgString = Buffer.from(this.source).toString("utf-8");
    }

    const root = parseXML(svgString);
    if (!root || root.name !== "svg") {
      throw new Error("Invalid SVG: could not find root <svg> element");
    }
    this.rootNode = root;

    // Resolve defs first
    this.findDefs(this.rootNode);

    // Get SVG dimensions
    const vb = root.attributes.viewBox || root.attributes.viewbox;
    let svgW = parseFloat(root.attributes.width || "0");
    let svgH = parseFloat(root.attributes.height || "0");

    if (vb) {
      const parts = vb
        .trim()
        .split(/[\s,]+/)
        .map(parseFloat)
        .filter((n) => !isNaN(n));
      if (parts.length === 4) {
        const vbWidth = parts[2]!;
        const vbHeight = parts[3]!;
        if (svgW === 0) svgW = vbWidth;
        if (svgH === 0) svgH = vbHeight;
      }
    }

    this.svgWidth = svgW || 100;
    this.svgHeight = svgH || 100;
  }

  private findDefs(node: SVGNode): void {
    if (node.name === "defs") {
      for (const child of node.children) {
        if (child.attributes.id) {
          this.defsMap.set(child.attributes.id, child);
        }
      }
    } else {
      for (const child of node.children) {
        this.findDefs(child);
      }
    }
  }

  private getDimensions(containerWidth: number): { w: number; h: number } {
    let w = this.width;
    let h = this.height;

    if (w === undefined && h === undefined) {
      w = this.svgWidth;
      h = this.svgHeight;
    } else if (w !== undefined && h === undefined) {
      w = Math.min(w, containerWidth);
      h = this.svgHeight * (w / this.svgWidth);
    } else if (w === undefined && h !== undefined) {
      w = this.svgWidth * (h / this.svgHeight);
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

    let xShift = 0;
    if (this.align === "center") {
      xShift = (width - drawWidth) / 2;
    } else if (this.align === "right") {
      xShift = width - drawWidth;
    }

    const renderX = x + xShift + writer.margin.left;
    const renderY = y - drawHeight + writer.margin.bottom;

    const scaleX = drawWidth / this.svgWidth;
    const scaleY = -drawHeight / this.svgHeight;
    const translateX = renderX;
    const translateY = renderY + drawHeight;

    const commands: string[] = [];
    commands.push("q");
    commands.push(
      `${scaleX.toFixed(6)} 0 0 ${scaleY.toFixed(6)} ${translateX.toFixed(6)} ${translateY.toFixed(6)} cm`,
    );

    this.renderNode(this.rootNode, {}, writer, commands);

    commands.push("Q");

    writer.writeCommands(commands);

    return null;
  }

  private renderNode(
    node: SVGNode,
    parentStyle: SVGStyle,
    writer: PDFPageWriter,
    commands: string[],
  ): void {
    if (node.name === "defs") {
      return;
    }

    const inlineStyles = parseStyleAttribute(node.attributes.style || "");

    const getStyleVal = (key: string, attrKey: string, parentVal?: string): string | undefined => {
      return inlineStyles[key] || node.attributes[attrKey] || node.attributes[key] || parentVal;
    };

    const nodeStyle: SVGStyle = {
      fill: getStyleVal("fill", "fill", parentStyle.fill),
      stroke: getStyleVal("stroke", "stroke", parentStyle.stroke),
      strokeWidth: getStyleVal("stroke-width", "strokeWidth", parentStyle.strokeWidth),
      fontFamily: getStyleVal("font-family", "fontFamily", parentStyle.fontFamily),
      fontSize: getStyleVal("font-size", "fontSize", parentStyle.fontSize),
      opacity: getStyleVal("opacity", "opacity", parentStyle.opacity),
      fillOpacity: getStyleVal("fill-opacity", "fillOpacity", parentStyle.fillOpacity),
      strokeOpacity: getStyleVal("stroke-opacity", "strokeOpacity", parentStyle.strokeOpacity),
    };

    const hasTransform = !!node.attributes.transform;
    if (hasTransform) {
      commands.push("q");
      const m = parseTransform(node.attributes.transform);
      commands.push(
        `${m[0].toFixed(6)} ${m[1].toFixed(6)} ${m[2].toFixed(6)} ${m[3].toFixed(6)} ${m[4].toFixed(6)} ${m[5].toFixed(6)} cm`,
      );
    }

    const name = node.name;

    if (name === "g" || name === "svg") {
      for (const child of node.children) {
        this.renderNode(child, nodeStyle, writer, commands);
      }
    } else if (name === "use") {
      const href = node.attributes["xlink:href"] || node.attributes["href"];
      if (href && href.startsWith("#")) {
        const id = href.substring(1);
        const defNode = this.defsMap.get(id);
        if (defNode) {
          const mergedAttributes = { ...defNode.attributes, ...node.attributes };
          const useX = parseFloat(node.attributes.x || "0");
          const useY = parseFloat(node.attributes.y || "0");
          let transform = node.attributes.transform || "";
          if (useX !== 0 || useY !== 0) {
            transform = `translate(${useX}, ${useY}) ` + transform;
          }
          mergedAttributes.transform = transform.trim();

          const resolvedNode: SVGNode = {
            ...defNode,
            attributes: mergedAttributes,
          };
          this.renderNode(resolvedNode, nodeStyle, writer, commands);
        }
      }
    } else if (
      ["path", "rect", "circle", "ellipse", "line", "polyline", "polygon"].includes(name)
    ) {
      let d = "";
      if (name === "path") {
        d = node.attributes.d || "";
      } else {
        d = convertShapeToPath(node);
      }

      if (d) {
        const pathCmds = svgPathToPDF(d);
        if (pathCmds) {
          commands.push("q");

          const op = parseFloat(nodeStyle.opacity || "1");
          const fillOp = parseFloat(nodeStyle.fillOpacity || "1") * op;
          const strokeOp = parseFloat(nodeStyle.strokeOpacity || "1") * op;

          const hasFill = nodeStyle.fill !== "none";
          const fillColorVal = nodeStyle.fill || "#000000";

          if (hasFill) {
            const fillCol = Color.coerce(fillColorVal);
            if (fillOp < 1) {
              const alphaKey = `GS_Opacity_${fillOp.toFixed(2).replace(".", "_")}`;
              const res = writer["getOrCreateResources"]();
              res.addExtGState(alphaKey, {
                Type: "/ExtGState",
                ca: fillOp,
              });
              commands.push(`/${alphaKey} gs`);
            }
            commands.push(fillCol.toPDFFill());
          }

          const hasStroke = nodeStyle.stroke && nodeStyle.stroke !== "none";
          if (hasStroke) {
            const strokeCol = Color.coerce(nodeStyle.stroke!);
            const strokeWidth = parseFloat(nodeStyle.strokeWidth || "1");

            if (strokeOp < 1) {
              const alphaKey = `GS_Opacity_${strokeOp.toFixed(2).replace(".", "_")}`;
              const res = writer["getOrCreateResources"]();
              res.addExtGState(alphaKey, {
                Type: "/ExtGState",
                CA: strokeOp,
              });
              commands.push(`/${alphaKey} gs`);
            }
            commands.push(strokeCol.toPDFStroke());
            commands.push(`${strokeWidth} w`);

            const dasharray =
              node.attributes["stroke-dasharray"] || inlineStyles["stroke-dasharray"];
            if (dasharray && dasharray !== "none") {
              const dashPattern = dasharray
                .split(/[\s,]+/)
                .map(parseFloat)
                .filter((n) => !isNaN(n));
              if (dashPattern.length > 0) {
                const dashPhase = parseFloat(
                  node.attributes["stroke-dashoffset"] || inlineStyles["stroke-dashoffset"] || "0",
                );
                commands.push(`[${dashPattern.join(" ")}] ${dashPhase} d`);
              }
            }
          }

          commands.push(pathCmds);

          const fillRule = node.attributes["fill-rule"] || inlineStyles["fill-rule"] || "nonzero";
          const isEvenOdd = fillRule === "evenodd";

          if (hasFill && hasStroke) {
            commands.push(isEvenOdd ? "B*" : "B");
          } else if (hasFill) {
            commands.push(isEvenOdd ? "f*" : "f");
          } else if (hasStroke) {
            commands.push("S");
          } else {
            commands.push("f");
          }

          commands.push("Q");
        }
      }
    } else if (name === "text") {
      const textX = parseFloat(node.attributes.x || "0");
      const textY = parseFloat(node.attributes.y || "0");
      this.renderTextNode(node, nodeStyle, textX, textY, writer, commands);
    }

    if (hasTransform) {
      commands.push("Q");
    }
  }

  private renderTextNode(
    node: SVGNode,
    nodeStyle: SVGStyle,
    x: number,
    y: number,
    writer: PDFPageWriter,
    commands: string[],
  ): void {
    const rawSize = nodeStyle.fontSize || "12";
    const fontSize = parseFloat(rawSize.replace("px", "").replace("pt", "").trim()) || 12;

    const fillVal = nodeStyle.fill || "#000000";
    const strokeVal = nodeStyle.stroke || "none";

    let fontKey = writer["currentFontKey"];
    if (!fontKey) {
      writer.setFont("Helvetica", fontSize);
      fontKey = writer["currentFontKey"] || "Helvetica";
    }

    interface TextContext {
      x: number;
      y: number;
      fontSize: number;
      fill: string;
      stroke: string;
      strokeWidth: string;
    }

    const initialCtx: TextContext = {
      x,
      y,
      fontSize,
      fill: fillVal,
      stroke: strokeVal,
      strokeWidth: nodeStyle.strokeWidth || "1",
    };

    const processChild = (child: SVGNode, ctx: TextContext) => {
      let activeX = ctx.x;
      let activeY = ctx.y;

      if (child.attributes.x !== undefined) activeX = parseFloat(child.attributes.x);
      if (child.attributes.y !== undefined) activeY = parseFloat(child.attributes.y);

      const childInlineStyles = parseStyleAttribute(child.attributes.style || "");

      const getChildStyleVal = (key: string, attrKey: string, parentVal: string): string => {
        return (
          childInlineStyles[key] || child.attributes[attrKey] || child.attributes[key] || parentVal
        );
      };

      const childSizeRaw = getChildStyleVal("font-size", "fontSize", "");
      const childSize = childSizeRaw
        ? parseFloat(childSizeRaw.replace("px", "").replace("pt", "").trim())
        : ctx.fontSize;

      const childFill = getChildStyleVal("fill", "fill", ctx.fill);
      const childStroke = getChildStyleVal("stroke", "stroke", ctx.stroke);
      const childStrokeWidth = getChildStyleVal("stroke-width", "strokeWidth", ctx.strokeWidth);

      const nextCtx: TextContext = {
        x: activeX,
        y: activeY,
        fontSize: childSize,
        fill: childFill,
        stroke: childStroke,
        strokeWidth: childStrokeWidth,
      };

      if (child.name === "#text" && child.content) {
        commands.push("q");

        if (nextCtx.fill !== "none") {
          const fillCol = Color.coerce(nextCtx.fill);
          commands.push(fillCol.toPDFFill());
        }
        if (nextCtx.stroke !== "none") {
          const strokeCol = Color.coerce(nextCtx.stroke);
          commands.push(strokeCol.toPDFStroke());
          const sWidth = parseFloat(nextCtx.strokeWidth || "1");
          commands.push(`${sWidth} w`);
        }

        commands.push(`q`);
        commands.push(`1 0 0 -1 ${nextCtx.x.toFixed(6)} ${nextCtx.y.toFixed(6)} cm`);
        commands.push("BT");
        commands.push(`/${fontKey} ${nextCtx.fontSize.toFixed(2)} Tf`);
        commands.push("0 0 Td");

        if (writer["activeFontObject"]) {
          const { commands: textCmds } = getPDFTextCommands(
            child.content,
            writer["activeFontObject"],
            nextCtx.fontSize,
            0,
          );
          commands.push(textCmds);
        } else {
          commands.push(`(${escapePDFString(child.content)}) Tj`);
        }

        commands.push("ET");
        commands.push("Q");
        commands.push("Q");
      } else if (child.name === "tspan") {
        for (const sub of child.children) {
          processChild(sub, nextCtx);
        }
      }
    };

    const textContent = node.content;
    if (textContent) {
      processChild(
        { name: "#text", attributes: {}, children: [], content: textContent },
        initialCtx,
      );
    }

    for (const child of node.children) {
      processChild(child, initialCtx);
    }
  }
}
