import { PDFIndirectBaseObject } from "./baseIndirect";
import { formatDateToPDFString } from "../../crypto";

export interface PDFInfoDict {
  Title?: string;
  Author?: string;
  Subject?: string;
  Keywords?: string;
  Creator?: string;
  Producer?: string;
  CreationDate?: Date;
  ModDate?: Date;
}

export class PDFInfoObject extends PDFIndirectBaseObject {
  override _type: string = "info";

  constructor(options: { id?: number; generation?: number; info: PDFInfoDict }) {
    const dict: any = {};
    if (options.info.Title !== undefined) dict.Title = options.info.Title;
    if (options.info.Author !== undefined) dict.Author = options.info.Author;
    if (options.info.Subject !== undefined) dict.Subject = options.info.Subject;
    if (options.info.Keywords !== undefined) dict.Keywords = options.info.Keywords;
    dict.Creator = options.info.Creator ?? "MheePDF";
    dict.Producer = options.info.Producer ?? "MheePDF";

    const creationDate = options.info.CreationDate ?? new Date();
    dict.CreationDate = formatDateToPDFString(creationDate);

    const modDate = options.info.ModDate ?? creationDate;
    dict.ModDate = formatDateToPDFString(modDate);

    super({
      id: options.id,
      generation: options.generation,
      value: dict,
    });
  }
}
