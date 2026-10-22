import test from 'node:test';import assert from 'node:assert/strict';
import {certificateState,matchesCertificate,parseRoute,routeHref,getOverview,validateCertificate} from '../dist/overview.js';
test('certificate renewal boundaries include today and final warning day',()=>{
 const asof='2026-10-20';assert.equal(certificateState({expires_on:'2026-10-19'},90,asof),'expired');assert.equal(certificateState({expires_on:'2026-10-20'},90,asof),'expiring');assert.equal(certificateState({expires_on:'2027-01-18'},90,asof),'expiring');assert.equal(certificateState({expires_on:'2027-01-19'},90,asof),'active');assert.equal(certificateState({},90,asof),'undated');
});
test('certificate search combines school, issuer and status, and searches certificate names',()=>{
 const c={kind:'vocational',name:'ช่างเชื่อม',issuer:'หน่วยทดสอบ A',expires_on:'2026-10-30'};const p={id:'p',school_id:2,full_name:'สมชาย',employee_code:'001'};
 assert.equal(matchesCertificate(c,p,{school:'2',issuer:'หน่วยทดสอบ A',status:'expiring',q:'ช่างเชื่อม'},90,'2026-10-20'),true);assert.equal(matchesCertificate(c,p,{school:'1'}),false);assert.equal(matchesCertificate(c,p,{issuer:'หน่วยทดสอบ B'}),false);assert.equal(matchesCertificate(c,null,{}),false);
});
test('drilldown URLs retain Thai issuer names, school and status across navigation',()=>{
 const f={school:'7',issuer:'กรม A & B',status:'expired',q:'ชลดา'};assert.deepEqual(parseRoute(routeHref('certificates',f)),{page:'certificates',filters:{q:'ชลดา',school:'7',status:'expired',education:'',issuer:'กรม A & B',kind:'',readiness:''}});
});
test('overview counts certificates separately from distinct holders and missing education',()=>{
 const d={personnel:[{id:'1',school_id:1,highest_education:'ปริญญาโท'},{id:'2',school_id:2}],schools:[{id:1},{id:2}],certificates:[{personnel_id:'1',expires_on:'2026-10-30'},{personnel_id:'1',expires_on:'2026-01-01'}],documents:[],document_types:[{id:1,required:true,positions:[]}]};const m=getOverview(d,90,'2026-10-20');assert.equal(m.total,2);assert.equal(m.certificates,2);assert.equal(m.holders,1);assert.equal(m.missingEducation,1);assert.equal(m.incomplete,2);assert.equal(m.expiring,1);assert.equal(m.expired,1);assert.deepEqual(m.schools.map(s=>s.count),[1,1]);
});
test('certificate name and issuer are required but number and expiry are optional',()=>{
 assert.doesNotThrow(()=>validateCertificate({kind:'vocational',name:'ใบรับรอง',issuer:'หน่วยงาน',number:''}));assert.throws(()=>validateCertificate({kind:'vocational',name:'ใบรับรอง',issuer:''}));assert.throws(()=>validateCertificate({kind:'vocational',name:'ใบรับรอง',issuer:'หน่วยงาน',issued_on:'2026-10-01',expires_on:'2026-09-01'}));
});
