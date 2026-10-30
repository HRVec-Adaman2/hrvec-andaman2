// Session/route integration with a DOM adapter; browser layout is checked separately.
import test from 'node:test';import assert from 'node:assert/strict';
const nodes=new Map(),events=new Map(),windowEvents=new Map(),paths=[];
const makeNode=()=>{const classes=new Set();return {innerHTML:'',textContent:'',style:{},open:false,classList:{contains:n=>classes.has(n),toggle(n,on){on?classes.add(n):classes.delete(n);}},setAttribute(){},focus(){},showModal(){this.open=true;},close(){this.open=false;}};};
const query=s=>{if(!nodes.has(s))nodes.set(s,makeNode());return nodes.get(s);};
globalThis.document={body:makeNode(),querySelector:query,addEventListener:(n,f)=>events.set(n,f)};
globalThis.window={HR_CONFIG:{supabaseUrl:'https://auth.invalid',supabaseAnonKey:'public-test-key'},addEventListener:(n,f)=>windowEvents.set(n,f)};
globalThis.location={hash:'#dashboard'};globalThis.history={pushState:(_a,_b,h)=>location.hash=h,replaceState:(_a,_b,h)=>location.hash=h};
globalThis.FormData=class{constructor(form){this.values=new Map(Object.entries(form.values));}entries(){return this.values.entries();}has(k){return this.values.has(k);}get(k){return this.values.get(k)??null;}getAll(k){return this.values.has(k)?[this.values.get(k)]:[];}};
let accepted=false,role='admin';
globalThis.fetch=async(url,options)=>{
 const path=new URL(url).pathname;paths.push(path);let status=200,result=[];
 if(path==='/auth/v1/token'){
  if(!accepted){status=400;result={message:'Invalid login credentials'};}else result={access_token:'test-token',refresh_token:'test-refresh',expires_in:3600,user:{id:'test-id',email:'admin@example.com'}};
 }else if(path==='/rest/v1/profiles')result=[{role}];
 else if(path==='/rest/v1/rpc/hr_overview'||path==='/rest/v1/rpc/hr_public_overview')result={public:path.endsWith('hr_public_overview'),total:1,certificates:0,holders:0,schools:[{id:2,name:'สถานศึกษาทดสอบ',count:1}],degrees:[],issuers:[],required:0,done:0,incomplete:0,expired:0,expiring:0,pending:0,missingEducation:0};
 else if(path==='/rest/v1/personnel')result=[{id:'p-test',employee_code:'PRIVATE-CODE',full_name:'PRIVATE-NAME',position:'ครู',school_id:2,status:'ปฏิบัติงาน',highest_education:'ปริญญาโท'}];
 else if(path==='/rest/v1/schools')result=[{id:2,name:'สถานศึกษาทดสอบ'}];else if(path==='/rest/v1/settings')result=[{id:1,expiry_days:90}];
 if(path.endsWith('hr_public_overview'))assert.equal(options.headers.Authorization,undefined);else if(!path.startsWith('/auth/'))assert.equal(options.headers.Authorization,'Bearer test-token');
 return {ok:status<400,status,text:async()=>JSON.stringify(result)};
};
await import('../dist/app.js');await new Promise(resolve=>setTimeout(resolve,0));const api=await import('../dist/api.js');
const html=()=>query('#main').innerHTML,navigate=hash=>{location.hash=hash;return windowEvents.get('hashchange')();};
const click=dataset=>events.get('click')({preventDefault(){},target:{closest:s=>s==='[data-action]'?{dataset,disabled:false}:null}});
async function confirm(){const form={id:'adminaccessform',values:{email:'admin@example.com',password:'test-password'},reset(){this.values.password='';},querySelector:s=>query(s)};await events.get('submit')({preventDefault(){},target:form});return form;}
test('guest can load aggregate counts but details require a valid account',async()=>{
 assert.deepEqual(paths,['/rest/v1/rpc/hr_public_overview']);assert.doesNotMatch(html(),/PRIVATE-NAME|PRIVATE-CODE/);
 await events.get('click')({preventDefault(){},target:{closest:s=>s==='#main a[href^="#"]'?{getAttribute:()=> '#personnel?school=2'}:null}});
 assert.equal(location.hash,'#dashboard');assert.match(query('#modalbody').innerHTML,/เข้าสู่ระบบเพื่อเปิดข้อมูล/);
 await confirm();assert.equal(query('#formerror').hidden,false);assert.equal(paths.includes('/rest/v1/personnel'),false);
 accepted=true;role='personnel';const form=await confirm();assert.equal(form.values.password,'');assert.equal(location.hash,'#personnel?school=2');assert.equal(api.session().role,'personnel');assert.match(html(),/PRIVATE-NAME/);assert.equal(paths.includes('/rest/v1/rpc/record_admin_access'),false);assert.doesNotMatch(query('#nav').innerHTML,/href="#settings"|href="#accounts"/);
});
test('staff navigation keeps the session and restricts admin menus',async()=>{
 const authCount=paths.filter(p=>p==='/auth/v1/token').length,count=paths.length;await navigate('#dashboard');assert.deepEqual(paths.slice(count),['/rest/v1/rpc/hr_overview']);assert.doesNotMatch(html(),/PRIVATE-NAME|PRIVATE-CODE/);assert.equal(query('#modalbody').innerHTML,'');
 await navigate('#certificates');await navigate('#settings');assert.equal(query('#crumb').textContent,'ข้อมูลบุคลากร');assert.equal(query('#modalbody').innerHTML,'');assert.equal(paths.filter(p=>p==='/auth/v1/token').length,authCount);
});
test('one admin login covers dashboard and every allowed menu without another password',async()=>{
 await api.logout();await navigate('#dashboard');role='admin';await navigate('#personnel');await confirm();assert.ok(paths.includes('/rest/v1/rpc/record_admin_access'));const authCount=paths.filter(p=>p==='/auth/v1/token').length;
 for(const page of ['dashboard','personnel','certificates','documents','reports','settings','accounts','logs','archive','requests','review']){await navigate('#'+page);assert.equal(query('#modalbody').innerHTML,'');assert.equal(query('#modal').open,false);assert.doesNotMatch(html(),/ข้อมูลส่วนบุคคลถูกจำกัดสิทธิ์/);}
 assert.equal(api.session().role,'admin');assert.equal(paths.filter(p=>p==='/auth/v1/token').length,authCount);
});
test('logout clears personal UI and returns to public counts; a later detail click asks for login',async()=>{
 await click({action:'signout'});assert.equal(api.session().mode,'guest');await navigate('#dashboard');assert.doesNotMatch(html(),/PRIVATE-NAME|PRIVATE-CODE/);assert.equal(paths.at(-1),'/rest/v1/rpc/hr_public_overview');const count=paths.length;await navigate('#personnel');assert.equal(paths.length,count);assert.match(query('#modalbody').innerHTML,/เข้าสู่ระบบเพื่อเปิดข้อมูล/);assert.doesNotMatch(html(),/PRIVATE-NAME|PRIVATE-CODE/);
});
