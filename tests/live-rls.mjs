// Run manually against an isolated test project after setup.
// Environment: HR_URL, HR_ANON_KEY, HR_A_EMAIL, HR_A_PASSWORD,
// HR_B_PERSON_ID (owned by another employee), HR_A_PERSON_ID (owned by A).
import assert from 'node:assert/strict';
const env=process.env;
for(const k of ['HR_URL','HR_ANON_KEY','HR_A_EMAIL','HR_A_PASSWORD','HR_A_PERSON_ID','HR_B_PERSON_ID'])if(!env[k])throw Error('Missing '+k);
async function req(path,method='GET',body,token=''){const res=await fetch(env.HR_URL+path,{method,headers:{apikey:env.HR_ANON_KEY,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined});const text=await res.text();let data;try{data=text?JSON.parse(text):null;}catch{data=text;}return {status:res.status,data};}
const login=await req('/auth/v1/token?grant_type=password','POST',{email:env.HR_A_EMAIL,password:env.HR_A_PASSWORD});assert.equal(login.status,200);const token=login.data.access_token;
const anonymous=await req('/rest/v1/personnel?select=id');assert.ok(anonymous.status>=400||anonymous.data.length===0,'Anonymous must not read personnel');
const other=await req('/rest/v1/personnel?select=id&id=eq.'+env.HR_B_PERSON_ID,'GET',undefined,token);assert.deepEqual(other.data,[],'Employee cannot read another employee');
const own=await req('/rest/v1/personnel?select=id&id=eq.'+env.HR_A_PERSON_ID,'GET',undefined,token);assert.equal(own.data[0].id,env.HR_A_PERSON_ID);
const tamper=await req('/rest/v1/personnel?id=eq.'+env.HR_A_PERSON_ID,'PATCH',{status:'ลาออก'},token);assert.ok(tamper.status>=400,'Employee cannot change official status');
const escalate=await req('/rest/v1/profiles','PATCH',{role:'admin'},token);assert.ok(escalate.status>=400,'Employee cannot self-promote');
const create=await req('/rest/v1/personnel','POST',{employee_code:'UNAUTHORIZED',full_name:'Unauthorized',school_id:1},token);assert.ok(create.status>=400);
const docs=await req('/rest/v1/documents?personnel_id=eq.'+env.HR_B_PERSON_ID,'GET',undefined,token);assert.deepEqual(docs.data,[]);
const bridge=await req('/functions/v1/hr-bridge','POST',{action:'backup'},token);assert.equal(bridge.status,403);
console.log('PASS: live RLS boundary checks. Also perform document upload/download and review acceptance cases in README.');
