import { serialize } from "./serialize";

export class PDFStreamObject {
  public _type: string = "stream";
  public value: string | Buffer;
  private extraDict: any;

  constructor(stream: string | Buffer, extraDict?: any) {
    this.value = stream;
    this.extraDict = extraDict || {};
  }

  toString(): string {
    let streamContent: string;
    const dict = { ...this.extraDict };

    if (this.value instanceof Buffer) {
      streamContent = this.value.toString("hex").toUpperCase() + ">";
      if (!dict.Filter) {
        dict.Filter = "/ASCIIHexDecode";
      } else if (Array.isArray(dict.Filter)) {
        if (!dict.Filter.includes("/ASCIIHexDecode")) {
          dict.Filter = ["/ASCIIHexDecode", ...dict.Filter];
        }
      } else if (typeof dict.Filter === "string" && dict.Filter !== "/ASCIIHexDecode") {
        dict.Filter = ["/ASCIIHexDecode", dict.Filter];
      }
    } else {
      streamContent = this.value.toString();
    }

    dict.Length = streamContent.length;

    return `${serialize(dict)}\nstream\n${streamContent}\nendstream`;
  }
}
