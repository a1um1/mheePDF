import {
  MheePDF,
  PDFCatalogObject,
  PDFFontObject,
  PDFIndirectStreamObject,
  PDFPageObject,
  PDFPagesObject,
} from "./src";

const pdf = new MheePDF();

const pages = pdf.addObject(
  new PDFPagesObject({
    pages: [],
  }),
);

const font = pdf.addObject(
  new PDFFontObject({
    fontName: "F1",
  }),
);

const text = pdf.addObject(
  new PDFIndirectStreamObject({
    value: "BT /F1 12 Tf 100 700 Td (Hello, Auto-ID World!) Tj ET",
  }),
);

const page = pdf.addObject(
  new PDFPageObject({
    pageSize: [612, 792],
    resources: font,
    Parent: pages,
    Contents: [text],
  }),
);

pages.addPage(page);

const catalog = pdf.addObject(
  new PDFCatalogObject({
    Base: pages,
  }),
);

const content = pdf.generatePDFcontent();

console.log(content);
