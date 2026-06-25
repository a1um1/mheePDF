# Line

MheePDF includes a `Line` component for drawing horizontal dividers across the page. Lines are useful for visually separating sections of content — such as dividing a header from a body, or adding decorative spacing between paragraphs.

## Adding a Line

Add a line using the `addLine` method on your `MheePDF` instance:

```typescript
pdf.addLine(options);
```

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `color` | `string \| Color` | Black | Stroke color of the line (hex string or `Color` instance). |
| `thickness` | `number` | `1` | Line thickness in points. |
| `dash` | `"solid" \| "dashed" \| "dotted" \| number[]` | `"solid"` | Dash style. Pass a custom `number[]` for a fully custom `[dash, gap]` pattern. |
| `dashPhase` | `number` | `0` | Offset (in points) at which the dash pattern starts. |
| `height` | `number` | Same as `thickness` | Total vertical space the line occupies in the layout. Useful for adding breathing room around a thin line. |

## Example

```typescript
import { MheePDF } from "mheepdf";

const pdf = new MheePDF({
  pageSize: MheePDF.A4,
  margin: 50,
  defaultFontSize: 12,
});

// --- Section Header ---
pdf.addText("Order Summary", { fontSize: 16 });

// 1. Solid line (default) — used as a primary section divider
pdf.addLine({
  color: "#1e3a5f",
  thickness: 1.5,
  height: 12, // extra spacing above and below
});

pdf.addText("Item A — 2x ..................... 120.00 THB");
pdf.addText("Item B — 1x ....................... 89.00 THB");

// 2. Dashed line — used as a subtle inner separator
pdf.addLine({
  color: "#94a3b8",
  thickness: 0.5,
  dash: "dashed",
  height: 10,
});

pdf.addText("Subtotal: 209.00 THB");
pdf.addText("VAT (7%): 14.63 THB");

// 3. Dotted line — decorative footer separator
pdf.addLine({
  color: "#cbd5e1",
  thickness: 1,
  dash: "dotted",
  height: 14,
});

pdf.addText("Total: 223.63 THB", { fontSize: 14 });

// 4. Custom dash pattern [on, off, on, off]
pdf.addLine({
  color: "#475569",
  thickness: 0.75,
  dash: [6, 3, 1, 3], // long dash, gap, dot, gap
  height: 10,
});

const pdfBuffer = pdf.generate();
```

> [!TIP]
> Use `height` to control the whitespace around a thin line without adding an extra `addText("\n")` call. For example, `thickness: 0.5, height: 16` draws a hairline but reserves 16 points of vertical space.
