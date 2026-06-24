# Tables

MheePDF provides a powerful `Table` component to display structured tabular data. It automatically handles text wrapping inside cells and handles page breaks across rows.

## Table Options

When creating a new table, you can configure several styling options:

* **`columns`**: Array defining the columns. You can use absolute widths (e.g. `80`) or proportional weight strings (e.g. `*`, `2*`).
* **`aligns`**: Array defining cell alignments: `"left"`, `"center"`, or `"right"`.
* **`borderWidth`**: Width of borders (e.g., `0.5`).
* **`borderColor`**: Color of table borders (e.g., `#000000`).
* **`backgroundColor`**: Default background color for rows.
* **`alternateRowBackgroundColor`**: Background color for even/odd rows to enable zebra striping.

## Example

Here is a standard example of drawing a table:

```typescript
import { MheePDF, Table } from "mheepdf";

const pdf = new MheePDF();

// 1. Define columns and styling
const table = new Table({
  columns: [80, "2*", "*"],           // 80pt width, double-weight relative, single-weight relative
  aligns: ["center", "left", "right"],
  borderWidth: 0.5,
  borderColor: "#000000",
  backgroundColor: "#ffffff",
  alternateRowBackgroundColor: "#eff6ff", // Zebra stripes (light blue)
});

// 2. Add Header Row
table.addHeader(["ID", "Product Name", "Price"]);

// 3. Add Content Rows
const sampleItems = [
  { code: "P001", name: "Premium Mug", price: "250.00 THB" },
  { code: "P002", name: "Soft Cotton T-Shirt", price: "490.00 THB" },
  { code: "P003", name: "Ergonomic Office Chair", price: "4,500.00 THB" },
];

for (const item of sampleItems) {
  table.addRow([item.code, item.name, item.price]);
}

// 4. Add Table to Document
pdf.add(table);
```
