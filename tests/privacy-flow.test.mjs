// Authenticated UI journey using a DOM adapter and mocked network, not browser QA.
import test from 'node:test';import assert from 'node:assert/strict';
const nodes=new Map(),events=new Map(),windowEvents=new Map(),paths=[];
const makeNode=()=>{const classes=new Set(),attrs=new Map();return {innerHTML:'',textContent:'',style:{},open:false,classList:{contains:n=>classes.has(n),toggle(n,on){on?classes.add(n):classes.delete(n);}},setAttribute:(n,v)=>attrs.set(n,v),focus(){},showModal(){this.open=true;},close(){this.open=false;}};};
const query=s=>{if(!nodes.has(s))nodes.set(s,makeNode());return nodes.get(s);};
globalThis.document={body:makeNode(),querySelector:query,addEventListener:(n,f)=>events.set(n,f)};
globalThis.window={HR_CONFIG:{supabaseUrl:'https://auth.invalid',supabaseAnonKey:'public-test-key'},addEventListener:(n,f)=>windowEvents.set(n,f)};
globalThis.location={hash:'#dashboard'};globalThis.history={pushState:(_a,_b,h)=>location.hash=h,replaceState:(_a,_b,h)=>location.hash=h};
globalThis.FormData=class{constructor(form){this.values=new Map(Object.entries(form.values));}entries(){return this.values.entries();}};
let accepted=false,role='admin';
globalThis.fetch=async(url,options)=>{
 const path=new URL(url).pathname;paths.push(path);let status=200,result=[];
 if(path==='/auth/v1/token'){
  if(!accepted){status=400;result={message:'Invalid login credentials'};}
  else result={access_token:'test-token',refresh_token:'test-refresh',expires_in:3600,user:{id:'test-id',email:'admin@example.com'}};
 }else if(path==='/rest/v1/profiles')result=[{role}];
 else if(path==='/rest/v1/rpc/hr_overview')result={total:1,certificates:0,holders:0,schools:[{id:2,name:'สถานศึกษาทดสอบ',count:1}],degrees:[],issuers:[],required:0,done:0,incomplete:0,expired:0,expiring:0,pending:0,missingEducation:0};
 else if(path==='/rest/v1/personnel')result=[{id:'p-test',employee_code:'PRIVATE-CODE',full_name:'PRIVATE-NAME',position:'ครู',school_id:2,status:'ปฏิบัติงาน',highest_education:'ปริญญาโท'}];
 else if(path==='/rest/v1/schools')result=[{id:2,name:'สถานศึกษาทดสอบ'}];
 else if(path==='/rest/v1/settings')result=[{id:1,expiry_days:90}];
 if(!path.startsWith('/auth/'))assert.equal(options.headers.Authorization,'Bearer test-token');
 return {ok:status<400,status,text:async()=>JSON.stringify(result)};
};
await import('../dist/app.js');await new Promise(resolve=>setTimeout(resolve,0));
const html=()=>query('#main').innerHTML;
const navigate=hash=>{location.hash=hash;return windowEvents.get('hashchange')();};
async function confirm(){const form={id:'adminaccessform',values:{email:'admin@example.com',password:'test-password'},reset(){this.values.password='';},querySelector:s=>query(s)};await events.get('submit')({preventDefault(){},target:form});return form;}

test('live overview requires real admin credentials before any personnel load and locks again on return',async()=>{
 assert.equal(paths.length,0);assert.doesNotMatch(html(),/PRIVATE-NAME/);
 await events.get('click')({preventDefault(){},target:{closest:s=>s==='#main a[href^="#"]'?{getAttribute:()=> '#personnel?school=2'}:null}});
 assert.equal(location.hash,'#dashboard');assert.match(query('#modalbody').innerHTML,/รหัสผ่าน admin/);
 await confirm();assert.equal(query('#formerror').hidden,false);assert.equal(paths.includes('/rest/v1/personnel'),false);
 accepted=true;role='personnel';await confirm();assert.equal(paths.includes('/rest/v1/personnel'),false);assert.equal(location.hash,'#dashboard');
 role='admin';const form=await confirm();assert.equal(form.values.password,'');assert.equal(location.hash,'#personnel?school=2');assert.match(html(),/PRIVATE-NAME/);assert.ok(paths.includes('/rest/v1/rpc/record_admin_access'));
 const count=paths.length;await navigate('#dashboard');assert.deepEqual(paths.slice(count),['/rest/v1/rpc/hr_overview']);assert.doesNotMatch(html(),/PRIVATE-NAME|PRIVATE-CODE/);assert.equal(query('#modalbody').innerHTML,'');
 const lockedCount=paths.length;await navigate('#reports');assert.equal(paths.length,lockedCount);assert.match(html(),/ข้อมูลส่วนบุคคลถูกจำกัดสิทธิ์/);assert.match(query('#modalbody').innerHTML,/ยืนยันสิทธิ์ผู้ดูแลระบบ/);
});
