import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs';
import {workbookAPI,normalizeXlsx} from '../dist/xlsx-compat.js';import {readImportFile,validateWorkbookImport} from '../dist/importer.js';
import {templateSheets} from '../dist/template.js';
import {fields,certificateFields} from '../dist/importer.js';
globalThis.window={};vm.runInThisContext(fs.readFileSync('dist/vendor/fflate-0.8.2.min.js','utf8'));window.fflate=globalThis.fflate||window.fflate;vm.runInThisContext(fs.readFileSync('dist/vendor/exceljs-4.4.0.min.js','utf8'));
const ExcelJS=window.ExcelJS;let saved;const xlsx=workbookAPI(ExcelJS,async(blob,name)=>{saved={blob,name};},window.fflate);
test('local Excel engine writes and reopens a linked workbook with dynamic schools and multiple certificates',async()=>{
 const wb=xlsx.utils.book_new();for(const [name,rows]of [['บุคลากร',[['employee_code','full_name','school_id','highest_education','education_majors','phone'],['0001','ทดสอบ Excel',8,'ปริญญาโท','บริหาร; เทคโนโลยี','0812345678']]],['ใบรับรองวิชาชีพ',[['employee_code','kind','name','issuer'],['0001','vocational','ใบที่หนึ่ง','หน่วยงาน ก'],['0001','vocational','ใบที่สอง','หน่วยงาน ข']]],['คำแนะนำ',[['วิธีใช้','หลายใบให้เพิ่มแถว ใช้เลขที่ตำแหน่งเดิม']]]])xlsx.utils.book_append_sheet(wb,xlsx.utils.aoa_to_sheet(rows),name);
 await xlsx.writeFile(wb,'template.xlsx');assert.equal(saved.name,'template.xlsx');assert.ok(saved.blob.size>1000);
 const input=await readImportFile({name:'template.xlsx',size:saved.blob.size,arrayBuffer:()=>saved.blob.arrayBuffer()},xlsx);const result=validateWorkbookImport(input,[],[{id:8,name:'วิทยาลัยใหม่',is_active:true}]);assert.deepEqual(result.errors,[]);assert.equal(result.records[0].employee_code,'0001');assert.equal(result.records[0].phone,'0812345678');assert.deepEqual(result.records[0].education_majors,['บริหาร','เทคโนโลยี']);assert.equal(result.certificateCount,2);
});
test('the shipped reader rejects formula cells in a real XLSX file',async()=>{
 const wb=new ExcelJS.Workbook(),sheet=wb.addWorksheet('บุคลากร');sheet.addRow(['employee_code','full_name','school_id']);sheet.addRow(['0001',{formula:'1+1',result:2},8]);const bytes=await wb.xlsx.writeBuffer();await assert.rejects(readImportFile({name:'formula.xlsx',size:bytes.length,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)},xlsx),/พบสูตร/);
});
test('legacy formatted template remains readable with the shipped local engine',async()=>{
 const bytes=fs.readFileSync('dist/HRVec-Andaman2-Personnel-Template.xlsx');const input=await readImportFile({name:'template.xlsx',size:bytes.length,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)},xlsx);assert.deepEqual(input.matrix[0],fields.map(f=>f[1]));assert.deepEqual(input.certificateMatrix[0],certificateFields.map(f=>f[1]));
});

test('downloaded Thai templates round-trip through the application reader with current units and competency fields',async()=>{
 const schools=[{id:71,name:'วิทยาลัยปัจจุบัน',unit_type:'college',is_active:true},{id:92,name:'สถาบันปัจจุบัน',unit_type:'institute',is_active:true},{id:51,name:'วิทยาลัยปิดใช้งาน',is_active:false}];
 const tabs=new Map(templateSheets(schools)),book=xlsx.utils.book_new();
 tabs.set('บุคลากร',tabs.get('ตัวอย่าง'));tabs.set('ใบรับรองวิชาชีพ',tabs.get('ตัวอย่างใบรับรอง'));
 for(const [name,rows]of tabs)xlsx.utils.book_append_sheet(book,xlsx.utils.aoa_to_sheet(rows),name);
 await xlsx.writeFile(book,'thai-template.xlsx');
 const input=await readImportFile({name:saved.name,size:saved.blob.size,arrayBuffer:()=>saved.blob.arrayBuffer()},xlsx);
 const result=validateWorkbookImport(input,[],schools);
 assert.deepEqual(input.matrix[0],fields.map(f=>f[1]));assert.deepEqual(input.certificateMatrix[0],certificateFields.map(f=>f[1]));
 assert.deepEqual(result.errors,[]);assert.deepEqual(result.records.map(p=>p.school_id),[71,92]);assert.equal(result.certificateCount,2);
 assert.equal(result.records[0].phone,'0812345678');assert.equal(result.records[0].certificates[0].kind,'competency');assert.equal(result.records[0].certificates[0].competency_level,'ระดับ 4');
 assert.equal(tabs.get('รายการอ้างอิง').some(r=>r.includes('วิทยาลัยปิดใช้งาน')),false);
});

test('oversized ZIP entries are rejected before allocating their uncompressed size',()=>{
 const bytes=window.fflate.zipSync({'big.xml':new Uint8Array([1,2,3])});let offset=-1;for(let i=0;i<bytes.length-4;i++)if(bytes[i]===80&&bytes[i+1]===75&&bytes[i+2]===1&&bytes[i+3]===2){offset=i;break;}assert.ok(offset>=0);new DataView(bytes.buffer).setUint32(offset+24,60*1024*1024,true);assert.throws(()=>normalizeXlsx(bytes,window.fflate),/ใหญ่เกินกำหนด/);
});
test('the distributed template carries native dropdowns, dependent departments and Buddhist date formats',async()=>{
 const bytes=fs.readFileSync('dist/HRVec-Andaman2-Personnel-Template.xlsx'),wb=new ExcelJS.Workbook();await wb.xlsx.load(normalizeXlsx(bytes,window.fflate));
 const p=wb.getWorksheet('บุคลากร'),c=wb.getWorksheet('ใบรับรองวิชาชีพ');assert.equal(p.getCell('N1').value,'ตำแหน่งทางวิชาการ');assert.equal(p.getCell('O1').value,'ด้านงานบริหารทั่วไป');
 assert.equal(p.getCell('N501').dataValidation.type,'list');assert.match(p.getCell('N2').dataValidation.formulae[0],/รายการอ้างอิง/);
 assert.match(p.getCell('E2').dataValidation.formulae[0],/VLOOKUP/);assert.match(c.getCell('A5001').dataValidation.formulae[0],/บุคลากร/);
 assert.equal(p.getCell('H2').numFmt,'@');assert.equal(wb.getWorksheet('ตัวอย่าง').getCell('H2').numFmt,'[$-th-TH]dd/mm/bbbb');
 assert.equal(wb.getWorksheet('ตัวอย่าง').getCell('H2').value.toISOString().slice(0,10),'1985-05-15');
 const imported=await readImportFile({name:'blank.xlsx',size:bytes.length,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)},xlsx);
 assert.equal(imported.matrix.slice(1).filter(r=>r.some(v=>v!==''&&v!=null)).length,0);
});
