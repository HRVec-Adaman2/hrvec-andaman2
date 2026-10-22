// Render/route integration with a minimal DOM adapter. This is not a browser layout test.
import test from 'node:test';import assert from 'node:assert/strict';
const elements=new Map(),handlers=new Map(),windowHandlers=new Map(),storage=new Map();
const node=()=>{const attrs=new Map(),classes=new Set();return {innerHTML:'',textContent:'',style:{},open:false,classList:{contains:name=>classes.has(name),toggle(name,on){if(on)classes.add(name);else classes.delete(name);}},setAttribute:(name,value)=>attrs.set(name,String(value)),getAttribute:name=>attrs.get(name),focus(){document.activeElement=this;},scrollIntoView(options){this.scrolled=options;},querySelectorAll(){return this.focusable||[];},showModal(){this.open=true;},close(){this.open=false;}};};
globalThis.document={body:node(),querySelector:s=>{if(!elements.has(s))elements.set(s,node());return elements.get(s);},getElementById:id=>document.querySelector('#'+id),addEventListener:(name,fn)=>handlers.set(name,fn)};
globalThis.window={HR_CONFIG:{},innerWidth:390,matchMedia:()=>({matches:false}),addEventListener:(name,fn)=>windowHandlers.set(name,fn)};
globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
globalThis.location={hash:'#dashboard',reload(){}};globalThis.history={replaceState:(_s,_t,hash)=>location.hash=hash,pushState:(_s,_t,hash)=>location.hash=hash};
await import('../dist/app.js');await new Promise(resolve=>setTimeout(resolve,0));
const html=()=>elements.get('#main').innerHTML;
const navigate=hash=>{location.hash=hash;return windowHandlers.get('hashchange')();};
const click=dataset=>handlers.get('click')({preventDefault(){},target:{closest:selector=>selector==='[data-action]'?{dataset,disabled:false}:null}});
test('overview links lead to personnel, certificate and each school breakdown',()=>{
 assert.doesNotMatch(html(),/บุคลากรตัวอย่าง|name="password"/);assert.match(html(),/ข้อมูลใบรับรองวิชาชีพ/);assert.match(html(),/href="#personnel\?school=1"/);assert.match(html(),/href="#personnel\?school=7"/);assert.match(html(),/href="#certificates\?status=expiring"/);
});
test('direct detail links require confirmation, and demo access is explicitly labelled',async()=>{
 await navigate('#personnel?school=2');assert.match(html(),/ข้อมูลส่วนบุคคลถูกจำกัดสิทธิ์/);assert.doesNotMatch(html(),/บุคลากรตัวอย่าง/);assert.match(elements.get('#modalbody').innerHTML,/รหัสผ่าน admin/);assert.match(elements.get('#modalbody').innerHTML,/ยังไม่ได้เปิดใช้งานบัญชีผู้ดูแลระบบจริง/);await click({action:'demoaccess'});assert.match(html(),/บุคลากรตัวอย่าง 2/);assert.doesNotMatch(html(),/บุคลากรตัวอย่าง 1<\//);assert.match(html(),/value="2" selected/);assert.match(html(),/วุฒิสูงสุด/);
});
test('certificate issuer drilldown reaches certificate details',async()=>{
 await navigate('#certificates?issuer='+encodeURIComponent('ข้อมูลสาธิต'));assert.match(html(),/ใบอนุญาตประกอบวิชาชีพผู้บริหารสถานศึกษา/);
 await handlers.get('click')({preventDefault(){},target:{closest:()=>({dataset:{action:'certdetail',id:'cert-1'},disabled:false})}});
 assert.match(elements.get('#modalbody').innerHTML,/จากหน่วยงาน/);assert.match(elements.get('#modalbody').innerHTML,/ข้อมูลสาธิต/);
});
test('personnel form includes highest education and an optional certificate with issuer',async()=>{
 await handlers.get('click')({preventDefault(){},target:{closest:()=>({dataset:{action:'editperson'},disabled:false})}});
 const form=elements.get('#modalbody').innerHTML;assert.match(form,/name="highest_education"/);assert.match(form,/name="education_major"/);assert.match(form,/data-action="addmajor"/);assert.doesNotMatch(form,/name="status"/);assert.match(form,/name="certificate_name"/);assert.match(form,/name="certificate_issuer"/);assert.match(form,/ไม่ระบุฝ่าย/);
});
test('saving personnel with a certificate creates a linked demo record and rejects incomplete certificates',async()=>{
 const api=await import('../dist/api.js');const before=(await api.all('personnel')).length;
 const person={employee_code:'ATOMIC-001',full_name:'ทดสอบ ใบรับรอง',school_id:1,highest_education:'ปริญญาโท',position:'ผู้อำนวยการ',department:''};
 await assert.rejects(api.savePersonnel(person,{kind:'vocational',name:'ทดสอบ',issuer:''}));assert.equal((await api.all('personnel')).length,before);
 const saved=await api.savePersonnel(person,{kind:'vocational',name:'ใบรับรองทดสอบ',issuer:'หน่วยงานทดสอบ',number:''});
 assert.ok(saved.id);assert.ok(saved.certificate_id);assert.equal((await api.all('certificates')).find(c=>c.id===saved.certificate_id).personnel_id,saved.id);assert.equal((await api.all('personnel')).find(p=>p.id===saved.id).highest_education,'ปริญญาโท');
});
test('admin can reach settings through navigation and settings sections',async()=>{
 await navigate('#settings');assert.match(elements.get('#nav').innerHTML,/admin-group/);assert.match(elements.get('#nav').innerHTML,/href="#settings"/);assert.match(elements.get('#adminQuickAction').innerHTML,/ตั้งค่าระบบ/);
 assert.match(html(),/id="settings-organization"/);assert.match(html(),/id="settings-backup"/);
 await click({action:'settingssection',section:'settings-backup'});assert.equal(elements.get('#settings-backup').scrolled.block,'start');assert.equal(location.hash,'#settings');
});
test('staff cannot see admin menus or open admin routes or write settings',async()=>{
 const api=await import('../dist/api.js');
 const changeRole=role=>handlers.get('change')({target:{id:'demoRole',value:role,matches:()=>false}});
 try{await changeRole('personnel');for(const route of ['settings','review','logs']){await navigate('#'+route);assert.equal(elements.get('#crumb').textContent,'ข้อมูลบุคลากร');assert.doesNotMatch(elements.get('#nav').innerHTML,/href="#(?:settings|review|logs)"/);assert.equal(elements.get('#adminQuickAction').innerHTML,'');}assert.match(elements.get('#roleBadge').innerHTML,/บุคลากร/);await assert.rejects(api.save('settings',{id:1,organization:'ไม่ได้รับอนุญาต'}),/ไม่มีสิทธิ์/);
 }finally{await changeRole('admin');api.openDemoDetails();await navigate('#settings');}
});
test('mobile navigation supports toggle, focus containment and Escape',async()=>{
 const toggle=elements.get('#menuToggle'),close=elements.get('.sidebar-close'),last=node();document.querySelector('#appsidebar').focusable=[close,last];
 await click({action:'togglemenu'});assert.equal(document.body.classList.contains('nav-open'),true);assert.equal(toggle.getAttribute('aria-expanded'),'true');assert.equal(document.activeElement,close);
 let trapped=false;handlers.get('keydown')({key:'Tab',shiftKey:true,preventDefault(){trapped=true;}});assert.equal(trapped,true);assert.equal(document.activeElement,last);
 handlers.get('keydown')({key:'Tab',shiftKey:false,preventDefault(){}});assert.equal(document.activeElement,close);
 handlers.get('keydown')({key:'Escape'});assert.equal(document.body.classList.contains('nav-open'),false);assert.equal(toggle.getAttribute('aria-expanded'),'false');assert.equal(document.activeElement,toggle);
 await click({action:'togglemenu'});await navigate('#dashboard');assert.equal(document.body.classList.contains('nav-open'),false);
});
test('skip to content keeps the current route',async()=>{
 await navigate('#personnel?school=2');await click({action:'skipcontent'});assert.equal(location.hash,'#personnel?school=2');assert.equal(document.activeElement,elements.get('#main-content'));
});

test('each overview selection opens the admin prompt before changing the route',async()=>{
 await navigate('#dashboard');const before=location.hash;let prevented=false;
 await handlers.get('click')({preventDefault(){prevented=true;},target:{closest:selector=>selector==='#main a[href^="#"]'?{getAttribute:()=> '#certificates?status=expiring'}:null}});
 assert.equal(prevented,true);assert.equal(location.hash,before);assert.match(elements.get('#modalbody').innerHTML,/ยืนยันสิทธิ์ผู้ดูแลระบบ/);assert.doesNotMatch(html(),/บุคลากรตัวอย่าง/);
 await click({action:'close'});assert.equal(elements.get('#modal').open,false);assert.equal(location.hash,before);
});
