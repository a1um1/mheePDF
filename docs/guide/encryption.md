# Encryption & Security

MheePDF supports RC4-based PDF encryption (PDF 1.4 standard), allowing you to protect documents with user and owner passwords and restrict what readers can do with the file.

> [!IMPORTANT]
> Encryption is configured in the `MheePDF` constructor. It cannot be added after `generate()` has been called.

## How It Works

When encryption is enabled:
- A **user password** controls who can *open* the document.
- An **owner password** controls who can change *permissions* (e.g. remove restrictions via a PDF editor).
- **Permission flags** let you restrict printing, content copying, annotations, and modifications.

If only `userPassword` is set, the owner password defaults to an empty string (anyone with a PDF editor can remove restrictions). Set both for stronger control.

## Options

Pass an `encrypt` object inside `MheePDFOptions`:

```typescript
encrypt?: {
  userPassword?: string;
  ownerPassword?: string;
  permissions?: { ... };
}
```

### Permissions

<details>
<summary><strong>permissions</strong></summary>

| Option | Type | Default | Description |
|---|---|---|---|
| `print` | `"none" \| "low" \| "high"` | `"high"` | `"none"` disables printing entirely. `"low"` allows low-res print (screen). `"high"` allows full printing. |
| `modify` | `boolean` | `true` | Allow modification of document content. |
| `copy` | `boolean` | `true` | Allow copying text and graphics. |
| `annot` | `boolean` | `true` | Allow adding or modifying annotations and form fields. |

</details>

## Example

```typescript
import { MheePDF } from "mheepdf";

// 1. Fully protected — requires password to open, prevents printing & copying
const securePdf = new MheePDF({
  pageSize: MheePDF.A4,
  encrypt: {
    userPassword: "open1234",
    ownerPassword: "admin9876",
    permissions: {
      print: "none",
      modify: false,
      copy: false,
      annot: false,
    },
  },
});

securePdf.addText("This document is confidential.");
securePdf.addText("Password required to open.");
const secureBuffer = securePdf.generate();

// 2. View-only — no password to open, but copying and printing are disabled
const readonlyPdf = new MheePDF({
  pageSize: MheePDF.A4,
  encrypt: {
    permissions: {
      print: "none",
      copy: false,
    },
  },
});

readonlyPdf.addText("You can read this document, but not copy or print it.");
const readonlyBuffer = readonlyPdf.generate();

// 3. Print-allowed, no modifications
const printablePdf = new MheePDF({
  pageSize: MheePDF.A4,
  encrypt: {
    userPassword: "print2026",
    permissions: {
      print: "high",
      modify: false,
      copy: false,
    },
  },
});

printablePdf.addText("Printable invoice — modifications restricted.");
const printableBuffer = printablePdf.generate();
```

> [!NOTE]
> RC4 encryption satisfies most practical access-control needs. For highly sensitive content requiring AES-256 (PDF 2.0), consider a post-processing tool such as `qpdf`.
