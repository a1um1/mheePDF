import { PDFIndirectBaseObject } from "./baseIndirect";

export class PDFFontObject extends PDFIndirectBaseObject {
  override _type: string = "font";

  constructor(options: {
    id?: number;
    generation?: number;
    fontName?: string;
    fonts?: { [key: string]: PDFIndirectBaseObject | any };
  }) {
    const fontKey = options.fontName || "F1";
    const fontDict: any = {};

    if (options.fonts) {
      for (const [key, fontObj] of Object.entries(options.fonts)) {
        fontDict[key] = fontObj instanceof PDFIndirectBaseObject ? fontObj.toRef() : fontObj;
      }
    } else {
      fontDict[fontKey] = {
        Type: "/Font",
        BaseFont: "/Helvetica",
        Subtype: "/Type1",
      };
    }

    super({
      id: options.id,
      generation: options.generation,
      value: {
        Font: fontDict,
      },
    });
  }

  addFont(fontKey: string, fontObject: PDFIndirectBaseObject | any): void {
    const ref = fontObject instanceof PDFIndirectBaseObject ? fontObject.toRef() : fontObject;
    this.value.Font[fontKey] = ref;
  }

  addExtGState(key: string, extGState: any): void {
    if (!this.value.ExtGState) {
      this.value.ExtGState = {};
    }
    this.value.ExtGState[key] = extGState;
  }

  addXObject(key: string, xObject: PDFIndirectBaseObject | any): void {
    if (!this.value.XObject) {
      this.value.XObject = {};
    }
    const ref = xObject instanceof PDFIndirectBaseObject ? xObject.toRef() : xObject;
    this.value.XObject[key] = ref;
  }
}
