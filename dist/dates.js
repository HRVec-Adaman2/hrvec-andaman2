// Thai Buddhist input and display; database dates remain Gregorian ISO values.
const digits=s=>s.replace(/[๐-๙]/g,c=>String(c.charCodeAt(0)-0x0e50));
function checked(year,month,day){
 if(year>=2400)year-=543;
 const value=new Date(Date.UTC(year,month-1,day));
 if(year<1900||year>2199||value.getUTCFullYear()!==year||value.getUTCMonth()!==month-1||value.getUTCDate()!==day)throw Error('วันที่ไม่ถูกต้อง กรุณาระบุ วว/ดด/ปี พ.ศ. 4 หลัก');
 return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}
export function normalizedDate(value){
 if(value==null||value==='')return null;
 if(value instanceof Date){if(isNaN(value))throw Error('วันที่ไม่ถูกต้อง');const localMidnight=value.getHours()===0&&value.getMinutes()===0&&value.getSeconds()===0;return localMidnight?checked(value.getFullYear(),value.getMonth()+1,value.getDate()):checked(value.getUTCFullYear(),value.getUTCMonth()+1,value.getUTCDate());}
 if(typeof value==='number'){
  if(!Number.isFinite(value)||value<61||value>300000)throw Error('วันที่ Excel ไม่ถูกต้อง');
  const d=new Date(Date.UTC(1899,11,30)+Math.floor(value)*86400000);
  return checked(d.getUTCFullYear(),d.getUTCMonth()+1,d.getUTCDate());
 }
 const s=digits(String(value).trim());let m;
 if((m=/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s)))return checked(+m[3],+m[2],+m[1]);
 if((m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s)))return checked(+m[1],+m[2],+m[3]);
 throw Error('วันที่ต้องเป็น วว/ดด/ปี พ.ศ. 4 หลัก เช่น 29/10/2569');
}
export function buddhistDate(value,empty=''){
 if(!value)return empty;
 const iso=normalizedDate(value),[y,m,d]=iso.split('-');return `${d}/${m}/${+y+543}`;
}
export const excelBuddhistFormat='[$-th-TH]dd/mm/bbbb';
