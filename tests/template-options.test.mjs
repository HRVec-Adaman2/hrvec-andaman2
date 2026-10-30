import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {referenceLists} from '../dist/template.js';
import {personnelOptions,universityRanks} from '../dist/personnel-options.js';
import {departmentsFor} from '../dist/structure.js';
import {certKinds,educationLevels} from '../dist/overview.js';
const config=JSON.parse(fs.readFileSync(new URL('../deployment/template-reference.json',import.meta.url),'utf8'));

test('empty settings still offer the full positions and academic ranks in both form and Excel',()=>{
 const lists=referenceLists(config.schools);
 for(const name of ['ผู้อำนวยการ','รองผู้อำนวยการ','ครู','ครูผู้ช่วย','พนักงานราชการ','เจ้าหน้าที่','ผู้อำนวยการสถาบัน','รองผู้อำนวยการสถาบัน','พนักงานบริหารงานทั่วไป'])assert.ok(lists.position.includes(name));
 assert.deepEqual(lists.position,personnelOptions('position'));assert.equal(lists.academic_rank.length,5);assert.deepEqual(lists.university_rank,universityRanks);
});
test('current Excel choices match the same reference lists that populate the personnel form',()=>{
 const lists=referenceLists(config.schools,config.lookups);
 for(const key of ['position','academic_rank','university_rank','administration_field'])assert.deepEqual(lists[key],personnelOptions(key,config.lookups),key);
 assert.deepEqual(lists.school_id,config.schools.filter(s=>s.is_active!==false).map(s=>s.name));
 assert.deepEqual(lists.college_department,departmentsFor({unit_type:'college'},config.lookups));assert.deepEqual(lists.institute_department,departmentsFor({unit_type:'institute'},config.lookups));
 assert.deepEqual(lists.highest_education,educationLevels);assert.deepEqual(lists.kind,Object.values(certKinds));
});
test('new school and lookup choices appear in the next template while closed schools stay out',()=>{
 const schools=[...config.schools,{id:90,name:'หน่วยงานเพิ่มใหม่',is_active:true},{id:91,name:'หน่วยงานปิด',is_active:false}];
 const lookups=[...config.lookups,{category:'position',name:'ตำแหน่งเพิ่มใหม่'},{category:'academic_rank',name:'วิทยฐานะเพิ่มใหม่'},{category:'institute_department',name:'ส่วนราชการเพิ่มใหม่'},{category:'administration_field',name:'ด้านงานเพิ่มใหม่'}];
 const lists=referenceLists(schools,lookups);
 assert.ok(lists.school_id.includes('หน่วยงานเพิ่มใหม่'));assert.ok(!lists.school_id.includes('หน่วยงานปิด'));
 assert.ok(lists.position.includes('ตำแหน่งเพิ่มใหม่'));assert.ok(lists.academic_rank.includes('วิทยฐานะเพิ่มใหม่'));assert.ok(lists.administration_field.includes('ด้านงานเพิ่มใหม่'));
 assert.ok(lists.institute_department.includes('ส่วนราชการเพิ่มใหม่'));assert.ok(!lists.college_department.includes('ส่วนราชการเพิ่มใหม่'));
});
