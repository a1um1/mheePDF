# Templates & Loops

MheePDF has a built-in templating system for generating data-driven documents. Instead of building a new `MheePDF` instance for every record, you define the layout once and pass your data at generation time.

## How It Works

There are two main concepts:

1. **Variable Interpolation** — embed `&#123;&#123;variable.path&#125;&#125;` placeholders in text strings. They are resolved against the data you pass to `generate()`.
2. **Template Loops** — use `addTemplateLoop` to repeat a set of components (or table rows) for every item in an array inside your data.

## Variable Interpolation

Any string argument (text content, image path, color) can contain `&#123;&#123;...&#125;&#125;` placeholders:

```typescript
pdf.addText("Invoice for: {{customer.name}}");
pdf.addText("Date: {{date}}");
```

Inside a loop, you can also access the current iteration item via the `item` prefix:

```typescript
// inside addTemplateLoop — refers to current array item
pdf.addText("{{item.product}} — {{item.price}} THB");
```

When you call `generate(data)`, the placeholders are resolved against `data`:

```typescript
pdf.generate({
  customer: { name: "Acme Corp" },
  date: "2026-06-25",
});
```

## `addTemplateLoop(arrayPath, components)`

Repeats a list of components for every element in a nested array of your data.

| Parameter | Type | Description |
|---|---|---|
| `arrayPath` | `string` | Dot-separated path to the array in your data object (e.g. `"items"`, `"order.lines"`). |
| `components` | `Component[]` | Components to render once per array element. Use `&#123;&#123;item.*&#125;&#125;` inside them. |

## Table Row Loops

For tables, call `table.addTemplateRows(arrayPath, cellTemplates)` to repeat rows from an array:

```typescript
table.addTemplateRows("items", [
  new Text("{{item.name}}"),
  new Text("{{item.qty}}"),
  new Text("{{item.price}}"),
]);
```

## Example

```typescript
import { MheePDF, Table, Text } from "mheepdf";

// 1. Define the template (once)
const pdf = new MheePDF<{
  customer: { name: string; address: string };
  invoiceNo: string;
  items: { name: string; qty: number; price: string }[];
}>({
  pageSize: MheePDF.A4,
  margin: 50,
  defaultFontSize: 12,
});

pdf.addText("INVOICE #{{invoiceNo}}", { fontSize: 20 });
pdf.addText("Bill to: {{customer.name}}");
pdf.addText("{{customer.address}}");
pdf.addText("\n");

// Table with a header + looped data rows
const table = new Table({
  columns: ["2*", "*", "*"],
  aligns: ["left", "center", "right"],
  borderWidth: 0.5,
  alternateRowBackgroundColor: "#f8fafc",
});
table.addHeader(["Product", "Qty", "Price"]);
table.addTemplateRows("items", [
  new Text("{{item.name}}"),
  new Text("{{item.qty}}"),
  new Text("{{item.price}}"),
]);
pdf.add(table);

// 2. Generate with real data (one set → one document)
const singleBuffer = pdf.generate({
  invoiceNo: "INV-0042",
  customer: { name: "Acme Corp", address: "123 Main St, Bangkok" },
  items: [
    { name: "Widget A", qty: 3, price: "150.00 THB" },
    { name: "Widget B", qty: 1, price: "320.00 THB" },
  ],
});

// 3. Generate for multiple customers in one call (each gets its own page group)
const batchBuffer = pdf.generate([
  {
    invoiceNo: "INV-0043",
    customer: { name: "Beta Ltd", address: "456 River Rd, Chiang Mai" },
    items: [{ name: "Gadget X", qty: 2, price: "890.00 THB" }],
  },
  {
    invoiceNo: "INV-0044",
    customer: { name: "Gamma Co", address: "789 Hill Ave, Phuket" },
    items: [{ name: "Part Y", qty: 10, price: "45.00 THB" }],
  },
]);
```

> [!TIP]
> `generate(data[])` appends each dataset's pages sequentially into a **single PDF file** — ideal for batch-printing invoices or receipts.
