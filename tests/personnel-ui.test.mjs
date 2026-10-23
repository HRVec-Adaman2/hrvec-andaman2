// Form/route integration with a minimal DOM adapter; does not test browser layout.
import test from 'node:test';import assert from 'node:assert/strict';
const elements=new Map(),handlers=new Map(),events=new Map(),storage=new Map();
const node=()=>({innerHTML:'',textContent:'',style:{},open:false,hidden:true,value:'',disabled:false,classList:{contains:()=>false,toggle(){}},setAttribute(){},focus(){},showModal(){this.open=true;},close(){this.open=false;},querySelector(){return null;},querySelectorAll(){return [];},replaceWith(form){this.replaced=form;}});
globalThis.document={body:node(),querySelector:s=>{if(!elements.has(s))elements.set(s,node());return elements.get(s);},getElementById:id=>document.querySelector('#'+id),addEventListener:(name,fn)=>handlers.set(name,fn)};
globalThis.window={HR_CONFIG:{},addEventListener:(name,fn)=>events.set(name,fn)};globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
globalThis.location={hash:'#personnel?school=1'};globalThis.history={replaceState:(_s,_t,hash)=>location.hash=hash,pushState:(_s,_t,hash)=>location.hash=hash};
globalThis.FormData=class{constructor(form){this.values=form.values;}entries(){return this.values[Symbol.iterator]();}get(k){return this.values.find(x=>x[0]===k)?.[1]??null;}getAll(k){return this.values.filter(x=>x[0]===k).map(x=>x[1]);}has(k){return this.values.some(x=>x[0]===k);}};
await import('../dist/app.js');await new Promise(r=>setTimeout(r,0));const api=await import('../dist/api.js');
const click=dataset=>handlers.get('click')({preventDefault(){},target:{closest:s=>s==='[data-action]'?{dataset,disabled:false}:null}});
const navigate=hash=>{location.hash=hash;return events.get('hashchange')();};
function form(id,values){const error=node(),button=node();return {id,values:Object.entries(values),error,querySelector:s=>s==='#formerror'?error:s==='[type=submit],button.primary'?button:null};}
const submit=form=>handlers.get('submit')({preventDefault(){},target:form});
test('school rows expose edit/delete/history; editing requires a review and leaves data untouched until confirmation',async()=>{
 api.openDemoDetails();await navigate('#personnel?school=1');const html=elements.get('#main').innerHTML;assert.match(html,/data-action="editperson" data-id="demo-0"/);assert.match(html,/data-action="deleteperson" data-id="demo-0"/);assert.match(html,/data-action="personhistory" data-id="demo-0"/);
 const original=(await api.all('personnel')).find(p=>p.id==='demo-0');await click({action:'editperson',id:original.id});
 const values=Object.fromEntries(['employee_code','full_name','school_id','position','department','academic_rank','highest_education','birth_date','start_date','email','phone','work_unit'].map(k=>[k,String(original[k]??'')]));values.education_major=original.education_majors[0];values.phone='0812345678';
 const edit=form('personform',values);await submit(edit);assert.match(elements.get('#modalbody').innerHTML,/ค่าเดิม/);assert.match(elements.get('#modalbody').innerHTML,/0812345678/);assert.equal((await api.all('personnel')).find(p=>p.id===original.id).phone,original.phone);
 await click({action:'backpersonreview'});assert.equal(elements.get('#personformreturn').replaced,edit);await submit(edit);
 await submit(form('personreviewform',{reviewed:'on',reason:'ปรับข้อมูลติดต่อให้เป็นปัจจุบัน'}));assert.equal((await api.all('personnel')).find(p=>p.id===original.id).phone,'0812345678');
});
test('delete verifies the exact person code and reason, and archive restore returns the same record',async()=>{
 await click({action:'deleteperson',id:'demo-0'});assert.match(elements.get('#modalbody').innerHTML,/วิทยาลัยเทคนิคระนอง/);assert.match(elements.get('#modalbody').innerHTML,/DEMO001/);
 const wrong=form('lifecycleform',{confirm_code:'DEMO002',reason:'รายการนี้กรอกข้อมูลผิด',reviewed:'on'});await submit(wrong);assert.match(wrong.error.textContent,/ไม่ตรง/);assert.ok((await api.all('personnel')).find(p=>p.id==='demo-0'));
 await submit(form('lifecycleform',{confirm_code:'DEMO001',reason:'รายการนี้กรอกข้อมูลผิด',reviewed:'on'}));assert.equal((await api.all('personnel')).some(p=>p.id==='demo-0'),false);
 await navigate('#archive?school=1');assert.match(elements.get('#main').innerHTML,/data-action="restoreperson" data-id="demo-0"/);assert.match(elements.get('#main').innerHTML,/รายการนี้กรอกข้อมูลผิด/);
 await click({action:'personhistory',id:'demo-0'});assert.match(elements.get('#modalbody').innerHTML,/ลบบุคลากร/);assert.match(elements.get('#modalbody').innerHTML,/ผู้ดูแลระบบ/);
 await click({action:'restoreperson',id:'demo-0'});await submit(form('lifecycleform',{confirm_code:'DEMO001',reason:'ตรวจข้อมูลแล้วขอกู้คืน',reviewed:'on'}));assert.ok((await api.all('personnel')).find(p=>p.id==='demo-0'));
});
test('staff can edit and inspect own history or request removal, but cannot directly delete',async()=>{
 api.demoRole('personnel');await navigate('#archive');assert.equal(location.hash,'#archive');assert.equal(elements.get('#crumb').textContent,'ข้อมูลบุคลากร');assert.doesNotMatch(elements.get('#main').innerHTML,/data-action="(?:deleteperson|restoreperson)"/);assert.doesNotMatch(elements.get('#nav').innerHTML,/href="#archive"/);
 assert.match(elements.get('#main').innerHTML,/data-action="editperson" data-id="demo-0"/);assert.match(elements.get('#main').innerHTML,/data-action="requestremoval"/);assert.match(elements.get('#main').innerHTML,/ประวัติของฉัน/);await click({action:'deleteperson',id:'demo-0'});assert.match(elements.get('#toast').textContent,/ผู้ดูแลระบบ/);
});
