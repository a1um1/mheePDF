import { MheePDF } from "mheepdf";
import { write } from "bun";

// 1. Initialize MheePDF Document with password encryption and restricted permissions
const pdf = new MheePDF({
  pageSize: MheePDF.A4,
  margin: 50,
  defaultFont: "Helvetica",
  defaultFontSize: 12,
  compress: false, // Set to false to easily inspect standard PDF structure
  encrypt: {
    userPassword: "student123", // Password required to open/view the document
    ownerPassword: "admin123",   // Password required to change permissions/decrypt
    permissions: {
      print: "low",             // Allow low-resolution printing only
      copy: false,              // Disallow copying text/graphics
      modify: false,            // Disallow editing document contents
      annot: false,             // Disallow adding annotations/comments
    },
  },
  info: {
    title: "Secure Encrypted Document",
    author: "MheePDF Security Service",
  },
});

// 2. Add content
pdf.addText("SECURE & ENCRYPTED PDF", { fontSize: 24, align: "center" });
pdf.addText("\n\n");
pdf.addText("This document demonstrates the built-in PDF encryption features of MheePDF.");
pdf.addText("Standard 128-bit RC4 encryption is used to secure the contents from unauthorized access.");
pdf.addText("\n");
pdf.addText("Security Configuration:", { fontSize: 16 });
pdf.addText("- User Password: 'student123' (required to open and view)");
pdf.addText("- Owner Password: 'admin123' (required to edit security settings)");
pdf.addText("- Print Quality: Restricted to 'low' resolution");
pdf.addText("- Text Selection / Copying: Disabled");
pdf.addText("- Annotations / Modifying: Disabled");
pdf.addText("\n");
pdf.addText("In an encrypted PDF, the catalog, info dictionary, page objects, and page contents streams are encrypted, ensuring absolute privacy for sensitive documents like medical records, certificates, and payroll slips.");

// 3. Generate and write the PDF
const pdfBuffer = pdf.generate();
await write("docs/public/examples/encrypt.pdf", pdfBuffer);
console.log("Generated encrypted PDF successfully!");
