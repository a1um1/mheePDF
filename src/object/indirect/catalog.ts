import { PDFIndirectBaseObject } from "./baseIndirect";
import type { PDFPagesObject } from "./pages";

export class PDFCatalogObject extends PDFIndirectBaseObject {
  override _type: string = "catalog";

  constructor(options: { id?: number; generation?: number; Base: PDFPagesObject }) {
    super({
      id: options.id,
      generation: options.generation,
      value: {
        Type: "/Catalog",
        Pages: options.Base.toRef()!,
      },
    });
  }
}
