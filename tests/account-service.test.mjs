import test from 'node:test';import assert from 'node:assert/strict';
import {handleAccountAction} from '../supabase/functions/hr-accounts/service.js';
const adminId='00000000-0000-0000-0000-000000000001',staffId='00000000-0000-0000-0000-000000000002',newId='00000000-0000-0000-0000-000000000003';
const personId='10000000-0000-0000-0000-000000000001';
function setup(){
 const calls=[],profiles=[{id:adminId,role:'admin',account_enabled:true,account_pending:false,must_change_password:false,account_revision:0},{id:staffId,role:'personnel',account_enabled:true,account_pending:false,must_change_password:true,account_revision:0}],people=[{id:personId,school_id:1,user_id:null,revision:1,deleted_at:null}];
 const flags={wrongPassword:false,authFailure:false,bindFailure:false};
 const admin={from(table){const filters=[];let changes;return {select(){return this;},eq(k,v){filters.push([k,v]);return this;},update(value){changes=value;return this;},async single(){const rows=table==='profiles'?profiles:people;const row=rows.find(r=>filters.every(([k,v])=>r[k]===v));if(!row)return {error:{}};if(changes)Object.assign(row,changes);return {data:{...row},error:null};}}},auth:{admin:{async createUser(payload){calls.push(['create',payload]);profiles.push({id:newId,role:'personnel',account_enabled:true,account_pending:false,must_change_password:true,account_revision:0});return {data:{user:{id:newId}}};},async deleteUser(id){calls.push(['cleanup',id]);return {};},async updateUserById(id,payload){calls.push(['auth-update',id,payload]);return flags.authFailure?{error:{}}:{data:{user:{id}}};}}},async rpc(name,args){calls.push([name,args]);if(name==='bind_managed_account'){if(flags.bindFailure)return {error:{}};people[0].user_id=args.user_id;return {data:null};}const p=profiles.find(p=>p.id===args.target_id);if(p.account_revision!==args.expected_revision)return {error:{}};
 if(name==='begin_account_change'){p.account_pending=true;p.must_change_password=true;p.account_revision++;return {data:p.account_revision};}if(name==='finish_account_change'){p.account_pending=false;p.must_change_password=args.force_change;return {data:null};}if(name==='set_account_enabled'){p.account_enabled=args.enabled;p.account_revision++;return {data:null};}return {error:{}};}};
 const context={admin,actor:{id:adminId,email:'admin@example.com'},sessionValid:true,ready:true,createAuthClient:()=>({auth:{async signInWithPassword(){return flags.wrongPassword?{error:{}}:{data:{user:{id:context.actor.id}}};},async signOut(){calls.push(['discard-verifier']);}}})};
 return {context,calls,profiles,people,flags};
}
test('admin creates linked accounts in the original schools and newly added schools, forces first change, and never returns passwords',async()=>{
 for(let school=1;school<=8;school++){const x=setup();x.people[0].school_id=school;const result=await handleAccountAction(x.context,{action:'create',personnel_id:personId,username:'College'+school,password:'StartPass123',expected_revision:1});assert.equal(result.username,'college'+school);assert.equal(result.must_change_password,true);assert.equal(x.people[0].user_id,newId);assert.doesNotMatch(JSON.stringify(result),/StartPass123/);assert.equal(x.calls[0][1].email,'college'+school+'@users.hrvec-andaman2.invalid');}
});
test('staff, forced-change admins and revoked sessions cannot manage others; forged client roles have no effect',async()=>{
 for(const kind of ['staff','forced','revoked']){const x=setup();if(kind==='staff')x.context.actor.id=staffId;if(kind==='forced')x.profiles[0].must_change_password=true;if(kind==='revoked')x.context.sessionValid=false;await assert.rejects(handleAccountAction(x.context,{action:'create',role:'admin',personnel_id:personId,username:'test1',password:'StartPass123',expected_revision:1}),e=>e.status===403);assert.equal(x.calls.length,0);}
});
test('wrong current password produces no mutations; a successful first change signs out the verifier and clears the flag',async()=>{
 const x=setup();x.context.actor.id=staffId;x.context.ready=false;x.flags.wrongPassword=true;await assert.rejects(handleAccountAction(x.context,{action:'change_password',current_password:'wrong',new_password:'NewPassword123'}),/ปัจจุบัน/);assert.equal(x.calls.length,0);
 x.flags.wrongPassword=false;await handleAccountAction(x.context,{action:'change_password',current_password:'StartPass123',new_password:'NewPassword123'});assert.equal(x.profiles[1].must_change_password,false);assert.deepEqual(x.calls.map(c=>c[0]),['discard-verifier','begin_account_change','auth-update','finish_account_change']);
});
test('a cross-service failure leaves the account blocked for admin repair and creation binding failure removes the new orphan',async()=>{
 const x=setup();x.people[0].user_id=staffId;x.flags.authFailure=true;await assert.rejects(handleAccountAction(x.context,{action:'reset_password',personnel_id:personId,expected_account_revision:0,password:'ResetPass123'}),/พักชั่วคราว/);assert.equal(x.profiles[1].account_pending,true);assert.equal(x.profiles[1].must_change_password,true);
 const y=setup();y.flags.bindFailure=true;await assert.rejects(handleAccountAction(y.context,{action:'create',personnel_id:personId,expected_revision:1,username:'test1',password:'StartPass123'}),/ผูกบัญชี/);assert.ok(y.calls.some(c=>c[0]==='cleanup'&&c[1]===newId));
});
test('stale resets and archived personnel cannot change an account',async()=>{
 const x=setup();x.people[0].user_id=staffId;await assert.rejects(handleAccountAction(x.context,{action:'reset_password',personnel_id:personId,expected_account_revision:99,password:'ResetPass123'}),/เปลี่ยนแปลง/);assert.equal(x.calls.some(c=>c[0]==='auth-update'),false);
 x.people[0].deleted_at='2026-10-20';await assert.rejects(handleAccountAction(x.context,{action:'reset_password',personnel_id:personId,expected_account_revision:0,password:'ResetPass123'}),/ทะเบียน/);
});

test('central admin can reset and suspend a delegated school officer without granting that officer account administration',async()=>{
 const x=setup();x.people[0].school_id=8;x.people[0].user_id=staffId;x.profiles[1].role='school_editor';
 await handleAccountAction(x.context,{action:'reset_password',personnel_id:personId,expected_account_revision:0,password:'ResetPass123'});assert.equal(x.profiles[1].must_change_password,true);
 await handleAccountAction(x.context,{action:'set_enabled',personnel_id:personId,expected_account_revision:1,enabled:false});assert.equal(x.profiles[1].account_enabled,false);
 x.profiles[1].account_enabled=true;x.profiles[1].must_change_password=false;x.context.actor.id=staffId;await assert.rejects(handleAccountAction(x.context,{action:'create',personnel_id:personId,username:'forbidden',password:'StartPass123',expected_revision:1}),e=>e.status===403);
});
