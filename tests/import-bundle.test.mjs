import test from 'node:test';
import assert from 'node:assert/strict';
import {validateWorkbookImport,readImportFile} from '../dist/importer.js';
import {validatePerson,parseEducationMajors} from '../dist/core.js';
const schools=[{id:1,name:'วิทยาลัยเทคนิคระนอง'}];
const main=[['เลขที่ตำแหน่ง','ชื่อ-นามสกุล','สถานศึกษา','วุฒิการศึกษาสูงสุด','สาขาวิชา'],['001','ทดสอบ หนึ่ง',1,'ปริญญาโท','การบริหารการศึกษา; เทคโนโลยีสารสนเทศ'],['002','ทดสอบ สอง',1,'ปริญญาตรี','วิศวกรรมเครื่องกล']];
const head=['เลขที่ตำแหน่ง','ประเภทใบรับรอง','ชื่อใบรับรองวิชาชีพ','หน่วยงานผู้ออก','เลขที่ใบรับรอง','วันที่ออก','วันหมดอายุ'];
const certificateMatrix=[head,['001','ใบรับรองทักษะวิชาชีพ','ทักษะหนึ่ง','หน่วยงาน A','0001','2024-01-01',''],['001','administrator','ใบอนุญาตผู้บริหาร','หน่วยงาน B','','2024-02-01','2029-02-01'],['002','vocational','ทักษะสอง','หน่วยงาน C']];
test('one workbook links multiple certificates and majors to the correct new personnel',()=>{
 const r=validateWorkbookImport({matrix:main,certificateMatrix},[],schools);assert.deepEqual(r.errors,[]);
 assert.equal(r.records.length,2);assert.equal(r.certificateCount,3);assert.deepEqual(r.records[0].education_majors,['การบริหารการศึกษา','เทคโนโลยีสารสนเทศ']);
 assert.equal(r.records[0].certificates.length,2);assert.equal(r.records[1].certificates[0].issuer,'หน่วยงาน C');assert.equal(r.records[0].certificates[0].number,'0001');assert.equal(r.records[0].status,'ปฏิบัติงาน');
});
test('orphan and duplicate certificate rows identify their worksheet and source row',()=>{
 const r=validateWorkbookImport({matrix:main,certificateMatrix:[head,certificateMatrix[1],certificateMatrix[1],['999','vocational','ใบ A','หน่วยงาน']]},[],schools);
 assert.equal(r.errors.length,2);assert.match(r.errors[0],/ใบรับรองวิชาชีพ แถว 3.*ซ้ำ/);assert.match(r.errors[1],/แถว 4.*999/);
});
test('invalid certificate dates or missing issuer block the entire bundle',()=>{
 for(const row of [['001','vocational','ใบ A','หน่วยงาน','','2024-02-30'],['001','vocational','ใบ A',''],['001','vocational','ใบ A','หน่วยงาน','','2024-03-01','2024-02-01']]){
  const r=validateWorkbookImport({matrix:main,certificateMatrix:[head,row]},[],schools);assert.equal(r.errors.length,1);
 }
});
test('multiple majors use semicolons or line breaks, require a degree and reject duplicates',()=>{
 assert.deepEqual(parseEducationMajors(' สาขา A;สาขา B\nสาขา C '),['สาขา A','สาขา B','สาขา C']);
 for(const [degree,majors] of [['',['A']],['ปริญญาโท',['A',' A']],['ปริญญาโท',Array.from({length:21},(_,i)=>String(i))]])assert.throws(()=>validatePerson({employee_code:'P',full_name:'ทดสอบ',school_id:1,highest_education:degree,education_majors:majors}));
});
test('blank optional certificate worksheet imports people only; old CSV remains compatible',()=>{
 const r=validateWorkbookImport({matrix:main,certificateMatrix:[head,[]]},[],schools);assert.deepEqual(r.errors,[]);assert.equal(r.certificateCount,0);
 const old=validateWorkbookImport({matrix:[['employee_code','full_name','school_id','status'],['P','ทดสอบ',1,'ย้าย']]},[],schools);assert.equal(old.records[0].status,'ย้าย');
});
test('formula checks cover the certificate worksheet and ignore example worksheets',async()=>{
 const file={size:1,name:'input.xlsx',arrayBuffer:async()=>new ArrayBuffer(1)};
 const sheets={บุคลากร:{'!ref':'A1:C2'},ใบรับรองวิชาชีพ:{'!ref':'A1:G2',G2:{f:'TODAY()'}},ตัวอย่าง:{A2:{f:'1+1'}}};
 const engine={read:()=>({SheetNames:Object.keys(sheets),Sheets:sheets}),utils:{decode_range:()=>({e:{r:1,c:6}}),sheet_to_json:()=>main}};
 await assert.rejects(readImportFile(file,engine),/พบสูตรใน ใบรับรองวิชาชีพ!G2/);
 delete sheets.ใบรับรองวิชาชีพ.G2;const read=await readImportFile(file,engine);assert.equal(read.certificateMatrix,main);
});
