import { PDFIndirectBaseObject } from "./baseIndirect";
import { PDFIndirectStreamObject } from "./stream";
import * as opentype from "opentype.js";
import * as hb from "harfbuzzjs";
import { ensureBuffer } from "../../utils/buffer";

export class PDFType0FontObject extends PDFIndirectBaseObject {
  override _type: string = "fontType0";
  public fontName: string;
  public font: opentype.Font;

  public cidFont: PDFIndirectBaseObject;
  public toUnicode: PDFIndirectStreamObject;
  public fontDescriptor: PDFIndirectBaseObject;
  public fontFile: PDFIndirectStreamObject;

  public hbBlob: any;
  public hbFace: any;
  public hbFont: any;

  override getChildren(): (PDFIndirectBaseObject | undefined)[] {
    return [this.fontFile, this.fontDescriptor, this.cidFont, this.toUnicode];
  }

  constructor(fontBufferInput: any) {
    const fontBuffer = ensureBuffer(fontBufferInput);
    const arrayBuffer = fontBuffer.buffer.slice(
      fontBuffer.byteOffset,
      fontBuffer.byteOffset + fontBuffer.byteLength,
    );
    const font = opentype.parse(arrayBuffer);

    const postscriptName = (
      (font.names as any).windows?.postScriptName?.en ||
      (font.names as any).macintosh?.postScriptName?.en ||
      (font.names as any).windows?.fontFamily?.en ||
      (font.names as any).macintosh?.fontFamily?.en ||
      "CustomFont"
    ).replace(/\s+/g, "-");

    // ponytail: Reuse PDFIndirectStreamObject to represent the embedded font file hex stream
    const fontFile = new PDFIndirectStreamObject({
      value: fontBuffer,
      extraDict: { Length1: fontBuffer.length },
    });

    // ponytail: Construct descriptor as direct PDFIndirectBaseObject using native types
    const scale = 1000 / font.unitsPerEm;
    const xMin = Math.round((font.tables.head?.xMin || 0) * scale);
    const yMin = Math.round((font.tables.head?.yMin || 0) * scale);
    const xMax = Math.round((font.tables.head?.xMax || 0) * scale);
    const yMax = Math.round((font.tables.head?.yMax || 0) * scale);

    const fontDescriptor = new PDFIndirectBaseObject({
      value: {
        Type: "/FontDescriptor",
        FontName: `/${postscriptName}`,
        Flags: 32, // Non-Symbolic
        FontBBox: [xMin, yMin, xMax, yMax],
        ItalicAngle: font.tables.post?.italicAngle || 0,
        Ascent: Math.round(font.ascender * scale),
        Descent: Math.round(font.descender * scale),
        CapHeight: Math.round((font.tables.os2?.sCapHeight || font.ascender) * scale),
        StemV: 80,
        FontFile2: fontFile.toRef(),
      },
    });

    // ponytail: Construct CIDFont as direct PDFIndirectBaseObject using native types
    const widths: number[] = [];
    for (let i = 0; i < font.glyphs.length; i++) {
      const glyph = font.glyphs.get(i);
      widths.push(Math.round((glyph.advanceWidth || 0) * scale));
    }

    const cidFont = new PDFIndirectBaseObject({
      value: {
        Type: "/Font",
        Subtype: "/CIDFontType2",
        BaseFont: `/${postscriptName}`,
        CIDSystemInfo: {
          Registry: "Adobe",
          Ordering: "Identity",
          Supplement: 0,
        },
        FontDescriptor: fontDescriptor.toRef(),
        CIDToGIDMap: "/Identity",
        W: [0, widths],
      },
    });

    // ponytail: Construct CMap ToUnicode stream as direct PDFIndirectStreamObject
    let cmap = "/CIDInit /ProcSet findresource begin\n";
    cmap += "12 dict begin\n";
    cmap += "begincmap\n";
    cmap += "/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n";
    cmap += "/CMapName /Custom-ToUnicode def\n";
    cmap += "/CMapType 2 def\n";
    cmap += "1 begincodespacerange\n";
    cmap += "  <0000> <FFFF>\n";
    cmap += "endcodespacerange\n";

    const mappings: { gid: number; unicode: number }[] = [];
    for (let i = 0; i < font.glyphs.length; i++) {
      const glyph = font.glyphs.get(i);
      let unicode: number | undefined = undefined;

      if (glyph.name) {
        const match = glyph.name.match(/^(?:uni|u)([0-9A-Fa-f]{4,6})/i);
        if (match && match[1]) {
          unicode = parseInt(match[1], 16);
        }
      }

      if (unicode === undefined && glyph.unicode !== undefined) {
        unicode = glyph.unicode;
      }

      if (unicode !== undefined) {
        mappings.push({ gid: i, unicode });
      }
    }

    const chunkSize = 100;
    for (let i = 0; i < mappings.length; i += chunkSize) {
      const chunk = mappings.slice(i, i + chunkSize);
      cmap += `${chunk.length} beginbfchar\n`;
      for (const m of chunk) {
        const gidHex = m.gid.toString(16).padStart(4, "0").toUpperCase();
        const uniHex = m.unicode.toString(16).padStart(4, "0").toUpperCase();
        cmap += `<${gidHex}> <${uniHex}>\n`;
      }
      cmap += "endbfchar\n";
    }

    cmap += "endcmap\n";
    cmap += "CMapName currentdict /CMap defineresource pop\n";
    cmap += "end\n";
    cmap += "end";

    const toUnicode = new PDFIndirectStreamObject({ value: cmap });

    super({
      value: {
        Type: "/Font",
        Subtype: "/Type0",
        BaseFont: `/${postscriptName}`,
        Encoding: "/Identity-H",
        DescendantFonts: [cidFont.toRef()],
        ToUnicode: toUnicode.toRef(),
      },
    });

    const uint8Array = new Uint8Array(
      fontBuffer.buffer.slice(fontBuffer.byteOffset, fontBuffer.byteOffset + fontBuffer.byteLength),
    );
    const hbBlob = new hb.Blob(uint8Array.buffer as ArrayBuffer);
    const hbFace = new hb.Face(hbBlob, 0);
    const hbFont = new hb.Font(hbFace);

    this.fontName = postscriptName;
    this.font = font;
    this.fontFile = fontFile;
    this.fontDescriptor = fontDescriptor;
    this.cidFont = cidFont;
    this.toUnicode = toUnicode;

    this.hbBlob = hbBlob;
    this.hbFace = hbFace;
    this.hbFont = hbFont;
  }
}
