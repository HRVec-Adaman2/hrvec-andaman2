# การตรวจ HRVec-Andaman2 รุ่น 1.11

ตรวจเมื่อ 30 ตุลาคม 2569

## ผลอัตโนมัติ

- npm run check ผ่าน syntax ทุกโมดูลที่โครงการกำหนด รวม photos.js และ personnel-order.js
- TZ=Asia/Bangkok node --test tests/*.test.mjs: 116 ผ่าน, fail 0
- TZ=UTC node --test tests/*.test.mjs: 116 ผ่าน, fail 0
- tests/schools-db.mjs: 76 PostgreSQL assertions ผ่าน
- tests/institute-db.mjs: 40 assertions ผ่าน
- tests/v110-db.mjs: 15 assertions ผ่าน
- tests/v111-db.mjs: 26 assertions ผ่าน

ใช้ PGlite 0.3.14 ในฐานข้อมูลแยก ไม่มีการสร้างบัญชีทดสอบหรือรายชื่อสมมติในโครงการจริง Workflow ตรวจทุกชุดก่อนเผยแพร่

```sh
HR_PGLITE_MODULE=/absolute/path/to/@electric-sql/pglite/dist/index.js node tests/schools-db.mjs
HR_PGLITE_MODULE=/absolute/path/to/@electric-sql/pglite/dist/index.js node tests/institute-db.mjs
HR_PGLITE_MODULE=/absolute/path/to/@electric-sql/pglite/dist/index.js node tests/v110-db.mjs
HR_PGLITE_MODULE=/absolute/path/to/@electric-sql/pglite/dist/index.js node tests/v111-db.mjs
```

## พฤติกรรมที่ครอบคลุม

- เรียงกลุ่มหน่วยงาน ผู้อำนวยการถึงเจ้าหน้าที่ ชื่อไทยหลังคำนำหน้า และลำดับรองเมื่อชื่อซ้ำ ไม่แก้อาร์เรย์ต้นฉบับ
- รับรูป JPEG / PNG / WebP ภายในขนาด ปฏิเสธชนิดไม่รองรับและ URL ที่ไม่ใช่ภาพ data URL ที่ปลอดภัย
- ฟอร์มจัดการรูปโดยเฉพาะ แสดงรูปเดิมและรูปใหม่ การลบรูปยังไม่บันทึกจนผ่านการทบทวน ยืนยัน และระบุเหตุผล
- บุคลากรบันทึกและลบรูปของตนเองได้ แก้ตำแหน่งหรือรูปคนอื่นไม่ได้ ประวัติไม่มี base64 ของภาพ
- ผู้เยี่ยมชมโหลด RPC สถิติรวมเท่านั้น ไม่ส่ง Authorization และไม่ดึงตารางบุคลากร รหัสผิดไม่ปลดล็อก
- ยืนยันบัญชี admin / เจ้าหน้าที่ / บุคลากรได้ตามบทบาท ไม่รับบทบาทที่ระบบไม่รู้จัก
- admin เข้าครั้งเดียว เปลี่ยนทุกเมนูที่อนุญาตและกลับภาพรวมได้โดยไม่มีคำขอรหัสใหม่ บุคลากรไม่มีเมนู admin
- ออกจากระบบล้างข้อมูลส่วนบุคคลจากหน้าหลัก และเปิดรายละเอียดครั้งถัดไปต้องยืนยันบัญชีใหม่
- อัปเกรดซ้ำและติดตั้งใหม่ได้ สถิติสาธารณะไม่มีชื่อ เลขที่ตำแหน่ง รูป ข้อมูลติดต่อ หรือรายละเอียดใบรับรอง
- anon อ่านตารางบุคลากร รูป ใบรับรอง RPC ภาพรวมภายใน และตัวเขียนข้อมูลภายในไม่ได้ RLS ยังเปิด

## ฐานข้อมูลจริง

โครงการ oftlfxiywhtoftxluviv อัปเกรดจาก 1.10.0 เป็น 1.11.0 ด้วย migration hrvec_v111_public_overview แล้ว จำนวนบุคลากร 13 ราย รูปปัจจุบัน 0 รูป fingerprint ของทุกคอลัมน์ทุกรายตรงกับก่อนอัปเกรด:

```text
6cf811c1b63fea50a56e2d41ca76fa99
```

RLS ใน personnel, certificates, profiles และ schools ยังเปิด public.hr_public_overview เป็น SECURITY INVOKER เรียกตัวรวมผลใน schema ที่ไม่เปิด Data API ไม่มีการให้ anon อ่านตารางข้อมูลส่วนบุคคล

ตรวจ HTTP จริงด้วย publishable key โดยไม่ใส่ user token: hr_public_overview ตอบ 200 ยอด 13 ตรงผลรวมสถานศึกษา ส่วนการขอ personnel พร้อม avatar_data, certificates และ hr_overview เดิมตอบ 401

Security Advisors ยังมีคำเตือนเดิม 9 จุดสำหรับ RPC แบบ SECURITY DEFINER ที่ผู้ใช้ authenticated เรียกใช้ตามการออกแบบ และการตรวจรหัสผ่านที่รั่วไหลยังปิดอยู่ 1 จุด ไม่อ้างว่าคำเตือนเป็นศูนย์ รุ่นนี้ไม่เพิ่ม SECURITY DEFINER ใน public และคงข้อจำกัดตัวเขียนข้อมูลภายใน

แนวทางตรวจคำเตือนเดิม:
https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## การตรวจหน้าจอและขอบเขตที่ยังต้องตรวจจริง

ตรวจฟอร์มรูปและทะเบียนในเบราว์เซอร์ด้วยข้อมูลสมมติแยกจากฐานข้อมูลจริง เห็นคอลัมน์รูปและลำดับผู้อำนวยการก่อนครู และเห็นตัวเลือกไฟล์กับกรอบตัวอย่าง เครื่องมือเลือกไฟล์ของเบราว์เซอร์ค้าง จึงไม่ได้ยืนยันการอัปโหลดผ่านเบราว์เซอร์ในรอบนี้ การบันทึก ลบรูป และ RLS ตรวจด้วยฐานข้อมูลแยกและ DOM adapter แล้ว

ไม่ได้ใช้รหัสผ่านบัญชีจริง ไม่เปลี่ยนรูปของบุคคลจริง และไม่ได้อัปโหลดไฟล์เข้า Drive หรือ Deploy Apps Script ของผู้ใช้ ให้ตรวจการเลือกรูป ล็อกอินบัญชีจริง และวงจร Drive / Sheets ตามคู่มือหลังอัปเดต GitHub

แม่แบบ Excel ไม่มีการแก้ในรุ่นนี้ โครงสร้าง 1.10 ยังคงใช้ได้ การทดสอบอ่าน/เขียนแม่แบบและตรวจ Drop-down เดิมยังผ่าน
