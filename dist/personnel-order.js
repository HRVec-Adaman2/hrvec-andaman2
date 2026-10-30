// Display order within each institution; does not change stored positions.
const levels=[
 ['ผู้อำนวยการ','ผู้อำนวยการสถาบัน'],['รองผู้อำนวยการ','รองผู้อำนวยการสถาบัน'],
 ['ผู้ช่วยผู้อำนวยการ','ผู้ช่วยผู้อำนวยการสถาบัน'],['ผู้อำนวยการสำนักงาน','ผู้อำนวยการสำนัก','ผู้อำนวยการศูนย์'],
 ['หัวหน้าภาควิชา','หัวหน้าแผนก','หัวหน้างาน'],['อาจารย์','ศาสตราจารย์','รองศาสตราจารย์','ผู้ช่วยศาสตราจารย์'],
 ['ครู'],['ครูผู้ช่วย'],['พนักงานราชการ'],['พนักงานบริหารงานทั่วไป'],['ลูกจ้างประจำ','ลูกจ้างชั่วคราว','เจ้าหน้าที่']
];
const positions=new Map(levels.flatMap((names,index)=>names.map(name=>[name,index])));
const thai=new Intl.Collator('th',{sensitivity:'variant',numeric:true});
const prefix=/^(?:ผู้ช่วยศาสตราจารย์|รองศาสตราจารย์|ศาสตราจารย์|ว่าที่ร้อยตรี|นางสาว|อาจารย์|นาง|นาย|ดร\.|ผศ\.|รศ\.|ศ\.)\s*/u;
export function nameForSort(value){let name=String(value||'').trim(),next;while((next=name.replace(prefix,''))!==name)name=next.trim();return name;}
export function sortPersonnel(records,schools=[]){
 const order=new Map(schools.map((s,index)=>[String(s.id),index]));
 const schoolOrder=p=>order.get(String(p.school_id))??(Number.isFinite(Number(p.school_id))?Number(p.school_id):9999);
 const position=p=>String(p.position||'').trim();
 const level=p=>positions.get(position(p))??(position(p).startsWith('หัวหน้า')?4:100);
 return [...records].sort((a,b)=>schoolOrder(a)-schoolOrder(b)||level(a)-level(b)||thai.compare(position(a),position(b))||thai.compare(nameForSort(a.full_name),nameForSort(b.full_name))||thai.compare(String(a.employee_code||''),String(b.employee_code||''))||String(a.id||'').localeCompare(String(b.id||'')));
}
