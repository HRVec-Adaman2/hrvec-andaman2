import test from 'node:test';import assert from 'node:assert/strict';
import {collegeDepartments,instituteDepartments,departmentsFor,validateStructure} from '../dist/structure.js';
import {fields,certificateFields,validateWorkbookImport} from '../dist/importer.js';import {templateSheets} from '../dist/template.js';import {getOverview,matchesCertificate,validateCertificate} from '../dist/overview.js';
const schools=[{id:1,name:'วิทยาลัยเทคนิคระนอง',unit_type:'college',is_active:true},{id:19,name:'สถาบันการอาชีวศึกษาภาคใต้ 2',unit_type:'institute',is_active:true}];
const h=['employee_code','full_name','school_id','department','work_unit','highest_education','education_majors'];
const row=['00019','ส่วนกลาง ทดสอบ',19,instituteDepartments[0],'งานบริหารบุคลากร','ปริญญาโท','สาขา ก; สาขา ข'];
const c={kind:'competency',name:'คุณวุฒิวิชาชีพ',issuer:'หน่วยงานทดสอบ',occupation:'เทคโนโลยีสารสนเทศ',competency_level:'ระดับ 4',standard:'มาตรฐานอาชีพ'};
test('institute structure remains distinct from college departments and supports configured additions',()=>{
 assert.equal(collegeDepartments.length,4);assert.equal(instituteDepartments.length,5);assert.deepEqual(departmentsFor(schools[1]),instituteDepartments);
 assert.throws(()=>validateStructure({school_id:19,department:collegeDepartments[0]},schools),/ไม่ตรง/);assert.throws(()=>validateStructure({school_id:1,department:instituteDepartments[0]},schools),/ไม่ตรง/);
 assert.doesNotThrow(()=>validateStructure({school_id:19,department:''},schools));assert.doesNotThrow(()=>validateStructure({school_id:19,department:'ส่วนราชการที่ตั้งเพิ่ม'},schools,[{category:'institute_department',name:'ส่วนราชการที่ตั้งเพิ่ม'}]));
});
test('a linked workbook imports one central person with multiple competency certificates and preserves all metadata',()=>{
 const result=validateWorkbookImport({matrix:[h,row],certificateMatrix:[certificateFields.map(f=>f[0]),['00019','competency',c.name,c.issuer,'00001','2025-01-01','2028-01-01',c.occupation,c.competency_level,c.standard],['00019','ใบรับรองสมรรถนะทางวิชาชีพ','ใบที่สอง',c.issuer,'00002','','',c.occupation,'ระดับ 5','มาตรฐานที่สอง']]},[],schools);
 assert.deepEqual(result.errors,[]);assert.equal(result.records[0].position,'เจ้าหน้าที่');assert.equal(result.records[0].work_unit,'งานบริหารบุคลากร');assert.equal(result.records[0].education_majors.length,2);assert.equal(result.certificateCount,2);assert.equal(result.records[0].certificates[1].competency_level,'ระดับ 5');assert.equal(result.records[0].certificates[1].expires_on,null);assert.equal(Object.hasOwn(result.records[0],'address'),false);
});
test('wrong department type and retired address columns prevent import before saving',()=>{
 const wrong=structuredClone(row);wrong[3]=collegeDepartments[0];assert.match(validateWorkbookImport({matrix:[h,wrong]},[],schools).errors.join(' '),/ไม่ตรง/);
 assert.match(validateWorkbookImport({matrix:[[...h,'address'],[...row,'']]},[],schools).errors.join(' '),/คอลัมน์ไม่รองรับ.*address/);
 assert.throws(()=>validateStructure({school_id:19,address:''},schools),/ไม่จัดเก็บ/);
 const legacy=validateWorkbookImport({matrix:[h,['00001','วิทยาลัย ทดสอบ',1,'แผนงานและความร่วมมือ']]},[],schools);assert.deepEqual(legacy.errors,[]);assert.equal(legacy.records[0].department,'ฝ่ายยุทธศาสตร์และแผนงาน');
});
test('current templates expose matching fields and choose live institute IDs instead of assuming ID 8',()=>{
 const tabs=new Map(templateSheets(schools));assert.deepEqual(tabs.get('บุคลากร')[0],fields.map(f=>f[1]));assert.deepEqual(tabs.get('ใบรับรองวิชาชีพ')[0],certificateFields.map(f=>f[1]));assert.equal(fields.some(([k])=>['address','status'].includes(k)),false);assert.ok(tabs.get('รายการอ้างอิง').some(r=>r[0]===19));assert.ok(tabs.get('ตัวอย่าง')[2].includes(schools[1].name));
 const actual=new Map(tabs);actual.set('บุคลากร',tabs.get('ตัวอย่าง'));actual.set('ใบรับรองวิชาชีพ',tabs.get('ตัวอย่างใบรับรอง'));const imported=validateWorkbookImport({matrix:actual.get('บุคลากร'),certificateMatrix:actual.get('ใบรับรองวิชาชีพ')},[],schools);assert.deepEqual(imported.errors,[]);assert.equal(imported.certificateCount,2);
});
test('competency drilldown counts and searches occupation, level and standard',()=>{
 const p={id:'p',school_id:19},cert={...c,personnel_id:'p'};assert.doesNotThrow(()=>validateCertificate(cert));assert.throws(()=>validateCertificate({...c,standard:'ก'.repeat(301)}),/ยาวเกิน/);assert.equal(matchesCertificate(cert,p,{kind:'competency',school:'19',q:'ระดับ 4'}),true);assert.equal(matchesCertificate(cert,p,{kind:'vocational'}),false);const overview=getOverview({personnel:[p],certificates:[cert],schools});assert.equal(overview.competency,1);assert.equal(overview.schools.find(s=>s.id===19).unit_type,'institute');
});
