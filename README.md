<img src="docs/resources/logo.svg" width="100" height="100">

# MheePDF - หมี PDF

🚧 Construction

# Usage
```bash
bun install mheepdf
```
| Implementations | Result |
| :---         |     :---:      |
| Text Left    |  Text Center   |

<table>
<tr><td> Implementations </td> <td> Result </td></tr>
<tr>
<td>
		```typescript
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
</table>
