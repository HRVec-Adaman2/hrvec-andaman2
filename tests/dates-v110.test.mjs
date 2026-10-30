import test from 'node:test';import assert from 'node:assert/strict';
import {normalizedDate,buddhistDate} from '../dist/dates.js';
import {fields,certificateFields,validateWorkbookImport} from '../dist/importer.js';
import {templateSheets,templateValidations} from '../dist/template.js';
import {validatePerson} from '../dist/core.js';
import {personnelDiff} from '../dist/changes.js';
test('Buddhist dates accept four-digit years, Thai digits and leap days without changing the represented date',()=>{
 assert.equal(normalizedDate('29/10/2569'),'2026-10-29');assert.equal(normalizedDate('๒๙/๑๐/๒๕๖๙'),'2026-10-29');
 assert.equal(normalizedDate('29/02/2567'),'2024-02-29');assert.equal(normalizedDate('2024-02-29'),'2024-02-29');
 assert.equal(normalizedDate('15/5/2523'),'1980-05-15');assert.equal(buddhistDate('1980-05-15'),'15/05/2523');
 for(const value of ['29/02/2566','31/04/2569','29/10/69','2569/10/29','2024-02-30'])assert.throws(()=>normalizedDate(value),/วันที่/);
 assert.equal(normalizedDate(''),null);assert.equal(buddhistDate(null,'—'),'—');
});
test('numeric Excel dates and local or UTC midnight remain stable in different host time zones',()=>{
 assert.equal(normalizedDate(45292),'2024-01-01');assert.equal(normalizedDate(new Date(1980,4,15)),'1980-05-15');
 assert.equal(normalizedDate(new Date('1980-05-15T00:00:00Z')),'1980-05-15');
 assert.equal(normalizedDate(new Date(2569,9,29)),'2026-10-29');
});
test('academic titles and administration fields round-trip in a linked Thai workbook with BE certificate dates',()=>{
 const schools=[{id:9,name:'สถาบันทดสอบ',unit_type:'institute',is_active:true}];
 const p={employee_code:'0001',full_name:'บุคลากร ทดสอบ',school_id:9,position:'พนักงานบริหารงานทั่วไป',birth_date:'15/05/2523',start_date:'01/05/2548',university_rank:'ผศ.',administration_field:'การเงินและบัญชี'};
 const c={employee_code:'0001',kind:'competency',name:'ใบรับรอง ทดสอบ',issuer:'หน่วยงานทดสอบ',issued_on:'01/01/2568',expires_on:'01/01/2571'};
 const result=validateWorkbookImport({matrix:[fields.map(f=>f[1]),fields.map(([k])=>p[k]??'')],certificateMatrix:[certificateFields.map(f=>f[1]),certificateFields.map(([k])=>c[k]??'')]},[],schools);
 assert.deepEqual(result.errors,[]);assert.equal(result.records[0].university_rank,'ผู้ช่วยศาสตราจารย์');assert.equal(result.records[0].administration_field,'การเงินและบัญชี');
 assert.equal(result.records[0].birth_date,'1980-05-15');assert.equal(result.records[0].certificates[0].issued_on,'2025-01-01');
 assert.throws(()=>validatePerson({...result.records[0],university_rank:'ตำแหน่งที่ไม่มี'}),/ตำแหน่งทางวิชาการ/);
 assert.throws(()=>validatePerson({...result.records[0],administration_field:'ก'.repeat(201)}),/200/);
 assert.equal(personnelDiff({},p).some(x=>x.key==='university_rank'),true);
});
test('templates expose lists for all text columns, dependent departments and linked certificate identifiers',()=>{
 const a=templateValidations('บุคลากร'),b=templateValidations('ใบรับรองวิชาชีพ');
 assert.equal(a.length,15);assert.equal(a.filter(r=>r.type==='list').length,13);assert.equal(b.filter(r=>r.type==='list').length,8);
 assert.match(a.find(r=>r.key==='department').formula,/VLOOKUP/);assert.match(b[0].formula,/บุคลากร/);
 assert.ok([...a,...b].every(r=>r.formula.length<=255));
 const tabs=new Map(templateSheets([{id:9,name:'วิทยาลัย ทดสอบ',unit_type:'college'}]));
 assert.ok(tabs.get('รายการอ้างอิง').some(r=>r.includes('พนักงานบริหารงานทั่วไป')));
 assert.ok(tabs.get('รายการอ้างอิง').some(r=>r.includes('ผู้ช่วยศาสตราจารย์')));
});
