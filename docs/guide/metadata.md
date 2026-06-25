# Document Metadata

MheePDF can embed metadata into the PDF's document information dictionary. This metadata is read by PDF viewers (title bar, Properties panel) and search indexers.

## Setting Metadata

Pass an `info` object inside `MheePDFOptions`:

```typescript
const pdf = new MheePDF({
  info: {
    title: "...",
    author: "...",
    // ...
  },
});
```

## Options

| Field | Type | Description |
|---|---|---|
| `title` | `string` | Document title displayed in the viewer title bar. |
| `author` | `string` | Name of the document author or organization. |
| `subject` | `string` | Short description of the document's subject. |
| `keywords` | `string` | Space or comma-separated keywords for search indexing. |
| `creator` | `string` | Name of the application that created the original content. |
| `producer` | `string` | Name of the software that produced the PDF (defaults to MheePDF if omitted). |
| `creationDate` | `Date` | Date and time the document was originally created. |
| `modDate` | `Date` | Date and time the document was last modified. |

## Example

```typescript
import { MheePDF } from "mheepdf";

const pdf = new MheePDF({
  pageSize: MheePDF.A4,
  margin: 50,
  info: {
    title: "Q2 2026 Financial Report",
    author: "Finance Department — Acme Corp",
    subject: "Quarterly financial summary for Q2 2026",
    keywords: "finance, report, quarterly, acme, 2026",
    creator: "Acme Reporting Suite v3",
    producer: "MheePDF",
    creationDate: new Date("2026-07-01T09:00:00Z"),
    modDate: new Date(),
  },
});

pdf.addText("Q2 2026 Financial Report", { fontSize: 24 });
pdf.addText("Prepared by the Finance Department.");

const buffer = pdf.generate();
```

After opening the generated PDF, the viewer's **File → Properties** (or **⌘I** on macOS) panel will show all of these fields.

> [!TIP]
> Setting `title` and `keywords` is especially useful for documents that will be stored in a DMS (document management system) or indexed by search engines via PDF parsing.
