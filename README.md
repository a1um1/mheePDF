<img src="docs/resources/logo.svg" width="100" height="100">

# MheePDF - หมี PDF

🚧 Construction

# Usage
```bash
bun install mheepdf
```

<table>
	<tr>
		<td>Implementations</td>
		<td>Result</td>
	</tr>
	<tr>
		<td>

```typescript
// Basic Usage
import { MheePDF } from "mheepdf";

const pdf = new MheePDF({
  pageSize: MheePDF.A4,
  defaultFontSize: 18,
  margin: 50,
});

pdf.addText("Hello World");
pdf.addText("Automatic Multiple Line!");
pdf.addText("\n");
pdf.addText("Lorem ipsum ...");

await Bun.write("test.pdf", pdf.generatePDFcontent());
```

</td>
		<td>
			<img src="docs/resources/usage/basic.png" width="100%" >
		</td>
	</tr>
	<tr>
		<td>

```typescript
// Basic Usage With Thai
const fontBuffer; // TTF font Buffer
const sarabunFont = new PDFType0FontObject(fontBuffer);

const pdf = new MheePDF({
  pageSize: MheePDF.A4,
  fonts: [sarabunFont],
  defaultFont: sarabunFont,
});

pdf.addText("สวัสดีไทย");
pdf.addText("จัดหน้าอัตโนมัติ เท่ไหมอะ");
pdf.addText("\n");
pdf.addText("เพื่อที่โลกาภิวัฒน์หรือ ...");
```
> [!CAUTION]
> Usage with Thai must include Thai font
</td>
		<td>
			<img src="docs/resources/usage/thai.png" width="100%" >
		</td>
	</tr>
</table>
