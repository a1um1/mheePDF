import type { PDFIndirectBaseObject } from "./object/indirect/baseIndirect";
import { PDFCatalogObject } from "./object/indirect/catalog";
import { PDFTailerObject } from "./object/tailer";
import { randomBytes } from "crypto";
import { deriveObjectKey, rc4 } from "./crypto";

export class PDFEngine {
  protected objects: PDFIndirectBaseObject[] = [];
  protected nextId: number = 1;

  public infoObject?: any;
  public encryptObject?: any;
  public encryptionKey?: Buffer;
  public documentId?: Buffer;
  public compress: boolean = true;

  addObject<T extends PDFIndirectBaseObject>(object: T): T {
    if (object === null || object === undefined) return object;

    if (object.id === undefined) {
      object.id = this.nextId++;
      object.generation = 0;
      this.objects.push(object);

      for (const child of object.getChildren()) {
        if (child) this.addObject(child);
      }
    }

    return object;
  }

  generatePDFcontent(): Buffer {
    const indirectObjects = this.objects.filter(
      (obj): obj is PDFIndirectBaseObject =>
        obj !== null && obj !== undefined && obj.id !== undefined,
    );
    indirectObjects.sort((a, b) => (a.id || 0) - (b.id || 0));

    const header = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n\n";
    const parts: Buffer[] = [Buffer.from(header, "binary")];
    let currentOffset = parts[0].length;
    const offsets: { [key: number]: number } = {};

    for (const obj of indirectObjects) {
      if (obj.id === undefined) continue;
      offsets[obj.id] = currentOffset;

      let objBuf: Buffer;
      if (this.encryptionKey && (!this.encryptObject || obj.id !== this.encryptObject.id)) {
        const objKey = deriveObjectKey(this.encryptionKey, obj.id, obj.generation || 0);
        const encryptFn = (str: string): string => {
          const strBuf = Buffer.from(str, "utf-8");
          const encBuf = rc4(objKey, strBuf);
          return `<${encBuf.toString("hex").toUpperCase()}>`;
        };
        const encryptStreamFn = (data: Buffer): Buffer => {
          return rc4(objKey, data);
        };
        objBuf = obj.toBuffer(encryptFn, encryptStreamFn, this.compress);
      } else {
        objBuf = obj.toBuffer(undefined, undefined, this.compress);
      }

      const separator = Buffer.from("\n\n");
      const combined = Buffer.concat([objBuf, separator]);
      parts.push(combined);
      currentOffset += combined.length;
    }

    const startXref = currentOffset;

    // Generate xref table
    const maxId = indirectObjects.reduce((max, obj) => Math.max(max, obj.id || 0), 0);
    let xref = "xref\n";
    xref += `0 ${maxId + 1}\n`;
    xref += "0000000000 65535 f \r\n";

    for (let i = 1; i <= maxId; i++) {
      const offset = offsets[i];
      if (offset !== undefined) {
        xref += `${offset.toString().padStart(10, "0")} 00000 n \r\n`;
      } else {
        xref += "0000000000 00000 f \r\n";
      }
    }

    parts.push(Buffer.from(xref, "ascii"));

    const catalog = indirectObjects.find(
      (obj) => obj._type === "catalog" || obj.constructor.name === "PDFCatalogObject",
    ) as PDFCatalogObject;

    let documentIdHex: [string, string] | undefined = undefined;
    if (this.documentId) {
      const idHex = this.documentId.toString("hex").toUpperCase();
      documentIdHex = [`<${idHex}>`, `<${idHex}>`];
    } else if (this.encryptObject) {
      const fallbackId = randomBytes(16);
      this.documentId = fallbackId;
      const idHex = fallbackId.toString("hex").toUpperCase();
      documentIdHex = [`<${idHex}>`, `<${idHex}>`];
    } else if (this.infoObject) {
      const fallbackId = randomBytes(16);
      this.documentId = fallbackId;
      const idHex = fallbackId.toString("hex").toUpperCase();
      documentIdHex = [`<${idHex}>`, `<${idHex}>`];
    }

    let trailer = new PDFTailerObject({
      size: maxId + 1,
      root: catalog,
      startXref,
      encrypt: this.encryptObject,
      info: this.infoObject,
      documentId: documentIdHex,
    });

    parts.push(Buffer.from(trailer.toString(), "ascii"));

    return Buffer.concat(parts);
  }
}
