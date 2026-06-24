import { PDFReferenceObject } from "../reference";
import { serialize } from "../serialize";

export class PDFIndirectBaseObject {
  public _type: string = "baseIndirect";
  public id?: number;
  public generation?: number;
  public value: any;

  constructor(options: { value: any; id?: number; generation?: number }) {
    this.value = options.value;
    this.id = options.id;
    this.generation = options.generation;
  }

  toRef(): PDFReferenceObject {
    return new PDFReferenceObject(this);
  }

  toString(): string {
    if (this.id === undefined || this.generation === undefined) return serialize(this.value);
    return `${this.id} ${this.generation} obj\n${serialize(this.value)}\nendobj`;
  }

  toBuffer(
    encryptFn?: (str: string) => string,
    encryptStreamFn?: (data: Buffer) => Buffer,
    compressOverride?: boolean,
  ): Buffer {
    if (this.id === undefined || this.generation === undefined) {
      if (this.value && typeof this.value.toBuffer === "function") {
        return this.value.toBuffer(encryptStreamFn, compressOverride);
      }
      return Buffer.from(serialize(this.value, 0, encryptFn));
    }

    if (this.value && typeof this.value.toBuffer === "function") {
      const streamBuf = this.value.toBuffer(encryptStreamFn, compressOverride);
      const prefix = Buffer.from(`${this.id} ${this.generation} obj\n`);
      const suffix = Buffer.from("\nendobj");
      return Buffer.concat([prefix, streamBuf, suffix]);
    }

    const contentStr = serialize(this.value, 0, encryptFn);
    return Buffer.from(`${this.id} ${this.generation} obj\n${contentStr}\nendobj`);
  }

  getChildren(): (PDFIndirectBaseObject | undefined)[] {
    return [];
  }
}
