import { serialize } from "./serialize";
import { deflateSync } from "zlib";

export class PDFStreamObject {
  public _type: string = "stream";
  public value: string | Buffer;
  public extraDict: any;
  public compress?: boolean;

  public static compressByDefault: boolean = true;

  constructor(stream: string | Buffer, extraDict?: any) {
    this.value = stream;
    this.extraDict = extraDict || {};
  }

  toString(): string {
    return this.toBuffer().toString("binary");
  }

  toBuffer(
    encryptStreamFn?: (data: Buffer) => Buffer,
    compressOverride?: boolean,
  ): Buffer {
    const dict = { ...this.extraDict };
    const shouldCompress = compressOverride ?? this.compress ?? PDFStreamObject.compressByDefault;

    let isAlreadyCompressedOrDCT = false;
    if (dict.Filter) {
      const filters = Array.isArray(dict.Filter) ? dict.Filter : [dict.Filter];
      if (
        filters.includes("/FlateDecode") ||
        filters.includes("/DCTDecode") ||
        filters.includes("FlateDecode") ||
        filters.includes("DCTDecode")
      ) {
        isAlreadyCompressedOrDCT = true;
      }
    }

    let streamData: Buffer;

    if (shouldCompress && !isAlreadyCompressedOrDCT) {
      const rawData = typeof this.value === "string" ? Buffer.from(this.value, "utf-8") : this.value;
      try {
        streamData = deflateSync(rawData);
        if (!dict.Filter) {
          dict.Filter = "/FlateDecode";
        } else if (Array.isArray(dict.Filter)) {
          dict.Filter = ["/FlateDecode", ...dict.Filter];
        } else {
          dict.Filter = ["/FlateDecode", dict.Filter];
        }
      } catch (err) {
        streamData = typeof this.value === "string" ? Buffer.from(this.value, "utf-8") : this.value;
      }
    } else {
      if (this.value instanceof Buffer) {
        if (
          dict.Filter === "/DCTDecode" ||
          dict.Filter === "/FlateDecode" ||
          (Array.isArray(dict.Filter) &&
            (dict.Filter.includes("/DCTDecode") || dict.Filter.includes("/FlateDecode")))
        ) {
          streamData = this.value;
        } else {
          const hexString = this.value.toString("hex").toUpperCase() + ">";
          streamData = Buffer.from(hexString, "ascii");
          if (!dict.Filter) {
            dict.Filter = "/ASCIIHexDecode";
          } else if (Array.isArray(dict.Filter)) {
            if (!dict.Filter.includes("/ASCIIHexDecode")) {
              dict.Filter = ["/ASCIIHexDecode", ...dict.Filter];
            }
          } else if (typeof dict.Filter === "string" && dict.Filter !== "/ASCIIHexDecode") {
            dict.Filter = ["/ASCIIHexDecode", dict.Filter];
          }
        }
      } else {
        streamData = Buffer.from(this.value.toString(), "utf-8");
      }
    }

    if (encryptStreamFn) {
      streamData = encryptStreamFn(streamData);
    }

    dict.Length = streamData.length;

    const dictStr = serialize(dict);
    const prefix = Buffer.from(`${dictStr}\nstream\n`);
    const suffix = Buffer.from("\nendstream");
    return Buffer.concat([prefix, streamData, suffix]);
  }
}
