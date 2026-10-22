import test from 'node:test';import assert from 'node:assert/strict';
import {normalizeUsername,loginEmail,validatePassword,suggestedUsername} from '../dist/accounts.js';
globalThis.window={HR_CONFIG:{supabaseUrl:'https://account.invalid',supabaseAnonKey:'public-key'}};
globalThis.localStorage={getItem(){throw Error('Passwords must not enter storage');},setItem(){throw Error('Passwords must not enter storage');}};
let first=true,enabled=true,pending=false;const calls=[];
globalThis.fetch=async(url,options)=>{const path=new URL(url).pathname,body=options.body?JSON.parse(options.body):null;calls.push({path,body});const result=path==='/auth/v1/token'?{access_token:'test-token',refresh_token:'test-refresh',expires_in:3600,user:{id:'admin-id',email:body.email}}:path==='/rest/v1/profiles'?[{role:'admin',username:'admin',must_change_password:first,account_enabled:enabled,account_pending:pending}]:path==='/functions/v1/hr-accounts'?{ok:true}:null;return {ok:true,text:async()=>JSON.stringify(result)};};
const api=await import('../dist/api.js');
test('usernames are normalized consistently and supported for all seven colleges',()=>{
 assert.equal(loginEmail('ADMIN'),'admin@users.hrvec-andaman2.invalid');assert.equal(loginEmail('old@example.com'),'old@example.com');assert.equal(normalizeUsername(' RNT.001 '),'rnt.001');assert.throws(()=>normalizeUsername('ชื่อ ผู้ใช้'));
 assert.equal(new Set(Array.from({length:7},(_,i)=>suggestedUsername({school_id:i+1,employee_code:'001'}))).size,7);assert.throws(()=>validatePassword('123456'));assert.throws(()=>validatePassword('abcdefgh'));assert.throws(()=>validatePassword('Password123','Password123'));assert.equal(validatePassword('Password123'),'Password123');
});
test('initial admin password authenticates only to the forced-change screen, without business data or access audit',async()=>{
 await api.verifyAdmin('admin','123456','accounts');assert.equal(api.session().mustChangePassword,true);assert.equal(api.canReadDetails(),false);assert.equal(await api.overview(),null);await assert.rejects(api.all('personnel'));assert.equal(calls.some(c=>c.path==='/rest/v1/rpc/record_admin_access'),false);
 assert.equal(calls.find(c=>c.path==='/auth/v1/token').body.email,'admin@users.hrvec-andaman2.invalid');
});
test('password changes use the authenticated server endpoint then remove the old session',async()=>{
 await api.changePassword('123456','NewPassword123');const call=calls.find(c=>c.path==='/functions/v1/hr-accounts');assert.deepEqual(call.body,{action:'change_password',current_password:'123456',new_password:'NewPassword123'});assert.equal(api.session().mode,'guest');assert.equal(api.session().email,'');assert.ok(calls.some(c=>c.path==='/auth/v1/logout'));
 first=false;await api.verifyAdmin('admin','NewPassword123','accounts');assert.equal(api.canReadDetails(),true);assert.equal(calls.at(-1).path,'/rest/v1/rpc/record_admin_access');
});
test('disabled and pending accounts cannot establish a session',async()=>{
 await api.logout();enabled=false;await assert.rejects(api.login('admin','NewPassword123'),/พัก/);assert.equal(api.session().mode,'guest');enabled=true;pending=true;await assert.rejects(api.login('admin','NewPassword123'),/พัก/);assert.equal(api.session().mode,'guest');
});
