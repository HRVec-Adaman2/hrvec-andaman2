# HRVec-Andaman2 รุ่น 1.11 — คู่มืออัปเดตและติดตั้ง

วันที่ 30 ตุลาคม 2569 ใช้กับโค้ดหน้าเว็บ ฐานข้อมูล Edge Functions และ Google Apps Script ใน ZIP รุ่น 1.11 ชุดเดียวกัน คู่มือนี้แยกจากเมนูของระบบ

## 1. รุ่นนี้เพิ่มอะไร

- ทะเบียนบุคลากรมีคอลัมน์รูปถ่าย กด เพิ่มรูป / เปลี่ยนรูป ได้โดยตรง เปิดดูรูปในแฟ้มบุคลากรได้
- เพิ่ม เปลี่ยน หรือลบรูป ต้องตรวจภาพเดิม–ภาพใหม่ ระบุเหตุผล และยืนยันก่อนบันทึก มีประวัติผู้แก้ไขและตรวจรุ่นข้อมูลเพื่อป้องกันเขียนทับกัน
- รูปต้นฉบับรับ JPEG, PNG หรือ WebP ขนาดไม่เกิน 10 MB หน้าเว็บย่อด้านยาวไม่เกิน 320 พิกเซล และบันทึกเป็น JPEG ในข้อมูลบุคลากรที่ควบคุมสิทธิ์ ประวัติบันทึกเพียงค่าอ้างอิงของรูป ไม่เก็บภาพซ้ำ
- รายชื่อแบ่งตามหน่วยงาน/สถานศึกษา จากนั้นเรียงตำแหน่งผู้อำนวยการ → รองผู้อำนวยการ → ผู้ช่วย → ผู้อำนวยการสำนักงาน/สำนัก/ศูนย์ → หัวหน้า → อาจารย์ → ครู → ครูผู้ช่วย → พนักงานราชการ → พนักงานบริหารงานทั่วไป → ลูกจ้าง/เจ้าหน้าที่ ตำแหน่งที่ระบบยังไม่รู้จักอยู่ท้ายกลุ่ม
- ตำแหน่งเดียวกันเรียงชื่อภาษาไทย โดยไม่นับคำนำหน้าที่รองรับ เช่น นาย นาง นางสาว ผศ. ดร. หากชื่อซ้ำใช้เลขที่ตำแหน่งและ ID เป็นลำดับรอง การเรียงนี้ไม่แก้ชื่อตำแหน่งหรือค่าทะเบียนเดิม
- เข้าสู่ระบบด้วยบัญชีที่ได้รับสิทธิ์ครั้งเดียว แล้วเปลี่ยนเมนูหรือกลับภาพรวมได้โดยไม่กรอกรหัสซ้ำ แต่ละบัญชียังใช้ได้เฉพาะเมนูและรายชื่อที่ได้รับสิทธิ์
- ผู้เยี่ยมชมเห็นยอดสรุปจริงและจำนวนแยกสถานศึกษา รายชื่อ รูปถ่าย ข้อมูลติดต่อ ใบรับรองรายบุคคล เอกสาร และรายงานรายละเอียดต้องเข้าสู่ระบบ
- โครงสร้าง Excel เดิมรุ่น 1.10 ใช้กับรุ่น 1.11 ได้ ชีตบุคลากร 15 ช่อง ใบรับรอง 10 ช่อง เพิ่มรูปผ่านเว็บหลังนำเข้ารายชื่อ ไม่วางรูปหรือ URL รูปลงใน Excel

เซสชันอยู่ในหน่วยความจำของหน้าเว็บ เปลี่ยนเมนูได้ต่อเนื่อง การโหลดหน้าใหม่ ปิดแท็บ หรือออกจากระบบต้องเข้าสู่ระบบใหม่ รหัสผ่านและ token ไม่ถูกบันทึกใน localStorage ของระบบจริง

## 2. ใช้โปรแกรมอะไร

| โปรแกรม | งานที่ทำ |
|---|---|
| File Explorer — Windows + E | แตก ZIP และคัดลอกไฟล์ |
| Visual Studio Code | เปิดโฟลเดอร์โค้ด ตรวจไฟล์ และใช้ Terminal |
| Node.js LTS | รันคำสั่งตรวจโค้ดและ Supabase CLI |
| GitHub Desktop | Clone / Pull / Commit / Push โค้ดไป GitHub |
| Chrome หรือ Edge | เปิดเว็บ HR, Supabase Dashboard, GitHub และ Google |
| Supabase Dashboard → SQL Editor | อัปเกรดฐานข้อมูลเดิม |
| Google Sheets → ส่วนขยาย → Apps Script | เปิดหลังบ้าน Google Drive / Sheets |
| Microsoft Excel | กรอกแม่แบบสำหรับรายชื่อใหม่ |

## 3. เลือกไฟล์ให้ถูก

| ไฟล์ | ใช้เมื่อ |
|---|---|
| HRVec-Andaman2-v1.11-Update.zip | มีระบบเดิมอยู่แล้ว ไม่บรรจุ dist/config.js เพื่อรักษาค่าการเชื่อมต่อเดิม |
| HRVec-Andaman2-v1.11-Full-Source.zip | ต้องการโค้ดครบ หรือติดตั้งใหม่ บรรจุหน้าเว็บ SQL Edge Functions Apps Script แม่แบบว่าง และ tests |
| HRVec-Andaman2-v1.11-Apps-Script.zip | ต้องการนำ Code.gs และ appsscript.json ไปวางใน Google Apps Script |
| HRVec-Andaman2-v1.11-Guide-and-Code.html | เปิดด้วย Chrome / Edge เพื่ออ่านขั้นตอนและดูหรือคัดลอกโค้ดแต่ละไฟล์แบบออฟไลน์ |

ระบบเดิมรุ่น 1.10: ทำหัวข้อ 4 → 5 → 6 → 7 → 8 ถ้า Drive / Sheets เดิมทำงานอยู่แล้ว ไม่ต้องตั้งค่าการเชื่อมต่อใหม่

ติดตั้งโครงการใหม่ที่ยังไม่มีตาราง: อ่านหัวข้อ 9 ด้วย ใช้ schema.sql เต็มเฉพาะโครงการใหม่ ไม่ใช้แทนไฟล์ upgrade ในฐานข้อมูลที่มีข้อมูลอยู่แล้ว

## 4. ตรวจและอัปเกรดฐานข้อมูล — Chrome / Edge + VS Code

1. เปิด https://supabase.com/dashboard เลือกโครงการ HR Reference oftlfxiywhtoftxluviv ให้ตรงกับ Project URL https://oftlfxiywhtoftxluviv.supabase.co
2. เลือก SQL Editor → New query วางคำสั่งต่อไปนี้แล้ว Run

```sql
select public.hr_schema_version();
```

3. ถ้าได้ 1.11.0 ให้ข้ามไปหัวข้อ 5 ถ้าได้ 1.10.0 ให้ทำข้อต่อไป ถ้าเป็น 1.9.0 ให้อัปเกรดด้วย supabase/upgrade-v1.10.sql ก่อน แล้วจึงใช้ไฟล์ 1.11 ถ้ารุ่นเก่ากว่านี้ให้อัปเกรดตามคู่มือรุ่นเดิมตามลำดับ
4. ใน VS Code เลือก File → Open Folder… เปิดโฟลเดอร์ที่แตกจาก ZIP ด้านซ้ายเปิด supabase/upgrade-v1.11.sql คลิกในไฟล์ กด Ctrl + A แล้ว Ctrl + C
5. กลับ Supabase → SQL Editor → New query วางโค้ดทั้งไฟล์แล้ว Run รอจนเสร็จ ไฟล์นี้เพิ่มช่องทางอ่านสถิติรวมสำหรับผู้เยี่ยมชม และเปลี่ยนเลขรุ่นฐานข้อมูล ไม่เปลี่ยนตารางรายชื่อหรือสิทธิ์รายบุคคล
6. ตรวจอีกครั้งด้วยคำสั่งต่อไปนี้

```sql
select public.hr_schema_version();
select public.hr_public_overview()->>'total' as total_personnel;
```

โครงการ HR oftlfxiywhtoftxluviv อัปเกรดเป็น 1.11.0 และตรวจข้อมูล 13 รายคงเดิมแล้วเมื่อ 30 ตุลาคม 2569 ตรวจรุ่นก่อนเพื่อข้ามการรันซ้ำ

ผลต้องเป็น 1.11.0 และยอดบุคลากรที่ใช้งานอยู่ตรงกับข้อมูลเดิม ไฟล์อัปเกรดรันซ้ำได้ ไม่สร้าง admin ใหม่และไม่เปลี่ยนรหัสผ่านเดิม

## 5. วางโค้ดใน Repository เดิม — GitHub Desktop + File Explorer

1. เปิด GitHub Desktop เลือก Repository hrvec-andaman2 ที่ใช้งานอยู่ หากยังไม่มีสำเนาในเครื่อง เปิด Repository ใน Chrome / Edge แล้ว Code → Open with GitHub Desktop → Clone
2. ถ้าเครื่องมีงานที่แก้ค้างอยู่ ให้ Commit หรือเก็บสำเนางานนั้นก่อน จากนั้น Fetch origin / Pull origin เพื่อนำโค้ดล่าสุดลงเครื่อง
3. เลือก Repository → Show in Explorer เพื่อเปิดโฟลเดอร์ปลายทาง
4. ใน File Explorer คลิกขวา HRVec-Andaman2-v1.11-Update.zip → Extract All… → Extract
5. เข้าไปจนเห็น package.json, dist, supabase, apps-script, tests, docs และ .github อยู่ระดับเดียวกัน คัดลอกเนื้อหาทั้งชุดไปวางทับในโฟลเดอร์ Repository เดิม เลือก Replace เมื่อพบไฟล์ชื่อซ้ำ
6. ตรวจว่าเป็นการวางทับในโฟลเดอร์หลัก ไม่ได้สร้างโฟลเดอร์รุ่นใหม่ซ้อนเข้าไปอีกชั้น ต้องมี .github/workflows/pages.yml และ dist/app.js ในตำแหน่งเดิม
7. ชุด Update ไม่มี dist/config.js จึงใช้ไฟล์เดิมต่อ หากใช้ชุด Full ให้สำรอง config.js เดิมก่อน และคง Project URL / publishable key ของระบบที่ถูกต้อง
8. ตรวจ Changes ว่าไม่มีไฟล์ .env ที่กรอกค่าแล้ว ไฟล์ Excel ที่มีข้อมูลจริง ไฟล์สำรอง JSON หรือรูปบุคลากร ห้ามนำสิ่งเหล่านี้ขึ้น Repository สาธารณะ

## 6. ตรวจโค้ดและเผยแพร่ — VS Code + GitHub Desktop + Chrome

1. เปิด VS Code → File → Open Folder… เลือกโฟลเดอร์ Repository เดิม
2. เมนูด้านบนเลือก Terminal → New Terminal ถ้าไม่เห็นแถบเมนูให้กด Alt หรือ Ctrl + Shift + P แล้วเลือก Terminal: Create New Terminal
3. แผง Terminal อยู่ด้านล่าง ตรวจว่าโฟลเดอร์ปัจจุบันมี package.json แล้วรันทีละคำสั่ง

```powershell
node --version
npm.cmd run check
npm.cmd test
```

4. การใช้ npm.cmd ช่วยเลี่ยงปัญหา PowerShell ปิดการรันสคริปต์ ไม่ต้องเปลี่ยน Execution Policy ทั้งเครื่อง การทดสอบโค้ดรุ่นนี้ควรผ่าน 116 รายการ
5. กลับ GitHub Desktop ตรวจรายการไฟล์ ใส่ Summary ว่า Update HRVec-Andaman2 to v1.11 กด Commit to main → Push origin ถ้าใช้ VS Code Source Control ให้ Commit แล้ว Sync Changes
6. เปิด Repository ใน Chrome / Edge → Settings → Pages → Source: GitHub Actions
7. เปิดแท็บ Actions เลือก Deploy HRVec-Andaman2 to GitHub Pages รอเครื่องหมายถูกสีเขียว หากต้องเริ่มเองกด Run workflow เลือก main แล้ว Run workflow
8. ถ้าไม่มี workflow ตรวจ .github/workflows/pages.yml บน GitHub ว่ามีอยู่ใน main จริง ถ้า Action ล้มเหลว เปิดรายการที่เป็นสีแดงและดูขั้นตอนแรกที่ผิดพลาดก่อนแก้
9. สำเร็จแล้ว Settings → Pages → Visit site กด Ctrl + F5 ตรวจท้ายหน้าเป็นรุ่น 1.11

การเผยแพร่เว็บไซต์ใน ChatGPT กับ Repository GitHub ของคุณเป็นคนละระบบ การอัปเดตเว็บไซต์ใน ChatGPT ไม่ Push โค้ดขึ้น GitHub ของคุณอัตโนมัติ

## 7. Google Apps Script — ใช้โครงการเดิม

ชุดนี้ให้ Code.gs ครบอีกครั้ง การเพิ่มรูป การเรียงรายชื่อ และเซสชันทำงานผ่านหน้าเว็บและฐานข้อมูล Edge Functions เดิมไม่ต้อง Deploy ใหม่เพื่อรับสามการเปลี่ยนแปลงนี้ Apps Script เปลี่ยนเพียงเลขรุ่นที่ระบุในไฟล์สำรอง

1. เปิด Chrome / Edge → Google Sheet เดิมที่เก็บสำเนาข้อมูล → ส่วนขยาย → Apps Script
2. ใน VS Code เปิด apps-script/Code.gs คัดลอกทั้งไฟล์ ไปวางแทน Code.gs ใน Apps Script แล้วกด Save
3. ใน Apps Script เปิด Project Settings รูปเฟือง → Show appsscript.json manifest file in editor จากนั้นเปิด appsscript.json และวางเนื้อหาจากไฟล์ชื่อเดียวกันในชุด ZIP แล้ว Save
4. คง Script Properties เดิม โดยเฉพาะ SHEET_ID, DRIVE_FOLDER_ID, BRIDGE_SECRET, SUPABASE_URL และ SUPABASE_SERVICE_ROLE_KEY ไม่สร้างรหัสลับใหม่ถ้าของเดิมเชื่อมต่อถูกต้อง
5. เลือกฟังก์ชัน testConfiguration แล้ว Run ตรวจผล Configuration OK ให้สิทธิ์บัญชีเจ้าของเมื่อ Google ขอ
6. เลือก Deploy → Manage deployments → deployment เดิม → Edit รูปดินสอ → Version: New version → Deploy เพื่อใช้ URL /exec เดิม การกด Save อย่างเดียวไม่เปลี่ยนเวอร์ชัน Web app ที่เผยแพร่
7. หากได้ URL ใหม่ ให้แก้ GAS_URL ใน Supabase → Edge Functions → Secrets ให้ตรงกับ URL ที่ลงท้าย /exec
8. เปิดเว็บ HR เข้าด้วย admin ทดลองดาวน์โหลดเอกสารที่ได้รับสิทธิ์ หรือส่งสำเนาไป Sheets ตรวจผลปลายทางด้วยบัญชีเจ้าของ

รูปถ่ายเก็บในฐานข้อมูลบุคลากรที่มี RLS ไม่สร้าง URL รูปสาธารณะ สำรอง JSON รวมรูปถ่ายด้วย ส่วนการส่งสำเนาไป Google Sheets ไม่ใส่ข้อมูลภาพ base64 ลงในเซลล์ Excel จึงไม่จำเป็นต้องเพิ่มคอลัมน์รูปในแม่แบบ

## 8. วิธีใช้งานและตรวจหลังอัปเดต — เว็บ HR ใน Chrome / Edge

1. เปิดเว็บแบบยังไม่เข้าสู่ระบบ ต้องเห็นยอดรวมและยอดแยกสถานศึกษา คลิกดูรายชื่อแล้วระบบต้องขอชื่อผู้ใช้และรหัสผ่านก่อน
2. เข้าด้วยบัญชี admin เดิม เปิด ข้อมูลบุคลากร เลือกสถานศึกษา ตรวจว่าผู้อำนวยการอยู่ก่อนรองผู้อำนวยการ ครู และเจ้าหน้าที่ ตำแหน่งเดียวกันเรียงชื่อไทย
3. ที่คอลัมน์ รูปถ่าย คลิก เพิ่มรูป ของคนที่ต้องการ เลือกไฟล์ JPEG / PNG / WebP ไม่เกิน 10 MB ดูตัวอย่างแล้วกด ตรวจสอบก่อนบันทึก
4. ตรวจบุคคล สถานศึกษา รูปเดิมและรูปใหม่ ใส่เหตุผลอย่างน้อย 5 ตัวอักษร ติ๊กยืนยัน แล้วกด ยืนยันบันทึกการแก้ไข เปิดแฟ้มอีกครั้งต้องเห็นรูปที่บันทึก
5. เปลี่ยนรูปด้วยปุ่มเดิม หากลบรูปให้ติ๊ก ลบรูปถ่ายปัจจุบัน แล้วตรวจและยืนยันเช่นเดียวกัน เป็นการลบรูปปัจจุบันโดยยังเก็บทะเบียนบุคลากรไว้
6. หลังเข้าสู่ระบบ สลับ ภาพรวม → ข้อมูลบุคลากร → ใบรับรอง → รายงาน → ตั้งค่า แล้วกลับทะเบียน ต้องไม่มีหน้าขอรหัสซ้ำระหว่างเปลี่ยนเมนู
7. บุคลากรทั่วไปแก้รูปของตนเองได้ เจ้าหน้าที่หน่วยงานต้องมีสิทธิ์ข้อมูลติดต่อหรือทะเบียนในรายชื่อที่รับผิดชอบ admin จัดการทุกหน่วยงานได้ ผู้มีสิทธิ์อ่านอย่างเดียวไม่มีปุ่มเปลี่ยนรูป
8. บัญชีบุคลากรและเจ้าหน้าที่ไม่เห็นเมนู admin และไม่สามารถเปิดข้อมูลนอกขอบเขตด้วยการเปลี่ยน URL สิทธิ์ตรวจซ้ำที่ฐานข้อมูล ไม่อาศัยการซ่อนเมนูเพียงอย่างเดียว
9. กด ออกจากระบบ แล้วเปิดเมนูรายละเอียดอีกครั้ง ต้องขอเข้าสู่ระบบ และหน้าเว็บต้องไม่เหลือรายชื่อ รูป หรือข้อมูลติดต่อของบัญชีก่อนหน้า
10. หลังโหลดหน้าใหม่หรือปิดแท็บ ให้เข้าสู่ระบบใหม่ตามการเก็บเซสชันในหน่วยความจำ ถ้าบัญชีใหม่หรือถูกรีเซ็ตรหัส ระบบยังบังคับเปลี่ยนรหัสก่อนเปิดข้อมูล

ถ้ารูปไม่แสดง ให้ตรวจชนิด/ขนาดไฟล์ สิทธิ์ของบัญชี และข้อความบันทึกสำเร็จ ถ้าขึ้นว่ามีผู้อื่นแก้ไข ให้โหลดข้อมูลล่าสุดและตรวจใหม่ ถ้าภาพรวมผิดพลาดแต่หน้าเว็บเปิดได้ ให้ตรวจฐานข้อมูลเป็น 1.11.0 และ hr_public_overview มีอยู่จริง

## 9. ติดตั้งใหม่เท่านั้น — ค่าการเชื่อมต่อมาจากไหน

ระบบเดิมที่ทำงานแล้วข้ามหัวข้อนี้ ใช้บัญชีและรหัสผ่านปัจจุบัน ไม่ Bootstrap admin ซ้ำ

| ค่า | นำมาจาก | ใส่ที่ |
|---|---|---|
| Project URL | Supabase → Project Settings / API | dist/config.js, .env.bootstrap และ Script Properties |
| Publishable key | Supabase → API Keys | dist/config.js เท่านั้นในหน้าเว็บ |
| service_role key | Supabase → API Keys → legacy service_role | .env.bootstrap และ Apps Script หลังบ้าน ห้ามใส่หน้าเว็บ |
| SHEET_ID | URL Sheet ระหว่าง /d/ กับ /edit | Apps Script → Project Settings → Script Properties |
| DRIVE_FOLDER_ID | URL โฟลเดอร์ Drive หลัง /folders/ | Script Properties |
| BRIDGE_SECRET | สุ่มจาก Node.js ครั้งเดียว | Script Properties และ Supabase Secrets ใช้ข้อความเดียวกัน |
| GAS_URL | URL Web app Apps Script ลงท้าย /exec | Supabase → Edge Functions → Secrets |
| ALLOWED_ORIGINS | origin เว็บจริง เช่น https://ชื่อบัญชี.github.io ไม่มีชื่อ Repository ต่อท้าย | Supabase Secrets |

1. ในโครงการ Supabase ใหม่ที่ยังไม่มีตาราง ใช้ SQL Editor รัน supabase/schema.sql ทั้งไฟล์ แล้วตรวจ hr_schema_version ต้องได้ 1.11.0
2. สร้าง Sheet และโฟลเดอร์ Drive เปิด Apps Script วาง Code.gs / appsscript.json แล้วใส่ Script Properties ตามตาราง ค่าสุ่มสร้างใน VS Code → Terminal ด้วยคำสั่งต่อไปนี้ เก็บเฉพาะหลังบ้าน

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

3. สำหรับ Apps Script ใหม่ เลือก Deploy → New deployment → Web app: Execute as Me, Who has access Anyone เพื่อให้ Edge Function ส่งคำขอที่ลงลายเซ็น HMAC ได้ แล้วคัดลอก /exec ตั้งค่าการเผยแพร่ให้สอดคล้องกับนโยบาย Google Workspace ของหน่วยงาน
4. Supabase → Edge Functions → Secrets ใส่ GAS_URL, BRIDGE_SECRET และ ALLOWED_ORIGINS ให้ครบ ตัวอย่าง origin ของ GitHub เดิมคือ https://hrvec-adaman2.github.io ส่วนชื่อ path /hrvec-andaman2 ไม่ใส่ในค่า origin
5. เปิด VS Code ที่โฟลเดอร์หลัก Terminal → New Terminal แล้วรันทีละคำสั่ง แทน YOUR_PROJECT_REF ด้วยโครงการที่จะติดตั้ง

```powershell
npx.cmd supabase login
npx.cmd supabase link --project-ref YOUR_PROJECT_REF
npx.cmd supabase functions deploy hr-bridge --project-ref YOUR_PROJECT_REF --no-verify-jwt --use-api
npx.cmd supabase functions deploy hr-accounts --project-ref YOUR_PROJECT_REF --no-verify-jwt --use-api
npx.cmd supabase functions list --project-ref YOUR_PROJECT_REF
```

6. ใช้โฟลเดอร์ฟังก์ชันครบรวม _shared และ service.js โค้ดชุดนี้ตรวจ token บัญชี เซสชัน และสิทธิ์ภายในฟังก์ชัน ตัวเลือก --use-api ไม่ต้องใช้ Docker บนเครื่องผู้ติดตั้ง ไม่ส่ง .env.bootstrap เข้า Secrets
7. ใน VS Code แก้ dist/config.js ให้เป็น URL และ publishable key ของโครงการที่จะใช้ ตัวอย่างโครงสร้าง:

```javascript
window.HR_CONFIG = {
  supabaseUrl: "https://YOUR_PROJECT.supabase.co",
  supabaseAnonKey: "YOUR_PUBLISHABLE_KEY"
};
```

8. คัดลอก scripts/bootstrap.env.example เป็น .env.bootstrap ที่ระดับ package.json ใส่ SUPABASE_URL และ SUPABASE_SERVICE_ROLE_KEY ของโครงการใหม่ แล้วรัน

```powershell
node --env-file=.env.bootstrap scripts/bootstrap-admin.mjs
```

9. สคริปต์สร้าง admin รหัสเริ่มต้น 123456 เฉพาะครั้งแรก และบังคับเปลี่ยนรหัสก่อนใช้ข้อมูลจริง หากมี admin อยู่แล้วสคริปต์จะไม่รีเซ็ต ให้เข้าสู่ระบบด้วยรหัสปัจจุบัน
10. เผยแพร่ GitHub Pages ตามหัวข้อ 6 แล้วทดสอบบัญชี เอกสาร Drive และสำเนา Sheets ตามหัวข้อ 8 เก็บไฟล์ .env ที่มีค่าจริงไว้เฉพาะเครื่องผู้ติดตั้ง

## 10. ไฟล์สำคัญและข้อจำกัดการตรวจ

| งาน | ไฟล์ |
|---|---|
| ฟอร์ม รูปถ่าย และเมนู | dist/app.js, dist/theme.css |
| ตรวจไฟล์รูป | dist/photos.js |
| เรียงตำแหน่งและชื่อไทย | dist/personnel-order.js |
| เข้าสู่ระบบและใช้เซสชันเดิม | dist/api.js |
| SQL อัปเดตจาก 1.10 | supabase/upgrade-v1.11.sql |
| ฐานข้อมูลเต็มสำหรับติดตั้งใหม่ | supabase/schema.sql |
| หลังบ้านบัญชี / Google bridge | supabase/functions/hr-accounts, hr-bridge, _shared |
| หลังบ้าน Google | apps-script/Code.gs, appsscript.json |
| เผยแพร่ GitHub Pages | .github/workflows/pages.yml |

ทดสอบอัตโนมัติ 116 รายการทั้ง Asia/Bangkok และ UTC พร้อมฐานข้อมูล PostgreSQL จำลองสำหรับ RLS การแก้รูปของตนเอง การปฏิเสธบุคคลอื่น การลบรูป ประวัติที่ไม่มีภาพ และสถิติสาธารณะ ดูผลละเอียดใน TESTING-v1.11.md

ตรวจหน้าฟอร์มผ่านเบราว์เซอร์ด้วยข้อมูลสมมติแล้ว ตัวเลือกไฟล์ของเครื่องมือตรวจเบราว์เซอร์ค้าง จึงไม่ได้ยืนยันการเลือกไฟล์ผ่านเบราว์เซอร์ในรอบนี้ ไม่ได้ใช้รหัสผ่านผู้ใช้จริง ไม่แก้ข้อมูลจริงเพื่อทดสอบ และไม่ได้ Deploy Apps Script เข้า Google ของผู้ใช้ ให้ตรวจการเลือกรูปและวงจร Drive / Sheets จริงตามหัวข้อ 7–8 หลังอัปเดต GitHub

## 11. GitHub Actions ได้ false แทน true ที่ schools-db.mjs

ใช้ชุดแก้ HRVec-Andaman2-v1.11-CI-Fix.zip อัปเดตโฟลเดอร์ tests และ docs ใน Repository เดิม แล้ว Commit / Push ใหม่ตาม docs/CI-FIX-20261030-TH.md ชุด Full / Update ปัจจุบันรวมการแก้แล้ว กฎยกเลิกเซสชันและ RLS จริงยังตรวจตามเดิม การแก้ครั้งนี้เป็นตัวสร้างเซสชันในฐานข้อมูลจำลองสำหรับ CI เท่านั้น
