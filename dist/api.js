import {universityRanks,administrationFields,additionalPositions} from './personnel-options.js';
import {collegeDepartments,instituteDepartments,institutePositions,unitType,validateStructure} from './structure.js';
import {canPerson,canSchool,validateAssignment,permissionLabels} from './permissions.js';
import {schools,provinces,types,validatePerson,uuid} from './core.js';
import {getOverview,validateCertificate} from './overview.js';
import {historySnapshot,requireRevision,validateChangeReason} from './changes.js';
import {loginEmail,validatePassword,normalizeUsername} from './accounts.js';
const config=window.HR_CONFIG||{};
export const configured=!!(config.supabaseUrl&&config.supabaseAnonKey);
let token='',refresh='',expires=0,mode=configured?'guest':'demo',role=configured?'guest':'admin',email='',detailGranted=false,mustChangePassword=false,username='',userId='';
const key='hr-andaman2-demo-v19';
export function seed(){return {schools:schools.map((name,i)=>({id:i+1,name,province:provinces[i],unit_type:i===7?'institute':'college',is_active:true,revision:1})),personnel:Array.from({length:21},(_,i)=>({id:'demo-'+i,revision:1,deleted_at:null,deleted_by:null,delete_reason:'',employee_code:'DEMO'+String(i+1).padStart(3,'0'),full_name:['อรทัย','กิตติพงศ์','สุภาวดี','ธนกร','ปวีณา','อนุชา','นฤมล'][i%7]+' บุคลากรตัวอย่าง '+(i+1),user_id:i===0?'demo-user':i===1?'demo-editor':null,school_id:i%8+1,position:i%8===7?'เจ้าหน้าที่':i%6===0?'ผู้อำนวยการ':'ครู',status:'ปฏิบัติงาน',department:i%8===7?instituteDepartments[i%5]:collegeDepartments[i%4],work_unit:'',highest_education:['ปริญญาตรี','ปริญญาโท','ปริญญาเอก'][i%3],education_majors:[['การบริหารการศึกษา'],['เทคโนโลยีสารสนเทศ','คอมพิวเตอร์ศึกษา'],['วิศวกรรมเครื่องกล']][i%3],academic_rank:['ชำนาญการ','ชำนาญการพิเศษ','ไม่มีวิทยฐานะ'][i%3],birth_date:`${1968+i%20}-05-15`,start_date:`${2000+i%15}-05-01`,email:`demo${i+1}@example.com`,phone:'',retirement_override:null})),documents:Array.from({length:37},(_,i)=>({id:'doc-'+i,personnel_id:'demo-'+(i%21),type_id:i%9+1,file_name:'เอกสารตัวอย่าง-'+(i+1)+'.pdf',status:i%5===0?'pending':i%7===0?'returned':'approved',review_note:i%7===0?'กรุณาแนบหน้าลงนามให้ครบ':'',created_at:new Date().toISOString()})),certificates:[{id:'cert-competency',personnel_id:'demo-1',kind:'competency',name:'คุณวุฒิวิชาชีพตัวอย่าง',issuer:'หน่วยงานตัวอย่าง',number:'DEMO-C01',occupation:'เทคโนโลยีสารสนเทศ',competency_level:'ระดับ 4',standard:'มาตรฐานอาชีพตัวอย่าง',issued_on:'2025-01-01',expires_on:'2027-01-01'},{id:'cert-1',personnel_id:'demo-0',kind:'administrator',name:'ใบอนุญาตประกอบวิชาชีพผู้บริหารสถานศึกษา',number:'DEMO-001',issuer:'ข้อมูลสาธิต',issued_on:'2024-01-01',expires_on:'2027-01-01'}],document_types:types.map((name,i)=>({id:i+1,name,required:i<2,positions:[]})),lookups:[...additionalPositions.map(name=>({category:'position',name})),...administrationFields.map(name=>({category:'administration_field',name})),...['ผู้อำนวยการ','รองผู้อำนวยการ','ครู','ครูผู้ช่วย','พนักงานราชการ','เจ้าหน้าที่'].map(name=>({category:'position',name})),...['ปฏิบัติงาน','ย้าย','ลาออก','เกษียณอายุ'].map(name=>({category:'status',name})),...collegeDepartments.map(name=>({category:'department',name})),...instituteDepartments.map(name=>({category:'institute_department',name})),...institutePositions.map(name=>({category:'position',name})),...['ไม่มีวิทยฐานะ','ชำนาญการ','ชำนาญการพิเศษ','เชี่ยวชาญ','เชี่ยวชาญพิเศษ'].map(name=>({category:'academic_rank',name}))],settings:[{id:1,organization:'สถาบันการอาชีวศึกษาภาคใต้ 2',logo_url:'https://img2.pic.in.th/S__15728643.th.jpg',notify_email:'',notifications:false,expiry_days:90}],audit_log:[],status_history:[],personnel_changes:[],profiles:[{id:'demo-editor',role:'school_editor',username:'school.demo',account_enabled:true,account_revision:0}],personnel_requests:[],school_assignments:[{id:'assignment-demo',user_id:'demo-editor',school_id:1,permissions:Object.keys(permissionLabels),personnel_ids:null,revision:1}],administration_changes:[]};}
let db;if(!configured){try{db=JSON.parse(localStorage.getItem(key))||seed();}catch{db=seed();}}
if(!configured){db.school_assignments??=seed().school_assignments;db.administration_changes??=[];for(const school of db.schools){school.is_active??=true;school.revision??=1;}db.personnel_changes??=[];db.profiles??=[];db.personnel_requests??=[];for(const p of db.personnel){p.revision??=1;p.deleted_at??=null;p.deleted_by??=null;p.delete_reason??='';}}
export const session=()=>({mode,role,email,username,userId,detailGranted,mustChangePassword});
export const canReadDetails=()=>mode!=='guest'&&!mustChangePassword&&(['personnel','school_editor'].includes(role)||detailGranted);
export function lockDetails(){detailGranted=false;}
export function openDemoDetails(){if(configured||mode!=='demo')throw Error('เปิดได้เฉพาะข้อมูลสาธิต');detailGranted=true;}
function requireDetails(){if(!canReadDetails())throw Error('กรุณายืนยันบัญชีผู้ใช้งานก่อนเปิดรายละเอียด');}
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
export async function unlockDetails(email,password,view='personnel'){
 const checked=await authenticate(email,password);
 if(!['admin','school_editor','personnel'].includes(checked.role)){await discard(checked.data.access_token);throw Error('ไม่พบสิทธิ์บัญชีผู้ใช้งาน');}
 if(checked.role==='admin'&&!checked.profile.must_change_password){
  try{await request('/rest/v1/rpc/record_admin_access',{method:'POST',headers:{Authorization:'Bearer '+checked.data.access_token},body:JSON.stringify({view_name:view})},false);}
  catch(e){await discard(checked.data.access_token);throw Error('ยังเปิดข้อมูลไม่ได้ กรุณาตรวจการตั้งค่าระบบหรือลองใหม่');}
 }
 install(checked.data,checked.role,checked.profile);return checked.data;
}
export async function logout(){if(token)await discard(token);token='';refresh='';expires=0;email='';username='';userId='';mustChangePassword=false;detailGranted=false;mode=configured?'guest':'demo';role=configured?'guest':'admin';}
export async function overview(){if(mustChangePassword)return null;if(mode==='guest')return request('/rest/v1/rpc/hr_public_overview',{method:'POST',body:'{}'},false);if(mode==='demo'){const ids=new Set(db.personnel.filter(p=>demoCan(p,'view')).map(p=>p.id));const source=role==='admin'?db:{...db,personnel:db.personnel.filter(p=>ids.has(p.id)),documents:db.documents.filter(d=>ids.has(d.personnel_id)),certificates:db.certificates.filter(c=>ids.has(c.personnel_id))};return getOverview(source,db.settings[0]?.expiry_days||90);}return request('/rest/v1/rpc/hr_overview',{method:'POST',body:'{}'});}
export function demoRole(r){if(mode==='demo'){role=['admin','school_editor','personnel'].includes(r)?r:'personnel';userId=role==='school_editor'?'demo-editor':role==='personnel'?'demo-user':'demo-admin';detailGranted=false;}}
async function request(path,options={},auth=true){if(auth&&refresh&&Date.now()>expires-60000){const r=await request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:refresh})},false);token=r.access_token;refresh=r.refresh_token;expires=Date.now()+r.expires_in*1000;}const res=await fetch(config.supabaseUrl.replace(/\/$/,'')+path,{...options,headers:{apikey:config.supabaseAnonKey,'Content-Type':'application/json',...(auth?{Authorization:'Bearer '+token}:{}),...options.headers}});const text=await res.text();let body;try{body=text?JSON.parse(text):null;}catch{throw Error('เซิร์ฟเวอร์ตอบกลับผิดรูปแบบ');}if(!res.ok)throw Error(body?.message||body?.error_description||body?.error||'ไม่สามารถเชื่อมต่อได้');return body;}
async function readRows(table,query=''){
 let rows=[],from=0;while(true){const page=await request(`/rest/v1/${table}?select=*&order=${table==='lookups'?'category,name':'id'}${query}`,{headers:{Range:`${from}-${from+499}`}});rows.push(...page);if(page.length<500)break;from+=500;}return rows;
}
export async function all(table){requireDetails();if(mode==='demo'){
 const activeIds=new Set(db.personnel.filter(p=>!p.deleted_at).map(p=>p.id));let rows=structuredClone(db[table]||[]);
 if(table==='personnel')rows=rows.filter(p=>!p.deleted_at);
 if(['documents','certificates'].includes(table))rows=rows.filter(p=>activeIds.has(p.personnel_id));
 if(role!=='admin'){if(table==='personnel')rows=rows.filter(p=>demoCan(p,'view'));if(['documents','certificates','status_history','personnel_changes','personnel_requests'].includes(table))rows=rows.filter(p=>activeIds.has(p.personnel_id)&&demoCan(db.personnel.find(x=>x.id===p.personnel_id),'view'));if(['audit_log','profiles','administration_changes'].includes(table))rows=[];if(table==='school_assignments')rows=rows.filter(a=>a.user_id===userId);}
 return rows;}return readRows(table,table==='personnel'?'&deleted_at=is.null':'');
}
export async function archivedPersonnel(){requireDetails();if(role!=='admin')throw Error('เฉพาะผู้ดูแลระบบ');return mode==='demo'?structuredClone(db.personnel.filter(p=>p.deleted_at)):readRows('personnel','&deleted_at=not.is.null');}
export async function save(table,row){requireDetails();if(table==='schools')throw Error('กรุณาบันทึกผ่านเมนูจัดการสถานศึกษา');if(table==='personnel')throw Error('กรุณาบันทึกผ่านหน้าตรวจสอบการเปลี่ยนแปลง');if(mode==='live'){const id=row.id;return request('/rest/v1/'+table+(id?'?id=eq.'+encodeURIComponent(id):''),{method:id?'PATCH':'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(row)});}if(table==='certificates')validateCertificate(row);if(table==='certificates'||table==='documents'){const owner=row.personnel_id||db[table].find(x=>x.id===row.id)?.personnel_id;if(!db.personnel.some(p=>p.id===owner&&!p.deleted_at))throw Error('บุคลากรถูกลบแล้ว');}const existing=db[table].find(x=>x.id===row.id);if(role!=='admin'&&!(table==='certificates'&&demoCan(db.personnel.find(p=>p.id===(row.personnel_id||existing?.personnel_id)),'certificates_write')))throw Error('ไม่มีสิทธิ์');if(table==='certificates'&&existing&&existing.personnel_id!==row.personnel_id)throw Error('ไม่สามารถเปลี่ยนเจ้าของใบรับรอง');if(existing){if(table==='personnel'&&['position','status','academic_rank','department'].some(k=>row[k]!==undefined&&row[k]!==existing[k]))db.status_history.unshift({id:uuid(),personnel_id:row.id,old_data:structuredClone(existing),new_data:row,changed_at:new Date().toISOString()});Object.assign(existing,row);}else {row={...row,id:row.id||uuid()};db[table].push(row);}db.audit_log.unshift({id:uuid(),action:existing?'UPDATE':'INSERT',table_name:table,record_id:row.id||'',created_at:new Date().toISOString(),actor_id:'demo'});persist();return [row];}
export async function bridge(action,payload={}){requireDetails();if(mode==='live'){const r=await request('/functions/v1/hr-bridge',{method:'POST',body:JSON.stringify({action,...payload})});if(r.error)throw Error(r.error);return r;}if(action==='upload'){if(!db.personnel.some(p=>p.id===payload.personnel_id&&!p.deleted_at&&demoCan(p,'documents_write')))throw Error('ไม่มีสิทธิ์หรือบุคลากรถูกลบแล้ว');db.documents.push({id:uuid(),personnel_id:payload.personnel_id,type_id:+payload.type_id,file_name:payload.name,status:'pending',created_at:new Date().toISOString(),demo_data:payload.base64,mime_type:payload.mime});persist();return {ok:true};}if(action==='download'){const d=db.documents.find(x=>x.id===payload.id);if(!d||!db.personnel.some(p=>p.id===d.personnel_id&&!p.deleted_at&&demoCan(p,'view')))throw Error('ไม่มีสิทธิ์หรือบุคลากรถูกลบแล้ว');if(!d.demo_data)throw Error('เอกสารตัวอย่างไม่มีไฟล์จริง กรุณาลองอัปโหลดไฟล์');return {base64:d.demo_data,mime:d.mime_type,name:d.file_name};}if(action==='sync'||action==='backup')throw Error('ต้องเชื่อมต่อระบบจริงก่อนใช้งาน Google Drive / Sheets');throw Error('คำสั่งไม่รองรับ');}
export async function importPeople(rows){
 requireDetails();if(!['admin','school_editor'].includes(role))throw Error('ไม่มีสิทธิ์');
 if(!Array.isArray(rows)||!rows.length||rows.length>500)throw Error('นำเข้าได้ครั้งละ 1–500 คน');
 if(mode==='live')return request('/rest/v1/rpc/import_personnel_bundle',{method:'POST',body:JSON.stringify({records:rows})});
 const codes=new Set(db.personnel.map(p=>p.employee_code)),people=[],certificates=[];
 for(const source of rows){if(role!=='admin'){for(const permission of ['import','create_personnel','personnel_write',...(source.highest_education||source.education_majors?.length?['education_write']:[]),...(source.certificates?.length?['certificates_write']:[])])if(!demoSchool(source.school_id,permission))throw Error('ไม่มีสิทธิ์นำเข้าข้อมูลในสถานศึกษานี้');}if(!db.schools.some(s=>s.id===+source.school_id&&s.is_active!==false))throw Error('สถานศึกษาไม่พร้อมใช้งาน');const {certificates:items=[],...fields}=source;const p={status:'ปฏิบัติงาน',education_majors:[],...fields,id:uuid(),revision:1,deleted_at:null,deleted_by:null,delete_reason:''};validatePerson(p);validateStructure(p,db.schools,db.lookups);
  if(codes.has(p.employee_code))throw Error('เลขที่ตำแหน่งซ้ำ: '+p.employee_code);codes.add(p.employee_code);
  if(!Array.isArray(items)||items.length>100)throw Error('ใบรับรองต้องเป็นรายการไม่เกิน 100 ใบต่อคน');const signatures=new Set();
  for(const c of items){validateCertificate(c);const signature=JSON.stringify([c.kind,c.name.trim(),c.issuer.trim(),c.number||'',c.issued_on||null,c.expires_on||null]);if(signatures.has(signature))throw Error('ใบรับรองซ้ำในไฟล์');signatures.add(signature);certificates.push({...c,id:uuid(),personnel_id:p.id,document_id:null,created_at:new Date().toISOString()});}
  people.push(p);
 }
 if(certificates.length>5000)throw Error('นำเข้าใบรับรองได้ไม่เกิน 5,000 ใบต่อครั้ง');
 // Mutate only after every person and certificate has passed validation.
 db.personnel.push(...people);db.certificates.push(...certificates);for(const p of people)recordChange(null,p,'CREATE','นำเข้าข้อมูลครั้งแรก');db.audit_log.unshift({id:uuid(),action:'IMPORT',table_name:'personnel',record_id:String(people.length),actor_id:'demo',created_at:new Date().toISOString()});persist();return {personnel_count:people.length,certificate_count:certificates.length};
}
export async function addLookup(category,name){requireDetails();if(mode==='live')return request('/rest/v1/lookups',{method:'POST',body:JSON.stringify({category,name})});db.lookups.push({category,name});persist();}
export function clearCache(){if(mode==='demo'){localStorage.removeItem(key);db=seed();}return true;}

function recordChange(before,after,action,reason){
 db.personnel_changes.unshift({id:uuid(),personnel_id:after.id,revision:after.revision,action,old_data:before?historySnapshot(before):{},new_data:historySnapshot(after),reason,actor_id:'demo',actor_role:role,changed_at:new Date().toISOString()});
 db.audit_log.unshift({id:uuid(),action,table_name:'personnel',record_id:after.id,actor_id:'demo',created_at:new Date().toISOString()});
}
export async function saveReviewedPersonnel(row,certificate=null,expectedRevision=null,reason=''){
 requireDetails();const admin=role==='admin',editor=role==='school_editor';
 const allowed=(admin||editor)?['id','employee_code','full_name','school_id','user_id','position','status','department','work_unit','academic_rank','university_rank','administration_field','highest_education','education_majors','birth_date','start_date','retirement_override','email','phone','avatar_data']:['id','email','phone','avatar_data'];
 if(Object.keys(row).some(k=>!allowed.includes(k)))throw Error('มีข้อมูลที่ไม่มีสิทธิ์แก้ไข');
 if(!admin&&!editor&&(!row.id||certificate))throw Error('ไม่มีสิทธิ์');
 if(row.id){requireRevision(expectedRevision);reason=validateChangeReason(reason);}else{if(!admin&&!editor)throw Error('ไม่มีสิทธิ์');reason='เพิ่มบุคลากร';}
 if((admin||editor)&&!row.id)validatePerson(row);if(certificate)validateCertificate(certificate);
 if(mode==='live')return request('/rest/v1/rpc/save_personnel_reviewed',{method:'POST',body:JSON.stringify({personnel_data:row,certificate_data:certificate,expected_revision:expectedRevision,change_reason:reason})});
 const old=row.id?db.personnel.find(p=>p.id===row.id):null;
 if(row.id&&(!old||!demoCan(old,'view')))throw Error('ไม่มีสิทธิ์');
 if(!old&&!db.schools.some(s=>s.id===+row.school_id&&s.is_active!==false))throw Error('สถานศึกษาไม่พร้อมใช้งาน');
 if(!admin){if(row.user_id!==undefined||(old&&row.school_id!==undefined&&+row.school_id!==old.school_id))throw Error('ไม่มีสิทธิ์ย้ายสถานศึกษาหรือผูกบัญชี');if(!old&&!['create_personnel','personnel_write'].every(k=>demoSchool(row.school_id,k)))throw Error('ไม่มีสิทธิ์เพิ่มบุคลากร');for(const k of Object.keys(row)){if(k==='id'||(old&&JSON.stringify(row[k])===JSON.stringify(old[k])))continue;const perm=['highest_education','education_majors'].includes(k)?'education_write':['email','phone','avatar_data'].includes(k)?'contact_write':'personnel_write';if(!old){if(perm==='education_write'&&(row[k]?.length||0)&&!demoSchool(row.school_id,perm))throw Error('ไม่มีสิทธิ์กรอกวุฒิ');}else if(!demoCan(old,perm)&&!(perm==='contact_write'&&demoCan(old,'personnel_write')))throw Error('บุคลากรแก้ไขได้เฉพาะข้อมูลติดต่อและรูปโปรไฟล์');}if(certificate&&!(old?demoCan(old,'certificates_write'):demoSchool(row.school_id,'certificates_write')))throw Error('ไม่มีสิทธิ์จัดการใบรับรอง');}
 if(old?.deleted_at)throw Error('รายการนี้ถูกลบแล้ว กรุณาโหลดรายชื่อใหม่');
 if(old&&old.revision!==expectedRevision)throw Error('ข้อมูลถูกเปลี่ยนแปลงโดยผู้อื่น กรุณาโหลดรายชื่อใหม่แล้วตรวจสอบอีกครั้ง');
 const p={status:'ปฏิบัติงาน',education_majors:[],deleted_at:null,deleted_by:null,delete_reason:'',...old,...row,id:old?.id||uuid(),revision:old?old.revision+1:1,updated_at:new Date().toISOString()};
 validatePerson(p);validateStructure(p,db.schools,db.lookups);if(db.personnel.some(x=>x.id!==p.id&&x.employee_code===p.employee_code))throw Error('เลขที่ตำแหน่งซ้ำ รวมถึงรายการที่ลบแล้ว กรุณาตรวจสอบหรือกู้คืนรายการเดิม');
 const certificateId=certificate?uuid():null;
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
 const p=db.personnel.find(p=>p.id===id&&!p.deleted_at);if(!p||!demoCan(p,'request_delete'))throw Error('ไม่มีสิทธิ์ส่งคำขอสำหรับบุคลากรนี้');if(p.revision!==expectedRevision)throw Error('ข้อมูลถูกเปลี่ยนแปลง กรุณาโหลดรายชื่อใหม่');
 if(db.personnel_requests.some(x=>x.personnel_id===id&&x.status==='pending'))throw Error('มีคำขอรอพิจารณาอยู่แล้ว');
 const requestId=uuid();db.personnel_requests.unshift({id:requestId,personnel_id:id,personnel_revision:p.revision,requested_by:'demo',reason,status:'pending',created_at:new Date().toISOString()});persist();return requestId;
}
export async function reviewRemoval(id,decision,reason){
 requireDetails();if(role!=='admin')throw Error('เฉพาะผู้ดูแลระบบ');reason=validateChangeReason(reason);if(!['approve','reject'].includes(decision))throw Error('คำสั่งไม่ถูกต้อง');
 if(mode==='live')return request('/rest/v1/rpc/review_personnel_removal',{method:'POST',body:JSON.stringify({request_id:id,decision,reason})});
 const r=db.personnel_requests.find(r=>r.id===id&&r.status==='pending');if(!r)throw Error('คำขอนี้ได้รับการพิจารณาแล้วหรือไม่พบข้อมูล');
 if(decision==='approve')await changePersonnelLifecycle(r.personnel_id,r.personnel_revision,'delete',reason);
 Object.assign(r,{status:decision==='approve'?'approved':'rejected',review_reason:reason,reviewed_by:'demo',reviewed_at:new Date().toISOString()});persist();return {ok:true};
}

function demoCan(p,permission){return canPerson(session(),db.school_assignments,db.schools,p,permission);}
function demoSchool(id,permission){return canSchool(session(),db.school_assignments,db.schools,+id,permission);}
function administrationChange(entity,id,action,before,after,reason){db.administration_changes.unshift({id:uuid(),entity,record_id:String(id),action,old_data:before||{},new_data:after||{},reason,actor_id:userId||'demo-admin',created_at:new Date().toISOString()});persist();}
export async function manageSchool(operation,schoolData,expectedRevision=null,reason=''){
 requireDetails();if(role!=='admin')throw Error('เฉพาะผู้ดูแลระบบ');reason=validateChangeReason(reason);
 if(!['create','update','activate','deactivate','delete'].includes(operation))throw Error('คำสั่งไม่ถูกต้อง');
 if(mode==='live')return request('/rest/v1/rpc/manage_school',{method:'POST',body:JSON.stringify({operation,school_data:schoolData,expected_revision:expectedRevision,reason})});
 const existing=db.schools.find(s=>s.id===schoolData.id);if(operation!=='create'&&(!existing||existing.revision!==expectedRevision))throw Error('ข้อมูลสถานศึกษาถูกเปลี่ยนแปลง กรุณาโหลดใหม่');
 if(['create','update'].includes(operation)){if(schoolData.unit_type!==undefined&&!['college','institute'].includes(schoolData.unit_type))throw Error('ประเภทหน่วยงานไม่ถูกต้อง');if(existing&&schoolData.unit_type&&schoolData.unit_type!==unitType(existing)&&db.personnel.some(p=>p.school_id===existing.id))throw Error('มีบุคลากรอ้างอิง ไม่สามารถเปลี่ยนประเภทหน่วยงาน');if(!schoolData.name?.trim()||schoolData.name.length>200||!schoolData.province?.trim()||schoolData.province.length>100)throw Error('กรุณาระบุชื่อและจังหวัด');if(db.schools.some(s=>s.id!==existing?.id&&s.name.trim().toLowerCase()===schoolData.name.trim().toLowerCase()))throw Error('ชื่อสถานศึกษาซ้ำ');}
 if(operation==='delete'&&(db.personnel.some(p=>p.school_id===existing.id)||db.school_assignments.some(a=>a.school_id===existing.id)))throw Error('มีบุคลากรหรือสิทธิ์อ้างอิง กรุณาปิดใช้งานแทนการลบ');
 const before=existing?structuredClone(existing):null;let result;
 if(operation==='create'){result={id:Math.max(0,...db.schools.map(s=>s.id),db.next_school_id||0)+1,name:schoolData.name.trim(),province:schoolData.province.trim(),unit_type:schoolData.unit_type||'college',is_active:true,revision:1};db.next_school_id=result.id;db.schools.push(result);}
 else if(operation==='delete'){db.schools=db.schools.filter(s=>s.id!==existing.id);result={id:existing.id,deleted:true};}
 else {Object.assign(existing,operation==='update'?{name:schoolData.name.trim(),province:schoolData.province.trim(),unit_type:schoolData.unit_type||'college'}:{is_active:operation==='activate'});existing.revision++;result=existing;}
 administrationChange('schools',result.id,operation.toUpperCase(),before,structuredClone(result),reason);return result;
}
export async function manageAssignment(assignmentData,expectedRevision=null,removeAssignment=false,reason=''){
 requireDetails();if(role!=='admin')throw Error('เฉพาะผู้ดูแลระบบ');reason=validateChangeReason(reason);
 if(mode==='live')return request('/rest/v1/rpc/manage_school_assignment',{method:'POST',body:JSON.stringify({assignment_data:assignmentData,expected_revision:expectedRevision,remove_assignment:removeAssignment,reason})});
 const old=db.school_assignments.find(a=>a.user_id===assignmentData.user_id&&a.school_id===assignmentData.school_id);
 if(old?old.revision!==expectedRevision:expectedRevision!==null||removeAssignment)throw Error('สิทธิ์ถูกเปลี่ยนแปลง กรุณาโหลดใหม่');
 const profile=db.profiles.find(p=>p.id===assignmentData.user_id);if(!profile||profile.role==='admin'||!db.personnel.some(p=>p.user_id===profile.id&&!p.deleted_at))throw Error('ต้องเลือกบัญชีบุคลากรที่ผูกทะเบียน');
 if(!removeAssignment){validateAssignment(assignmentData,db.personnel);if(!db.schools.some(s=>s.id===assignmentData.school_id&&s.is_active!==false))throw Error('สถานศึกษาไม่พร้อมใช้งาน');}
 const before=old?structuredClone(old):null;let next=null;
 if(removeAssignment)db.school_assignments=db.school_assignments.filter(a=>a!==old);else{next={...assignmentData,id:old?.id||uuid(),revision:(old?.revision||0)+1,updated_at:new Date().toISOString()};if(old)Object.assign(old,next);else db.school_assignments.push(next);}
 profile.role=db.school_assignments.some(a=>a.user_id===profile.id)?'school_editor':'personnel';profile.account_revision++;
 administrationChange('school_assignments',next?.id||old.id,removeAssignment?'REVOKE':'GRANT',before,next,reason);return {ok:true,role:profile.role,revision:next?.revision};
}
