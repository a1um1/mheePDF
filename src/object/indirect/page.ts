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
  }) {
    super({
      id: options.id,
      generation: options.generation,
      value: {
        Type: "/Page",
        MediaBox: [0, 0, options.pageSize[0], options.pageSize[1]],
        Resources: options.resources?.toRef()!,
        Parent: options.Parent.toRef()!,
        Contents: (options.Contents || []).map((content) => content.toRef()),
      },
    });
  }
}
