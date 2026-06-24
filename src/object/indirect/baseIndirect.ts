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

  getChildren(): (PDFIndirectBaseObject | undefined)[] {
    return [];
  }
}
