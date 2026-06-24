# Getting Started

Welcome to **MheePDF (หมี PDF)**, a high-performance TypeScript PDF generation library. 

MheePDF allows you to programmatically build PDF documents with standard layout patterns. It features out-of-the-box support for tables, images, encryption, and custom shaper rules (like Thai language support).

## Installation

You can install MheePDF using your favorite package manager.

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

Here is a basic example of generating a PDF document with MheePDF.

```typescript
import { MheePDF } from "mheepdf";

// 1. Initialize MheePDF Document
const pdf = new MheePDF({
  pageSize: MheePDF.A4,
  defaultFontSize: 18,
  margin: 50,
});

// 2. Add Content
pdf.addText("Hello World");
pdf.addText("Automatic Multiple Line layout is supported out of the box!");
pdf.addText("\n");
pdf.addText("This is simple text rendered inside standard bounding boxes.");

// 3. Generate PDF content (Uint8Array)
const pdfBuffer = await pdf.generatePDFcontent();

// 4. Save file
await Bun.write("test.pdf", pdfBuffer);
```

## Features

Learn how to use specific features:

* [Thai Language Support](./thai)
* [Tables](./tables)
* [Images](./images)
