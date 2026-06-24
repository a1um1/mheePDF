import { colordx, extend } from "@colordx/core";
import namesPlugin from "@colordx/core/plugins/names";
import cmykPlugin from "@colordx/core/plugins/cmyk";

extend([namesPlugin, cmykPlugin]);

export class Color {
  private col: ReturnType<typeof colordx>;

  constructor(input: any) {
    let normalizedInput = input;
    if (input && typeof input === "object") {
      if ("a" in input && !("alpha" in input)) {
        normalizedInput = { ...input, alpha: input.a };
      }
    }
    this.col = colordx(normalizedInput);
    if (!this.col.isValid()) {
      this.col = colordx("#000000");
    }
  }

  public static coerce(color: Color | string | any): Color {
    if (color instanceof Color) {
      return color;
    }
    return new Color(color);
  }

  public static rgb(r: number, g: number, b: number, a?: number): Color {
    return new Color({ r, g, b, alpha: a });
  }

  public static hsl(h: number, s: number, l: number, a?: number): Color {
    return new Color({ h, s, l, alpha: a });
  }

  public static hex(hexStr: string): Color {
    return new Color(hexStr);
  }

  public static oklab(l: number, a: number, b: number, alpha?: number): Color {
    const alphaPart = alpha !== undefined ? ` / ${alpha}` : "";
    return new Color(`oklab(${l} ${a} ${b}${alphaPart})`);
  }

  public getAlpha(): number {
    return this.col.alpha();
  }

  public isGrayscale(): boolean {
    const { r, g, b } = this.col.toRgb();
    return r === g && g === b;
  }

  public getRgb(): { r: number; g: number; b: number } {
    const { r, g, b } = this.col.toRgb();
    return { r, g, b };
  }

  public toPDFFillValue(): string {
    const { r, g, b } = this.col.toRgb();
    if (this.isGrayscale()) {
      return (r / 255).toFixed(3);
    } else {
      return `${(r / 255).toFixed(3)} ${(g / 255).toFixed(3)} ${(b / 255).toFixed(3)}`;
    }
  }
  public toPDFStrokeValue(): string {
    return this.toPDFFillValue();
  }

  public toPDFFill(): string {
    const val = this.toPDFFillValue();
    return this.isGrayscale() ? `${val} g` : `${val} rg`;
  }

  public toPDFStroke(): string {
    const val = this.toPDFStrokeValue();
    return this.isGrayscale() ? `${val} G` : `${val} RG`;
  }
}
