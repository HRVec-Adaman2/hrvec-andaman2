import test from 'node:test';import assert from 'node:assert/strict';
const storage=new Map();globalThis.window={HR_CONFIG:{}};globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
const api=await import('../dist/api.js');api.openDemoDetails();
const p=code=>({employee_code:code,full_name:'ทดสอบ '+code,school_id:1,highest_education:'ปริญญาโท',education_majors:['สาขา A','สาขา B']});
const cert=name=>({kind:'vocational',name,issuer:'หน่วยงานทดสอบ',number:'',issued_on:null,expires_on:null});
test('demo import commits a linked bundle once and rejects a duplicate retry',async()=>{
 const result=await api.importPeople([{...p('BUNDLE-1'),certificates:[cert('ใบ 1'),cert('ใบ 2')]},p('BUNDLE-2')]);assert.deepEqual(result,{personnel_count:2,certificate_count:2});
 const owner=(await api.all('personnel')).find(x=>x.employee_code==='BUNDLE-1');assert.equal((await api.all('certificates')).filter(c=>c.personnel_id===owner.id).length,2);assert.equal(owner.status,'ปฏิบัติงาน');
 await assert.rejects(api.importPeople([p('BUNDLE-1')]),/ซ้ำ/);
});
test('late invalid certificate rolls back every new person and certificate',async()=>{
 const beforePeople=await api.all('personnel'),beforeCerts=await api.all('certificates');
 await assert.rejects(api.importPeople([{...p('ROLLBACK-1'),certificates:[cert('ผ่าน')]},{...p('ROLLBACK-2'),certificates:[{...cert('ไม่ผ่าน'),issuer:''}]}]));
 assert.deepEqual(await api.all('personnel'),beforePeople);assert.deepEqual(await api.all('certificates'),beforeCerts);
});
test('removing status from editing preserves the existing value and new records get the default',async()=>{
 const old=(await api.all('personnel'))[0];await api.savePersonnel({id:old.id,status:'ย้าย'},null,old.revision,'ย้ายตามคำสั่ง');
 const current=(await api.all('personnel')).find(x=>x.id===old.id);await api.savePersonnel({id:old.id,highest_education:'ปริญญาเอก',education_majors:['การบริหารการศึกษา']},null,current.revision,'ปรับวุฒิการศึกษาสูงสุด');
 assert.equal((await api.all('personnel')).find(x=>x.id===old.id).status,'ย้าย');
 const saved=await api.savePersonnel(p('DEFAULT-1'));assert.equal((await api.all('personnel')).find(x=>x.id===saved.id).status,'ปฏิบัติงาน');
});
test('personnel accounts cannot import a bundle',async()=>{
 api.demoRole('personnel');await assert.rejects(api.importPeople([p('DENIED')]));
});
