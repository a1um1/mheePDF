# Getting Started

Welcome to **MheePDF (หมี PDF)**, a high-performance TypeScript PDF generation library built for server-side and browser environments.

MheePDF lets you programmatically build professional PDF documents — from simple reports to complex, data-driven invoices and certificates — with an ergonomic, chainable API.

## What's Included

- 📄 **Multi-page layout** — automatic page breaking and content flow
- 📊 **Tables** — column weights, zebra stripes, cell padding, header repeat
- 🖼️ **Images** — PNG, JPEG, and native SVG vector rendering
- ✏️ **Lines** — solid, dashed, dotted horizontal dividers
- 🇹🇭 **Thai language** — correct vowel and tone-mark placement via HarfBuzz
- 🔐 **Encryption** — RC4 password protection with permission flags
- 🔄 **Templates & loops** — `&#123;&#123;variable&#125;&#125;` interpolation and array-driven row generation
- 📏 **Flexible page sizing** — fixed, landscape, auto-height (receipts), custom paper
- 🖼️ **Background images** — full-page letterheads and certificate templates
- 📝 **Document metadata** — title, author, keywords, dates
- 🗜️ **Compression** — zlib stream compression by default

## Installation

Install MheePDF using your favorite package manager:

::: code-group

```bash [bun]
bun add mheepdf
```

```bash [npm]
npm install mheepdf
```

```bash [pnpm]
pnpm add mheepdf
```

```bash [yarn]
yarn add mheepdf
```

:::

## Basic Usage

Here is a minimal example to generate your first PDF:

```typescript
import { MheePDF } from "mheepdf";

// 1. Create a document
const pdf = new MheePDF({
  pageSize: MheePDF.A4,
  margin: 50,
  defaultFontSize: 12,
});

// 2. Add content
pdf.addText("Hello World", { fontSize: 24 });
pdf.addText("MheePDF handles multi-line text wrapping automatically.");
pdf.addText("\n");
pdf.addText("Build invoices, reports, receipts, and certificates with ease.");

// 3. Generate and save
const pdfBuffer = pdf.generate();
await Bun.write("hello.pdf", pdfBuffer);
```

## Feature Guides

Explore the full feature set:

* [Thai Language Support](./thai)
* [Tables](./tables)
* [Images](./images)
* [Lines](./line)
* [SVG Vector Graphics](./svg)
* [Encryption & Security](./encryption)
* [Templates & Loops](./templates)
* [Page Options](./page-options)
* [Document Metadata](./metadata)
