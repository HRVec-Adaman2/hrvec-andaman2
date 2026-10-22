import test from 'node:test';import assert from 'node:assert/strict';
globalThis.window={};globalThis.localStorage={getItem:()=>null,setItem(){},removeItem(){}};
const api=await import('../dist/api.js');
test('demo school management requires revisions, preserves references and records who changed the school',async()=>{
 api.openDemoDetails();const school=await api.manageSchool('create',{name:'สถานศึกษาเพิ่มใหม่',province:'ตรัง'},null,'เพิ่มหน่วยงานตามคำสั่ง');assert.equal(school.id,8);
 await assert.rejects(api.manageSchool('update',{id:8,name:'ชื่อใหม่',province:'ตรัง'},2,'แก้ไขตามคำสั่ง'),/เปลี่ยนแปลง/);
 await assert.rejects(api.manageSchool('delete',{id:1},1,'ลบที่มีบุคลากร'),/ปิดใช้งาน/);
 const closed=await api.manageSchool('deactivate',{id:8},1,'ปิดใช้งานชั่วคราว');assert.equal(closed.is_active,false);
 await assert.rejects(api.saveReviewedPersonnel({employee_code:'BAD',full_name:'ทดสอบ',school_id:8}),/สถานศึกษา/);
 await api.manageSchool('activate',{id:8},2,'เปิดใช้งานอีกครั้ง');const log=await api.all('administration_changes');assert.equal(log.filter(x=>x.entity==='schools').length,3);
});
test('officers can create and import only within assignments, and mixed-school imports make no partial changes',async()=>{
 const grant={user_id:'demo-editor',school_id:8,personnel_ids:null,permissions:['view','create_personnel','personnel_write','education_write','certificates_write','documents_write','import','request_delete']};await api.manageAssignment(grant,null,false,'มอบหมายเจ้าหน้าที่รับผิดชอบ');
 api.demoRole('school_editor');assert.equal(api.canReadDetails(),true);api.lockDetails();assert.equal(api.canReadDetails(),true);
 const saved=await api.saveReviewedPersonnel({employee_code:'SCOPED8',full_name:'บุคลากรใหม่',school_id:8});assert.equal(saved.revision,1);
 await assert.rejects(api.saveReviewedPersonnel({employee_code:'WRONG2',full_name:'นอกขอบเขต',school_id:2}),/ไม่มีสิทธิ์/);
 const before=(await api.all('personnel')).length;
 await assert.rejects(api.importPeople([{employee_code:'OK8',full_name:'ถูกต้อง',school_id:8},{employee_code:'BAD2',full_name:'นอกสิทธิ์',school_id:2}]),/ไม่มีสิทธิ์/);assert.equal((await api.all('personnel')).length,before);
 await assert.rejects(api.manageSchool('create',{name:'ไม่ได้รับอนุญาต',province:'ตรัง'},null,'ทดสอบสิทธิ์'),/ผู้ดูแล/);
 const result=await api.importPeople([{employee_code:'IMPORT8',full_name:'นำเข้าภายในสิทธิ์',school_id:8,certificates:[{kind:'vocational',name:'ใบรับรอง',issuer:'หน่วยงาน',number:''}]}]);assert.equal(result.personnel_count,1);assert.equal(result.certificate_count,1);
});
test('selected-name delegation removes access to colleagues and supports independent education responsibility',async()=>{
 api.demoRole('admin');api.openDemoDetails();const rows=await api.all('personnel'),a=rows.find(p=>p.employee_code==='SCOPED8'),b=rows.find(p=>p.employee_code==='IMPORT8');
 await api.manageAssignment({user_id:'demo-editor',school_id:8,personnel_ids:[a.id],permissions:['view','education_write']},1,false,'จำกัดขอบเขตผู้รับผิดชอบ');api.demoRole('school_editor');
 assert.equal((await api.all('personnel')).some(p=>p.id===b.id),false);
 await api.saveReviewedPersonnel({id:a.id,highest_education:'ปริญญาโท',education_majors:['บริหารการศึกษา']},null,a.revision,'แก้ไขวุฒิให้ถูกต้อง');
 await assert.rejects(api.saveReviewedPersonnel({id:a.id,full_name:'ไม่มีสิทธิ์เปลี่ยน'},null,2,'ทดสอบการแก้ไขชื่อ'),/เฉพาะข้อมูลติดต่อ/);
 await assert.rejects(api.requestRemoval(a.id,2,'ทดสอบคำขอลบข้อมูล'),/ไม่มีสิทธิ์/);
});
