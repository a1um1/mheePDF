import { PDFIndirectBaseObject } from "./baseIndirect";

export class PDFEncryptObject extends PDFIndirectBaseObject {
  override _type: string = "encrypt";

  constructor(options: {
    id?: number;
    generation?: number;
    O: Buffer;
    U: Buffer;
    P: number;
    keyLengthBytes?: number;
  }) {
    super({
      id: options.id,
      generation: options.generation,
      value: {
        Filter: "/Standard",
        V: 2,
        R: 3,
        O: `<${options.O.toString("hex").toUpperCase()}>`,
        U: `<${options.U.toString("hex").toUpperCase()}>`,
        P: options.P,
        Length: (options.keyLengthBytes ?? 16) * 8,
      },
    });
  }
}
