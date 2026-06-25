import { expect, test } from "bun:test";
import { write } from "bun";
import { MheePDF, Table, Text, Line } from "../src";

test("Templating Module: simple string interpolation & dotted paths", async () => {
  const doc = new MheePDF({
    pageSize: [300, "auto"],
    margin: 15,
    defaultFont: "Helvetica",
    defaultFontSize: 10,
    compress: false,
  });

  doc.addText("Hello {{name}}");
  doc.addText("Welcome to {{company.name}} in {{company.location.city}}!");
  doc.addLine({ color: "{{lineColor}}", thickness: 2 });

  const data = {
    name: "A1UM1",
    company: {
      name: "Home",
      location: {
        city: "Bangkok",
      },
    },
    lineColor: "#ff0000",
  };

  const pdfBuf = doc.generate(data);
  await write("test/test-template-basic.pdf", pdfBuf);
  const pdfString = pdfBuf.toString("binary");

  expect(pdfString).toContain("%PDF-1.4");
  expect(pdfString).toContain("Hello A1UM1");
  expect(pdfString).toContain("1.000 0.000 0.000 RG"); // lineColor was successfully interpolated and converted
});

test("Templating Module: Table template row repeating", async () => {
  const doc = new MheePDF({
    pageSize: [300, "auto"],
    margin: 15,
    defaultFont: "Helvetica",
    defaultFontSize: 10,
    compress: false,
  });

  const table = new Table({
    columns: ["*", 50],
    borderWidth: 0,
    padding: 2,
  });
  table.addHeader(["Item Description", "Price"]);

  // Test static rows remain untouched and compiled
  table.addRow(["Static Item", "$1.00"]);

  // Test template rows repeating
  table.addTemplateRow("items", [
    new Text("{{item.name}}"),
    new Text("${{item.price}}", { align: "right" }),
  ]);

  doc.add(table);

  const data = {
    items: [
      { name: "Cappuccino", price: "4.50" },
      { name: "Almond Croissant", price: "3.75" },
    ],
  };

  const pdfBuf = doc.generate(data);
  await write("test/test-template-table.pdf", pdfBuf);
  const pdfString = pdfBuf.toString("binary");

  expect(pdfString).toContain("%PDF-1.4");
  expect(pdfString).toContain("Static Item");
  expect(pdfString).toContain("Cappuccino");
  expect(pdfString).toContain("4.50");
  expect(pdfString).toContain("Almond Croissant");
  expect(pdfString).toContain("3.75");
});

test("Templating Module: general loop repeating via addTemplateLoop", async () => {
  const doc = new MheePDF({
    pageSize: [300, "auto"],
    margin: 15,
    defaultFont: "Helvetica",
    defaultFontSize: 10,
    compress: false,
  });

  doc.addText("Current Task List:");

  // Use general loop to repeat multiple components (Text and Line)
  doc.addTemplateLoop("todos", [
    new Text("- {{item.title}} (Priority: {{item.priority}})"),
    new Line({ thickness: 0.5, color: "#cccccc" }),
  ]);

  const data = {
    todos: [
      { title: "Implement templating", priority: "High" },
      { title: "Write tests", priority: "Medium" },
      { title: "Deploy to NPM", priority: "Low" },
    ],
  };

  const pdfBuf = doc.generate(data);
  await write("test/test-template-loop.pdf", pdfBuf);
  const pdfString = pdfBuf.toString("binary");

  expect(pdfString).toContain("%PDF-1.4");
  expect(pdfString).toContain("Implement templating \\(Priority: High\\)");
  expect(pdfString).toContain("Write tests \\(Priority: Medium\\)");
  expect(pdfString).toContain("Deploy to NPM \\(Priority: Low\\)");
});

test("Templating Module: Image path template deferral & rendering", async () => {
  const doc = new MheePDF({
    pageSize: [300, "auto"],
    margin: 15,
    defaultFont: "Helvetica",
    defaultFontSize: 10,
    compress: false,
  });

  // Image source has a template path
  doc.addImage("{{catImagePath}}", { width: 100 });

  const data = {
    catImagePath: "test/resources/images/test-cat.jpg",
  };

  const pdfBuf = doc.generate(data);
  await write("test/test-template-image.pdf", pdfBuf);
  const pdfString = pdfBuf.toString("binary");

  expect(pdfString).toContain("%PDF-1.4");
  expect(pdfString).toContain("/DCTDecode"); // Verifies JPEG image was successfully parsed and drawn
});

test("Templating Module: document-level batch generation with arrays", async () => {
  const doc = new MheePDF({
    pageSize: [300, 200], // Fixed height to easily track multi-page boundary / batch separation
    margin: 15,
    defaultFont: "Helvetica",
    defaultFontSize: 10,
    compress: false,
  });

  doc.addText("INVOICE");
  doc.addText("Customer: {{customerName}}");
  doc.addText("Amount Due: {{amount}}");

  const batchData = [
    { customerName: "Alice Smith", amount: "$150.00" },
    { customerName: "Bob Jones", amount: "$240.50" },
    { customerName: "Charlie Brown", amount: "$99.99" },
  ];

  const pdfBuf = doc.generate(batchData);
  await write("test/test-template-batch.pdf", pdfBuf);
  const pdfString = pdfBuf.toString("binary");

  expect(pdfString).toContain("%PDF-1.4");
  expect(pdfString).toContain("Alice Smith");
  expect(pdfString).toContain("Bob Jones");
  expect(pdfString).toContain("Charlie Brown");
});
