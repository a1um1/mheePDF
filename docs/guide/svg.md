# SVG

MheePDF can render SVG vector graphics natively — parsing shapes, paths, and text directly into PDF vector commands, with no rasterization. This gives you crisp, scalable graphics at any resolution.

## Adding an SVG

Use `addSvg` to embed a vector graphic from a file path, a `Buffer`, or an inline SVG string:

```typescript
pdf.addSvg(source, options);
```

`source` can be:
- A **file path** string (e.g. `"assets/logo.svg"`) — loaded from disk.
- A **`Buffer`** or `Uint8Array` containing SVG bytes.
- An **inline SVG string** starting with `<svg …>`.

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `width` | `number` | Intrinsic SVG width | Rendered width in points. Height scales proportionally unless `height` is also set. |
| `height` | `number` | Proportional | Rendered height in points. |
| `align` | `"left" \| "center" \| "right"` | `"left"` | Horizontal alignment on the page. |

## Supported SVG Elements

| Element | Status |
|---|---|
| `<rect>` | ✅ Supported |
| `<circle>`, `<ellipse>` | ✅ Supported |
| `<line>`, `<polyline>`, `<polygon>` | ✅ Supported |
| `<path>` | ✅ Supported (M, L, H, V, C, S, Q, T, A, Z) |
| `<text>`, `<tspan>` | ✅ Supported |
| `<g>` (groups with transforms) | ✅ Supported |
| `<defs>`, `<use>` | ⚠️ Partial |
| `<image>` (embedded bitmaps) | ❌ Not supported |

> [!NOTE]
> `fill`, `stroke`, `opacity`, `transform` (translate, scale, rotate, matrix) and inline `style` attributes are all resolved.

## Example

```typescript
import { MheePDF } from "mheepdf";
import { readFileSync } from "fs";

const pdf = new MheePDF({
  pageSize: MheePDF.A4,
  margin: 50,
});

// 1. Embed an SVG from a file path
await pdf.addSvg("assets/company-logo.svg", {
  width: 120,
  align: "center",
});

pdf.addText("Annual Report 2026", { fontSize: 20, align: "center" });
pdf.addText("\n");

// 2. Embed an inline SVG string
const inlineChart = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100">
  <rect x="10"  y="60" width="30" height="40" fill="#3b82f6"/>
  <rect x="50"  y="30" width="30" height="70" fill="#6366f1"/>
  <rect x="90"  y="45" width="30" height="55" fill="#8b5cf6"/>
  <rect x="130" y="15" width="30" height="85" fill="#a855f7"/>
  <line x1="5" y1="100" x2="195" y2="100" stroke="#64748b" stroke-width="1"/>
</svg>
`;

pdf.addSvg(Buffer.from(inlineChart), {
  width: 300,
  align: "center",
});

const pdfBuffer = pdf.generate();
```

> [!TIP]
> For icons and logos, use SVG files exported directly from Figma or Illustrator — they are rendered pixel-perfectly at any zoom level, unlike raster images.
