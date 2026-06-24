# Thai Font Support

MheePDF supports complex Thai text layout, including proper positioning of vowels and tone marks.

> [!CAUTION]
> Usage with Thai language **must** include a custom Thai font (TTF). Standard PDF fonts (like Helvetica, Times) do not contain Thai glyphs or layout tables.

## How it works

Behind the scenes, MheePDF uses **HarfBuzz** (via `harfbuzzjs`) and **opentype.js** to shape the text:
1. It parses the TTF font file.
2. It shapes the character clusters (consonants, vowels, tone marks).
3. It places glyphs at the exact coordinates calculated by the shaper, preventing vowel-overlapping and floating tone marks.

## Example Usage

Here is how you can render Thai text using a custom TTF font:

```typescript
import { MheePDF, PDFType0FontObject } from "mheepdf";
import { readFile } from "fs/promises";

// 1. Load your TTF font buffer (e.g. TH Sarabun New)
const fontBuffer = await readFile("./fonts/Sarabun-Regular.ttf");

// 2. Wrap it with PDFType0FontObject
const sarabunFont = new PDFType0FontObject(fontBuffer);

// 3. Initialize MheePDF with the custom font
const pdf = new MheePDF({
  pageSize: MheePDF.A4,
  fonts: [sarabunFont],
  defaultFont: sarabunFont, // Use it as the default font
});

// 4. Add Thai text
pdf.addText("สวัสดีประเทศไทย");
pdf.addText("จัดหน้าอัตโนมัติ เท่ไหมละครับ");
pdf.addText("\n");
pdf.addText("เพื่อที่โลกาภิวัตน์หรือกระแสความเปลี่ยนแปลงด้านต่างๆ...");

// 5. Generate
const pdfBuffer = await pdf.generatePDFcontent();
await Bun.write("test_thai.pdf", pdfBuffer);
```
