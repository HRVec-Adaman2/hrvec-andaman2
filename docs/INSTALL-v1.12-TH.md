# HRVec-Andaman2 รุ่น 1.12 — Excel รายการเลือกตรงกับฟอร์ม

วันที่ 30 ตุลาคม 2569 รุ่นหน้าเว็บและแม่แบบ 1.12.0 ใช้ฐานข้อมูลรุ่น 1.11.0 เดิม การอัปเดตนี้ปรับรายการเลือก Excel และการดาวน์โหลดแม่แบบ พร้อมรวมการแก้ GitHub Actions เรื่องเวลาเซสชันทดสอบจากรุ่นก่อน

## 1. ไฟล์ที่ใช้

| ไฟล์ | ใช้ทำอะไร |
|---|---|
| HRVec-Andaman2-v1.12-Personnel-Template.xlsx | แม่แบบว่างสำหรับกรอกรายชื่อใหม่และใบรับรอง |
| HRVec-Andaman2-v1.12-Update.zip | วางทับ Repository เดิม เก็บ dist/config.js ที่เชื่อมระบบเดิมไว้ |
| HRVec-Andaman2-v1.12-Full-Source.zip | โค้ดครบหน้าเว็บ SQL Edge Functions Apps Script แม่แบบว่าง เอกสาร และ tests |
| HRVec-Andaman2-v1.12-Apps-Script.zip | Code.gs, appsscript.json และวิธีวางใน Google Apps Script |
| HRVec-Andaman2-v1.12-Guide-and-Code.html | เปิดด้วย Chrome / Edge เพื่ออ่านคู่มือและคัดลอกโค้ดรายไฟล์ |

ชุด Complete รวมไฟล์ข้างต้นไว้ใน ZIP เดียว ไฟล์ Excel เดิมที่มีข้อมูลบุคลากรปรับรายการเลือกให้เช่นกัน โดยส่งแยกจากชุดโค้ดที่เผยแพร่ ไม่บรรจุรายชื่อจริงในชุดโค้ดสาธารณะ

## 2. รายการเลือกตรงกับฟอร์ม

| ชีต / เซลล์เริ่มต้น | ช่อง | รายการปัจจุบัน |
|---|---|---|
| บุคลากร C2 | หน่วยงาน/สถานศึกษา | 7 วิทยาลัย และส่วนกลางสถาบัน รวม 8 แห่ง |
| บุคลากร D2 | ตำแหน่ง | 15 ตำแหน่ง รวมผู้บริหาร ครู อาจารย์ พนักงานราชการ และพนักงานบริหารงานทั่วไป |
| บุคลากร E2 | ฝ่าย/ส่วนราชการ | เปลี่ยนตามหน่วยงาน วิทยาลัย 4 ฝ่าย ส่วนกลาง 5 ส่วนราชการ |
| บุคลากร G2 | วิทยฐานะ | 5 รายการ ใช้คนละช่องกับตำแหน่งทางวิชาการ |
| บุคลากร L2 | วุฒิการศึกษาสูงสุด | 10 รายการ เลือกหรือกรอกค่าเพิ่มเติมได้เหมือนฟอร์ม |
| บุคลากร N2 | ตำแหน่งทางวิชาการ | อาจารย์ ผู้ช่วยศาสตราจารย์ รองศาสตราจารย์ ศาสตราจารย์ |
| บุคลากร O2 | ด้านงานบริหารทั่วไป | 7 รายการ เลือกหรือพิมพ์ด้านงานเพิ่มเติมได้ |
| ใบรับรองวิชาชีพ A2 | เลขที่ตำแหน่ง | อ้างอิงเลขที่ตำแหน่งที่กรอกไว้ในชีตบุคลากร |
| ใบรับรองวิชาชีพ B2 | ประเภทใบรับรอง | ผู้บริหาร ทักษะวิชาชีพ สมรรถนะทางวิชาชีพ และใบประกอบวิชาชีพครู |

ชื่อ เลขที่ตำแหน่ง งาน/แผนก สาขาวิชา อีเมล โทรศัพท์ และรายละเอียดใบรับรองพิมพ์ข้อมูลเฉพาะบุคคลได้ตามปกติ ช่องวันที่ใช้ วว/ดด/ปี พ.ศ. เช่น 30/10/2569 โครงสร้างเดิมยังเป็นบุคลากร 15 คอลัมน์และใบรับรอง 10 คอลัมน์

รายการตั้งต้นในไฟล์ตรงกับข้อมูลหน่วยงานและรายการตั้งค่าของระบบ HR เมื่อ 30 ตุลาคม 2569 ปุ่มดาวน์โหลดแม่แบบบนเว็บใช้รายการปัจจุบันตามสิทธิ์ของบัญชี เมื่อแอดมินเพิ่มหน่วยงานหรือตำแหน่งให้ดาวน์โหลดแม่แบบใหม่ ไฟล์ Excel ที่บันทึกไว้ในเครื่องไม่เปลี่ยนรายการเอง

## 3. ใช้ Excel กรอกอย่างไร — Microsoft Excel

1. ดับเบิลคลิกไฟล์ .xlsx ด้วย Microsoft Excel หากเปิดเป็นตัวอย่างในเว็บ ให้ดาวน์โหลดไฟล์มาเปิดในโปรแกรมก่อน ถ้ามี Protected View ให้ตรวจไฟล์แล้วกด Enable Editing
2. เปิดชีต บุคลากร เริ่มกรอกแถว 2 คงหัวตารางแถว 1 และชื่อชีตเดิม
3. เลือกเซลล์ C2 แล้วคลิกลูกศรด้านขวา เลือกหน่วยงานก่อน จากนั้นเลือก D2 ตำแหน่ง E2 ฝ่าย และ G2 วิทยฐานะ
4. หากเลือกวิทยาลัย รายการฝ่ายมี 4 ฝ่าย หากเลือกสถาบันการอาชีวศึกษาภาคใต้ 2 จะเป็นส่วนราชการสถาบัน ผู้อำนวยการเว้นฝ่ายว่างได้
5. เลือกวุฒิสูงสุดที่ L2 กรอกหลายสาขาวิชาใน M2 โดยคั่นด้วย ; เช่น การบริหารการศึกษา; เทคโนโลยีการศึกษา
6. N2 เป็นตำแหน่งทางวิชาการ อาจารย์ / ผศ. / รศ. / ศ. เลือกชื่อเต็มจากรายการ แยกจาก G2 วิทยฐานะ
7. ตำแหน่งพนักงานบริหารงานทั่วไป เลือกชื่อที่ D2 และเลือกหรือกรอกด้านงานที่ O2
8. วันที่ว่างเตรียมเป็นข้อความเพื่อให้พิมพ์ พ.ศ. ตรงตามที่เห็น วันที่เดิมที่เป็นวันที่ Excel ยังคงค่าเดิมและรูปแบบแสดง พ.ศ. หาก Excel แปลงปีขณะพิมพ์ ให้เริ่มด้วย apostrophe เช่น '30/10/2569 หรือเปลี่ยนเซลล์เป็น Text ก่อนกรอก
9. เปิดชีต ใบรับรองวิชาชีพ หนึ่งใบต่อหนึ่งแถว เลือกเลขที่ตำแหน่งเดิมซ้ำได้เมื่อบุคคลมีหลายใบ ไม่เพิ่มคอลัมน์ใบที่ 2 หรือใบที่ 3 ต้องกรอกประเภท ชื่อใบรับรอง และหน่วยงานผู้ออกให้ครบ
10. เลขที่ตำแหน่ง โทรศัพท์ และเลขที่ใบรับรองเป็นข้อความเพื่อรักษาศูนย์นำหน้า บันทึกเป็น .xlsx และคงสูตร Data Validation เดิมไว้ หลีกเลี่ยงการวางสูตรในสองชีตข้อมูล
11. ในเว็บเลือก ข้อมูลบุคลากร → อัปโหลด Excel → ตรวจสอบข้อมูล ตรวจทุกแถวก่อนยืนยัน การนำเข้าใช้เพิ่มรายชื่อใหม่ ถ้ารายชื่ออยู่ในระบบแล้วให้ใช้แก้ไขรายบุคคล ไม่เปลี่ยนเลขที่ตำแหน่งเพื่อหลบรายการซ้ำ
12. รูปถ่ายจัดการจากคอลัมน์รูปถ่ายในเว็บหลังมีทะเบียนบุคลากรแล้ว

หากยังไม่เห็นลูกศร ให้เลือกเซลล์ในแถว 2 เป็นต้นไป ใช้ Excel → Data → Data Validation ตรวจ Allow: List และ In-cell dropdown ดูแนวทาง Microsoft ที่ https://support.microsoft.com/th-th/excel/get-started/create-a-drop-down-list

## 4. อัปเดตโค้ดเดิม — File Explorer และ GitHub Desktop

1. เปิด GitHub Desktop เลือก Repository hrvec-andaman2 ตรวจงานที่แก้ค้างไว้ แล้ว Commit หรือสำรองก่อน Fetch origin / Pull origin
2. เลือก Repository → Show in Explorer เพื่อเปิดโฟลเดอร์ปลายทาง
3. ใน File Explorer คลิกขวา HRVec-Andaman2-v1.12-Update.zip → Extract All… → Extract
4. เข้าไปจนเห็น package.json, dist, supabase, apps-script, tests, docs และ .github อยู่ระดับเดียวกัน คัดลอกเนื้อหาไปวางทับ Repository เดิม เลือก Replace เมื่อพบไฟล์ชื่อซ้ำ
5. ตรวจว่ามี tests/helpers/auth-session.mjs ซึ่งเป็นไฟล์แก้ CI จากรอบก่อน ชุดนี้รวมไว้แล้ว
6. ชุด Update ไม่มี dist/config.js จึงเก็บค่าการเชื่อมต่อเดิมไว้ ถ้าใช้ Full Source ให้สำรองและใช้ config.js ของโครงการที่ถูกต้อง
7. ตรวจ Changes ให้มีเฉพาะโค้ด เอกสาร และแม่แบบว่าง เก็บไฟล์ Excel ที่มีรายชื่อจริงหรือไฟล์ .env ที่กรอกแล้วไว้เฉพาะเครื่องผู้รับผิดชอบ

## 5. ตรวจและเผยแพร่ — VS Code / GitHub Desktop / Chrome

1. เปิด VS Code → File → Open Folder… เลือกโฟลเดอร์ Repository เดิม
2. เลือก Terminal → New Terminal แผงคำสั่งอยู่ด้านล่าง ตรวจว่าอยู่ระดับ package.json แล้วรันทีละคำสั่ง

```powershell
node --version
npm.cmd run check
npm.cmd test
```

3. ใช้ npm.cmd เมื่อ PowerShell เคยแจ้ง running scripts is disabled ผลทดสอบรุ่นนี้ควรผ่าน 121 รายการ
4. กลับ GitHub Desktop ใส่ Summary ว่า Update HRVec-Andaman2 to v1.12 → Commit to main → Push origin
5. เปิด GitHub ด้วย Chrome / Edge → Actions → งานรอบใหม่จาก Commit นี้ → รอขั้นตอนทดสอบและ Deploy ผ่านเป็นสีเขียว งานเก่าใช้โค้ด Commit เก่า จึงให้ตรวจรอบใหม่
6. หากไม่เห็น Workflow ตรวจ .github/workflows/pages.yml บน main และ Settings → Pages → Source: GitHub Actions
7. สำเร็จแล้ว Settings → Pages → Visit site กด Ctrl + F5 ตรวจท้ายหน้าเป็นรุ่น 1.12
8. เข้าด้วยบัญชีเดิม เปิดข้อมูลบุคลากร → ดาวน์โหลดแม่แบบ .xlsx ไฟล์ที่ได้ต้องเป็นรุ่น 1.12 และมีรายการเลือกตามช่องในหัวข้อ 2

การเผยแพร่เว็บใน ChatGPT และ Repository GitHub ของผู้ใช้เป็นคนละระบบ การ Push โค้ดใน GitHub ต้องทำใน Repository ของคุณตามขั้นตอนนี้

## 6. ฐานข้อมูลและบัญชีเดิม

รุ่น 1.12 ใช้ schema ฐานข้อมูล 1.11.0 เดิม ไม่มีไฟล์ upgrade-v1.12.sql และไม่เพิ่มคอลัมน์บุคลากร ใช้ admin รหัสผ่าน และสิทธิ์สถานศึกษาปัจจุบันต่อได้ ส่วนหน้าเว็บ แม่แบบ และเลขรุ่นไฟล์สำรองเป็น 1.12

หากต้องการตรวจ เปิด Supabase Dashboard → โครงการ HR oftlfxiywhtoftxluviv → SQL Editor → New query แล้วรันคำสั่งอ่านอย่างเดียว

```sql
select public.hr_schema_version();
```

ผล 1.11.0 เป็นค่าที่ถูกต้องสำหรับเว็บรุ่น 1.12 โครงการที่เก่ากว่าให้ใช้คู่มืออัปเกรด 1.11 ที่อยู่ใน docs ก่อน ระบบเดิมไม่ต้อง Bootstrap admin หรือนำเข้ารายชื่อเดิมซ้ำ

## 7. Google Apps Script — Chrome / Edge

โค้ดครบอยู่ใน apps-script/Code.gs และ appsscript.json ชุดนี้เปลี่ยนเลขรุ่นในไฟล์สำรองเป็น 1.12.0 การรับส่งเอกสารยังใช้การเชื่อมต่อเดิม

1. เปิด Google Sheet เดิม → ส่วนขยาย → Apps Script
2. ใน VS Code เปิด apps-script/Code.gs คัดลอกทั้งไฟล์ไปวางแทน Code.gs แล้ว Save
3. เปิด Project Settings รูปเฟือง → Show appsscript.json manifest file in editor วางไฟล์ appsscript.json จากชุดนี้แล้ว Save
4. คง Script Properties เดิม: SHEET_ID, DRIVE_FOLDER_ID, BRIDGE_SECRET, SUPABASE_URL และ SUPABASE_SERVICE_ROLE_KEY
5. Run testConfiguration ตรวจ Configuration OK แล้ว Deploy → Manage deployments → Edit → Version: New version → Deploy เพื่อใช้ URL /exec เดิม
6. Edge Functions hr-bridge / hr-accounts และ Secrets GAS_URL, BRIDGE_SECRET, ALLOWED_ORIGINS ใช้ค่าที่เชื่อมต่ออยู่แล้ว หากเปลี่ยน URL Apps Script ให้แก้ GAS_URL ให้ตรง

## 8. การตรวจและไฟล์สำคัญ

ทดสอบ 121 รายการผ่านทั้ง Node.js 24 เวลา Asia/Bangkok และ Node.js 22 เวลา UTC ตรวจรายการในไฟล์ .xlsx ที่บันทึกแล้วเทียบกับตัวเลือกฟอร์ม ตรวจลูกศร Native Data Validation และฝ่ายตามประเภทหน่วยงาน ตรวจข้อมูลเดิม 13 รายและข้อมูลใบรับรองทุกช่องว่าเหมือนต้นฉบับหลังเปิดไฟล์ที่ส่งออกซ้ำ

ตรวจภาพภาษาไทยของชีตและช่วงที่เปลี่ยนแล้ว ไม่ได้เปิด native Microsoft Excel บนเครื่อง Windows ของผู้ใช้ จึงให้ตรวจการเลือก C2 / D2 / E2 / G2 หลังดาวน์โหลดตามหัวข้อ 3 อีกครั้ง

| ส่วน | ไฟล์ |
|---|---|
| รายการเลือกที่ฟอร์มและ Excel ใช้ร่วมกัน | dist/personnel-options.js, dist/structure.js, dist/overview.js |
| สร้างรายการอ้างอิงและ Data Validation | dist/template.js |
| ตัวอ่าน/เขียน Excel ของหน้าเว็บ | dist/xlsx-compat.js |
| ปุ่มดาวน์โหลดแม่แบบตามรายการปัจจุบัน | dist/app.js |
| รายการสาธารณะตั้งต้นของแม่แบบ | deployment/template-reference.json |
| แม่แบบว่างที่บรรจุในระบบ | dist/HRVec-Andaman2-Personnel-Template.xlsx |
| ฐานข้อมูลและ Edge Functions | supabase/ |
| Google Apps Script | apps-script/ |

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

