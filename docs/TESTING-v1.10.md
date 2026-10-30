# การตรวจ HRVec-Andaman2 รุ่น 1.10

ตรวจเมื่อ 29 ตุลาคม 2569

## การทดสอบที่ดำเนินการ

- `npm run check` ผ่านการตรวจ syntax ทุกโมดูลหน้าเว็บและไฟล์ service / bootstrap ที่โครงการกำหนด
- `TZ=Asia/Bangkok node --test --test-reporter=tap tests/*.test.mjs`: 106 ผ่าน, fail 0
- `TZ=UTC node --test --test-reporter=tap tests/*.test.mjs`: 106 ผ่าน, fail 0
- `tests/schools-db.mjs`: 76 PostgreSQL assertions ผ่าน
- `tests/institute-db.mjs`: 40 PostgreSQL assertions ผ่าน
- `tests/v110-db.mjs`: 15 PostgreSQL assertions ผ่าน รวมติดตั้งใหม่ อัปเกรดซ้ำ เก็บข้อมูลเดิม ช่องใหม่ ประวัติ revision สิทธิ์เจ้าหน้าที่และบุคลากร การปฏิเสธ anonymous และ RLS

ฐานข้อมูลแยกใช้ PGlite โดยไม่สร้างบัญชีหรือรายชื่อทดสอบในโครงการจริง Workflow ติดตั้ง dependency รุ่นที่ระบุในโฟลเดอร์ชั่วคราวของ GitHub Actions

```sh
HR_PGLITE_MODULE=/absolute/path/to/@electric-sql/pglite/dist/index.js node tests/schools-db.mjs
HR_PGLITE_MODULE=/absolute/path/to/@electric-sql/pglite/dist/index.js node tests/institute-db.mjs
HR_PGLITE_MODULE=/absolute/path/to/@electric-sql/pglite/dist/index.js node tests/v110-db.mjs
```

## Excel

แก้ด้วย Artifact Tool โดยคงข้อมูลบุคลากรทั้ง 13 แถวจากไฟล์แนบ ตรวจค่าคอลัมน์เดิมและวันที่เดิมครบทุกแถว แยกแม่แบบว่างสำหรับเผยแพร่ในโค้ด ตรวจว่าไม่บรรจุชื่อจากไฟล์แนบในไฟล์ว่าง

ทดสอบเปิดไฟล์จริงด้วย ExcelJS ที่มากับหน้าเว็บ ตรวจหัวคอลัมน์ 15 / 10 ช่อง Native list validation ครอบคลุมแถว 2–501 และ 2–5001 ฝ่ายใช้สูตรอ้างอิงประเภทหน่วยงาน เลขที่ตำแหน่งในใบรับรองอ้างถึงชีตบุคลากร วันที่เดิมใช้ serial Excel และ Buddhist number format ส่วนเซลล์วันที่ว่างเป็น Text

ทดสอบวันที่ พ.ศ. เลขไทย วันอธิกสุรทิน วันที่ไม่มีจริง ปีสองหลัก และไฟล์ ISO เดิม ตรวจการปฏิเสธสูตรในสองชีตข้อมูล เลขศูนย์นำหน้า และการยืนยันก่อนนำเข้าข้อมูลพร้อมหลายใบรับรอง

ตรวจภาพที่เรนเดอร์ของชีตและช่วงข้อมูลที่เปลี่ยน ไม่ได้เปิดไฟล์ด้วย native Microsoft Excel บนเครื่อง Windows จึงให้ผู้ติดตั้งตรวจการเลือก Drop-down และรูปแบบปฏิทินใน Excel ของตนตามคู่มืออีกครั้ง

## หน้าเว็บ

ตรวจผ่านเบราว์เซอร์ใน preview ที่ใช้ข้อมูลสมมติแยกจากระบบจริง ยืนยันว่าเมนูวิธีใช้งานไม่ปรากฏ ช่องตำแหน่งทางวิชาการมีสี่ค่า ด้านงานเป็นช่องเลือกพร้อมกรอกเพิ่มได้ วันเกิดและวันเริ่มงานแสดง พ.ศ. และหน้าทบทวนแสดงค่าเดิม–ค่าใหม่ของสองช่องใหม่ โดยยังไม่บันทึกจนยืนยัน

## ฐานข้อมูล HR จริง

โครงการ `oftlfxiywhtoftxluviv` อัปเกรดจาก 1.9.0 เป็น 1.10.0 แล้ว ตรวจว่ามีสองคอลัมน์ใหม่ จำนวนบุคลากรยังเป็น 13 ราย และ fingerprint ของค่าทุกคอลัมน์เดิมตรงกับก่อนอัปเกรด

RLS ของ personnel, certificates, profiles และ schools ยังเปิดอยู่ authenticated เรียก write_personnel_internal โดยตรงไม่ได้ ไม่รีเซ็ตรหัสผู้ใช้ และไม่ส่งไฟล์แนบเข้าระบบเป็นชุดข้อมูลใหม่

Security Advisors ยังรายงานคำเตือนเดิม 9 จุดสำหรับ RPC แบบ SECURITY DEFINER ที่ผู้ใช้ authenticated เรียกได้โดยตั้งใจ และการป้องกันรหัสผ่านที่เคยรั่วไหลยังปิดอยู่ 1 จุด จึงไม่อ้างว่าคำเตือนทั้งหมดเป็นศูนย์ ช่องทาง RPC เดิมตรวจบัญชี เซสชัน และสิทธิ์ภายใน โค้ดรุ่นนี้ไม่ได้สร้าง RPC แบบ SECURITY DEFINER ที่เปิดให้ผู้ใช้เพิ่ม และคงการปิดสิทธิ์ตัวบันทึกภายใน

ไม่ได้ใช้รหัสผ่านของผู้ใช้จริงทดสอบล็อกอิน ไม่เปลี่ยนข้อมูลจริงเพื่อทดสอบ และไม่ได้อัปโหลดเอกสารไป Google Drive ในการตรวจครั้งนี้ ให้ตรวจวงจรบัญชีจริงและ Drive / Sheets ตามคู่มือหลังอัปเดต GitHub
