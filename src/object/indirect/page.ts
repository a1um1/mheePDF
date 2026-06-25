import { PDFIndirectBaseObject } from "./baseIndirect";

export class PDFPageObject extends PDFIndirectBaseObject {
  override _type: string = "page";

  constructor(options: {
    id?: number;
    generation?: number;
    pageSize: [number, number];
    resources?: PDFIndirectBaseObject;
    Parent: PDFIndirectBaseObject;
    Contents?: PDFIndirectBaseObject[];
    rotate?: number;
  }) {
    const value: any = {
      Type: "/Page",
      MediaBox: [0, 0, options.pageSize[0], options.pageSize[1]],
      Resources: options.resources?.toRef()!,
      Parent: options.Parent.toRef()!,
      Contents: (options.Contents || []).map((content) => content.toRef()),
    };

    if (options.rotate !== undefined) {
      if (options.rotate % 90 !== 0) {
        throw new Error("Page rotation must be a multiple of 90");
      }
      value.Rotate = ((options.rotate % 360) + 360) % 360;
    }

    super({
      id: options.id,
      generation: options.generation,
      value,
    });
  }
}
