import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
import {handleAccountAction} from './service.js';
const env=(key:string)=>{const value=Deno.env.get(key);if(!value)throw new Error('Missing server configuration');return value;};
const response=(body:unknown,status:number,origin:string)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':origin,'Vary':'Origin','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS'}});
Deno.serve(async(req)=>{
 let origin='';try{
  const incoming=req.headers.get('Origin')||'',allowed=env('ALLOWED_ORIGINS').split(',').map(v=>v.trim());origin=allowed.includes(incoming)?incoming:'';
  if(incoming&&!origin)return response({error:'Origin not allowed'},403,'');
  if(req.method==='OPTIONS')return response({},200,origin);
  if(req.method!=='POST')return response({error:'Method not allowed'},405,origin);
  const bearer=req.headers.get('Authorization')||'';if(!bearer.startsWith('Bearer '))return response({error:'กรุณาเข้าสู่ระบบ'},401,origin);
  const options={auth:{persistSession:false,autoRefreshToken:false}};
  const admin=createClient(env('SUPABASE_URL'),env('SUPABASE_SERVICE_ROLE_KEY'),options);
  const {data,error}=await admin.auth.getUser(bearer.slice(7));if(error||!data.user)return response({error:'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่'},401,origin);
  const userClient=createClient(env('SUPABASE_URL'),env('SUPABASE_ANON_KEY'),{...options,global:{headers:{Authorization:bearer}}});
  const valid=await userClient.rpc('account_session_valid'),ready=await userClient.rpc('account_ready');
  if(valid.error||ready.error)return response({error:'กรุณาติดตั้งโครงสร้างบัญชีรุ่นล่าสุด'},503,origin);
  const raw=await req.text();if(raw.length>16000)return response({error:'ข้อมูลใหญ่เกินกำหนด'},413,origin);
  let body;try{body=JSON.parse(raw);}catch{return response({error:'ข้อมูลไม่ถูกต้อง'},400,origin);}
  if(!body||typeof body!=='object'||Array.isArray(body))return response({error:'ข้อมูลไม่ถูกต้อง'},400,origin);
  const out=await handleAccountAction({admin,actor:data.user,sessionValid:valid.data===true,ready:ready.data===true,createAuthClient:()=>createClient(env('SUPABASE_URL'),env('SUPABASE_ANON_KEY'),options)},body);
  return response(out,200,origin);
 }catch(error){const e=error as Error & {status?:number};console.error('hr-accounts',e.status||500);return response({error:e.status?e.message:'ดำเนินการไม่สำเร็จ กรุณาตรวจการตั้งค่าระบบ'},e.status||500,origin);}
});
