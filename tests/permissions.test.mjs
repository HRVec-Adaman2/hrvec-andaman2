import test from 'node:test';import assert from 'node:assert/strict';
import {canPerson,canSchool,validateAssignment} from '../dist/permissions.js';
const schools=[{id:1,is_active:true},{id:8,is_active:true},{id:9,is_active:false}],session={role:'school_editor',userId:'editor'},people=[{id:'a',school_id:1},{id:'b',school_id:1},{id:'c',school_id:8},{id:'own',school_id:8,user_id:'editor'}];
const assignments=[{user_id:'editor',school_id:1,personnel_ids:['a'],permissions:['view','education_write']},{user_id:'editor',school_id:8,personnel_ids:null,permissions:['view','personnel_write']}];
test('school officers combine selected-person and whole-school scopes without inheriting unrelated modules',()=>{
 assert.equal(canPerson(session,assignments,schools,people[0],'education_write'),true);assert.equal(canPerson(session,assignments,schools,people[1]),false);assert.equal(canPerson(session,assignments,schools,people[0],'personnel_write'),false);assert.equal(canPerson(session,assignments,schools,people[2],'personnel_write'),true);assert.equal(canPerson(session,assignments,schools,people[2],'certificates_write'),false);
});
test('staff self-service survives delegation but never expands to colleagues',()=>{
 assert.equal(canPerson(session,assignments,schools,people[3],'contact_write'),true);assert.equal(canPerson({...session,role:'personnel'},assignments,schools,people[2]),false);assert.equal(canPerson({...session,role:'personnel'},assignments,schools,people[3],'education_write'),false);
});
test('closing schools preserves scoped read access and stops delegated writes',()=>{
 const a=[{user_id:'editor',school_id:9,personnel_ids:null,permissions:['view','personnel_write']}];assert.equal(canSchool(session,a,schools,9,'view'),true);assert.equal(canSchool(session,a,schools,9,'personnel_write'),false);assert.equal(canSchool(session,a,schools,1,'view'),false);
});
test('assignment validation rejects contradictory scope, foreign personnel, missing view and incomplete import rights',()=>{
 const a={user_id:'editor',school_id:1,personnel_ids:['a'],permissions:['view','education_write']};assert.equal(validateAssignment(a,people),a);
 for(const patch of [{personnel_ids:[]},{personnel_ids:['a','a']},{personnel_ids:['c']},{permissions:['education_write']},{permissions:['view','root']},{permissions:['view','import']},{permissions:['view','create_personnel']}])assert.throws(()=>validateAssignment({...a,...patch},people));
 assert.throws(()=>validateAssignment({...a,personnel_ids:null,permissions:['view','import']},people));
});
