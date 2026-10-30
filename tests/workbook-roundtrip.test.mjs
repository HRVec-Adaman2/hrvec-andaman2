import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs';
import {workbookAPI,normalizeXlsx} from '../dist/xlsx-compat.js';import {readImportFile,validateWorkbookImport} from '../dist/importer.js';
import {templateSheets,referenceColumns,referenceLists} from '../dist/template.js';
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
test('distributed Excel lists contain every current form choice and show native dropdown arrows',async()=>{
 const config=JSON.parse(fs.readFileSync('deployment/template-reference.json','utf8')),expected=referenceLists(config.schools,config.lookups);
 const bytes=fs.readFileSync('dist/HRVec-Andaman2-Personnel-Template.xlsx'),normalized=normalizeXlsx(bytes,window.fflate),wb=new ExcelJS.Workbook();await wb.xlsx.load(normalized);
 const refs=wb.getWorksheet('รายการอ้างอิง'),people=wb.getWorksheet('บุคลากร');
 for(const key of ['school_id','position','academic_rank','highest_education','university_rank','administration_field','kind','college_department','institute_department']){
  const col=referenceColumns.find(r=>r.key===key).column,values=[];for(let row=2;row<=1001;row++){const value=refs.getCell(col+row).value;if(value!==null&&value!=='')values.push(value);}assert.deepEqual(values,expected[key],key);
 }
 for(const col of ['C','D','E','G','L','N','O']){assert.equal(people.getCell(col+'2').dataValidation.type,'list');assert.equal(people.getCell(col+'501').dataValidation.type,'list');}
 const files=window.fflate.unzipSync(new Uint8Array(normalized));for(const name of ['xl/worksheets/sheet1.xml','xl/worksheets/sheet2.xml'])assert.doesNotMatch(window.fflate.strFromU8(files[name]),/<(?:[A-Za-z]+:)?dataValidation\b[^>]*showDropDown="(?:1|true)"/);
});

async function downloadTemplate(schools,lookups=[]){
 const book=xlsx.utils.book_new();for(const [name,rows]of templateSheets(schools,lookups))xlsx.utils.book_append_sheet(book,xlsx.utils.aoa_to_sheet(rows),name);
 let file;const writer=workbookAPI(ExcelJS,async(blob,name)=>{file={bytes:new Uint8Array(await blob.arrayBuffer()),name};},window.fflate);await writer.writeFile(book,'downloaded.xlsx');
 const reader=new ExcelJS.Workbook();await reader.xlsx.load(file.bytes);return {reader,...file};
}
function namedValues(book,name){
 const ranges=book.definedNames.getRanges(name).ranges;assert.equal(ranges.length,1,'one workbook-level range for '+name);
 const match=/^'?([^']+)'?!\$?([A-Z]+)\$?(\d+)(?::\$?([A-Z]+)\$?(\d+))?$/.exec(ranges[0]);assert.ok(match,ranges[0]);
 const sheet=book.getWorksheet(match[1]),values=[];for(let row=+match[3];row<=+(match[5]||match[3]);row++){const value=sheet.getCell(match[2]+row).value;if(value!==null&&value!=='')values.push(value);}return values;
}
test('the web-generated XLSX resolves populated named dropdowns and opens on the first institution cell',async()=>{
 const config=JSON.parse(fs.readFileSync('deployment/template-reference.json','utf8')),expected=referenceLists(config.schools,config.lookups),{reader,bytes}=await downloadTemplate(config.schools,config.lookups);
 const people=reader.getWorksheet('บุคลากร'),certificates=reader.getWorksheet('ใบรับรองวิชาชีพ');
 for(const [col,key]of Object.entries({C:'school_id',D:'position',G:'academic_rank',L:'highest_education',N:'university_rank',O:'administration_field'})){
  const rule=people.getCell(col+'2').dataValidation;assert.equal(rule.type,'list');assert.equal(rule.formulae[0],'HRV_'+key);assert.deepEqual(namedValues(reader,rule.formulae[0]),expected[key],key);assert.equal(people.getCell(col+'501').dataValidation.type,'list');
 }
 assert.deepEqual(namedValues(reader,certificates.getCell('B2').dataValidation.formulae[0]),expected.kind);assert.equal(certificates.getCell('B5001').dataValidation.type,'list');
 assert.equal(people.views[0].activeCell,'C2');assert.equal(certificates.views[0].activeCell,'B2');assert.equal(people.getCell('C2').fill.fgColor.argb,'FFEDF4FF');
 assert.equal(people.getCell('C501').fill.fgColor.argb,'FFEDF4FF');assert.equal(people.getCell('A501').numFmt,'@');assert.equal(people.getCell('H501').numFmt,'@');assert.equal(certificates.getCell('A5001').numFmt,'@');assert.equal(certificates.getCell('F5001').numFmt,'@');
 assert.deepEqual(Array.from({length:15},(_,i)=>people.getCell(1,i+1).value),fields.map(f=>f[1]));assert.equal(people.getCell('C2').value,null);
 const xml=window.fflate.unzipSync(bytes);for(const path of ['xl/worksheets/sheet1.xml','xl/worksheets/sheet2.xml'])assert.doesNotMatch(window.fflate.strFromU8(xml[path]),/<dataValidation\b[^>]*showDropDown="(?:1|true)"/);
});
test('a downloaded template binds dependent departments and new certificate identifiers to workbook names',async()=>{
 const config=JSON.parse(fs.readFileSync('deployment/template-reference.json','utf8')),expected=referenceLists(config.schools,config.lookups),{reader}=await downloadTemplate(config.schools,config.lookups),people=reader.getWorksheet('บุคลากร'),certificates=reader.getWorksheet('ใบรับรองวิชาชีพ');
 const formula=people.getCell('E2').dataValidation.formulae[0];assert.match(formula,/VLOOKUP\(\$C2,HRV_Units,3,0\)/);assert.match(formula,/HRV_institute_department/);assert.match(formula,/HRV_college_department/);assert.doesNotMatch(formula,/รายการอ้างอิง.*!/);
 assert.deepEqual(namedValues(reader,'HRV_college_department'),expected.college_department);assert.deepEqual(namedValues(reader,'HRV_institute_department'),expected.institute_department);
 assert.equal(people.getCell('E2').dataValidation.allowBlank,true);assert.equal(certificates.getCell('A2').dataValidation.formulae[0],'HRV_PersonnelCodes');assert.deepEqual(reader.definedNames.getRanges('HRV_PersonnelCodes').ranges,["'บุคลากร'!$A$2:$A$501"]);
 people.getCell('A2').value='000012';assert.equal(people.getCell('A2').numFmt,'@');assert.deepEqual(namedValues(reader,'HRV_PersonnelCodes'),['000012']);
});
test('the downloaded dropdown lists follow scoped schools, current additions and Unicode names',async()=>{
 const schools=[{id:91,name:'วิทยาลัย ทดสอบ (ใหม่)',is_active:true,unit_type:'college'},{id:711,name:'ส่วนกลาง สถาบันทดสอบ',is_active:true,unit_type:'institute'},{id:9,name:'วิทยาลัยปิดใช้งาน',is_active:false}],lookups=[{category:'position',name:'ตำแหน่งเพิ่มใหม่'}];
 const {reader}=await downloadTemplate(schools,lookups);assert.deepEqual(namedValues(reader,'HRV_school_id'),schools.slice(0,2).map(s=>s.name));assert.ok(namedValues(reader,'HRV_position').includes('ตำแหน่งเพิ่มใหม่'));
 assert.deepEqual(reader.definedNames.getRanges('HRV_Units').ranges,["'รายการอ้างอิง'!$B$2:$D$3"]);assert.ok(namedValues(reader,'HRV_academic_rank').length>=5);
});
test('ordinary exports without a reference sheet do not carry broken template dropdowns',async()=>{
 const book=xlsx.utils.book_new();xlsx.utils.book_append_sheet(book,xlsx.utils.aoa_to_sheet([['เลขที่ตำแหน่ง','ชื่อ-นามสกุล'],['0001','ข้อมูลตัวอย่าง']]),'บุคลากร');await xlsx.writeFile(book,'export.xlsx');
 const reader=new ExcelJS.Workbook();await reader.xlsx.load(new Uint8Array(await saved.blob.arrayBuffer()));assert.deepEqual(reader.definedNames.model,[]);assert.equal(reader.getWorksheet('บุคลากร').getCell('C2').dataValidation?.type,undefined);
});
