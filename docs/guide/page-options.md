# Page Options

MheePDF gives you full control over page dimensions, orientation, margins, background images, and compression. All of these are configured in the `MheePDF` constructor.

## Page Size

Use the `pageSize` option to define the page dimensions in points (1 point = 1/72 inch).

```typescript
pageSize?: [number, number | "auto"]
```

| Value | Description |
|---|---|
| `MheePDF.A4` | Standard A4 — `[595.27, 841.89]` |
| `[width, height]` | Any custom fixed size in points. |
| `[width, "auto"]` | Auto-height mode — pages grow to fit their content. Ideal for receipts. |

### Common Paper Sizes (in points)

| Format | Width × Height |
|---|---|
| A4 | 595 × 842 |
| A5 | 420 × 595 |
| Letter (US) | 612 × 792 |
| Legal (US) | 612 × 1008 |
| 80mm Thermal | 227 × auto |

## Margins

```typescript
margin?: number | { top?: number; bottom?: number; left?: number; right?: number }
```

Pass a single number for uniform margins, or an object for per-side control. Defaults to `50` points on all sides.

## Rotation

```typescript
rotate?: 0 | 90 | 180 | 270
```

Rotates every page by the specified angle. Use `90` for landscape orientation.

## Auto-Height Mode

When `pageSize` is set to `[width, "auto"]`, each page is sized to exactly contain its content. You can cap the maximum page height with:

```typescript
maxPageHeight?: number  // default: 14400 points
```

## Background Image

```typescript
backgroundImage?: string | Buffer | Uint8Array
```

A background image stretched to cover the full page. Accepts a file path, `Buffer`, or binary array. Useful for letterheads and certificate templates.

## Compression

```typescript
compress?: boolean  // default: true
```

Enables zlib stream compression. Disable only for debugging raw PDF content.

## Full Example

```typescript
import { MheePDF } from "mheepdf";

// 1. A4 Portrait — standard margins
const a4Pdf = new MheePDF({
  pageSize: MheePDF.A4,
  margin: 50,
});
a4Pdf.addText("Standard A4 document.");

// 2. A4 Landscape — via 90° rotation
const landscapePdf = new MheePDF({
  pageSize: MheePDF.A4,
  rotate: 90,
  margin: 40,
});
landscapePdf.addText("Landscape orientation.");

// 3. Thermal receipt — auto-height, narrow width, tight margins
const receiptPdf = new MheePDF({
  pageSize: [227, "auto"],   // 80mm wide
  margin: { top: 10, bottom: 10, left: 8, right: 8 },
  defaultFontSize: 9,
});
receiptPdf.addText("--- RECEIPT ---");
receiptPdf.addText("Item A: 50 THB");
receiptPdf.addText("Item B: 30 THB");
receiptPdf.addText("Total:  80 THB");

// 4. Certificate — custom size + background template image
const certPdf = new MheePDF({
  pageSize: [841.89, 595.27],  // A4 landscape (custom)
  margin: 60,
  backgroundImage: "assets/certificate-bg.png",
  compress: true,
});
certPdf.addText("Certificate of Excellence", { fontSize: 28, align: "center" });
certPdf.addText("Awarded to: Jane Doe", { fontSize: 18, align: "center" });

const buffer = certPdf.generate();
```

> [!TIP]
> For receipts and dynamic-height documents always use `[width, "auto"]` instead of a fixed height. This avoids blank whitespace at the bottom or unexpected page breaks.
