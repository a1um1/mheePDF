# Images

MheePDF supports rendering standard image types inside your generated documents, including PNG, JPEG, and vector SVG files.

## Adding Images

You can add an image using the `addImage` method. It takes the image file path or buffer and a configuration object:

```typescript
pdf.addImage(source, options);
```

### Options

* **`align`**: Alignment of the image on the page (`"left"`, `"center"`, or `"right"`).
* **`width`**: Rendered width of the image.
* **`height`**: Rendered height of the image (if omitted, the image will scale proportionally based on width).

## Example

Here is how you can render different image types:

```typescript
import { MheePDF } from "mheepdf";

const pdf = new MheePDF();

// 1. Add JPEG image aligned to the left
await pdf.addImage("assets/company-logo.jpg", {
  align: "left",
  width: 200,
});

// 2. Add PNG image with transparency aligned to the center
await pdf.addImage("assets/graph.png", {
  align: "center",
  width: 250,
});

// 3. Add SVG vector graphic aligned to the right
await pdf.addImage("assets/illustration.svg", {
  align: "right",
  width: 200,
});
```

*Note: For SVG graphics, MheePDF uses `@resvg/resvg-js` to ensure pixel-perfect vector rasterization.*
