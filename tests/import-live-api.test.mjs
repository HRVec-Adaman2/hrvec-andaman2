import test from 'node:test';import assert from 'node:assert/strict';
globalThis.window={HR_CONFIG:{supabaseUrl:'https://live.invalid',supabaseAnonKey:'public-key'}};
const calls=[];
globalThis.fetch=async(url,options)=>{const path=new URL(url).pathname;calls.push({path,options});const result=path==='/auth/v1/token'?{access_token:'test-session',refresh_token:'test-refresh',expires_in:3600,user:{id:'admin-id',email:'admin@example.com'}}:path==='/rest/v1/profiles'?[{role:'admin'}]:path==='/rest/v1/rpc/import_personnel_bundle'?{personnel_count:1,certificate_count:2}:null;return {ok:true,text:async()=>JSON.stringify(result)};};
const api=await import('../dist/api.js');
test('live imports send one authenticated RPC containing the complete linked bundle',async()=>{
 await api.verifyAdmin('admin@example.com','test-password');
 const records=[{employee_code:'001',full_name:'ทดสอบ',school_id:1,highest_education:'ปริญญาโท',education_majors:['สาขา A','สาขา B'],certificates:[{kind:'vocational',name:'ใบหนึ่ง',issuer:'A'},{kind:'vocational',name:'ใบสอง',issuer:'B'}]}];
 const result=await api.importPeople(records);assert.deepEqual(result,{personnel_count:1,certificate_count:2});
 const request=calls.at(-1);assert.equal(request.path,'/rest/v1/rpc/import_personnel_bundle');assert.equal(request.options.headers.Authorization,'Bearer test-session');assert.deepEqual(JSON.parse(request.options.body),{records});assert.equal(calls.filter(c=>c.path==='/rest/v1/personnel').length,0);
});
