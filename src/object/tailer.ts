import { serialize } from "./serialize";
import type { PDFCatalogObject } from "./indirect/catalog";

export class PDFTailerObject {
  public _type: string = "tailer";
  private size: number;
  private root: PDFCatalogObject;
  private startXref: number;

  constructor(dictionary: { size: number; root: PDFCatalogObject; startXref: number }) {
    this.size = dictionary.size;
    this.root = dictionary.root;
    this.startXref = dictionary.startXref;
  }

  toString(): string {
    const dict = {
      Size: this.size,
      Root: this.root,
    };
    return `trailer\n${serialize(dict)}\nstartxref\n${this.startXref}\n%%EOF`;
  }
}
