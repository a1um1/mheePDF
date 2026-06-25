import { MheePDF, Table, Text, PDFType0FontObject } from "mheepdf";
import { write } from "bun";
import { readFileSync } from "fs";

// 1. Load TrueType Fonts (TTF) for multilingual rendering
const sarabunRegBuffer = readFileSync("test/resources/fonts/THSarabunNew.ttf");
const sarabunBoldBuffer = readFileSync("test/resources/fonts/THSarabunNew Bold.ttf");
const googleSansBuffer = readFileSync("test/resources/fonts/GoogleSans_17pt-Regular.ttf");

const fontRegular = new PDFType0FontObject(sarabunRegBuffer);
const fontBold = new PDFType0FontObject(sarabunBoldBuffer);
const fontSans = new PDFType0FontObject(googleSansBuffer);

// 2. Initialize MheePDF Document with 72mm printable width (for 80mm thermal paper) and auto height
// 72mm = 72 * (72 / 25.4) = 204.09 pt
const width = 72 * (72 / 25.4);
const pdf = new MheePDF({
  pageSize: [width, "auto"],
  margin: 10,
  defaultFont: fontRegular,
  fonts: [fontRegular, fontBold, fontSans],
  defaultFontSize: 8,
  defaultLineHeight: 12,
  compress: false,
});

// 3. Define Cute Bear Logo in SVG format
const svgLogo = `
<svg width="128" height="128" style="enable-background:new 0 0 128 128;" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <g>
    <g>
      <path d="M127.55,66.02c-0.51-8.7-2.97-17.53-7.01-25.55c0.14-0.18,0.27-0.37,0.4-0.56l0.39-0.56 c0.9-1.42,1.61-2.95,2.24-4.5c2.88-7.21,2.94-15.27-0.69-21.16c-2.56-4.17-12.73-14.98-28.77-5.85c-3.78,2.16-7.29,2.3-9.29,2.14 c-6.68-2.03-13.79-3.07-20.84-3.06c-7.68-0.02-15.43,1.21-22.63,3.62c-2.02,0.14-5.47-0.05-9.15-2.15 c-16.04-9.14-26.2,1.68-28.78,5.85c-1.11,1.8-1.94,4-2.37,6.07C0.26,24.26,0.6,28.65,1.75,32.5c0.62,2.05,1.53,3.98,2.49,5.9 c0.62,1.27,1.27,2.53,2.06,3.69c0.08,0.13,0.14,0.25,0.21,0.37C3.05,49.94,0.9,58.03,0.44,66.02 c-0.95,16.27,1.9,32.65,15.06,43.97c7.29,6.26,16.35,10.52,25.7,12.81c3.55,0.88,12.72,2.92,22.35,2.92 c9.61,0,19.69-2.04,23.24-2.92c9.34-2.29,18.41-6.54,25.7-12.81C125.65,98.68,128.52,82.29,127.55,66.02z" style="fill:#855C52;"/>
      <ellipse cx="28.25" cy="70.8" rx="6.76" ry="8.1" style="fill:#2F2F2F;"/>
      <path d="M63.68,109.12c-13.41,0-24.26-4.85-24.26-19.76c0-14.92,10.85-27.01,24.26-27.01 c13.4,0,24.28,12.09,24.28,27.01C87.96,104.27,77.08,109.12,63.68,109.12z" style="fill:#FFFFFF;"/>
      <path d="M99.03,78.9c-3.72,0-6.76-3.62-6.76-8.09c0-4.48,3.04-8.1,6.76-8.1c3.74,0,6.77,3.63,6.77,8.1 C105.8,75.28,102.77,78.9,99.03,78.9z" style="fill:#2F2F2F;"/>
      <path d="M63.68,89.04c6.36,0,11.52-4.15,11.52-9.27c0-5.13-5.16-9.27-11.52-9.27s-11.5,4.15-11.5,9.27 C52.18,84.89,57.32,89.04,63.68,89.04z" style="fill:#2F2F2F;"/>
      <path d="M73.94,94.87c-0.13,0.18-3.15,4.34-10.26,4.34c-7.06,0-10.09-4.13-10.23-4.34 c-0.7-1-2.07-1.27-3.09-0.58c-1.02,0.69-1.28,2.08-0.59,3.09c0.17,0.26,4.36,6.27,13.91,6.27c9.56,0,13.75-6.02,13.93-6.27 c0.68-1.01,0.43-2.37-0.58-3.07C76.03,93.62,74.64,93.88,73.94,94.87z" style="fill:#2F2F2F;"/>
    </g>
    <path d="M29.62,21.2c-1.27,1.34-3.22,2.54-4.15,3.38c-2.08,1.88-3.65,4.35-5.12,6.71 c-2.13,3.41-4.84,1.32-6.3-1.34c-0.17-0.3-0.32-0.61-0.46-0.92c-0.54-1.29-0.83-2.7-0.83-4.1c0-5.69,4.55-10.29,10.15-10.29 c1.92,0,4.21,0.75,5.91,1.77c0.17,0.1,0.38,0.19,0.53,0.3C31.56,18.19,30.98,19.77,29.62,21.2z" style="fill:#B89278;"/>
    <path d="M113.71,29.03c-0.05,0.12-0.11,0.25-0.18,0.38c-1.38,2.9-4.31,5.52-6.58,1.89 c-1.48-2.36-3.04-4.83-5.12-6.71c-0.93-0.84-2.89-2.04-4.16-3.38c-1.35-1.43-1.93-3.01,0.28-4.49c0.27-0.18,0.58-0.34,0.9-0.51 c1.67-0.91,3.76-1.56,5.54-1.56c5.61,0,10.15,4.6,10.15,10.29C114.53,26.34,114.26,27.74,113.71,29.03z" style="fill:#B89278;"/>
  </g>
</svg>
`;

// Add Logo
pdf.addImage(svgLogo, { width: 40, align: "center" });
pdf.addText("\n");

// Add Header Information
pdf.addText("MHEE CAFE & RESTAURANT", { font: fontSans, fontSize: 11, align: "center" });
pdf.addText("หมีคาเฟ่ - สาขาใหญ่ กรุงเทพฯ", { font: fontBold, fontSize: 10, align: "center" });
pdf.addText("123 ถ.สุขุมวิท แขวงคลองเตย เขตคลองเตย กทม. 10110", {
  font: fontRegular,
  fontSize: 7,
  align: "center",
});
pdf.addText("Tel: 02-123-4567 | TAX ID: 0105560123456", {
  font: fontRegular,
  fontSize: 7,
  align: "center",
});
pdf.addText("ใบเสร็จรับเงิน / ใบกำกับภาษีอย่างย่อ", { font: fontBold, fontSize: 8, align: "center" });
pdf.addText("TAX INVOICE (ABB.)", { font: fontSans, fontSize: 7, align: "center" });

// Separator
pdf.addLine({ color: "#64748b", dash: "dashed", height: 10 });

// Metadata Table
const metaTable = new Table({
  columns: ["*", "*"],
  borderWidth: 0,
  padding: 1,
});
metaTable.addRow([
  new Text("Date: 25/06/2026 18:30", { font: fontRegular, fontSize: 7 }),
  new Text("Table: T05 (10 Pax)", { font: fontRegular, fontSize: 7, align: "right" }),
]);
metaTable.addRow([
  new Text("Receipt: #ABB-20260625-08", { font: fontRegular, fontSize: 7 }),
  new Text("Cashier: Mhee Som", { font: fontRegular, fontSize: 7, align: "right" }),
]);
pdf.add(metaTable);

// Separator
pdf.addLine({ color: "#64748b", dash: "dashed", height: 10 });

// Items Table Header
const itemsTable = new Table({
  columns: ["*", 20, 45],
  borderWidth: 0,
  padding: { top: 2, bottom: 2, left: 0, right: 0 },
  aligns: ["left", "center", "right"],
});
itemsTable.addRow([
  new Text("รายการ / Description", { font: fontBold, fontSize: 7.5 }),
  new Text("Qty", { font: fontBold, fontSize: 7.5, align: "center" }),
  new Text("บาท / Amt", { font: fontBold, fontSize: 7.5, align: "right" }),
]);

// 20 Menu Items (Big Dinner)
const items = [
  { name: "แกงส้มชะอมกุ้ง / Sour Curry w. Shrimp", qty: 1, price: 180 },
  { name: "ปลากะพงทอดน้ำปลา / Fried Seabass", qty: 1, price: 450 },
  { name: "ต้มยำกุ้งมะพร้าวอ่อน / Spicy Shrimp Soup", qty: 1, price: 250 },
  { name: "ผัดไทยกุ้งสด / Pad Thai w. Fresh Shrimp", qty: 2, price: 120 },
  { name: "ปูดองน้ำปลา / Pickled Crab", qty: 1, price: 350 },
  { name: "ผัดผักบุ้งไฟแดง / Stir-Fried Morning Glory", qty: 1, price: 80 },
  { name: "ข้าวผัดปูจานใหญ่ / Crab Fried Rice (L)", qty: 1, price: 220 },
  { name: "คอหมูย่าง / Grilled Pork Neck", qty: 2, price: 100 },
  { name: "ส้มตำไทยไข่เค็ม / Papaya Salad w. Egg", qty: 2, price: 85 },
  { name: "ลาบหมู / Spicy Minced Pork Salad", qty: 1, price: 90 },
  { name: "ทอดมันกุ้ง / Deep Fried Shrimp Cakes", qty: 1, price: 150 },
  { name: "ยำวุ้นเส้นทะเล / Spicy Seafood Glass Noodle", qty: 1, price: 140 },
  { name: "หอยนางรมสด / Fresh Oysters", qty: 6, price: 60 },
  { name: "ข้าวสวย (โถ) / Steamed Rice (Bowl)", qty: 1, price: 60 },
  { name: "น้ำมะพร้าวปั่น / Coconut Smoothie", qty: 4, price: 75 },
  { name: "ชาไทยเย็น / Iced Thai Milk Tea", qty: 3, price: 60 },
  { name: "เบียร์สิงห์ / Singha Beer", qty: 3, price: 95 },
  { name: "บัวลอยมะพร้าวอ่อน / Rice Balls in Coconut Milk", qty: 4, price: 50 },
  { name: "ข้าวเหนียวมะม่วง / Mango Sticky Rice", qty: 2, price: 120 },
  { name: "น้ำเปล่าและน้ำแข็ง / Water & Ice Bucket", qty: 1, price: 50 },
];

let subtotal = 0;
for (const item of items) {
  const amt = item.qty * item.price;
  subtotal += amt;
  itemsTable.addRow([
    new Text(item.name, { font: fontRegular, fontSize: 7 }),
    new Text(item.qty.toString(), { font: fontRegular, fontSize: 7, align: "center" }),
    new Text(amt.toFixed(2), { font: fontRegular, fontSize: 7, align: "right" }),
  ]);
}
pdf.add(itemsTable);

// Separator
pdf.addLine({ color: "#64748b", dash: "dashed", height: 10 });

// Summary calculations (VAT 7% included/excluded - we calculate as VAT 7% on top)
const vatRate = 0.07;
const vat = subtotal * vatRate;
const total = subtotal + vat;

const summaryTable = new Table({
  columns: ["*", 70, 45],
  borderWidth: 0,
  padding: 1,
  aligns: ["left", "right", "right"],
});
summaryTable.addRow(["", "Subtotal:", subtotal.toFixed(2)]);
summaryTable.addRow(["", "VAT (7%):", vat.toFixed(2)]);
summaryTable.addRow([
  "",
  new Text("Total / ยอดรวม:", { font: fontBold, fontSize: 8 }),
  new Text(total.toFixed(2), { font: fontBold, fontSize: 8, align: "right" }),
]);
pdf.add(summaryTable);

// Separator
pdf.addLine({ color: "#64748b", dash: "dashed", height: 10 });

// Footer thank you messages
pdf.addText("Thank you / ขอบคุณที่มาอุดหนุน", { font: fontBold, fontSize: 8.5, align: "center" });
pdf.addText("Please come again next time!", {
  font: fontSans,
  fontSize: 7,
  align: "center",
  color: "#475569",
});
pdf.addText("\n");
pdf.addText("Powered by MheePDF", {
  font: fontSans,
  fontSize: 6.5,
  align: "center",
  color: "#94a3b8",
});

// 4. Generate and save PDF
const pdfBuffer = pdf.generate();
await write("docs/public/examples/receipt.pdf", pdfBuffer);
console.log("Generated receipt.pdf successfully!");
