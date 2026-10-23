# ผลตรวจ HRVec-Andaman2 รุ่น 1.8

- npm run check: ผ่านการตรวจ JavaScript ของหน้าเว็บและบริการบัญชี
- ชุด Node: 87 รายการ ผ่านทั้งหมดในเขตเวลา Asia/Bangkok
- PostgreSQL แยกด้วย PGlite 0.3.14: 76 assertions ผ่าน ครอบคลุมอัปเกรดจาก 1.7 รันซ้ำ รหัสสถานศึกษาเกิน 7 ขอบเขตทั้งวิทยาลัย/เฉพาะรายชื่อ สิทธิ์แยกวุฒิ/ทะเบียน การยกเลิกเซสชัน การนำเข้าแบบยกเลิกทั้งชุด และตรวจสิทธิ์อีกครั้งขณะบันทึกไฟล์
- ชุดฐานข้อมูลเดิม personnel-db.mjs และ accounts-db.mjs ผ่าน ตรวจการแก้ไข/ลบ/กู้คืนและบัญชีรุ่นเดิม
- ทดสอบเขียนและอ่านไฟล์ XLSX จริง ด้วยตัวช่วยที่รวมในชุดส่งมอบ: รักษาศูนย์นำหน้า สาขาหลายสาขา ใบรับรองหลายใบ รองรับแม่แบบเดิม ปฏิเสธสูตรและข้อมูล ZIP ที่มีขนาดภายในเกินกำหนด
- ตรวจหน้าเว็บผ่านเบราว์เซอร์: เพิ่มสถานศึกษารหัส 8 ได้ เปิดฟอร์มกำหนดสิทธิ์และเลือกขอบเขตเฉพาะรายชื่อได้ ภาพตัวอย่างใช้ข้อมูลสาธิต

การตรวจเบราว์เซอร์ช่วงดาวน์โหลดหยุดเพราะการเชื่อมต่อเครื่องมือเบราว์เซอร์หมดเวลา จึงยืนยันการเขียน/อ่าน XLSX ด้วยไฟล์จริงผ่านโค้ดแทน ยังไม่ได้ตรวจบัญชีจริงและอัปโหลด/ดาวน์โหลด Google Drive ครบวงจร

## ตรวจระบบจริงหลังได้รับอนุญาต 22 ตุลาคม 2569

- โครงการ `oftlfxiywhtoftxluviv` อยู่ในสถานะ ACTIVE_HEALTHY
- ใช้ migration `20261022083857_school_delegation_v18` สำเร็จ; `hr_schema_version()` คืน `1.8.0` ชื่อไฟล์ในชุดนี้ตรงกับประวัติ migration จริง เนื้อหา SQL เดิมไม่เปลี่ยน
- สถานศึกษาเดิม 7 แห่งและบัญชีเดิม 2 บัญชีคงอยู่; personnel/documents/certificates เป็น 0 ทั้งก่อนและหลัง ไม่มีการมอบหมายสิทธิ์หรือรีเซ็ตรหัสจริง
- `school_assignments` และ `administration_changes` เปิด RLS; role รองรับ school_editor; schools.id สร้างอัตโนมัติ
- anon ไม่มีสิทธิ์เรียกจัดการสถานศึกษา/อ่านการมอบหมาย; authenticated เขียน schools และ school_assignments ตรงไม่ได้; wrapper ใหม่ทั้ง 3 เป็น INVOKER พร้อม search_path คงที่
- ตรวจ guard ใน transaction ที่ ROLLBACK ทั้งชุดด้วย authenticated ที่ไม่มีเซสชันจริง: account_ready และการอ่านบุคลากรเป็น false; จัดการสถานศึกษาและการมอบหมายถูกปฏิเสธ
- เผยแพร่ hr-bridge และ hr-accounts จากโค้ดรุ่น 1.8 ทั้งคู่ ACTIVE version 5 ของ Supabase; verify_jwt คง false ตามเดิมและโค้ดตรวจบัญชีเอง
- HTTP 14 กรณีผ่านทั้งหมด: preflight 200 จากทั้งสอง Origin ที่อนุญาต, ไม่มี/ใช้เซสชันไม่ถูกต้อง 401, Origin อื่น 403
- Advisors ไม่แจ้ง RLS ที่หายไป; ยังเตือน public SECURITY DEFINER เดิม 9 ฟังก์ชัน, leaked password protection ปิด, ดัชนี FK 5 จุด, initplan ใน RLS 3 จุด และดัชนียังไม่เคยใช้ 7 จุด ข้อจำกัดและลิงก์อ้างอิงอยู่ในคู่มือ

GitHub Pages และ Apps Script เดิมยังต้องอัปเดตโดยผู้ติดตั้งตามคู่มือ หน้าสาธิต Site ยังใช้ config ว่าง การตรวจข้างต้นไม่ใช่การยืนยันการเข้าสู่ระบบจริงหรือรับส่งไฟล์ Google Drive ครบวงจร

## ทดสอบซ้ำ

VS Code Terminal: `npm run check` และ `npm test` ใช้ Node.js 22 ขึ้นไป GitHub Actions ตรวจทั้งชุด Node และ PostgreSQL แยกโดยไม่ใช้ฐานข้อมูลจริง

สำหรับนักพัฒนาบน Linux สามารถติดตั้งตัวทดสอบเฉพาะเครื่องและรันดังนี้:

```bash
npm install --prefix /tmp/hrvec-checks --no-audit --no-fund --ignore-scripts --save-exact @electric-sql/pglite@0.3.14
HR_PGLITE_MODULE=/tmp/hrvec-checks/node_modules/@electric-sql/pglite/dist/index.js node tests/schools-db.mjs
```

รายละเอียดติดตั้งและรายการตรวจรับจริงอยู่ใน UPGRADE-v1.8-TH.md
