// Form/route tests with mocked Auth and a DOM adapter, not browser layout tests.
import test from 'node:test';import assert from 'node:assert/strict';
const nodes=new Map(),events=new Map(),windowEvents=new Map(),calls=[];let first=true;
const make=()=>({innerHTML:'',textContent:'',value:'',style:{},open:false,hidden:true,classList:{contains:()=>false,toggle(){}},setAttribute(){},focus(){},showModal(){this.open=true;},close(){this.open=false;}});
const query=s=>{if(!nodes.has(s))nodes.set(s,make());return nodes.get(s);};globalThis.document={body:make(),querySelector:query,getElementById:id=>query('#'+id),addEventListener:(n,f)=>events.set(n,f)};
globalThis.window={HR_CONFIG:{supabaseUrl:'https://account.invalid',supabaseAnonKey:'public-key'},addEventListener:(n,f)=>windowEvents.set(n,f)};globalThis.location={hash:'#dashboard'};globalThis.history={pushState:(_a,_b,h)=>location.hash=h,replaceState:(_a,_b,h)=>location.hash=h};
globalThis.FormData=class{constructor(f){this.values=f.values;}entries(){return Object.entries(this.values);}has(k){return Object.hasOwn(this.values,k);}};
globalThis.fetch=async(url,options)=>{const path=new URL(url).pathname;calls.push(path);let result=[];if(path==='/auth/v1/token')result={access_token:'token',refresh_token:'refresh',expires_in:3600,user:{id:'admin-id',email:'admin@users.hrvec-andaman2.invalid'}};
 else if(path==='/rest/v1/profiles')result=[{id:'admin-id',role:'admin',username:'admin',must_change_password:first,account_enabled:true,account_pending:false,account_revision:0}];else if(path==='/functions/v1/hr-accounts'){first=false;result={ok:true};}else if(path==='/rest/v1/rpc/hr_overview')result={total:1,certificates:0,holders:0,schools:[],degrees:[],issuers:[],required:0,done:0,incomplete:0,pending:0,missingEducation:0};else if(path==='/rest/v1/schools')result=Array.from({length:7},(_,i)=>({id:i+1,name:'วิทยาลัย '+(i+1)}));else if(path==='/rest/v1/personnel'&&!new URL(url).search.includes('not.is.null'))result=[{id:'p-7',full_name:'บุคลากรทดสอบ',employee_code:'007',school_id:7,revision:1,education_majors:[]}];return {ok:true,text:async()=>JSON.stringify(result)};};
await import('../dist/app.js');await new Promise(r=>setTimeout(r,0));
const click=dataset=>events.get('click')({preventDefault(){},target:{closest:s=>s==='[data-action]'?{dataset,disabled:false}:null}});
const navigate=hash=>{location.hash=hash;return windowEvents.get('hashchange')();};
const form=(id,values)=>({id,values,reset(){for(const k of Object.keys(this.values))this.values[k]='';},querySelector:s=>query(s)});
const submit=f=>events.get('submit')({preventDefault(){},target:f});
test('first login forces a password screen, clears submitted credentials and never loads personnel',async()=>{
 await query('#loginbtn').onclick();assert.match(query('#modalbody').innerHTML,/ชื่อผู้ใช้/);
 const f=form('loginform',{email:'admin',password:'123456'});await submit(f);assert.equal(f.values.password,'');assert.match(query('#main').innerHTML,/เปลี่ยนรหัสผ่านก่อนเริ่มใช้งาน/);assert.match(query('#modalbody').innerHTML,/name="current_password"/);assert.equal(calls.includes('/rest/v1/personnel'),false);
 await navigate('#accounts');assert.equal(calls.includes('/rest/v1/personnel'),false);assert.match(query('#modalbody').innerHTML,/เปลี่ยนรหัสผ่านครั้งแรก/);
});
test('changing the first password requires matching confirmation and returns to sign-in',async()=>{
 await submit(form('passwordform',{current_password:'123456',new_password:'NewPassword123',confirm_password:'Different123'}));assert.equal(calls.includes('/functions/v1/hr-accounts'),false);
 const f=form('passwordform',{current_password:'123456',new_password:'NewPassword123',confirm_password:'NewPassword123'});await submit(f);assert.equal(f.values.current_password,'');assert.match(query('#modalbody').innerHTML,/เข้าสู่ระบบ HRVec-Andaman2/);assert.doesNotMatch(query('#modalbody').innerHTML,/NewPassword123|123456/);assert.equal(calls.includes('/rest/v1/personnel'),false);
});
test('an authenticated admin reaches all seven college account lists and creates credentials in a dedicated form',async()=>{
 await submit(form('loginform',{email:'admin',password:'NewPassword123'}));await navigate('#dashboard');await navigate('#accounts');await submit(form('adminaccessform',{email:'admin',password:'NewPassword123'}));
 for(let i=1;i<=7;i++)assert.match(query('#main').innerHTML,new RegExp('href="#accounts\\?school='+i+'"'));
 await click({action:'accountform',id:'p-7'});const html=query('#modalbody').innerHTML;assert.match(html,/name="username"/);assert.match(html,/tic.007/);assert.match(html,/name="password"/);assert.match(html,/วิทยาลัย 7/);
});
