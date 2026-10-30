import {fields,certificateFields} from './importer.js';
import {certKinds,educationLevels} from './overview.js';
import {departmentsFor,unitType} from './structure.js';
import {personnelOptions,universityRanks} from './personnel-options.js?v=1.12.1';
export const templateVersion='1.12.1';
export const columnName=index=>{let result='';for(let n=index+1;n;n=Math.floor((n-1)/26))result=String.fromCharCode(65+(n-1)%26)+result;return result;};
const dates=new Set(['birth_date','start_date','issued_on','expires_on']);
const unique=values=>[...new Set(values.flat().map(v=>String(v??'').trim()).filter(Boolean))];
export const referenceColumns=[...fields.filter(([k])=>!dates.has(k)),...certificateFields.filter(([k])=>!dates.has(k)&&k!=='employee_code'),['college_department','ฝ่ายสถานศึกษา'],['institute_department','ส่วนราชการสถาบัน']].map(([key,label],i)=>({key,label,column:columnName(i+7)}));
export function referenceLists(schools,lookups=[],people=[],certificates=[]){
 const list=Object.fromEntries(referenceColumns.map(({key})=>[key,[]]));
 for(const [key] of fields)if(list[key])list[key]=unique(people.map(p=>key==='school_id'?schools.find(s=>s.id===+p.school_id)?.name||p.school_id:p[key]));
 for(const [key]of certificateFields)if(list[key]&&key!=='employee_code')list[key]=unique(certificates.map(c=>c[key]));
 list.school_id=schools.filter(s=>s.is_active!==false).map(s=>s.name);
 list.position=unique([...personnelOptions('position',lookups),...list.position]);
 list.college_department=departmentsFor({unit_type:'college'},lookups);list.institute_department=departmentsFor({unit_type:'institute'},lookups);
 list.department=unique([...list.college_department,...list.institute_department]);
 list.academic_rank=unique([...personnelOptions('academic_rank',lookups),...list.academic_rank]);
 list.highest_education=unique([...educationLevels,...list.highest_education]);
 list.education_majors=unique(list.education_majors.flatMap(v=>v.split(';')));
 list.university_rank=universityRanks;
 list.administration_field=unique([...personnelOptions('administration_field',lookups),...list.administration_field]);
 list.kind=Object.values(certKinds);
 return list;
}
export function templateSheets(schools,lookups=[],options={}){
 const available=schools.filter(s=>s.is_active!==false),college=available.find(s=>unitType(s)==='college'),hq=available.find(s=>unitType(s)==='institute');
 const example=(code,s,position,department)=>({employee_code:code,full_name:'บุคลากร ตัวอย่าง',school_id:s?.name||'',position,department,work_unit:'',academic_rank:'ไม่มีวิทยฐานะ',birth_date:'15/05/2528',start_date:'01/05/2553',email:'example@example.org',phone:'0812345678',highest_education:'ปริญญาโท',education_majors:'การบริหารการศึกษา; เทคโนโลยีการศึกษา',university_rank:position==='อาจารย์'?'ผู้ช่วยศาสตราจารย์':'',administration_field:position==='พนักงานบริหารงานทั่วไป'?'บริหารงานบุคคล':''});
 const examples=[...(college?[example('EXAMPLE001',college,'อาจารย์',departmentsFor(college,lookups)[3])]:[]),...(hq?[example('EXAMPLE002',hq,'พนักงานบริหารงานทั่วไป',departmentsFor(hq,lookups)[0])]:[])];
 const ref=[['รหัสหน่วยงาน','หน่วยงาน/สถานศึกษา','จังหวัด','ประเภทหน่วยงาน'],...available.map(s=>[s.id,s.name,s.province,unitType(s)==='institute'?'ส่วนกลางสถาบัน':'สถานศึกษา']),[],['ประเภทหน่วยงาน','ฝ่าย/ส่วนราชการ'],...['college','institute'].flatMap(type=>departmentsFor({unit_type:type},lookups).map(d=>[type==='college'?'สถานศึกษา':'ส่วนกลางสถาบัน',d])),[],['ประเภทใบรับรอง','ใช้สำหรับ'],...Object.entries(certKinds).map(([k,label])=>[label,{administrator:'ผู้บริหารสถานศึกษา',vocational:'ทักษะวิชาชีพเพิ่มเติม',competency:'สมรรถนะตามมาตรฐานอาชีพ',teacher_license:'ใบอนุญาตประกอบวิชาชีพครู'}[k]]),[],['หมวด','รายการ'],...lookups.filter(l=>['position','academic_rank'].includes(l.category)).map(l=>[l.category==='position'?'ตำแหน่ง':'วิทยฐานะ',l.name])];
 const lists=referenceLists(available,lookups,options.personnel||[],options.certificates||[]);
 for(const {key,label,column}of referenceColumns){const col=column.split('').reduce((a,c)=>a*26+c.charCodeAt(0)-64,0)-1;const values=[label,...lists[key]];values.forEach((v,row)=>{ref[row]??=[];ref[row][col]=v;});}
 return [
  ['บุคลากร',[fields.map(f=>f[1])]],['ใบรับรองวิชาชีพ',[certificateFields.map(f=>f[1])]],
  ['คำแนะนำ',[
   ['รายการ','คำชี้แจง'],['รุ่นแม่แบบ','HRVec-Andaman2 รุ่น 1.12.1 รายการเลือกตรงกับฟอร์ม'],
   ['รายชื่อ','กรอกชีต บุคลากร หนึ่งคนต่อแถว เริ่มแถว 2 คงชื่อชีตและหัวคอลัมน์'],
   ['ข้อมูลจำเป็น','เลขที่ตำแหน่ง ชื่อ-นามสกุล และหน่วยงาน/สถานศึกษา'],
   ['วันที่','กรอก วว/ดด/ปี พ.ศ. 4 หลัก เช่น 29/10/2569 ช่องว่างเตรียมเป็นข้อความเพื่อรักษาปีที่พิมพ์ วันที่เดิมแสดง พ.ศ. โดยเก็บวันที่ Excel'],
   ['แก้วันที่เดิม','หาก Excel แปลงปีผิด ให้เริ่มด้วยเครื่องหมาย apostrophe เช่น \'29/10/2569 เครื่องหมายนี้ไม่เป็นส่วนหนึ่งของข้อมูล'],
   ['ตำแหน่งทางวิชาการ','เลือก อาจารย์ ผู้ช่วยศาสตราจารย์ รองศาสตราจารย์ หรือศาสตราจารย์ แยกจากวิทยฐานะ'],
   ['พนักงานบริหารงานทั่วไป','เลือกชื่อตำแหน่ง แล้วเลือกหรือกรอก ด้านงานบริหารทั่วไป ตามหน้าที่ที่ได้รับมอบหมาย'],
   ['รายการเลือก','เปิดชีต บุคลากร เลือก C2 แล้วกดลูกศรด้านขวาหรือ Alt + ลูกศรลง ช่องสีฟ้ามีรายการเลือก หน่วยงาน ตำแหน่ง ฝ่าย วิทยฐานะ วุฒิ ตำแหน่งทางวิชาการ และด้านงานตรงกับฟอร์ม'],
   ['ใบรับรอง','เปิดชีต ใบรับรองวิชาชีพ เลือก B2 เพื่อเลือกประเภทใบรับรอง ช่อง A เลือกเลขที่ตำแหน่งหลังกรอกชีต บุคลากร แล้ว'],
   ['รายการล่าสุด','เมื่อแอดมินเพิ่มรายการในระบบ ให้ดาวน์โหลดแม่แบบจากเว็บใหม่ ไฟล์ Excel ที่บันทึกไว้แล้วไม่เปลี่ยนตามระบบอัตโนมัติ'],
   ['ฝ่าย','ฝ่ายและส่วนราชการต้องตรงกับหน่วยงาน ผู้อำนวยการเว้นว่างได้'],
   ['หลายสาขาวิชา','สาขาของวุฒิสูงสุดหลายสาขาคั่นด้วย ; เช่น การบริหารการศึกษา; เทคโนโลยีการศึกษา'],
   ['หลายใบรับรอง','หนึ่งใบต่อหนึ่งแถวในชีต ใบรับรองวิชาชีพ เลือกเลขที่ตำแหน่งจากชีต บุคลากร ไม่เพิ่มคอลัมน์'],
   ['ข้อมูลใบรับรอง','ต้องมีเลขที่ตำแหน่ง ประเภท ชื่อใบรับรอง และหน่วยงานผู้ออก ข้อมูลอื่นเว้นว่างเมื่อไม่มีหลักฐาน'],
   ['เลขศูนย์นำหน้า','เลขที่ตำแหน่ง โทรศัพท์ และเลขที่ใบรับรองเป็นข้อความ ห้ามแปลงเป็นตัวเลข'],
   ['ข้อจำกัด','500 คน / 5,000 ใบ / 100 ใบต่อคน / ไฟล์ไม่เกิน 5 MB ไม่มีสูตรในสองชีตนำเข้า'],
   ['การนำเข้า','ใช้เพิ่มรายชื่อใหม่ ไม่แทนข้อมูลเดิม ระบบตรวจทั้งหมดก่อนยืนยัน ไม่สร้างบัญชีผู้ใช้จาก Excel'],
   ['ชีตตัวอย่าง','ใช้ดูตัวอย่างเท่านั้น ระบบไม่นำเข้าสองชีตตัวอย่างและรายการอ้างอิง'],
   ['โครงสร้างสถานศึกษา','https://dles.vec.go.th/blog/47'],['โครงสร้างสถาบัน','https://veis2.ac.th/government_structure/']]],
  ['รายการอ้างอิง',ref],
  ['ตัวอย่าง',[fields.map(f=>f[1]),...examples.map(p=>fields.map(([k])=>p[k]??''))]],
  ['ตัวอย่างใบรับรอง',[certificateFields.map(f=>f[1]),...['01','02'].map((suffix,i)=>[examples[0]?.employee_code||'EXAMPLE001',certKinds.competency,'คุณวุฒิวิชาชีพตัวอย่าง '+suffix,'หน่วยงานตัวอย่าง','CERT-'+suffix,'01/01/2568',i?'':'01/01/2571','เทคโนโลยีสารสนเทศ','ระดับ 4','มาตรฐานอาชีพตัวอย่าง'])]]
 ];
}
export const templateRangeName=key=>'HRV_'+key;
export function templateNamedRanges(referenceRows,unitCount=8){
 const names=referenceColumns.map(({key,column})=>{
  const index=column.split('').reduce((a,c)=>a*26+c.charCodeAt(0)-64,0)-1;
  let end=2;for(let row=1;row<Math.min(referenceRows.length,1001);row++)if(referenceRows[row]?.[index]!==''&&referenceRows[row]?.[index]!=null)end=row+1;
  return {name:templateRangeName(key),range:`'รายการอ้างอิง'!$${column}$2:$${column}$${end}`};
 });
 return [...names,{name:'HRV_Units',range:`'รายการอ้างอิง'!$B$2:$D$${Math.max(2,unitCount+1)}`},{name:'HRV_PersonnelCodes',range:"'บุคลากร'!$A$2:$A$501"}];
}
export function templateValidations(name,unitCount=8){
 const definitions=name==='บุคลากร'?fields:name==='ใบรับรองวิชาชีพ'?certificateFields:[];
 return definitions.map(([key,label],i)=>{
  const col=columnName(i),end=name==='บุคลากร'?501:5001,range=`${col}2:${col}${end}`;
  if(dates.has(key))return {key,label,range,type:'custom',formula:`OR(${col}2="",ISNUMBER(${col}2),AND(ISTEXT(${col}2),LEN(${col}2)>=8,LEN(${col}2)<=10))`};
  if(name==='ใบรับรองวิชาชีพ'&&key==='employee_code')return {key,label,range,type:'list',formula:'HRV_PersonnelCodes',strict:true};
  if(key==='department'){
   return {key,label,range,type:'list',formula:'INDIRECT(IF(IFERROR(VLOOKUP($C2,HRV_Units,3,0),"")="ส่วนกลางสถาบัน","HRV_institute_department","HRV_college_department"))',strict:true};
  }
  return {key,label,range,type:'list',formula:templateRangeName(key),strict:['school_id','position','academic_rank','university_rank','kind'].includes(key)};
 });
}
