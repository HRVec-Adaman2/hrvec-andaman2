// Exercise file reading, validation, review and confirmation through app handlers.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {fields,certificateFields} from '../dist/importer.js';import {workbookAPI} from '../dist/xlsx-compat.js';
const elements=new Map(),handlers=new Map(),events=new Map(),storage=new Map();
const node=()=>({innerHTML:'',textContent:'',style:{},open:false,hidden:true,disabled:false,classList:{contains:()=>false,toggle(){}},setAttribute(){},focus(){},showModal(){this.open=true;},close(){this.open=false;},querySelector(){return null;},querySelectorAll(){return [];}});
globalThis.document={body:node(),querySelector:s=>{if(!elements.has(s))elements.set(s,node());return elements.get(s);},getElementById:id=>document.querySelector('#'+id),addEventListener:(name,fn)=>handlers.set(name,fn)};
globalThis.window={HR_CONFIG:{},addEventListener:(name,fn)=>events.set(name,fn)};
globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
globalThis.location={hash:'#personnel'};globalThis.history={replaceState:(_s,_t,hash)=>location.hash=hash,pushState:(_s,_t,hash)=>location.hash=hash};
globalThis.FormData=class{constructor(form){this.values=form.values;}entries(){return this.values[Symbol.iterator]();}get(k){return this.values.find(x=>x[0]===k)?.[1]??null;}};
for(const file of ['fflate-0.8.2.min.js','exceljs-4.4.0.min.js'])vm.runInThisContext(fs.readFileSync('dist/vendor/'+file,'utf8'));
window.fflate=globalThis.fflate||window.fflate;
await import('../dist/app.js');await new Promise(r=>setTimeout(r,0));const api=await import('../dist/api.js');
let output;window.XLSX=workbookAPI(window.ExcelJS,async(blob,name)=>{output={blob,name};},window.fflate);
const click=dataset=>handlers.get('click')({preventDefault(){},target:{closest:s=>s==='[data-action]'?{dataset,disabled:false}:null}});
const navigate=()=>events.get('hashchange')();const modal=()=>elements.get('#modalbody').innerHTML;
async function fixture(code){
 const h=fields.map(([k,t])=>k==='start_date'?'วันเริ่มรับราชการ':t),ch=certificateFields.map(([k,t])=>k==='issuer'?'หน่วยงานที่ออกให้':t);
 const person={employee_code:code,full_name:'บุคลากร ทดสอบนำเข้า',school_id:'วิทยาลัยเทคนิคระนอง',position:'ผู้อำนวยการ',department:'',work_unit:'งานบริหารบุคลากร',academic_rank:'ไม่มีวิทยฐานะ',birth_date:'1980-05-15',start_date:'2005-05-01',email:'test@example.org',phone:'0812345678',highest_education:'ปริญญาโท',education_majors:'การบริหาร; เทคโนโลยี'};
 const cert={employee_code:code,kind:'ใบรับรองสมรรถนะทางวิชาชีพ',name:'คุณวุฒิ ทดสอบ',issuer:'หน่วยงาน <ตัวอย่าง>',number:'00001',issued_on:'2025-01-01',expires_on:'',occupation:'เทคโนโลยีสารสนเทศ',competency_level:'ระดับ 4',standard:'มาตรฐานอาชีพ ทดสอบ'};
 const book=window.XLSX.utils.book_new();
 for(const [name,rows]of [['บุคลากร',[h,fields.map(([k])=>person[k])]],['ใบรับรองวิชาชีพ',[ch,certificateFields.map(([k])=>cert[k]),certificateFields.map(([k])=>({...cert,number:'00002',name:'คุณวุฒิ อีกใบ'})[k])]]])window.XLSX.utils.book_append_sheet(book,window.XLSX.utils.aoa_to_sheet(rows),name);
 await window.XLSX.writeFile(book,'v18-latest.xlsx');const {blob,name}=output;return {name,size:blob.size,arrayBuffer:()=>blob.arrayBuffer()};
}
async function inspect(file){const error=node(),button=node();await handlers.get('submit')({preventDefault(){},target:{id:'importform',values:[['file',file]],querySelector:s=>s==='#formerror'?error:s==='[type=submit],button.primary'?button:null}});assert.equal(error.textContent,'');}

test('import form describes the exact Thai template and keeps status and address inputs absent',async()=>{
 api.openDemoDetails();await navigate();await click({action:'import'});assert.match(modal(),/แม่แบบรุ่น 1.10/);assert.match(modal(),/บุคลากร 15 ช่อง/);assert.match(modal(),/ใบรับรอง 10 ช่อง/);assert.doesNotMatch(modal(),/templatehelp|importsteps|วิธีกรอก/);assert.doesNotMatch(modal(),/name="(?:status|address)"/);
});
test('a real XLSX reaches a complete escaped preview and only commits linked records after confirmation',async()=>{
 const before=(await api.all('personnel')).length;await inspect(await fixture('000UI123'));
 assert.equal((await api.all('personnel')).length,before);assert.match(modal(),/บุคลากร 1 คน · ใบรับรอง 2 ใบ/);assert.match(modal(),/งานบริหารบุคลากร/);assert.match(modal(),/ฝ่าย: ไม่ระบุ/);assert.match(modal(),/เทคโนโลยีสารสนเทศ/);assert.match(modal(),/ระดับ 4/);assert.match(modal(),/มาตรฐานอาชีพ ทดสอบ/);assert.match(modal(),/อ่านชื่อหัวตารางเดิมเป็น/);assert.match(modal(),/หน่วยงาน &lt;ตัวอย่าง&gt;/);assert.doesNotMatch(modal(),/หน่วยงาน <ตัวอย่าง>/);
 await click({action:'confirmimport'});const person=(await api.all('personnel')).find(p=>p.employee_code==='000UI123'),certs=(await api.all('certificates')).filter(c=>c.personnel_id===person.id);
 assert.equal((await api.all('personnel')).length,before+1);assert.equal(person.department,'');assert.equal(person.phone,'0812345678');assert.equal(person.education_majors.length,2);assert.equal(certs.length,2);assert.equal(certs[0].competency_level,'ระดับ 4');assert.equal(certs[0].number,'00001');
});
test('choosing a duplicate file clears a pending valid import and cannot commit any rows',async()=>{
 const before=(await api.all('personnel')).length;await click({action:'import'});await inspect(await fixture('000UI456'));assert.match(modal(),/data-action="confirmimport"/);
 await click({action:'import'});await inspect(await fixture('000UI123'));assert.match(modal(),/เลขที่ตำแหน่งซ้ำ/);assert.doesNotMatch(modal(),/data-action="confirmimport"/);
 await click({action:'confirmimport'});assert.equal((await api.all('personnel')).length,before);assert.match(elements.get('#toast').textContent,/กรุณาตรวจข้อมูลใหม่/);
});
