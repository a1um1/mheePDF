import { PDFStreamObject } from "../stream";
import { PDFIndirectBaseObject } from "./baseIndirect";

export class PDFIndirectStreamObject extends PDFIndirectBaseObject {
  override _type: string = "streamIndirect";
  declare value: PDFStreamObject;

  constructor(options: { id?: number; generation?: number; value: string | Buffer; extraDict?: any }) {
    super({
      id: options.id,
      generation: options.generation,
      value: new PDFStreamObject(options.value, options.extraDict),
    });
  }
}
