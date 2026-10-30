# HRVec-Andaman2 1.12 — Google Apps Script

ใช้ Chrome หรือ Edge เปิด Google Sheet เดิม → ส่วนขยาย → Apps Script

1. วาง Code.gs ทั้งไฟล์แทนไฟล์เดิมแล้ว Save
2. Project Settings → Show appsscript.json manifest file in editor เปิดไฟล์ manifest วาง appsscript.json จากชุดนี้แล้ว Save
3. คง Script Properties เดิม: SHEET_ID, DRIVE_FOLDER_ID, BRIDGE_SECRET, SUPABASE_URL และ SUPABASE_SERVICE_ROLE_KEY
4. Run testConfiguration เพื่อตรวจการเชื่อมต่อ อนุญาตบัญชีเจ้าของตามที่ Google ขอ
5. Deploy → Manage deployments → Edit → Version: New version → Deploy เพื่อคง URL /exec เดิม
6. ถ้าเปลี่ยน URL /exec ให้แก้ GAS_URL ใน Supabase Edge Functions → Secrets ด้วย

รุ่นนี้ปรับเฉพาะ app_version ในไฟล์สำรอง รูปถ่ายอยู่ในฐานข้อมูลบุคลากรที่มีสิทธิ์ RLS ไม่สร้างรูปสาธารณะ สำรอง JSON รวมรูป ส่วนสำเนา Sheets ไม่ใส่ภาพ base64 ในเซลล์ การเรียงชื่อและการใช้เซสชันอยู่ในหน้าเว็บ

ระบบเดิมที่ Drive / Sheets ทำงานอยู่แล้วไม่จำเป็นต้องตั้ง Secrets หรือ Deploy Edge Functions ใหม่เพื่อรับฟีเจอร์รุ่นนี้ อย่าสร้าง admin หรือรีเซ็ตรหัสเดิมซ้ำ คู่มือติดตั้งใหม่และขั้นตอน VS Code / GitHub อยู่ใน docs/INSTALL-v1.12-TH.md ของชุด Full Source และไฟล์ Guide-and-Code.html
