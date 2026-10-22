import {schools,provinces,types,validatePerson} from './core.js';
import {getOverview,validateCertificate} from './overview.js';
import {historySnapshot,requireRevision,validateChangeReason} from './changes.js';
import {loginEmail,validatePassword,normalizeUsername} from './accounts.js';
const config=window.HR_CONFIG||{};
export const configured=!!(config.supabaseUrl&&config.supabaseAnonKey);
let token='',refresh='',expires=0,mode=configured?'guest':'demo',role=configured?'guest':'admin',email='',detailGranted=false,mustChangePassword=false,username='',userId='';
const key='hr-andaman2-demo-v1';
export function seed(){return {schools:schools.map((name,i)=>({id:i+1,name,province:provinces[i]})),personnel:Array.from({length:21},(_,i)=>({id:'demo-'+i,revision:1,deleted_at:null,deleted_by:null,delete_reason:'',employee_code:'DEMO'+String(i+1).padStart(3,'0'),full_name:['อรทัย','กิตติพงศ์','สุภาวดี','ธนกร','ปวีณา','อนุชา','นฤมล'][i%7]+' บุคลากรตัวอย่าง '+(i+1),school_id:i%7+1,position:i%6===0?'ผู้อำนวยการ':'ครู',status:'ปฏิบัติงาน',department:['วิชาการ','บริหารทรัพยากร','พัฒนากิจการนักเรียน','แผนงานและความร่วมมือ'][i%4],highest_education:['ปริญญาตรี','ปริญญาโท','ปริญญาเอก'][i%3],education_majors:[['การบริหารการศึกษา'],['เทคโนโลยีสารสนเทศ','คอมพิวเตอร์ศึกษา'],['วิศวกรรมเครื่องกล']][i%3],academic_rank:['ชำนาญการ','ชำนาญการพิเศษ','ไม่มีวิทยฐานะ'][i%3],birth_date:`${1968+i%20}-05-15`,start_date:`${2000+i%15}-05-01`,email:`demo${i+1}@example.com`,phone:'',address:'',retirement_override:null})),documents:Array.from({length:37},(_,i)=>({id:'doc-'+i,personnel_id:'demo-'+(i%21),type_id:i%9+1,file_name:'เอกสารตัวอย่าง-'+(i+1)+'.pdf',status:i%5===0?'pending':i%7===0?'returned':'approved',review_note:i%7===0?'กรุณาแนบหน้าลงนามให้ครบ':'',created_at:new Date().toISOString()})),certificates:[{id:'cert-1',personnel_id:'demo-0',kind:'administrator',name:'ใบอนุญาตประกอบวิชาชีพผู้บริหารสถานศึกษา',number:'DEMO-001',issuer:'ข้อมูลสาธิต',issued_on:'2024-01-01',expires_on:'2027-01-01'}],document_types:types.map((name,i)=>({id:i+1,name,required:i<2,positions:[]})),lookups:[...['ผู้อำนวยการ','รองผู้อำนวยการ','ครู','ครูผู้ช่วย','พนักงานราชการ','เจ้าหน้าที่'].map(name=>({category:'position',name})),...['ปฏิบัติงาน','ย้าย','ลาออก','เกษียณอายุ'].map(name=>({category:'status',name})),...['วิชาการ','บริหารทรัพยากร','พัฒนากิจการนักเรียน','แผนงานและความร่วมมือ'].map(name=>({category:'department',name})),...['ไม่มีวิทยฐานะ','ชำนาญการ','ชำนาญการพิเศษ','เชี่ยวชาญ','เชี่ยวชาญพิเศษ'].map(name=>({category:'academic_rank',name}))],settings:[{id:1,organization:'สถาบันการอาชีวศึกษาภาคใต้ 2',logo_url:'https://img2.pic.in.th/S__15728643.th.jpg',notify_email:'',notifications:false,expiry_days:90}],audit_log:[],status_history:[],personnel_changes:[],profiles:[],personnel_requests:[]};}
let db;if(!configured){try{db=JSON.parse(localStorage.getItem(key))||seed();}catch{db=seed();}}
if(!configured){db.personnel_changes??=[];db.profiles??=[];db.personnel_requests??=[];for(const p of db.personnel){p.revision??=1;p.deleted_at??=null;p.deleted_by??=null;p.delete_reason??='';}}
export const session=()=>({mode,role,email,username,userId,detailGranted,mustChangePassword});
export const canReadDetails=()=>mode!=='guest'&&!mustChangePassword&&(role==='personnel'||detailGranted);
export function lockDetails(){detailGranted=false;}
export function openDemoDetails(){if(configured||mode!=='demo')throw Error('เปิดได้เฉพาะข้อมูลสาธิต');detailGranted=true;}
function requireDetails(){if(!canReadDetails())throw Error('กรุณายืนยันบัญชีผู้ดูแลระบบก่อนเปิดรายละเอียด');}
function persist(){localStorage.setItem(key,JSON.stringify(db));}
// Commit an authenticated session only after its database role has been checked.
async function authenticate(email,password){
 if(!configured)throw Error('ยังไม่ได้เปิดใช้งานบัญชีผู้ดูแลระบบจริง');
 const data=await request('/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email:loginEmail(email),password})},false);
 if(!data?.access_token||!data.user?.id)throw Error('ยืนยันบัญชีไม่สำเร็จ');
 try{const profiles=await request('/rest/v1/profiles?select=role,username,must_change_password,account_enabled,account_pending,account_revision&id=eq.'+encodeURIComponent(data.user.id),{headers:{Authorization:'Bearer '+data.access_token}},false);const profile=profiles[0];if(!profile||profile.account_enabled===false||profile.account_pending)throw Error('บัญชีถูกพัก กรุณาติดต่อผู้ดูแลระบบ');return {data,role:profile.role,profile};}
 catch(e){await discard(data.access_token);throw e;}
}
async function discard(candidate){await request('/auth/v1/logout?scope=local',{method:'POST',headers:{Authorization:'Bearer '+candidate}},false).catch(()=>{});}
function install(data,newRole,profile={}){token=data.access_token;refresh=data.refresh_token;expires=Date.now()+data.expires_in*1000;mode='live';role=newRole;email=data.user.email||'';userId=data.user.id;username=profile.username||email;mustChangePassword=profile.must_change_password===true;detailGranted=!mustChangePassword;}
export async function login(email,password){const checked=await authenticate(email,password);install(checked.data,checked.role,checked.profile);return checked.data;}
export async function verifyAdmin(email,password,view='personnel'){
 const checked=await authenticate(email,password);
 if(checked.role!=='admin'){await discard(checked.data.access_token);throw Error('ยืนยันไม่สำเร็จ กรุณาใช้บัญชีผู้ดูแลระบบ');}
 if(checked.profile.must_change_password){install(checked.data,'admin',checked.profile);return checked.data;}
 try{await request('/rest/v1/rpc/record_admin_access',{method:'POST',headers:{Authorization:'Bearer '+checked.data.access_token},body:JSON.stringify({view_name:view})},false);}
 catch(e){await discard(checked.data.access_token);throw Error('ยังเปิดข้อมูลไม่ได้ กรุณาตรวจการตั้งค่าระบบหรือลองใหม่');}
 install(checked.data,'admin',checked.profile);return checked.data;
}
export async function logout(){if(token)await discard(token);token='';refresh='';expires=0;email='';username='';userId='';mustChangePassword=false;detailGranted=false;mode=configured?'guest':'demo';role=configured?'guest':'admin';}
export async function overview(){if(mode==='guest'||mustChangePassword)return null;if(mode==='demo'){const source=role==='admin'?db:{...db,personnel:db.personnel.filter(p=>p.id==='demo-0'),documents:db.documents.filter(d=>d.personnel_id==='demo-0'),certificates:db.certificates.filter(c=>c.personnel_id==='demo-0')};return getOverview(source,db.settings[0]?.expiry_days||90);}return request('/rest/v1/rpc/hr_overview',{method:'POST',body:'{}'});}
export function demoRole(r){if(mode==='demo'){role=r==='admin'?'admin':'personnel';detailGranted=false;}}
async function request(path,options={},auth=true){if(auth&&refresh&&Date.now()>expires-60000){const r=await request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:refresh})},false);token=r.access_token;refresh=r.refresh_token;expires=Date.now()+r.expires_in*1000;}const res=await fetch(config.supabaseUrl.replace(/\/$/,'')+path,{...options,headers:{apikey:config.supabaseAnonKey,'Content-Type':'application/json',...(auth?{Authorization:'Bearer '+token}:{}),...options.headers}});const text=await res.text();let body;try{body=text?JSON.parse(text):null;}catch{throw Error('เซิร์ฟเวอร์ตอบกลับผิดรูปแบบ');}if(!res.ok)throw Error(body?.message||body?.error_description||body?.error||'ไม่สามารถเชื่อมต่อได้');return body;}
async function readRows(table,query=''){
 let rows=[],from=0;while(true){const page=await request(`/rest/v1/${table}?select=*&order=${table==='lookups'?'category,name':'id'}${query}`,{headers:{Range:`${from}-${from+499}`}});rows.push(...page);if(page.length<500)break;from+=500;}return rows;
}
export async function all(table){requireDetails();if(mode==='demo'){
 const activeIds=new Set(db.personnel.filter(p=>!p.deleted_at).map(p=>p.id));let rows=structuredClone(db[table]||[]);
 if(table==='personnel')rows=rows.filter(p=>!p.deleted_at);
 if(['documents','certificates'].includes(table))rows=rows.filter(p=>activeIds.has(p.personnel_id));
 if(role!=='admin'){if(table==='personnel')rows=rows.filter(p=>p.id==='demo-0');if(['documents','certificates','status_history','personnel_changes','personnel_requests'].includes(table))rows=rows.filter(p=>p.personnel_id==='demo-0'&&activeIds.has(p.personnel_id));if(['audit_log','profiles'].includes(table))rows=[];}
 return rows;}return readRows(table,table==='personnel'?'&deleted_at=is.null':'');
}
export async function archivedPersonnel(){requireDetails();if(role!=='admin')throw Error('เฉพาะผู้ดูแลระบบ');return mode==='demo'?structuredClone(db.personnel.filter(p=>p.deleted_at)):readRows('personnel','&deleted_at=not.is.null');}
export async function save(table,row){requireDetails();if(table==='personnel')throw Error('กรุณาบันทึกผ่านหน้าตรวจสอบการเปลี่ยนแปลง');if(mode==='live'){const id=row.id;return request('/rest/v1/'+table+(id?'?id=eq.'+encodeURIComponent(id):''),{method:id?'PATCH':'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(row)});}if(table==='certificates'||table==='documents'){const owner=row.personnel_id||db[table].find(x=>x.id===row.id)?.personnel_id;if(!db.personnel.some(p=>p.id===owner&&!p.deleted_at))throw Error('บุคลากรถูกลบแล้ว');}const existing=db[table].find(x=>x.id===row.id);if(role!=='admin'&&!(table==='personnel'&&row.id==='demo-0'))throw Error('ไม่มีสิทธิ์');if(existing){if(table==='personnel'&&['position','status','academic_rank','department'].some(k=>row[k]!==undefined&&row[k]!==existing[k]))db.status_history.unshift({id:crypto.randomUUID(),personnel_id:row.id,old_data:structuredClone(existing),new_data:row,changed_at:new Date().toISOString()});Object.assign(existing,row);}else {row={...row,id:row.id||crypto.randomUUID()};db[table].push(row);}db.audit_log.unshift({id:crypto.randomUUID(),action:existing?'UPDATE':'INSERT',table_name:table,record_id:row.id||'',created_at:new Date().toISOString(),actor_id:'demo'});persist();return [row];}
export async function bridge(action,payload={}){requireDetails();if(mode==='live'){const r=await request('/functions/v1/hr-bridge',{method:'POST',body:JSON.stringify({action,...payload})});if(r.error)throw Error(r.error);return r;}if(action==='upload'){if(!db.personnel.some(p=>p.id===payload.personnel_id&&!p.deleted_at&&(role==='admin'||p.id==='demo-0')))throw Error('ไม่มีสิทธิ์หรือบุคลากรถูกลบแล้ว');db.documents.push({id:crypto.randomUUID(),personnel_id:payload.personnel_id,type_id:+payload.type_id,file_name:payload.name,status:'pending',created_at:new Date().toISOString(),demo_data:payload.base64,mime_type:payload.mime});persist();return {ok:true};}if(action==='download'){const d=db.documents.find(x=>x.id===payload.id);if(!d||!db.personnel.some(p=>p.id===d.personnel_id&&!p.deleted_at&&(role==='admin'||p.id==='demo-0')))throw Error('ไม่มีสิทธิ์หรือบุคลากรถูกลบแล้ว');if(!d.demo_data)throw Error('เอกสารตัวอย่างไม่มีไฟล์จริง กรุณาลองอัปโหลดไฟล์');return {base64:d.demo_data,mime:d.mime_type,name:d.file_name};}if(action==='sync'||action==='backup')throw Error('ต้องเชื่อมต่อระบบจริงก่อนใช้งาน Google Drive / Sheets');throw Error('คำสั่งไม่รองรับ');}
export async function importPeople(rows){
 requireDetails();if(role!=='admin')throw Error('ไม่มีสิทธิ์');
 if(!Array.isArray(rows)||!rows.length||rows.length>500)throw Error('นำเข้าได้ครั้งละ 1–500 คน');
 if(mode==='live')return request('/rest/v1/rpc/import_personnel_bundle',{method:'POST',body:JSON.stringify({records:rows})});
 const codes=new Set(db.personnel.map(p=>p.employee_code)),people=[],certificates=[];
 for(const source of rows){const {certificates:items=[],...fields}=source;const p={status:'ปฏิบัติงาน',education_majors:[],...fields,id:crypto.randomUUID(),revision:1,deleted_at:null,deleted_by:null,delete_reason:''};validatePerson(p);
  if(codes.has(p.employee_code))throw Error('เลขที่ตำแหน่งซ้ำ: '+p.employee_code);codes.add(p.employee_code);
  if(!Array.isArray(items)||items.length>100)throw Error('ใบรับรองต้องเป็นรายการไม่เกิน 100 ใบต่อคน');const signatures=new Set();
  for(const c of items){validateCertificate(c);const signature=JSON.stringify([c.kind,c.name.trim(),c.issuer.trim(),c.number||'',c.issued_on||null,c.expires_on||null]);if(signatures.has(signature))throw Error('ใบรับรองซ้ำในไฟล์');signatures.add(signature);certificates.push({...c,id:crypto.randomUUID(),personnel_id:p.id,document_id:null,created_at:new Date().toISOString()});}
  people.push(p);
 }
 if(certificates.length>5000)throw Error('นำเข้าใบรับรองได้ไม่เกิน 5,000 ใบต่อครั้ง');
 // Mutate only after every person and certificate has passed validation.
 db.personnel.push(...people);db.certificates.push(...certificates);for(const p of people)recordChange(null,p,'CREATE','นำเข้าข้อมูลครั้งแรก');db.audit_log.unshift({id:crypto.randomUUID(),action:'IMPORT',table_name:'personnel',record_id:String(people.length),actor_id:'demo',created_at:new Date().toISOString()});persist();return {personnel_count:people.length,certificate_count:certificates.length};
}
export async function addLookup(category,name){requireDetails();if(mode==='live')return request('/rest/v1/lookups',{method:'POST',body:JSON.stringify({category,name})});db.lookups.push({category,name});persist();}
export function clearCache(){if(mode==='demo'){localStorage.removeItem(key);db=seed();}return true;}

function recordChange(before,after,action,reason){
 db.personnel_changes.unshift({id:crypto.randomUUID(),personnel_id:after.id,revision:after.revision,action,old_data:before?historySnapshot(before):{},new_data:historySnapshot(after),reason,actor_id:'demo',actor_role:role,changed_at:new Date().toISOString()});
 db.audit_log.unshift({id:crypto.randomUUID(),action,table_name:'personnel',record_id:after.id,actor_id:'demo',created_at:new Date().toISOString()});
}
export async function saveReviewedPersonnel(row,certificate=null,expectedRevision=null,reason=''){
 requireDetails();const admin=role==='admin';
 const allowed=admin?['id','employee_code','full_name','school_id','user_id','position','status','department','academic_rank','highest_education','education_majors','birth_date','start_date','retirement_override','email','phone','address','avatar_data']:['id','email','phone','address','avatar_data'];
 if(Object.keys(row).some(k=>!allowed.includes(k)))throw Error('มีข้อมูลที่ไม่มีสิทธิ์แก้ไข');
 if(!admin&&(!row.id||certificate))throw Error('ไม่มีสิทธิ์');
 if(row.id){requireRevision(expectedRevision);reason=validateChangeReason(reason);}else{if(!admin)throw Error('ไม่มีสิทธิ์');reason='เพิ่มบุคลากร';}
 if(admin&&(!row.id||row.employee_code!==undefined))validatePerson(row);if(certificate)validateCertificate(certificate);
 if(mode==='live')return request('/rest/v1/rpc/save_personnel_reviewed',{method:'POST',body:JSON.stringify({personnel_data:row,certificate_data:certificate,expected_revision:expectedRevision,change_reason:reason})});
 const old=row.id?db.personnel.find(p=>p.id===row.id):null;
 if(row.id&&(!old||(!admin&&row.id!=='demo-0')))throw Error('ไม่มีสิทธิ์');
 if(old?.deleted_at)throw Error('รายการนี้ถูกลบแล้ว กรุณาโหลดรายชื่อใหม่');
 if(old&&old.revision!==expectedRevision)throw Error('ข้อมูลถูกเปลี่ยนแปลงโดยผู้อื่น กรุณาโหลดรายชื่อใหม่แล้วตรวจสอบอีกครั้ง');
 const p={status:'ปฏิบัติงาน',education_majors:[],deleted_at:null,deleted_by:null,delete_reason:'',...old,...row,id:old?.id||crypto.randomUUID(),revision:old?old.revision+1:1,updated_at:new Date().toISOString()};
 validatePerson(p);if(db.personnel.some(x=>x.id!==p.id&&x.employee_code===p.employee_code))throw Error('เลขที่ตำแหน่งซ้ำ รวมถึงรายการที่ลบแล้ว กรุณาตรวจสอบหรือกู้คืนรายการเดิม');
 const certificateId=certificate?crypto.randomUUID():null;
 if(old)db.personnel[db.personnel.indexOf(old)]=p;else db.personnel.push(p);
 if(certificate)db.certificates.push({...certificate,id:certificateId,personnel_id:p.id,document_id:null,created_at:new Date().toISOString()});
 recordChange(old,p,old?'UPDATE':'CREATE',reason);persist();return {id:p.id,revision:p.revision,certificate_id:certificateId};
}
export async function savePersonnel(row,certificate=null,expectedRevision=null,reason=''){
 if(role!=='admin')throw Error('เฉพาะผู้ดูแลระบบ');return saveReviewedPersonnel(row,certificate,expectedRevision,reason);
}
export async function changePersonnelLifecycle(id,expectedRevision,operation,reason){
 requireDetails();if(role!=='admin')throw Error('เฉพาะผู้ดูแลระบบ');requireRevision(expectedRevision);reason=validateChangeReason(reason);
 if(!['delete','restore'].includes(operation))throw Error('คำสั่งไม่ถูกต้อง');
 if(mode==='live')return request('/rest/v1/rpc/change_personnel_lifecycle',{method:'POST',body:JSON.stringify({personnel_id:id,expected_revision:expectedRevision,operation,reason})});
 const p=db.personnel.find(p=>p.id===id);if(!p)throw Error('ไม่พบข้อมูลบุคลากร');if(p.revision!==expectedRevision)throw Error('ข้อมูลถูกเปลี่ยนแปลงโดยผู้อื่น กรุณาโหลดรายชื่อใหม่แล้วตรวจสอบอีกครั้ง');
 if((operation==='delete')===!!p.deleted_at)throw Error(operation==='delete'?'รายการนี้ถูกลบแล้ว':'รายการนี้ใช้งานอยู่แล้ว');
 const old=structuredClone(p);Object.assign(p,{deleted_at:operation==='delete'?new Date().toISOString():null,deleted_by:operation==='delete'?'demo':null,delete_reason:operation==='delete'?reason:'',revision:p.revision+1,updated_at:new Date().toISOString()});
 recordChange(old,p,operation==='delete'?'DELETE':'RESTORE',reason);persist();return {id,revision:p.revision,deleted:!!p.deleted_at};
}

export async function changePassword(currentPassword,newPassword){
 if(mode!=='live')throw Error('เปลี่ยนรหัสผ่านได้เมื่อเข้าสู่ระบบจริง');validatePassword(newPassword,currentPassword);
 const result=await request('/functions/v1/hr-accounts',{method:'POST',body:JSON.stringify({action:'change_password',current_password:currentPassword,new_password:newPassword})});
 if(!result?.ok)throw Error(result?.error||'เปลี่ยนรหัสผ่านไม่สำเร็จ');await logout();return result;
}
export async function manageAccount(action,payload){
 requireDetails();if(role!=='admin')throw Error('เฉพาะผู้ดูแลระบบ');
 if(mode!=='live')throw Error('โหมดสาธิตไม่สร้างบัญชีจริง กรุณาติดตั้งระบบบัญชีตามคู่มือ');
 if(action==='create'){normalizeUsername(payload.username);validatePassword(payload.password);}if(action==='reset_password')validatePassword(payload.password);
 return request('/functions/v1/hr-accounts',{method:'POST',body:JSON.stringify({...payload,action})});
}
export async function requestRemoval(id,expectedRevision,reason){
 requireDetails();requireRevision(expectedRevision);reason=validateChangeReason(reason);
 if(mode==='live')return request('/rest/v1/rpc/request_personnel_removal',{method:'POST',body:JSON.stringify({personnel_id:id,expected_revision:expectedRevision,reason})});
 const p=db.personnel.find(p=>p.id===id&&!p.deleted_at);if(!p||id!=='demo-0')throw Error('ไม่มีสิทธิ์ส่งคำขอสำหรับบุคลากรนี้');if(p.revision!==expectedRevision)throw Error('ข้อมูลถูกเปลี่ยนแปลง กรุณาโหลดรายชื่อใหม่');
 if(db.personnel_requests.some(x=>x.personnel_id===id&&x.status==='pending'))throw Error('มีคำขอรอพิจารณาอยู่แล้ว');
 const requestId=crypto.randomUUID();db.personnel_requests.unshift({id:requestId,personnel_id:id,personnel_revision:p.revision,requested_by:'demo',reason,status:'pending',created_at:new Date().toISOString()});persist();return requestId;
}
export async function reviewRemoval(id,decision,reason){
 requireDetails();if(role!=='admin')throw Error('เฉพาะผู้ดูแลระบบ');reason=validateChangeReason(reason);if(!['approve','reject'].includes(decision))throw Error('คำสั่งไม่ถูกต้อง');
 if(mode==='live')return request('/rest/v1/rpc/review_personnel_removal',{method:'POST',body:JSON.stringify({request_id:id,decision,reason})});
 const r=db.personnel_requests.find(r=>r.id===id&&r.status==='pending');if(!r)throw Error('คำขอนี้ได้รับการพิจารณาแล้วหรือไม่พบข้อมูล');
 if(decision==='approve')await changePersonnelLifecycle(r.personnel_id,r.personnel_revision,'delete',reason);
 Object.assign(r,{status:decision==='approve'?'approved':'rejected',review_reason:reason,reviewed_by:'demo',reviewed_at:new Date().toISOString()});persist();return {ok:true};
}
