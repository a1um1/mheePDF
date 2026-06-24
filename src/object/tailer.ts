import { serialize } from "./serialize";
import type { PDFCatalogObject } from "./indirect/catalog";

export class PDFTailerObject {
  public _type: string = "tailer";
  private size: number;
  private root: PDFCatalogObject;
  private startXref: number;
  private encrypt?: any;
  private info?: any;
  private documentId?: [string, string];

  constructor(dictionary: {
    size: number;
    root: PDFCatalogObject;
    startXref: number;
    encrypt?: any;
    info?: any;
    documentId?: [string, string];
  }) {
    this.size = dictionary.size;
    this.root = dictionary.root;
    this.startXref = dictionary.startXref;
    this.encrypt = dictionary.encrypt;
    this.info = dictionary.info;
    this.documentId = dictionary.documentId;
  }

  toString(): string {
    const dict: any = {
      Size: this.size,
      Root: this.root,
    };
    if (this.encrypt) dict.Encrypt = this.encrypt;
    if (this.info) dict.Info = this.info;
    if (this.documentId) dict.ID = this.documentId;

    return `trailer\n${serialize(dict)}\nstartxref\n${this.startXref}\n%%EOF`;
  }
}
