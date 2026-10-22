import test from 'node:test';import assert from 'node:assert/strict';
globalThis.window={HR_CONFIG:{}};globalThis.localStorage={getItem:()=>null,setItem(){}};const api=await import('../dist/api.js');
test('staff requests await admin review, duplicate requests are blocked and stale revisions never delete a changed record',async()=>{
 api.demoRole('personnel');let p=(await api.all('personnel'))[0];const id=await api.requestRemoval(p.id,p.revision,'กรอกข้อมูลผิดคน');assert.equal((await api.all('personnel')).length,1);
 await assert.rejects(api.requestRemoval(p.id,p.revision,'ขอลบซ้ำอีกครั้ง'),/รอพิจารณา/);await assert.rejects(api.requestRemoval('demo-1',1,'ลองขอลบผู้อื่น'),/สิทธิ์/);await assert.rejects(api.reviewRemoval(id,'approve','อนุมัติด้วยตนเอง'),/ผู้ดูแล/);
 api.demoRole('admin');api.openDemoDetails();await api.savePersonnel({id:p.id,phone:'0800000000'},null,p.revision,'แก้ข้อมูลระหว่างพิจารณา');await assert.rejects(api.reviewRemoval(id,'approve','ตรวจแล้วอนุมัติ'),/ผู้อื่น/);assert.ok((await api.all('personnel')).find(x=>x.id===p.id));
 await api.reviewRemoval(id,'reject','ข้อมูลเปลี่ยนแล้ว กรุณาส่งคำขอใหม่');api.demoRole('personnel');p=(await api.all('personnel'))[0];const retry=await api.requestRemoval(p.id,p.revision,'ขอลบตามข้อมูลล่าสุด');api.demoRole('admin');api.openDemoDetails();await api.reviewRemoval(retry,'approve','ตรวจสอบแล้วอนุมัติลบ');assert.equal((await api.all('personnel')).some(x=>x.id===p.id),false);assert.ok((await api.archivedPersonnel()).some(x=>x.id===p.id));
});
