// UI hints only. PostgreSQL/RPCs independently enforce every permission.
export const permissionLabels={view:'ดูข้อมูล',create_personnel:'เพิ่มบุคลากร',personnel_write:'แก้ไขทะเบียนและข้อมูลติดต่อ',education_write:'แก้ไขวุฒิและสาขาวิชา',certificates_write:'จัดการใบรับรอง',documents_write:'อัปโหลดเอกสาร',import:'นำเข้า Excel',request_delete:'ส่งคำขอลบ'};
export function canSchool(session,assignments,schools,schoolId,permission='view',personId=null){
 if(session.role==='admin')return true;
 if(session.role!=='school_editor'||(permission!=='view'&&schools.find(s=>s.id===+schoolId)?.is_active===false))return false;
 return assignments.some(a=>a.user_id===session.userId&&a.school_id===+schoolId&&a.permissions.includes(permission)&&(a.personnel_ids===null||(personId&&a.personnel_ids.includes(personId))));
}
export function canPerson(session,assignments,schools,p,permission='view'){
 if(!p)return false;if(session.role==='admin')return true;if(p.deleted_at)return false;
 const own=p.user_id===session.userId||(session.mode==='demo'&&session.role==='personnel'&&p.id==='demo-0');
 if(own&&['view','contact_write','documents_write','request_delete'].includes(permission))return permission==='view'||schools.find(s=>s.id===p.school_id)?.is_active!==false;
 return canSchool(session,assignments,schools,p.school_id,permission,p.id);
}
export function validateAssignment(a,people=[]){
 if(!a.user_id||!Number.isInteger(a.school_id)||a.school_id<1)throw Error('กรุณาเลือกบัญชีและสถานศึกษา');
 if(!Array.isArray(a.permissions)||!a.permissions.includes('view')||a.permissions.some(p=>!Object.hasOwn(permissionLabels,p))||new Set(a.permissions).size!==a.permissions.length)throw Error('สิทธิ์ไม่ถูกต้อง ต้องมีสิทธิ์ดูข้อมูล');
 if(a.personnel_ids!==null){if(!Array.isArray(a.personnel_ids)||!a.personnel_ids.length||new Set(a.personnel_ids).size!==a.personnel_ids.length)throw Error('กรุณาเลือกรายชื่อที่รับผิดชอบ');
  if(a.permissions.some(p=>['create_personnel','import'].includes(p)))throw Error('การเพิ่มบุคลากรและนำเข้า Excel ต้องเลือกขอบเขตทั้งสถานศึกษา');
  if(a.personnel_ids.some(id=>!people.some(p=>p.id===id&&p.school_id===a.school_id&&!p.deleted_at)))throw Error('มีบุคลากรอยู่นอกสถานศึกษาที่เลือก');}
 if(a.permissions.includes('import')&&!['create_personnel','personnel_write'].every(p=>a.permissions.includes(p)))throw Error('นำเข้า Excel ต้องมีสิทธิ์เพิ่มและแก้ไขทะเบียน');
 return a;
}
