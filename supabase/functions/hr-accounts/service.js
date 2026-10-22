import {normalizeUsername,loginEmail,validatePassword} from '../_shared/accounts.js';
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const check=(result,message,status=500)=>{if(result.error)throw fail(message,status);return result.data;};
const revision=value=>{if(!Number.isInteger(value)||value<0)throw fail('กรุณาโหลดข้อมูลบัญชีใหม่');return value;};

// Dependencies are injected to exercise the exact server workflow without real accounts.
export async function handleAccountAction({admin,createAuthClient,actor,sessionValid,ready},body){
 if(!actor?.id||!sessionValid)throw fail('บัญชีถูกพักหรือเซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่',403);
 const own=check(await admin.from('profiles').select('*').eq('id',actor.id).single(),'ไม่พบสิทธิ์บัญชี',403);
 if(!own.account_enabled||own.account_pending)throw fail('บัญชีถูกพัก กรุณาติดต่อผู้ดูแลระบบ',403);
 if(body.action==='change_password'){
  validatePassword(body.new_password,body.current_password);
  if(typeof body.current_password!=='string'||!body.current_password)throw fail('กรุณาระบุรหัสผ่านปัจจุบัน');
  const verifier=createAuthClient();const verified=await verifier.auth.signInWithPassword({email:actor.email,password:body.current_password});
  if(verified.error||verified.data?.user?.id!==actor.id)throw fail('รหัสผ่านปัจจุบันไม่ถูกต้อง',403);
  await verifier.auth.signOut({scope:'local'});
  const next=check(await admin.rpc('begin_account_change',{target_id:actor.id,expected_revision:own.account_revision}),'บัญชีถูกเปลี่ยนแปลง กรุณาเข้าสู่ระบบใหม่',409);
  const changed=await admin.auth.admin.updateUserById(actor.id,{password:body.new_password});
  if(changed.error)throw fail('เปลี่ยนรหัสไม่สำเร็จ บัญชีถูกพักชั่วคราว ให้ผู้ดูแลรีเซ็ตรหัสผ่านใหม่',503);
  check(await admin.rpc('finish_account_change',{target_id:actor.id,expected_revision:next,force_change:false,actor:actor.id,action_name:'PASSWORD_CHANGED'}),'บันทึกผลไม่สำเร็จ ให้ผู้ดูแลรีเซ็ตรหัสผ่านใหม่',503);
  return {ok:true,sign_in_again:true};
 }
 if(!ready||own.role!=='admin'||own.must_change_password)throw fail('เฉพาะผู้ดูแลระบบที่เปลี่ยนรหัสผ่านแล้ว',403);
 if(!['create','reset_password','set_enabled'].includes(body.action))throw fail('คำสั่งไม่รองรับ');
 if(!uuid(body.personnel_id))throw fail('รายการบุคลากรไม่ถูกต้อง');
 const p=check(await admin.from('personnel').select('id,user_id,school_id,deleted_at,revision').eq('id',body.personnel_id).single(),'ไม่พบข้อมูลบุคลากร',404);
 if(p.deleted_at||!Number.isInteger(p.school_id)||p.school_id<1||p.school_id>7)throw fail('บุคลากรนี้ไม่อยู่ในทะเบียนใช้งาน',409);
 if(body.action==='create'){
  const username=normalizeUsername(body.username);validatePassword(body.password);
  if(username==='admin')throw fail('ชื่อ admin สงวนสำหรับบัญชีผู้ดูแล');
  if(p.user_id)throw fail('บุคลากรนี้มีบัญชีแล้ว กรุณาโหลดข้อมูลใหม่',409);
  if(p.revision!==body.expected_revision)throw fail('ข้อมูลบุคลากรถูกเปลี่ยนแปลง กรุณาโหลดใหม่',409);
  const created=await admin.auth.admin.createUser({email:loginEmail(username),password:body.password,email_confirm:true,app_metadata:{hr_managed:true}});
  if(created.error||!created.data?.user)throw fail('สร้างบัญชีไม่สำเร็จ ตรวจชื่อผู้ใช้ซ้ำและนโยบายรหัสผ่าน',409);
  const id=created.data.user.id;let bound=false;
  try{
   check(await admin.from('profiles').update({username,must_change_password:true,account_enabled:true}).eq('id',id).select('id').single(),'กำหนดข้อมูลบัญชีไม่สำเร็จ');
   check(await admin.rpc('bind_managed_account',{personnel_id:p.id,user_id:id,expected_revision:p.revision,actor:actor.id}),'ผูกบัญชีไม่สำเร็จ กรุณาโหลดข้อมูลบุคลากรใหม่',409);bound=true;
  }catch(error){if(!bound)await admin.auth.admin.deleteUser(id);throw error;}
  return {ok:true,user_id:id,username,must_change_password:true};
 }
 if(!p.user_id)throw fail('บุคลากรนี้ยังไม่มีบัญชี',409);
 const target=check(await admin.from('profiles').select('*').eq('id',p.user_id).single(),'ไม่พบข้อมูลบัญชี',404);
 if(target.role!=='personnel')throw fail('จัดการบัญชีผู้ดูแลผ่านการเปลี่ยนรหัสของเจ้าของบัญชี',403);
 const expected=revision(body.expected_account_revision);
 if(body.action==='set_enabled'){
  if(typeof body.enabled!=='boolean')throw fail('กรุณาระบุการเปิดหรือพักบัญชี');
  check(await admin.rpc('set_account_enabled',{target_id:p.user_id,expected_revision:expected,enabled:body.enabled,actor:actor.id}),'บัญชีถูกเปลี่ยนแปลง กรุณาโหลดข้อมูลใหม่',409);return {ok:true};
 }
 validatePassword(body.password);
 const next=check(await admin.rpc('begin_account_change',{target_id:p.user_id,expected_revision:expected}),'บัญชีถูกเปลี่ยนแปลง กรุณาโหลดข้อมูลใหม่',409);
 const changed=await admin.auth.admin.updateUserById(p.user_id,{password:body.password});
 if(changed.error)throw fail('กำหนดรหัสไม่สำเร็จ บัญชีถูกพักชั่วคราว กรุณาลองรีเซ็ตใหม่',503);
 check(await admin.rpc('finish_account_change',{target_id:p.user_id,expected_revision:next,force_change:true,actor:actor.id,action_name:'PASSWORD_RESET'}),'บันทึกผลไม่สำเร็จ กรุณารีเซ็ตรหัสผ่านใหม่',503);
 return {ok:true,must_change_password:true};
}
