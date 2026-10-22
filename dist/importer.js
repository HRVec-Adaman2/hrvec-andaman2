import {validatePerson,parseCSV,parseEducationMajors} from './core.js';
import {validateCertificate,certKinds} from './overview.js';

// New templates omit employment status. Old files can still include that column.
export const fields=[['employee_code','เลขที่ตำแหน่ง'],['full_name','ชื่อ-นามสกุล'],['school_id','สถานศึกษา'],['position','ตำแหน่ง'],['department','ฝ่าย'],['academic_rank','วิทยฐานะ'],['birth_date','วันเกิด'],['start_date','วันเริ่มงาน'],['email','อีเมล'],['phone','โทรศัพท์'],['address','ที่อยู่'],['highest_education','วุฒิการศึกษาสูงสุด'],['education_majors','สาขาวิชา']];
export const certificateFields=[['employee_code','เลขที่ตำแหน่ง'],['kind','ประเภทใบรับรอง'],['name','ชื่อใบรับรองวิชาชีพ'],['issuer','หน่วยงานผู้ออก'],['number','เลขที่ใบรับรอง'],['issued_on','วันที่ออก'],['expires_on','วันหมดอายุ']];
const trim=v=>String(v??'').trim();
const legacyFields=[...fields,['status','สถานะ']];
export function normalizedDate(value){
 if(value==null||value==='')return null;
 if(value instanceof Date){if(isNaN(value))throw Error('วันที่ไม่ถูกต้อง');return `${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,'0')}-${String(value.getDate()).padStart(2,'0')}`;}
 if(typeof value==='number'){if(!Number.isFinite(value)||value<61||value>100000)throw Error('วันที่ Excel ไม่ถูกต้อง');return new Date(Date.UTC(1899,11,30)+Math.floor(value)*86400000).toISOString().slice(0,10);}
 const str=trim(value);if(!/^\d{4}-\d{2}-\d{2}$/.test(str))throw Error('วันที่ต้องเป็นวันที่ Excel หรือ YYYY-MM-DD ค.ศ.');return str;
}
function headersFor(matrix,definitions,required){
 const aliases=new Map(definitions.flatMap(([k,t])=>[[k,k],[t,k]]));
 for(const [a,k] of [['รหัสบุคลากร','employee_code'],['ชื่อ–นามสกุล','full_name'],['รหัสสถานศึกษา','school_id'],['วันบรรจุ','start_date'],['สาขาวิชาของวุฒิสูงสุด','education_majors'],['จากหน่วยงาน / ผู้ออกใบรับรอง','issuer']])aliases.set(a,k);
 const headers=(matrix[0]||[]).map(v=>aliases.get(trim(v))||trim(v));while(headers.length&&!headers.at(-1))headers.pop();
 const errors=[];const unknown=headers.filter(h=>!definitions.some(f=>f[0]===h));
 if(unknown.length)errors.push('หัวคอลัมน์ไม่รองรับ: '+unknown.join(', '));
 if(new Set(headers).size!==headers.length)errors.push('มีหัวคอลัมน์ซ้ำ');
 for(const k of required)if(!headers.includes(k))errors.push('ขาดคอลัมน์ '+definitions.find(f=>f[0]===k)[1]);
 return {headers,errors};
}
function rowObject(row,headers){if(row.slice(headers.length).some(v=>trim(v)!==''))throw Error('มีข้อมูลเกินจำนวนหัวคอลัมน์');return Object.fromEntries(headers.map((k,j)=>[k,row[j]??'']));}
export function validateImport(matrix,existing,schools,lookups=[]){
 const records=[],preview=[];if(!matrix.length)return {errors:['ไฟล์ไม่มีข้อมูล'],records,preview};
 const {headers,errors}=headersFor(matrix,legacyFields,['employee_code','full_name','school_id']);
 const nonblank=matrix.slice(1).filter(r=>r.some(v=>trim(v)!==''));if(nonblank.length>500)errors.push('นำเข้าได้สูงสุด 500 คนต่อครั้ง');
 if(errors.length)return {errors,records,preview};const codes=new Set(existing.map(p=>trim(p.employee_code)));
 matrix.slice(1).forEach((row,i)=>{if(!row.some(v=>trim(v)!==''))return;try{
  const p=rowObject(row,headers);for(const k of ['birth_date','start_date'])p[k]=normalizedDate(p[k]);
  for(const k of headers.filter(k=>!['birth_date','start_date','school_id','education_majors'].includes(k)))p[k]=trim(p[k]);
  p.education_majors=parseEducationMajors(p.education_majors);
  const school=schools.find(s=>String(s.id)===trim(p.school_id)||s.name===trim(p.school_id));if(!school)throw Error('ไม่พบสถานศึกษาในระบบ');if(school.is_active===false)throw Error('สถานศึกษาปิดใช้งานแล้ว');p.school_id=school.id;
  for(const k of ['position','status','department','academic_rank','email','phone','address','highest_education'])p[k]??='';p.position||='ครู';p.status||='ปฏิบัติงาน';
  validatePerson(p);if(p.employee_code.length>50||p.full_name.length>200)throw Error('เลขที่ตำแหน่งหรือชื่อยาวเกินกำหนด');
  if(codes.has(p.employee_code))throw Error('เลขที่ตำแหน่งซ้ำในไฟล์หรือระบบ: '+p.employee_code);codes.add(p.employee_code);
  if(p.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email))throw Error('อีเมลไม่ถูกต้อง');
  for(const k of ['position','status','department','academic_rank'])if(p[k]&&lookups.length&&!lookups.some(l=>l.category===k&&l.name===p[k]))throw Error(legacyFields.find(f=>f[0]===k)[1]+'ไม่ตรงรายการที่ตั้งไว้: '+p[k]);
  records.push(p);preview.push({row:i+2,person:p});
 }catch(e){errors.push('แถว '+(i+2)+': '+e.message);}});
 if(!nonblank.length)errors.push('ยังไม่มีรายชื่อ กรุณากรอกชีต บุคลากร ตั้งแต่แถว 2');return {errors,records,preview};
}
export function validateWorkbookImport(file,existing,schools,lookups=[]){
 const result=validateImport(file.matrix,existing,schools,lookups);
 result.errors=result.errors.map(e=>'บุคลากร: '+e);result.certificatePreview=[];result.certificateCount=0;
 const byCode=new Map(result.records.map(p=>[p.employee_code,p]));for(const p of result.records)p.certificates=[];
 const matrix=file.certificateMatrix||[];if(!matrix.length)return result;
 const {headers,errors}=headersFor(matrix,certificateFields,['employee_code','kind','name','issuer']);
 result.errors.push(...errors.map(e=>'ใบรับรองวิชาชีพ: '+e));if(errors.length)return result;
 if(matrix.slice(1).filter(r=>r.some(v=>trim(v)!=='')).length>5000){result.errors.push('ใบรับรองวิชาชีพ: นำเข้าได้สูงสุด 5,000 ใบต่อครั้ง');return result;}
 const signatures=new Set();
 matrix.slice(1).forEach((row,i)=>{if(!row.some(v=>trim(v)!==''))return;try{
  const item=rowObject(row,headers),code=trim(item.employee_code);const p=byCode.get(code);
  if(!p)throw Error('ไม่พบเลขที่ตำแหน่ง '+(code||'(ว่าง)')+' ในชีต บุคลากร ที่ผ่านการตรวจ');
  const c={kind:trim(item.kind),name:trim(item.name),issuer:trim(item.issuer),number:trim(item.number),issued_on:normalizedDate(item.issued_on),expires_on:normalizedDate(item.expires_on)};
  c.kind=Object.keys(certKinds).find(k=>k===c.kind||certKinds[k]===c.kind)||c.kind;validateCertificate(c);
  const signature=JSON.stringify([code,...Object.keys(c).sort().map(k=>c[k])]);if(signatures.has(signature))throw Error('ใบรับรองซ้ำในไฟล์');
  if(p.certificates.length>=100)throw Error('บุคลากรหนึ่งคนมีใบรับรองได้ไม่เกิน 100 ใบต่อครั้ง');signatures.add(signature);p.certificates.push(c);
  result.certificateCount++;result.certificatePreview.push({row:i+2,employee_code:code,full_name:p.full_name,certificate:c});
 }catch(e){result.errors.push('ใบรับรองวิชาชีพ แถว '+(i+2)+': '+e.message);}});return result;
}
export async function readImportFile(file,xlsx){
 if(!file?.size||file.size>5*1024*1024)throw Error('เลือกไฟล์ขนาดไม่เกิน 5 MB');
 if(/\.csv$/i.test(file.name))return {matrix:parseCSV(await file.text()),certificateMatrix:[],sheetName:'CSV'};
 if(!/\.xlsx$/i.test(file.name))throw Error('รองรับ .xlsx และ .csv');if(!xlsx)throw Error('ตัวอ่าน Excel ยังไม่พร้อม กรุณาลองใหม่หรือใช้ CSV');
 const wb=await xlsx.read(await file.arrayBuffer(),{type:'array',cellDates:true,cellFormula:true});
 const sheetName=wb.SheetNames.includes('บุคลากร')?'บุคลากร':wb.SheetNames[0];
 if(['ตัวอย่าง','ตัวอย่างใบรับรอง','ใบรับรองวิชาชีพ','รายการอ้างอิง','คำแนะนำ'].includes(sheetName))throw Error('โปรดใช้ชีตชื่อ บุคลากร สำหรับข้อมูลที่ต้องการนำเข้า');
 const read=name=>{const sheet=wb.Sheets[name];const range=xlsx.utils.decode_range(sheet['!ref']||'A1');if(range.e.r>10000||range.e.c>50)throw Error('ขอบเขตชีต '+name+' ใหญ่เกินไป กรุณาใช้แม่แบบ');
  for(const [address,cell]of Object.entries(sheet))if(!address.startsWith('!')&&cell?.f)throw Error('พบสูตรใน '+name+'!'+address+' กรุณาวางเป็นค่า (Paste Values) ก่อนนำเข้า');
  return xlsx.utils.sheet_to_json(sheet,{header:1,raw:true,defval:'',blankrows:true});};
 return {matrix:read(sheetName),certificateMatrix:wb.SheetNames.includes('ใบรับรองวิชาชีพ')?read('ใบรับรองวิชาชีพ'):[],sheetName};
}
