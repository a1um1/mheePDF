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

// 2. Initialize MheePDF Document with loaded custom fonts
const pdf = new MheePDF({
  pageSize: MheePDF.A4,
  margin: 50,
  defaultFont: sarabunReg,
  fonts: [sarabunReg, sarabunBold, googleSans],
  defaultFontSize: 16,
  defaultLineHeight: 22,
  compress: false,
});

// 3. Add text with Thai font, headings, and automatic segmenter wrapping
pdf.addText("การพิมพ์ภาษาไทยด้วย MheePDF", { font: sarabunBold, fontSize: 28, align: "center" });
pdf.addText("\n");

pdf.addText("รองรับฟอนต์ภาษาไทยและระบบตัดคำอัจฉริยะ", {
  font: googleSans,
  fontSize: 18,
  align: "center",
  color: "#3b82f6",
});
pdf.addText("\n");

pdf.addText("เปรียบเทียบขนาดตัวอักษรและสไตล์ฟอนต์ต่างๆ:", { font: sarabunBold, fontSize: 18 });
pdf.addText("• ฟอนต์ TH Sarabun New ตัวปกติขนาด 16pt - ใช้สำหรับเนื้อหาทั่วไปในภาษาไทย");
pdf.addText("• ฟอนต์ TH Sarabun New ตัวหนาขนาด 18pt - ใช้สำหรับหัวข้อย่อย", {
  font: sarabunBold,
  fontSize: 18,
});
pdf.addText("• ฟอนต์ Google Sans ขนาด 16pt - เหมาะสำหรับการออกแบบสไตล์โมเดิร์นและการผสมคำภาษาอังกฤษ", {
  font: googleSans,
});

pdf.addText("\n");
pdf.addText("ตัวอย่างการตัดคำเมื่อบรรทัดสิ้นสุดลง:", { font: sarabunBold, fontSize: 18 });
pdf.addText(
  "ภาษาไทยเขียนติดต่อกันโดยไม่มีช่องว่างระหว่างคำ ดังนั้นระบบจัดหน้าจำเป็นต้องรู้ตำแหน่งตัดคำที่เหมาะสม สังเกตว่าประโยคนี้จะค่อยๆ ถูกตัดคำและแบ่งบรรทัดให้อย่างเป็นธรรมชาติโดยไม่ตัดคำครึ่งกลางพยางค์หรือทำให้วรรณยุกต์ลอยหายไป",
  { color: "#4b5563" },
);

pdf.addText("\n");
pdf.addText("Lorem Ipsum:", { font: sarabunBold, fontSize: 18 });
pdf.addText(
  `แซวคูลเลอร์ แพทยสภาสเตอริโอวอลซ์ ราเม็งสปายเย้ว โชห่วยบุ๋นสปา เกมส์เทรนด์ ซามูไรเทรนด์โอเพ่นแบรนด์ บุญคุณศึกษาศาสตร์ก่อนหน้า บาร์บีคิว แพลนจิ๊กแคนยอนวาริชศาสตร์ จิ๊กฟีเวอร์ยอมรับแซวซิตี้ เวอร์ โค้กแอปเปิ้ลล้มเหลว กรอบรูปอุปสงค์ปัจเจกชน มอนสเตอร์ช็อปทีวีน็อก น็อคฟยอร์ดสติกเกอร์ละติน แลนด์มิลค์ม้าหินอ่อน

ฟอร์มแซมบ้าวาฟเฟิลมาร์เก็ตพาร์ บาบูนสงบสุขซูโม่ โบว์โอ้ยแฟรี่อยุติธรรม โบรชัวร์เอ๋อออทิสติกหม่านโถว สะเด่าความหมายศิลปวัฒนธรรม สปอตโปรเจ็คออทิสติกดัมพ์ อพาร์ทเมนท์โหงวพันธกิจหลวงปู่ เดชานุภาพสึนามิการันตีมวลชน อุปัทวเหตุนพมาศ ไนท์ แฟ็กซ์ สมิติเวชฮิบรูริคเตอร์ เที่ยงคืนสุริยยาตร์อาร์ติสต์ปิโตรเคมี ฮ็อตออเดอร์ ยิมออสซี่คอมพ์โมเดล บึ้มตะหงิดโฮสเตสโซน

วืดหล่อฮังก้วยชิฟฟอนฟลุตแทคติค ทอร์นาโดช็อปเปอร์โอเลี้ยง นินจาชะโนด แซวอยุติธรรม ไวอากร้าแครอทแจ็กพ็อต อุปัทวเหตุโปลิศสเตชั่นแดรี่ โยเกิร์ตเนอะ อันเดอร์เก๊ะเที่ยงคืนจังโก้ตะหงิด มาม่ารีไทร์ สเปกคำสาปแซมบ้าวิกดยุก เรซิน อึ้มคอนเฟิร์มอะคอมเพล็กซ์แมชชีน เซฟตี้โรแมนติกป่าไม้ ธุรกรรม ช็อปหมั่นโถวหยวนมิวสิค เพลซพรีเมียมล้มเหลว

จิตพิสัย ว่ะแพนงเชิญ การันตีโมจิไบโอบัลลาสต์ ท็อปบู๊ทสคริปต์โพสต์บาร์บีคิว ไพลินโฮสเตสแอดมิชชั่นเทวา อาว์โรแมนติกซูโม่เสกสรรค์โอเวอร์ ชะโนดวัจนะพอเพียงเอาต์ หมวยแลนด์แคมป์บอยคอตเฮีย โกเต็กซ์ไคลแม็กซ์ วอลนัทเยอบีร่าอัลไซเมอร์แดนเซอร์ตุ๊ด อมาตยาธิปไตยพาสปอร์ตหน่อมแน้มน็อก โอเปร่าอพาร์ตเมนต์เช็กธัมโมแฟกซ์ สแล็กอึ๋มจีดีพีสคริปต์ช็อปเปอร์ ไหร่แช่แข็งม้านั่ง ไรเฟิลโฮปแฟลชสะบึมส์ ตัวเองแซนด์วิชยอมรับคาสิโน

โมเดล สามช่าอิสรชน แตงกวามยุราภิรมย์เซ็กซี่รามเทพโคโยตี้ นาฏยศาลาสันทนาการเฟรช อพาร์ทเมนท์ไลท์แคมปัสอยุติธรรมโบว์ ออร์แกนซันตาคลอสโดนัทผ้าห่มมั้ย แอปเปิ้ลแดนเซอร์เฟิร์มวโรกาสเบนโตะ ลอร์ดซิตี้สแตนดาร์ดแคนู แบล็ก มหภาคเทรด ติ๋มฮาร์ดแผดเผาบูติก ช็อปปิ้งแล็บเทอร์โบเพลซ ฮิเคอร์ฟิว จัมโบ้สต็อคไลน์ปักขคณนา ทัวร์นาเมนท์ออโต้เทปมัฟฟิน ซัมเมอร์โฮลวีต`,
);

// 4. Generate the PDF bytes
const pdfBuffer = pdf.generate();

// 5. Save the generated PDF file
await write("docs/public/examples/thai.pdf", pdfBuffer);
console.log("Generated thai.pdf successfully!");
