import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window={HR_CONFIG:{supabaseUrl:'https://auth.invalid',supabaseAnonKey:'public-test-key'}};
// Production credentials and records must never enter browser storage.
globalThis.localStorage={getItem(){throw Error('Unexpected storage read');},setItem(){throw Error('Unexpected storage write');}};
const calls=[];
let passwordAccepted=true,candidateRole='admin',profileAvailable=true,auditAvailable=true;
globalThis.fetch=async(url,options)=>{
 const path=new URL(url).pathname,body=options.body?JSON.parse(options.body):null;calls.push({path,options});
 let status=200,result=null;
 if(path==='/auth/v1/token'){
  if(!passwordAccepted){status=400;result={message:'Invalid login credentials'};}
  else result={access_token:'candidate-token',refresh_token:'candidate-refresh',expires_in:3600,user:{id:'user-test',email:body.email}};
 }else if(path==='/rest/v1/profiles'){
  assert.equal(options.headers.Authorization,'Bearer candidate-token');
  if(profileAvailable)result=[{role:candidateRole}];else {status=503;result={message:'Unavailable'};}
 }else if(path==='/rest/v1/rpc/record_admin_access'){
  assert.equal(options.headers.Authorization,'Bearer candidate-token');
  if(!auditAvailable){status=404;result={message:'Function missing'};}
 }else if(path==='/rest/v1/rpc/hr_overview')result={total:2,schools:[],degrees:[],issuers:[]};
 else if(path==='/rest/v1/personnel')result=[];
 return {ok:status<400,status,text:async()=>JSON.stringify(result)};
};
const api=await import('../dist/api.js');

test('configured app starts locked and anonymous requests never fetch personnel',async()=>{
 assert.equal(api.session().mode,'guest');assert.equal(await api.overview(),null);
 await assert.rejects(api.all('personnel'),/ยืนยัน/);assert.equal(calls.length,0);assert.throws(()=>api.openDemoDetails(),/สาธิต/);
});
test('wrong password and non-admin accounts cannot unlock admin views',async()=>{
 passwordAccepted=false;await assert.rejects(api.verifyAdmin('test@example.com','wrong'));assert.equal(api.session().mode,'guest');
 passwordAccepted=true;candidateRole='personnel';await assert.rejects(api.verifyAdmin('test@example.com','test-password'),/ผู้ดูแล/);
 assert.equal(api.canReadDetails(),false);assert.ok(calls.some(c=>c.path==='/auth/v1/logout'));
});
test('failed role lookup or access audit leaves the session locked',async()=>{
 candidateRole='admin';profileAvailable=false;await assert.rejects(api.verifyAdmin('test@example.com','test-password'));
 profileAvailable=true;auditAvailable=false;await assert.rejects(api.verifyAdmin('test@example.com','test-password'));
 assert.equal(api.session().mode,'guest');assert.equal(api.canReadDetails(),false);auditAvailable=true;
});
test('admin confirmation checks database role and records the selected view',async()=>{
 await api.verifyAdmin('test@example.com','test-password','certificates');assert.equal(api.session().role,'admin');assert.equal(api.canReadDetails(),true);
 const entry=calls.findLast(c=>c.path==='/rest/v1/rpc/record_admin_access');assert.deepEqual(JSON.parse(entry.options.body),{view_name:'certificates'});
 await api.all('personnel');assert.equal(calls.at(-1).options.headers.Authorization,'Bearer candidate-token');
 const count=calls.length;api.lockDetails();await assert.rejects(api.all('personnel'));assert.equal(calls.length,count);
 assert.equal((await api.overview()).total,2);assert.equal(calls.at(-1).path,'/rest/v1/rpc/hr_overview');
 await api.verifyAdmin('test@example.com','test-password','personnel');assert.equal(calls.at(-1).path,'/rest/v1/rpc/record_admin_access');
});
test('staff identity survives a rejected admin confirmation; logout removes access',async()=>{
 candidateRole='personnel';await api.login('staff@example.com','test-password');
 await assert.rejects(api.verifyAdmin('staff@example.com','test-password'),/ผู้ดูแล/);assert.equal(api.session().role,'personnel');assert.equal(api.session().email,'staff@example.com');
 await api.logout();assert.equal(api.session().mode,'guest');assert.equal(api.session().email,'');await assert.rejects(api.all('personnel'));
});
