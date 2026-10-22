import test from 'node:test';
import assert from 'node:assert/strict';
import {validateImport,normalizedDate,readImportFile} from '../dist/importer.js';
const schools=[{id:1,name:'วิทยาลัยเทคนิคระนอง'},{id:7,name:'วิทยาลัยการอาชีพตรัง'}];
const headers=['เลขที่ตำแหน่ง','ชื่อ-นามสกุล','สถานศึกษา','วันเกิด','วันเริ่มงาน','โทรศัพท์'];
test('Thai headings and named school map to database fields, preserving phone',()=>{
 const r=validateImport([headers,['HR001','ทดสอบ บุคลากร','วิทยาลัยเทคนิคระนอง',new Date('1980-05-15T00:00:00Z'),new Date('2005-05-01T00:00:00Z'),'0812345678']],[],schools);
 assert.deepEqual(r.errors,[]);assert.equal(r.records[0].school_id,1);assert.equal(r.records[0].phone,'0812345678');assert.equal(r.records[0].birth_date,'1980-05-15');
});
test('English headings and school codes remain compatible with previous CSV',()=>{
 const r=validateImport([['employee_code','full_name','school_id'],['X001','ชื่อ ตัวอย่าง',7]],[],schools);assert.equal(r.records[0].school_id,7);assert.equal(r.errors.length,0);
});
test('blank formatted rows are ignored but an empty template cannot be saved',()=>{
 const r=validateImport([headers,[],['','','']],[],schools);assert.ok(r.errors.some(e=>e.includes('ยังไม่มีรายชื่อ')));assert.equal(r.records.length,0);
});
test('duplicate identifiers report source rows without overwriting',()=>{
 const r=validateImport([headers,['A','ทดสอบ',1],['A','ทดสอบ2',1],['B','ทดสอบ3',1]],[{employee_code:'B'}],schools);assert.equal(r.errors.length,2);assert.match(r.errors[0],/แถว 3/);assert.match(r.errors[1],/แถว 4/);
});
test('reject invalid dates, unknown schools and duplicate or unknown headers',()=>{
 assert.ok(validateImport([headers,['A','ทดสอบ',1,'1980-02-30']],[],schools).errors.length);
 assert.ok(validateImport([headers,['A','ทดสอบ',8]],[],schools).errors.length);
 assert.ok(validateImport([['employee_code','full_name','school_id','full_name']],[],schools).errors.length);
 assert.ok(validateImport([['employee_code','full_name','school_id','secret']],[],schools).errors.length);
});
test('Excel serial dates use the correct epoch',()=>assert.equal(normalizedDate(45292),'2024-01-01'));
test('limits apply to populated rows only',()=>{
 const rows=Array.from({length:501},(_,i)=>['X'+i,'ทดสอบ',1]);assert.ok(validateImport([headers,...rows],[],schools).errors.some(e=>e.includes('500')));
});
test('workbook import chooses data sheet and refuses formulas',async()=>{
 const bytes=new Uint8Array([1]);const fakeFile={size:1,name:'data.xlsx',arrayBuffer:async()=>bytes.buffer};
 const engine={read:()=>({SheetNames:['ตัวอย่าง','บุคลากร'],Sheets:{บุคลากร:{'!ref':'A1:C2',A2:{f:'1+1'}}}}),utils:{decode_range:()=>({e:{r:1,c:2}})}};
 await assert.rejects(readImportFile(fakeFile,engine),/พบสูตร/);
});

test('Excel local midnight preserves its calendar date across time zones',()=>assert.equal(normalizedDate(new Date(1980,4,15)),'1980-05-15'));
