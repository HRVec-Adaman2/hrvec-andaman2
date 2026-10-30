# HRVec-Andaman2 รุ่น 1.10 — ติดตั้งและอัปเดตระบบ

คู่มือสำหรับ Windows ใช้กับโค้ดชุดเดียวกันใน ZIP วันที่ 29 ตุลาคม 2569 คู่มือนี้แยกจากเมนูหน้าเว็บ

## 1. สิ่งที่เปลี่ยนในรุ่นนี้

- วันเกิด วันเริ่มงาน วันเกษียณ และวันที่ใบรับรองในฟอร์ม แสดงและกรอกเป็น วว/ดด/ปี พ.ศ. เช่น 29/10/2569 ฐานข้อมูลเก็บวันที่ ค.ศ. เพื่อคำนวณอายุและวันเกษียณ
- เพิ่มคอลัมน์ N ตำแหน่งทางวิชาการ: อาจารย์ ผู้ช่วยศาสตราจารย์ รองศาสตราจารย์ ศาสตราจารย์ รับคำย่อ ผศ. รศ. ศ. ในไฟล์นำเข้า และเก็บเป็นชื่อเต็ม แยกจากวิทยฐานะ
- เพิ่มชื่อตำแหน่ง พนักงานบริหารงานทั่วไป และคอลัมน์ O ด้านงานบริหารทั่วไป เลือกหรือกรอกด้านงานตามที่ได้รับมอบหมาย
- ชีตบุคลากรมี 15 คอลัมน์ และชีตใบรับรองมี 10 คอลัมน์ ชื่อคอลัมน์เดิม 13 ช่องไม่ย้ายตำแหน่ง
- ทุกคอลัมน์ข้อความในสองชีตมี Drop-down รวม 21 คอลัมน์ วันที่ 4 คอลัมน์รับวันที่แทนรายการเลือก ส่วนชื่อ เลขที่ตำแหน่ง อีเมล โทรศัพท์ และข้อความเพิ่มเติมยังกรอกค่าใหม่ได้
- ฝ่ายใน Excel เปลี่ยนรายการตามหน่วยงานที่เลือก วิทยาลัยใช้ฝ่ายสถานศึกษา ส่วนกลางใช้ส่วนราชการสถาบัน ผู้อำนวยการเว้นฝ่ายว่างได้
- ตัดเมนูและหน้าวิธีใช้งานออกจากเว็บ แต่ยังมีข้อความตรวจสอบข้อผิดพลาดและชื่อช่องเพื่อช่วยกรอกข้อมูล
- ช่องใหม่อยู่ในหน้าตรวจสอบค่าเดิม–ค่าใหม่ ประวัติ รายงาน และ CSV สิทธิ์แก้ไขใช้ทะเบียนบุคลากรตามเดิม

## 2. ใช้โปรแกรมอะไรทำส่วนไหน

| โปรแกรม | ใช้ทำอะไร | เปิดจากไหน |
|---|---|---|
| File Explorer | แตก ZIP และคัดลอกโฟลเดอร์โค้ด | กด Windows + E |
| Microsoft Excel | กรอกข้อมูลและใช้ Drop-down | ดับเบิลคลิกไฟล์ .xlsx |
| Visual Studio Code | เปิดโค้ด ตั้งค่า และใช้ Terminal | Start ค้นหา Visual Studio Code |
| Node.js รุ่น LTS | รันคำสั่งตรวจโค้ด สร้างรหัสลับ และสร้าง admin ครั้งแรก | ติดตั้งจาก https://nodejs.org/en/download |
| GitHub Desktop | ดึงโค้ดจาก GitHub และ Commit / Push | https://desktop.github.com/download/ |
| Chrome หรือ Edge | ใช้เว็บ HR และเปิดหน้า Supabase, GitHub, Google | เปิดจาก Start |
| Supabase Dashboard | อัปเกรดฐานข้อมูล ตรวจผู้ใช้ และตั้งค่า Edge Functions | https://supabase.com/dashboard |
| Google Apps Script | หลังบ้านสำหรับเอกสาร Drive สำเนา Sheets และสำรองข้อมูล | Google Sheets → ส่วนขยาย → Apps Script |

ฐานข้อมูลหลักของโค้ดชุดนี้คือ Supabase ส่วน Google Sheets เป็นสำเนาที่ผู้ดูแลสั่งส่งออก Excel ใช้รวบรวมข้อมูลก่อนนำเข้า หน้าล็อกอินอยู่ที่เว็บ GitHub Pages ไม่ใช่ URL หลังบ้าน Apps Script

## 3. เลือกเส้นทางให้ตรงกับระบบ

มีระบบรุ่น 1.9 ใช้งานอยู่แล้ว: ทำหัวข้อ 4 → 5 → 6 → 7 และตรวจตามหัวข้อ 12 ใช้บัญชีและค่าการเชื่อมต่อเดิม

ติดตั้งในโครงการใหม่ที่ยังไม่มีข้อมูล: ทำหัวข้อ 8 → 9 → 10 → 5 → 6 → 7 → 12

ไฟล์ Excel ที่แก้จากไฟล์แนบยังมีบุคลากรเดิม 13 แถว เก็บไฟล์นี้ไว้ในเครื่องผู้รับผิดชอบ ชุดโค้ดมีแม่แบบว่างแยกต่างหาก ไม่นำไฟล์ที่มีชื่อ เบอร์โทร หรือข้อมูลบุคลากรขึ้น Repository สาธารณะ

## 4. อัปเกรดฐานข้อมูลเดิม — Chrome / Edge และ VS Code

1. เปิด Supabase Dashboard แล้วเลือกโครงการ HR Reference `oftlfxiywhtoftxluviv` ให้ตรงกับ URL `https://oftlfxiywhtoftxluviv.supabase.co`
2. คลิก SQL Editor → New query วางคำสั่งด้านล่าง แล้วกด Run

```sql
select public.hr_schema_version();
```

ถ้าผลเป็น 1.10.0 แสดงว่าฐานข้อมูลพร้อมแล้ว ข้ามไปหัวข้อ 5 ถ้าเป็น 1.9.0 ให้ทำต่อ ถ้าเป็นรุ่นก่อน 1.9 ให้อัปเกรดตามเอกสารรุ่น 1.9 ก่อน

3. ใน VS Code เลือก File → Open Folder… แล้วเปิดโฟลเดอร์โค้ดที่แตกจาก ZIP
4. ด้านซ้ายเปิด `supabase/upgrade-v1.10.sql` คลิกในไฟล์ กด Ctrl + A แล้ว Ctrl + C
5. กลับ Supabase → SQL Editor → New query วางโค้ดทั้งไฟล์ แล้วกด Run รอจนทำงานเสร็จ
6. รันคำสั่งตรวจด้านล่าง ต้องได้เวอร์ชัน 1.10.0 และชื่อคอลัมน์ทั้งสอง

```sql
select public.hr_schema_version();
select column_name
from information_schema.columns
where table_schema='public' and table_name='personnel'
  and column_name in ('university_rank','administration_field');
```

ไฟล์อัปเกรดเพิ่มสองคอลัมน์ค่าเริ่มต้นว่าง เพิ่มรายการตำแหน่ง และปรับตัวบันทึกให้รับช่องใหม่ ไม่มีคำสั่งล้างรายชื่อ รีเซ็ตรหัสผ่าน หรือนำเข้า Excel รันไฟล์อัปเกรดซ้ำได้ ไม่ใช้ `schema.sql` ทั้งไฟล์กับระบบที่มีข้อมูลอยู่แล้ว

## 5. นำโค้ดลงโฟลเดอร์ GitHub เดิม — GitHub Desktop และ File Explorer

1. ถ้ายังไม่มีสำเนา Repository ในเครื่อง ติดตั้ง GitHub Desktop แล้ว Sign in บัญชี GitHub ของคุณ
2. เปิด Chrome / Edge ไปที่ Repository HR เดิม เช่น `https://github.com/HRVec-Adaman2/hrvec-andaman2`
3. ที่หน้าแสดงไฟล์ คลิก Code → Open with GitHub Desktop ยืนยันเปิดโปรแกรม
4. ใน GitHub Desktop กด Choose… เลือกตำแหน่งในเครื่อง จากนั้นกด Clone
5. ถ้ามีสำเนาเดิมแล้ว ให้เลือก Current repository ให้ถูก ตรวจ Changes ของคุณก่อน แล้ว Fetch origin / Pull origin เพื่อนำโค้ดล่าสุดลงเครื่อง อย่าลบงานที่ยังไม่ได้ Commit
6. ใช้ Repository → Show in Explorer เพื่อเปิดโฟลเดอร์ปลายทาง
7. เปิด File Explorer ไปยัง ZIP รุ่น 1.10 คลิกขวา → Extract All… → Extract
8. เข้าไปจนเห็น `package.json`, `dist`, `supabase`, `apps-script`, `tests` และ `.github` อยู่ระดับเดียวกัน
9. คัดลอกเนื้อหาข้างในไปวางทับในโฟลเดอร์ Repository ที่เปิดไว้ ถ้ามีคำถามชื่อไฟล์ซ้ำให้เลือก Replace the files in the destination
10. ชุดสำหรับอัปเดตไม่มี `dist/config.js` จึงเก็บการเชื่อมต่อของระบบเดิมไว้ หากใช้ชุด source ที่มีไฟล์นี้ ให้คงค่า config.js เดิมของหน่วยงาน

วางเนื้อหาโค้ดที่ระดับเดียวกับ package.json ของโครงการ ไม่ซ้อนเป็น `hrvec-andaman2/โฟลเดอร์ZIP/dist` และไม่อัปโหลด ZIP เป็นไฟล์เดียวเพื่อหวังให้ GitHub แตกให้

## 6. ตรวจ config และโค้ด — VS Code

1. เปิด VS Code → File → Open Folder… เลือกโฟลเดอร์ Repository จากหัวข้อ 5
2. เปิด `dist/config.js` ต้องมี Project URL และ publishable key ของโครงการ HR เดียวกับฐานข้อมูล สำหรับระบบเดิมคงค่าเดิมไว้
3. ถ้าเป็นการติดตั้งใหม่และไม่มีไฟล์ ให้คัดลอก `deployment/config.production.js` ไปเป็น `dist/config.js` ก่อน แล้วตรวจว่าค่าโครงการถูกต้อง
4. ตัวอย่างโครงสร้างค่าด้านหน้าเป็นดังนี้ ใช้ชื่อคุณสมบัติตรงตามโค้ด ไม่ใส่ server secret ในไฟล์นี้

```js
window.HR_CONFIG = {
  supabaseUrl: 'https://YOUR_PROJECT.supabase.co',
  supabaseAnonKey: 'YOUR_PUBLISHABLE_KEY'
};
```

5. ถ้าตั้งโครงการใหม่ หา Project URL จากหน้า Connect หรือ Settings → Data API และหา Publishable key จาก Settings → API Keys คัดลอกเฉพาะค่าที่ใช้กับ client ตามหัวข้อใน Dashboard
6. กด Ctrl + S เพื่อบันทึกไฟล์
7. คลิกเมนู Terminal → New Terminal ด้านบนของ VS Code ถ้าเมนูซ่อนให้กด Alt ก่อน แผง Terminal จะเปิดด้านล่าง
8. วางคำสั่งทีละบรรทัด กด Enter และรอให้แต่ละคำสั่งจบ

```powershell
node --version
npm.cmd run check
npm.cmd test
```

Node ต้องแสดงหมายเลขรุ่น ตรวจโค้ดต้องไม่มี syntax error และผลทดสอบต้อง fail 0 โค้ดและตัวอ่าน Excel อยู่ในชุดแล้ว ไม่ต้อง npm install เพื่อรัน check / test พื้นฐาน

ถ้า Windows ขึ้น `npx.ps1 cannot be loaded` หรือ `npm.ps1 cannot be loaded` ใช้ `npx.cmd` / `npm.cmd` ตามตัวอย่าง โดยไม่ต้องปิดระบบป้องกันสคริปต์ของเครื่อง

## 7. ส่งโค้ดขึ้น GitHub และเปิดเว็บ — GitHub Desktop / Chrome

1. กลับ GitHub Desktop เลือก Repository HR ให้ถูก ตรวจแท็บ Changes ว่ามีโค้ดและแม่แบบว่างที่ต้องการ
2. ในช่อง Summary ใส่ `Update HRVec-Andaman2 to v1.10` แล้วกด Commit to main จากนั้น Push origin
3. ถ้า Push ถูกปฏิเสธเพราะมีงานใหม่บน GitHub ให้ Fetch / Pull และแก้ conflict ที่แสดงก่อน ไม่ใช้ Force push เพื่อข้ามปัญหา
4. เปิด Repository ใน Chrome / Edge คลิก Settings → Pages → Build and deployment → Source เลือก GitHub Actions
5. เปิดแท็บ Actions เลือก `Deploy HRVec-Andaman2 to GitHub Pages` รอ workflow จากการ Push ให้เสร็จเป็นสีเขียว ถ้าต้องเริ่มเอง กด Run workflow เลือก main แล้ว Run workflow
6. ถ้าไม่พบ workflow ตรวจว่ามี `.github/workflows/pages.yml` อยู่ใน branch main จริง ให้คัดลอกทั้งโฟลเดอร์ .github จาก ZIP มาในระดับรากของ Repository
7. เมื่อสำเร็จ เปิด Settings → Pages → Visit site จากนั้นกด Ctrl + F5 เพื่อล้างหน้าเว็บเก่า
8. ตรวจท้ายหน้าเว็บว่าขึ้นรุ่น 1.10 เข้าด้วยบัญชี admin เดิม เปิดแก้ไขบุคลากรหนึ่งราย ต้องพบช่องตำแหน่งทางวิชาการ ด้านงานบริหารทั่วไป และวันที่ พ.ศ. เมนูวิธีใช้งานต้องไม่ปรากฏ

การเผยแพร่เว็บไซต์ตัวอย่างใน ChatGPT กับการ Push ขึ้น GitHub ของคุณเป็นคนละขั้นตอน การอัปเดตเว็บไซต์ตัวอย่างไม่เปลี่ยน Repository GitHub ของคุณอัตโนมัติ

## 8. ติดตั้งฐานข้อมูลและ admin ในโครงการใหม่เท่านั้น

1. เปิด Supabase Dashboard สร้างหรือเลือกโครงการเฉพาะระบบ HR จด Project Reference จากหน้า Settings → General หรือ URL Dashboard `/project/REF`
2. ใน VS Code เปิด `supabase/schema.sql` คัดลอกทั้งไฟล์
3. ใน Supabase เลือก SQL Editor → New query วางแล้ว Run ไฟล์นี้เป็น schema เต็มถึงรุ่น 1.10 สำหรับโครงการใหม่
4. ตรวจ `select public.hr_schema_version();` ต้องได้ 1.10.0
5. เปิด Settings → API Keys หา legacy `service_role` key สำหรับสคริปต์ bootstrap นี้ เก็บเฉพาะเครื่องผู้ติดตั้งและหลังบ้าน
6. ในโฟลเดอร์หลักของโค้ด คัดลอก `scripts/bootstrap.env.example` เป็น `.env.bootstrap` แล้วกรอก URL และ service_role ของโครงการใหม่

```text
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVER_ONLY_SERVICE_ROLE_KEY
```

7. เปิด Terminal → New Terminal ใน VS Code ที่โฟลเดอร์หลัก แล้วรัน

```powershell
node --env-file=.env.bootstrap scripts/bootstrap-admin.mjs
```

8. สคริปต์สร้างบัญชี `admin` รหัสเริ่มต้น `123456` และบังคับเปลี่ยนรหัสก่อนเปิดข้อมูล ถ้ามี admin อยู่แล้ว สคริปต์หยุดและไม่รีเซ็ตรหัสเดิม
9. ตั้งค่า Edge Functions ในหัวข้อ 10 ก่อนใช้งานการเปลี่ยนรหัสและจัดการบัญชี จากนั้นเปิดเว็บ เข้าสู่ระบบ แล้วเปลี่ยนรหัสเมื่อระบบขอ

ไฟล์ `.env.bootstrap` ไม่อัปโหลด GitHub และไม่ส่งเข้า Edge Function Secrets

## 9. เชื่อม Google Drive / Sheets — Chrome และ Google Apps Script

ระบบเดิมที่อัปโหลดเอกสารและสำรองได้แล้ว ใช้ URL และ Script Properties เดิม หากจะอัปเดตโค้ด Apps Script ให้ทำข้อ 3, 4 และ 8 ด้วย deployment เดิม รุ่นใหม่นี้ไม่เปลี่ยนรูปแบบคำขอ HMAC

1. สร้างหรือเลือก Google Sheet ที่ใช้สำเนาข้อมูล คัดลอก ID ระหว่าง `/d/` กับ `/edit` ใน URL
2. สร้างหรือเลือกโฟลเดอร์ Google Drive สำหรับเอกสาร คัดลอก ID หลัง `/folders/` ให้บัญชีเจ้าของ Apps Script เข้าถึงโฟลเดอร์นี้ได้
3. เปิด Sheet → ส่วนขยาย → Apps Script วาง `apps-script/Code.gs` ทั้งไฟล์ใน Code.gs แล้วกด Save
4. คลิกรูปเฟือง Project Settings เปิด Show appsscript.json manifest file in editor จากนั้นวาง `apps-script/appsscript.json` ในไฟล์ manifest และ Save
5. ใน Project Settings → Script Properties → Add script property ตั้งค่าตามตาราง

| ชื่อ | นำค่ามาจากไหน |
|---|---|
| SHEET_ID | ID จาก URL ของ Google Sheet |
| DRIVE_FOLDER_ID | ID จาก URL โฟลเดอร์ Google Drive |
| BRIDGE_SECRET | สร้างข้อความสุ่มด้วยคำสั่งด้านล่าง ใช้ค่าเดียวกับ Supabase |
| SUPABASE_URL | Project URL ของระบบ HR |
| SUPABASE_SERVICE_ROLE_KEY | service_role ของโครงการเดียวกัน ใช้เฉพาะหลังบ้าน สำหรับสำรองอัตโนมัติและทดสอบการเชื่อมต่อ |

สร้าง BRIDGE_SECRET บนเครื่องผู้ดูแล เปิด VS Code → Terminal → New Terminal แล้วรัน

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

คัดลอกผลสุ่ม 64 ตัวอักษรจากคำสั่งครั้งเดียวไปใส่ทั้งสองฝั่ง ระบบ HR ใช้ชื่อ `BRIDGE_SECRET` ส่วน `REPORT_BRIDGE_SECRET` เป็นของระบบ ANDAMAN REPORT คนละระบบกัน

6. ใน Apps Script เลือกฟังก์ชัน `testConfiguration` แล้ว Run ให้สิทธิ์บัญชีเจ้าของตามที่ Google แสดง หากสำเร็จจะขึ้น Configuration OK โดยไม่พิมพ์ค่ารหัสลับ
7. สำหรับติดตั้งใหม่ เลือก Deploy → New deployment → Web app ตั้ง Execute as: Me และ Who has access: Anyone เพื่อให้ Edge Function เรียกหลังบ้านได้ ระบบตรวจ HMAC ทุกคำขอที่เขียนข้อมูล จากนั้น Deploy และคัดลอก URL ที่ลงท้าย `/exec`
8. สำหรับระบบเดิม เลือก Deploy → Manage deployments → Edit → Version: New version → Deploy เพื่อคง URL เดิม การกด Save โค้ดอย่างเดียวไม่เปลี่ยนเวอร์ชัน Web app ที่เผยแพร่
9. ถ้าบัญชีองค์กรไม่มีตัวเลือก Anyone ให้ผู้ดูแล Google Workspace ตรวจนโยบายการเผยแพร่ ห้ามใช้ URL ลงท้าย /dev แทน /exec ในระบบจริง
10. ถ้าต้องการสำรองทุกวัน ให้ตั้งค่าการแจ้งเตือนผู้ดูแลในเว็บ และ Run `installDailyTrigger` ใน Apps Script เมื่อบัญชีเจ้าของอนุญาตแล้ว ตรวจ Trigger ว่ามี dailyMaintenance ทำงานรายวัน

## 10. ตั้ง Secrets และ Edge Functions — VS Code / Supabase

ถ้าระบบเดิมมี `hr-bridge` และ `hr-accounts` ทำงานอยู่แล้ว การเพิ่มสองช่องนี้ไม่จำเป็นต้อง Deploy Edge Functions ใหม่ เพราะตัวบันทึกข้อมูลใหม่อยู่ใน SQL และ bridge อ่านคอลัมน์จากฐานข้อมูลอัตโนมัติ ตรวจ Secrets เดิมให้ครบ และคงค่าเดิมที่ถูกต้อง

ถ้าติดตั้งใหม่ ให้เปิด Supabase → Edge Functions → Secrets เพิ่มรายการต่อไปนี้ กด Save

| Name | Value |
|---|---|
| GAS_URL | URL Apps Script ลงท้าย /exec จากหัวข้อ 9 |
| BRIDGE_SECRET | ค่าสุ่มเดียวกับ Script Properties ทุกตัวอักษร |
| ALLOWED_ORIGINS | origin หน้าเว็บที่เปิดใช้งาน หลายค่าคั่นจุลภาค ไม่มีชื่อ repository ต่อท้าย |

ตัวอย่างสำหรับบัญชี GitHub เดิมและเว็บไซต์ตัวอย่าง:

```text
https://hrvec-adaman2.github.io,https://hr-andaman2.muangyor.chatgpt.site
```

ถ้าใช้ GitHub คนละบัญชีหรือมีโดเมนเอง ให้ใช้ origin ที่เห็นใน URL เว็บจริง ไม่ใช้ลิงก์ Repository `github.com/...` เป็นค่า ALLOWED_ORIGINS

ใน VS Code เปิด Terminal ที่ระดับ package.json แล้วรันทีละคำสั่ง โดยแทน YOUR_PROJECT_REF ด้วยโครงการที่จะติดตั้ง

```powershell
npx.cmd supabase --version
npx.cmd supabase login
npx.cmd supabase link --project-ref YOUR_PROJECT_REF
npx.cmd supabase functions deploy hr-bridge --project-ref YOUR_PROJECT_REF --no-verify-jwt --use-api
npx.cmd supabase functions deploy hr-accounts --project-ref YOUR_PROJECT_REF --no-verify-jwt --use-api
npx.cmd supabase functions list --project-ref YOUR_PROJECT_REF
```

ใช้ทั้งโฟลเดอร์จาก ZIP เพราะ hr-accounts นำเข้า service.js และไฟล์ใน _shared ตัวเลือก --use-api ให้บริการจัดแพ็กเกจโดยไม่ใช้ Docker ฝั่งผู้ติดตั้ง --no-verify-jwt ใช้กับโค้ดชุดนี้ซึ่งตรวจ token บัญชี เซสชัน และสิทธิ์ภายในฟังก์ชันอยู่แล้ว

Supabase จัดเตรียม SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY ให้ hosted Edge Functions ตาม environment ของโครงการ ไม่เพิ่มชื่อที่ขึ้นต้น SUPABASE_ เองในหน้า Secrets

## 11. กรอก Excel และจัดการรายการเลือก — Microsoft Excel

1. เปิดไฟล์ด้วย Microsoft Excel ถ้ามี Protected View ให้ตรวจว่าเป็นไฟล์ที่ได้รับชุดนี้แล้วกด Enable Editing
2. เปิดชีต บุคลากร กรอกตั้งแต่แถว 2 เลือกชื่อหน่วยงานก่อนฝ่าย คงหัวตารางแถว 1
3. คลิกเซลล์ข้อความเพื่อเห็นลูกศร Drop-down ช่องชื่อ รหัส อีเมล เบอร์โทร สาขาวิชา และรายละเอียดสามารถพิมพ์ค่าใหม่ได้
4. คอลัมน์วันที่ว่างเตรียมเป็น Text เพื่อให้พิมพ์ `29/10/2569` ตรงตามที่เห็น วันที่เดิมยังเก็บวันที่ Excel จริงและใช้รูปแบบ `[$-th-TH]dd/mm/bbbb` แสดง พ.ศ.
5. ถ้าแก้เซลล์วันที่เดิมแล้ว Excel แปลงปีผิด ให้พิมพ์ apostrophe นำหน้า เช่น `'29/10/2569` หรือเปลี่ยนเซลล์เป็น Text ก่อนกรอก เครื่องหมาย apostrophe ที่ Excel ใช้กำกับข้อความไม่ถูกส่งเป็นส่วนหนึ่งของวันที่
6. N ตำแหน่งทางวิชาการ เลือกชื่อเต็มจากรายการ เป็นคนละช่องกับ G วิทยฐานะ ผู้ไม่มีตำแหน่งทางวิชาการเว้น N ว่างได้
7. หากเป็นพนักงานบริหารงานทั่วไป ให้เลือก D เป็น พนักงานบริหารงานทั่วไป แล้วเลือกหรือพิมพ์ด้านงานใน O เช่น บริหารงานบุคคล การเงินและบัญชี พัสดุ
8. หลายสาขาของวุฒิสูงสุด ใช้ `;` คั่นใน M เช่น การบริหารการศึกษา; เทคโนโลยีการศึกษา Drop-down ของ Excel ชุดนี้เลือกได้ครั้งละค่า หากต้องการหลายสาขาให้พิมพ์ต่อในเซลล์เดียว ไม่มี macro
9. ใบรับรองหลายใบใช้ชีต ใบรับรองวิชาชีพ หนึ่งใบต่อหนึ่งแถว เลือกเลขที่ตำแหน่งของคนเดิมซ้ำในคอลัมน์ A ไม่เพิ่มคอลัมน์ใบที่ 2, 3
10. ต้องมีเลขที่ตำแหน่ง ประเภท ชื่อใบรับรอง และหน่วยงานผู้ออก ไม่ทราบวันหมดอายุให้ว่าง วันที่ในใบรับรองใช้รูปแบบ พ.ศ. เช่นเดียวกัน
11. ถ้าจะเพิ่มตัวเลือกข้อความที่ใช้บ่อย เปิดชีต รายการอ้างอิง ตั้งแต่ H เป็นต้นไป แต่ละหัวคอลัมน์ระบุช่องที่ใช้ ให้เพิ่มค่าต่อท้ายรายการในคอลัมน์นั้น ไม่เว้นแถวคั่น ภายในแถว 2–1001 รายการเลือกทั่วไปปรับความยาวด้วย COUNTA
12. ฝ่ายสถานศึกษาใช้รายการอ้างอิงคอลัมน์ AB ส่วนราชการสถาบันใช้ AC รายการฝ่ายเตรียมไว้ถึงแถว 1001 การเพิ่มฝ่ายหรือตำแหน่งใน Excel เพียงอย่างเดียวไม่ได้เพิ่มข้อมูลตั้งค่าฐานข้อมูล ต้องให้ admin เพิ่มใน ตั้งค่าระบบ ก่อนนำเข้า ส่วนตำแหน่งทางวิชาการมีสี่ค่าที่ระบบรองรับ
13. บันทึกเป็น .xlsx หากคัดลอกจากไฟล์อื่นให้ Paste Values เพราะสองชีตข้อมูลห้ามมีสูตร ส่วนสูตรใน Data Validation เป็นส่วนของแม่แบบและใช้ได้ตามปกติ
14. กลับเว็บ → ข้อมูลบุคลากร → อัปโหลด Excel → เลือกไฟล์ → ตรวจสอบข้อมูล ระบบยังไม่บันทึกจนกดยืนยัน

การนำเข้าชุดนี้ใช้เพิ่มบุคลากรใหม่และใบรับรองที่ผูกกับคนในไฟล์เดียวกัน เลขที่ตำแหน่งเดิมในฐานข้อมูลจะถูกแจ้งซ้ำและไม่ถูกเขียนทับ หากบุคลากร 13 รายในไฟล์แนบมีอยู่ในระบบแล้ว ให้เพิ่มช่องใหม่ผ่านปุ่มแก้ไขในแถวของบุคคลนั้น และยืนยันค่าเดิม–ค่าใหม่ ไม่เปลี่ยนเลขที่ตำแหน่งเพื่อหลบการตรวจซ้ำ

## 12. ตรวจหลังอัปเดต — หน้าเว็บจริง

- ท้ายหน้าเป็นรุ่น 1.10 และไม่มีเมนูวิธีใช้งาน
- admin เดิมเข้าสู่ระบบได้ จำนวนบุคลากรเดิมเท่าเดิม
- เปิดแก้ไขหนึ่งราย วันเกิดและวันเริ่มงานเป็น วว/ดด/ปี พ.ศ. อายุและวันเกษียณยังตรงข้อมูลเดิม
- เลือกตำแหน่งทางวิชาการหรือด้านงาน ตรวจค่าเดิม–ค่าใหม่ ระบุเหตุผล และยืนยัน แล้วเปิดแฟ้มซ้ำเพื่อตรวจค่าที่บันทึก
- บุคลากรทั่วไปแก้ทะเบียนตำแหน่งไม่ได้ เจ้าหน้าที่หน่วยงานแก้ได้เฉพาะรายการและสิทธิ์ที่ admin มอบหมาย
- ดาวน์โหลดแม่แบบจากเว็บ คลิกเซลล์ N2 ต้องเลือกตำแหน่งทางวิชาการได้ คลิกคอลัมน์ A ของใบรับรองต้องอ้างถึงเลขที่ตำแหน่งในชีตบุคลากร
- ถ้าจะทดสอบนำเข้า ใช้ข้อมูลใหม่ที่ได้รับอนุญาต ตรวจข้อมูลก่อนยืนยัน ไม่ใช้ชีตตัวอย่างเป็นรายชื่อจริง
- หลังอัปโหลดเอกสารจริงหนึ่งไฟล์ ตรวจแฟ้มเอกสารและสิทธิ์ดาวน์โหลด แล้วสั่งสำรองหรือส่งสำเนาไป Sheets ตรวจ Drive และชีตปลายทางด้วยบัญชีเจ้าของ

การทดสอบอัตโนมัติในชุดนี้ตรวจตรรกะวันที่ ตัวอ่าน Excel แบบจริง ฟอร์ม การทบทวนก่อนบันทึก และสิทธิ์ใน PostgreSQL แยกจากข้อมูลจริง การตรวจ native Microsoft Excel บนเครื่องผู้ใช้ และการอัปโหลด Drive ด้วยบัญชีจริง ให้ทำตามรายการด้านบน

## 13. เมื่อพบข้อผิดพลาด

| อาการ | ตรวจที่ไหนและทำอย่างไร |
|---|---|
| หน้ายังเป็นรุ่น 1.9 | ตรวจ Actions ของ commit ล่าสุดให้เขียว เปิด URL จาก Settings → Pages แล้ว Ctrl + F5 |
| หน้ายังเป็นโหมดสาธิต | ตรวจ dist/config.js มี URL และ publishable key แล้ว Commit / Push config และรอ Actions ใหม่ |
| university_rank / administration_field ไม่พบ | รัน upgrade-v1.10.sql ในโครงการเดียวกับ config.js แล้วตรวจเวอร์ชัน 1.10.0 |
| เลขที่ตำแหน่งซ้ำ | ใช้แก้ไขข้อมูลเดิมในเว็บ หรือนำเข้าเฉพาะรายชื่อใหม่ |
| วันที่ไม่ถูกต้อง | ใช้ วว/ดด/ปี 4 หลัก ตรวจวันที่มีอยู่จริง เช่น 29/02 ต้องตรงปีอธิกสุรทิน ไม่ใช้ปี 2 หลัก |
| ไม่เห็นลูกศร Excel | คลิกเซลล์ตั้งแต่แถว 2 เปิด Enable Editing ตรวจ Data → Data Validation → List ใช้ไฟล์ .xlsx ไม่ใช่ CSV |
| รายการใน Excel ไม่ผ่านระบบ | เพิ่มค่าที่ admin ตั้งค่าระบบให้ตรง รายการในไฟล์ไม่สามารถขยายสิทธิ์หรือโครงสร้างฐานข้อมูลเอง |
| Origin not allowed | ใน Supabase → Edge Functions → Secrets ตรวจ ALLOWED_ORIGINS ให้เป็น origin ของเว็บจริง ตัวอักษร host ใช้พิมพ์เล็กและไม่มี / ท้าย |
| Invalid signature / Missing configuration | ตรวจ BRIDGE_SECRET สองฝั่งให้ตรง GAS_URL ลงท้าย /exec และ Deploy Apps Script เวอร์ชันล่าสุด |
| HTTP 500 จากฟังก์ชัน | เปิด Edge Functions → hr-bridge หรือ hr-accounts → Logs ตรวจข้อความโดยไม่เผยแพร่ค่า secret |
| ไม่พบ Git ใน VS Code | ใช้ GitHub Desktop จัดการ Commit / Push หรือเพิ่ม Git for Windows แล้วปิด–เปิด VS Code ใหม่ |
| จำเป็นต้องย้อนหน้าเว็บ | Revert commit รุ่น 1.10 ใน GitHub Desktop แล้ว Push ให้ Actions เผยแพร่รุ่นก่อน คงสองคอลัมน์ใหม่ในฐานข้อมูลไว้เพื่อรักษาข้อมูลที่กรอกแล้ว |

## 14. แผนที่ไฟล์โค้ด

| ไฟล์ / โฟลเดอร์ | หน้าที่ |
|---|---|
| dist/index.html, app.js, style.css, theme.css | หน้าตา ฟอร์ม เมนู และหน้าตรวจข้อมูล |
| dist/dates.js | รับวันที่ พ.ศ. / วันที่ Excel และแปลงเป็น ISO ค.ศ. |
| dist/personnel-options.js | ตำแหน่งทางวิชาการ ด้านงาน และคำย่อ |
| dist/importer.js, template.js, xlsx-compat.js | หัวคอลัมน์ ตรวจนำเข้า สร้างแม่แบบ และ Drop-down |
| dist/api.js, permissions.js, changes.js | เชื่อมหลังบ้าน ตรวจสิทธิ์ และประวัติการเปลี่ยนแปลง |
| dist/HRVec-Andaman2-Personnel-Template.xlsx | แม่แบบว่างสำหรับเผยแพร่ ไม่มีรายชื่อที่แนบมา |
| supabase/upgrade-v1.10.sql | อัปเดตฐานข้อมูลเดิม 1.9 → 1.10 |
| supabase/schema.sql | ติดตั้งฐานข้อมูลใหม่พร้อมสิทธิ์ถึงรุ่น 1.10 |
| supabase/functions/hr-bridge/index.ts | หลังบ้านเอกสาร Sheets และสำรองข้อมูล |
| supabase/functions/hr-accounts/ และ _shared/ | จัดการบัญชีและรหัสผ่าน |
| apps-script/Code.gs, appsscript.json | เชื่อม Google Drive / Sheets และงานสำรอง |
| scripts/bootstrap-admin.mjs | สร้าง admin ครั้งแรกสำหรับโครงการใหม่ |
| .github/workflows/pages.yml | ตรวจโค้ดและเผยแพร่ GitHub Pages |
| tests/ | การทดสอบอัตโนมัติและ PostgreSQL แยกสำหรับตรวจสิทธิ์ |

## เอกสารอ้างอิงของโปรแกรม

- GitHub Desktop Clone: https://docs.github.com/en/desktop/adding-and-cloning-repositories/cloning-a-repository-from-github-to-github-desktop
- GitHub Pages Workflow: https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
- VS Code Terminal: https://code.visualstudio.com/docs/terminal/getting-started
- Apps Script Web App: https://developers.google.com/apps-script/guides/web
- Apps Script Properties: https://developers.google.com/apps-script/guides/properties
- Supabase Edge Function Secrets: https://supabase.com/docs/guides/functions/secrets
- Supabase CLI Deploy: https://supabase.com/docs/reference/cli/supabase-functions-deploy
- Excel Drop-down: https://support.microsoft.com/th-th/excel/get-started/create-a-drop-down-list
