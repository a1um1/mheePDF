import { MheePDF, PDFType0FontObject } from "mheepdf";
import { write } from "bun";
import { readFileSync } from "fs";

// 1. Load Thai TrueType Fonts (TTF) from local assets
const sarabunRegBuffer = readFileSync("test/resources/fonts/THSarabunNew.ttf");
const sarabunBoldBuffer = readFileSync("test/resources/fonts/THSarabunNew Bold.ttf");
const googleSansBuffer = readFileSync("test/resources/fonts/GoogleSans_17pt-Regular.ttf");

const sarabunReg = new PDFType0FontObject(sarabunRegBuffer);
const sarabunBold = new PDFType0FontObject(sarabunBoldBuffer);
const googleSans = new PDFType0FontObject(googleSansBuffer);

// 2. Initialize MheePDF Document with A4 landscape and a background image
// A4 landscape dimensions: [841.89, 595.27]
const pdf = new MheePDF({
  pageSize: [841.89, 595.27],
  margin: { top: 120, bottom: 60, left: 120, right: 120 },
  defaultFont: sarabunReg,
  fonts: [sarabunReg, sarabunBold, googleSans],
  defaultFontSize: 18,
  defaultLineHeight: 24,
  compress: false,
  backgroundImage: "test/resources/images/certificate_bg.png",
});

// 3. Define the template layout (with curly braces template variables)
pdf.addText("สถาบันอบรมคอมพิวเตอร์และเทคโนโลยี MheePDF", {
  fontSize: 16,
  align: "center",
  color: "#374151",
});

// Small vertical spacer
pdf.addText("\n", { fontSize: 8 });

pdf.addText("ประกาศนียบัตร", {
  font: sarabunBold,
  fontSize: 48,
  align: "center",
  color: "#111827",
});

pdf.addText("ฉบับนี้ให้ไว้เพื่อแสดงว่า", {
  fontSize: 18,
  align: "center",
  color: "#4b5563",
});

pdf.addText("\n", { fontSize: 12 });

pdf.addText("{{ studentName }}", {
  font: sarabunBold,
  fontSize: 36,
  align: "center",
  color: "#1e3a8a",
});
pdf.addText("\n", { fontSize: 6 });

pdf.addText("ได้ผ่านการฝึกอบรมหลักสูตรการพัฒนาเอกสาร PDF ด้วยภาษา TypeScript", {
  fontSize: 18,
  align: "center",
  color: "#374151",
});
pdf.addText("\n", { fontSize: 20 });

pdf.addText("{{ courseName }}", {
  font: sarabunBold,
  fontSize: 22,
  align: "center",
  color: "#854d0e",
});

pdf.addText("\n", { fontSize: 24 });

pdf.addText("ให้ไว้ ณ วันที่ {{ date }}", {
  fontSize: 16,
  align: "center",
  color: "#4b5563",
});

// Signature spacer
pdf.addText("\n", { fontSize: 32 });

pdf.addText("{{ instructor }}", {
  font: sarabunBold,
  fontSize: 16,
  align: "center",
  color: "#374151",
});

pdf.addText("ผู้อำนวยการสถาบัน MheePDF", {
  fontSize: 14,
  align: "center",
  color: "#6b7280",
});

// 4. Generate PDF by passing the template data object
const studentData = {
  studentName: "เอลูมีนา",
  courseName: "หลักสูตรพัฒนาและออกรายงาน PDF ขั้นสูง (MheePDF Developer)",
  date: "25 มิถุนายน พ.ศ. 2569",
  instructor: "ดร. หมี นักพัฒนาซอฟต์แวร์",
};

const pdfBuffer = pdf.generate(studentData);
await write("docs/public/examples/certificate.pdf", pdfBuffer);
console.log("Generated student certificate PDF successfully!");
