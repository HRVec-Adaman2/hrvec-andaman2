import test from 'node:test';import assert from 'node:assert/strict';
globalThis.window={HR_CONFIG:{supabaseUrl:'https://live.invalid',supabaseAnonKey:'public-key'}};const calls=[];
globalThis.fetch=async(url,options)=>{const u=new URL(url);calls.push({path:u.pathname,search:u.search,...options});const result=u.pathname==='/auth/v1/token'?{access_token:'test-session',refresh_token:'test-refresh',expires_in:3600,user:{id:'admin-id',email:'admin@example.com'}}:u.pathname==='/rest/v1/profiles'?[{role:'admin'}]:u.pathname.includes('/rpc/')?{id:'person-id',revision:8}:[];return {ok:true,text:async()=>JSON.stringify(result)};};
const api=await import('../dist/api.js');
test('live reviewed changes and deletion send the exact revision and reason to authenticated RPCs',async()=>{
 await api.verifyAdmin('admin@example.com','test-password');const row={id:'person-id',phone:'0812345678'};
 await api.saveReviewedPersonnel(row,null,7,'แก้ไขเบอร์ติดต่อ');let call=calls.at(-1);assert.equal(call.path,'/rest/v1/rpc/save_personnel_reviewed');assert.equal(call.headers.Authorization,'Bearer test-session');assert.deepEqual(JSON.parse(call.body),{personnel_data:row,certificate_data:null,expected_revision:7,change_reason:'แก้ไขเบอร์ติดต่อ'});
 await api.changePersonnelLifecycle(row.id,8,'delete','บันทึกผิดบุคคล');call=calls.at(-1);assert.equal(call.path,'/rest/v1/rpc/change_personnel_lifecycle');assert.deepEqual(JSON.parse(call.body),{personnel_id:row.id,expected_revision:8,operation:'delete',reason:'บันทึกผิดบุคคล'});
 assert.equal(calls.filter(c=>c.method==='DELETE'||c.method==='PATCH').length,0);
 await api.all('personnel');assert.match(calls.at(-1).search,/deleted_at=is.null/);await api.archivedPersonnel();assert.match(calls.at(-1).search,/deleted_at=not.is.null/);
});
