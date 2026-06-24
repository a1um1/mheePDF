import type { PDFIndirectBaseObject } from "./object/indirect/baseIndirect";
import { PDFCatalogObject } from "./object/indirect/catalog";
import { PDFTailerObject } from "./object/tailer";

export class PDFEngine {
  protected objects: PDFIndirectBaseObject[] = [];
  protected nextId: number = 1;

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

  generatePDFcontent(): string {
    const encoder = new TextEncoder();

    const indirectObjects = this.objects.filter(
      (obj): obj is PDFIndirectBaseObject =>
        obj !== null && obj !== undefined && obj.id !== undefined,
    );
    indirectObjects.sort((a, b) => (a.id || 0) - (b.id || 0));

    const header = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n\n";
    let body = "";
    const offsets: { [key: number]: number } = {};

    let currentOffset = encoder.encode(header).length;

    for (const obj of indirectObjects) {
      if (obj.id === undefined) continue;
      offsets[obj.id] = currentOffset;
      const objStr = obj.toString() + "\n\n";
      body += objStr;
      currentOffset += encoder.encode(objStr).length;
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

    const catalog = indirectObjects.find(
      (obj) => obj._type === "catalog" || obj.constructor.name === "PDFCatalogObject",
    ) as PDFCatalogObject;

    let trailer = new PDFTailerObject({
      size: maxId + 1,
      root: catalog,
      startXref,
    });
    return `${header}${body}${xref}${trailer}`;
  }
}
