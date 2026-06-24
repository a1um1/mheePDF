import { PDFIndirectBaseObject } from "./baseIndirect";
import type { PDFPageObject } from "./page";

export class PDFPagesObject extends PDFIndirectBaseObject {
  override _type: string = "pages";

  constructor(options: { id?: number; generation?: number; pages: PDFPageObject[] }) {
    super({
      id: options.id,
      generation: options.generation,
      value: {
        Type: "/Pages",
        Count: options.pages.length,
        Kids: options.pages.map((page) => page.toRef()),
      },
    });
  }

  addPage(page: PDFPageObject): void {
    this.value.Kids.push(page.toRef());
    this.value.Count++;
  }
}
