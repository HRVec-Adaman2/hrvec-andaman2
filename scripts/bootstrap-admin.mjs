// Run locally once: node --env-file=.env.bootstrap scripts/bootstrap-admin.mjs
// .env.bootstrap contains SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY only.
import {loginEmail} from '../dist/accounts.js';
const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key)throw Error('กำหนด SUPABASE_URL และ SUPABASE_SERVICE_ROLE_KEY ใน .env.bootstrap ก่อน');
const base=new URL(url);if(base.protocol!=='https:'&&base.hostname!=='localhost')throw Error('กรุณาใช้ Project URL แบบ HTTPS');
async function request(path,method='GET',body){const r=await fetch(base.origin+path,{method,headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',Prefer:'return=representation'},body:body?JSON.stringify(body):undefined});const data=await r.json();if(!r.ok)throw Error('สร้างบัญชีไม่สำเร็จ ตรวจสิทธิ์ ค่าฐานข้อมูล และนโยบายรหัสผ่านใน Dashboard');return data;}
const existing=await request('/rest/v1/profiles?select=id&role=eq.admin&limit=1');
if(existing.length)throw Error('มีบัญชี admin แล้ว สคริปต์นี้จะไม่สร้างซ้ำหรือรีเซ็ตรหัสผ่านเดิม');
const result=await request('/auth/v1/admin/users','POST',{email:loginEmail('admin'),password:'123456',email_confirm:true,app_metadata:{hr_managed:true}});
const id=result.id||result.user?.id;if(!id)throw Error('ไม่ได้รับหมายเลขบัญชี กรุณาตรวจ Authentication Dashboard');
try{const rows=await request('/rest/v1/profiles?id=eq.'+encodeURIComponent(id),'PATCH',{role:'admin',username:'admin',must_change_password:true,account_enabled:true});if(rows.length!==1)throw Error('ไม่พบโปรไฟล์ผู้ดูแล ตรวจ trigger และ schema ก่อน');}
catch(error){await request('/auth/v1/admin/users/'+encodeURIComponent(id),'DELETE').catch(()=>{});throw error;}
console.log('สร้างผู้ดูแลสำเร็จ ชื่อผู้ใช้ admin รหัสเริ่มต้นตามคู่มือ ต้องเปลี่ยนรหัสเมื่อเข้าสู่ระบบครั้งแรก');
