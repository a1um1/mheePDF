import type { PDFIndirectBaseObject } from "./indirect/baseIndirect";

export class PDFReferenceObject {
  public _type: string = "reference";

  public target?: PDFIndirectBaseObject;
  private _id?: number;
  private _generation?: number;

  constructor(targetOrId: PDFIndirectBaseObject | number, generation?: number) {
    if (typeof targetOrId === "number") {
      this._id = targetOrId;
      this._generation = generation ?? 0;
    } else {
      this.target = targetOrId;
    }
  }

  get id(): number {
    if (this.target) {
      if (this.target.id === undefined) {
        throw new Error("Target indirect object does not have an ID yet.");
      }
      return this.target.id;
    }
    return this._id!;
  }

  get generation(): number {
    if (this.target) {
      return this.target.generation ?? 0;
    }
    return this._generation!;
  }

  toString(): string {
    return `${this.id} ${this.generation} R`;
  }
}
