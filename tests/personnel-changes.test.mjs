import test from 'node:test';import assert from 'node:assert/strict';
import {personnelDiff,historySnapshot} from '../dist/changes.js';
const storage=new Map();globalThis.window={HR_CONFIG:{}};globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
const api=await import('../dist/api.js');api.openDemoDetails();
const p=()=>({employee_code:'CHANGES-01',full_name:'ตรวจสอบ บุคลากร',school_id:3,position:'ผู้อำนวยการ',department:'',highest_education:'ปริญญาโท',education_majors:['การบริหารการศึกษา']});
let id;
test('review compares only submitted fields, normalizes blanks and omits binary images from history',()=>{
 assert.deepEqual(personnelDiff({phone:null,full_name:'เดิม'},{phone:'',full_name:'ใหม่'}),[{key:'full_name',label:'ชื่อ–นามสกุล',before:'เดิม',after:'ใหม่'}]);
 assert.equal(personnelDiff({education_majors:['A']},{education_majors:['A']}).length,0);
 const snapshot=historySnapshot({...p(),avatar_data:'data:image/png;base64,PRIVATE_IMAGE'});assert.doesNotMatch(JSON.stringify(snapshot),/PRIVATE_IMAGE|base64/);
 assert.notEqual(snapshot.avatar_data,historySnapshot({avatar_data:'data:image/png;base64,OTHER'}).avatar_data);
});
test('reviewed edit increments revision and a stale edit makes no changes or history',async()=>{
 const saved=await api.savePersonnel(p(),{kind:'vocational',name:'ใบรับรอง',issuer:'หน่วยงาน',number:''});id=saved.id;
 const updated=await api.savePersonnel({id,phone:'0812345678'},null,1,'แก้ไขหมายเลขติดต่อ');assert.equal(updated.revision,2);
 const history=await api.all('personnel_changes');assert.equal(history.filter(h=>h.personnel_id===id).length,2);
 const before=await api.all('personnel');await assert.rejects(api.savePersonnel({id,phone:'000'},null,1,'แก้ไขจากหน้าจอเก่า'),/ผู้อื่น/);
 assert.deepEqual(await api.all('personnel'),before);assert.deepEqual(await api.all('personnel_changes'),history);
 await assert.rejects(api.savePersonnel({id,phone:'000'},null,null,'เหตุผล'),/โหลดรายชื่อ/);
 await assert.rejects(api.save('personnel',{id,phone:'000'}),/ตรวจสอบ/);
});
test('delete hides a person and linked certificates from totals, preserves records, and restore returns them',async()=>{
 const total=(await api.overview()).total,certs=(await api.overview()).certificates;
 await assert.rejects(api.changePersonnelLifecycle(id,2,'delete','สั้น'),/เหตุผล/);
 await api.changePersonnelLifecycle(id,2,'delete','เพิ่มข้อมูลผิดคน');
 assert.equal((await api.all('personnel')).some(p=>p.id===id),false);assert.equal((await api.overview()).total,total-1);assert.equal((await api.overview()).certificates,certs-1);
 const archived=(await api.archivedPersonnel()).find(p=>p.id===id);assert.equal(archived.revision,3);assert.equal(archived.delete_reason,'เพิ่มข้อมูลผิดคน');
 await assert.rejects(api.savePersonnel({id,phone:'000'},null,3,'ลองแก้ไขรายการลบ'),/ถูกลบ/);await assert.rejects(api.savePersonnel(p()),/ซ้ำ/);
 await assert.rejects(api.bridge('upload',{personnel_id:id}),/ถูกลบ/);
 await assert.rejects(api.changePersonnelLifecycle(id,2,'restore','กู้คืนรายการเดิม'),/ผู้อื่น/);
 await api.changePersonnelLifecycle(id,3,'restore','ตรวจสอบแล้วกู้คืน');assert.equal((await api.overview()).total,total);assert.equal((await api.overview()).certificates,certs);assert.equal((await api.archivedPersonnel()).length,0);
 const history=(await api.all('personnel_changes')).filter(h=>h.personnel_id===id);assert.deepEqual(history.map(h=>h.action),['RESTORE','DELETE','UPDATE','CREATE']);
});
test('personnel may review own contact edits but cannot edit registry, archive, another history, or delete',async()=>{
 api.demoRole('personnel');const own=(await api.all('personnel'))[0];
 const saved=await api.saveReviewedPersonnel({id:own.id,phone:'0890000000'},null,own.revision,'ปรับข้อมูลติดต่อ');assert.ok(saved.revision>own.revision);
 await assert.rejects(api.saveReviewedPersonnel({id:own.id,full_name:'ปลอม'},null,saved.revision,'แก้ไขชื่อบุคลากร'),/สิทธิ์/);
 await assert.rejects(api.changePersonnelLifecycle(own.id,saved.revision,'delete','ลองลบรายการตนเอง'),/ผู้ดูแล/);await assert.rejects(api.archivedPersonnel(),/ผู้ดูแล/);assert.ok((await api.all('personnel_changes')).every(h=>h.personnel_id===own.id));
});
