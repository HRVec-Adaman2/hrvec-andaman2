import {institutePositions} from './structure.js';
export const universityRanks=['อาจารย์','ผู้ช่วยศาสตราจารย์','รองศาสตราจารย์','ศาสตราจารย์'];
export const universityRankLabels={'อาจารย์':'อาจารย์','ผู้ช่วยศาสตราจารย์':'ผู้ช่วยศาสตราจารย์ (ผศ.)','รองศาสตราจารย์':'รองศาสตราจารย์ (รศ.)','ศาสตราจารย์':'ศาสตราจารย์ (ศ.)'};
export const additionalPositions=['อาจารย์','พนักงานบริหารงานทั่วไป'];
export const defaultPositions=['ผู้อำนวยการ','รองผู้อำนวยการ','ครู','ครูผู้ช่วย','พนักงานราชการ','เจ้าหน้าที่',...institutePositions,...additionalPositions];
export const academicRanks=['ไม่มีวิทยฐานะ','ชำนาญการ','ชำนาญการพิเศษ','เชี่ยวชาญ','เชี่ยวชาญพิเศษ'];
export const administrationFields=['บริหารงานบุคคล','การเงินและบัญชี','พัสดุ','แผนงานและงบประมาณ','เทคโนโลยีสารสนเทศ','สารบรรณและธุรการ','ประสานงานและความร่วมมือ'];
export const rankAliases={'ผศ.':'ผู้ช่วยศาสตราจารย์','ผศ':'ผู้ช่วยศาสตราจารย์','รศ.':'รองศาสตราจารย์','รศ':'รองศาสตราจารย์','ศ.':'ศาสตราจารย์','ศ':'ศาสตราจารย์'};
export const normalizeUniversityRank=v=>rankAliases[String(v??'').trim()]||String(v??'').trim();
export function personnelOptions(category,lookups=[]){
 const defaults=({university_rank:universityRanks,administration_field:administrationFields,position:defaultPositions,academic_rank:academicRanks})[category]||[];
 return [...new Set([...lookups.filter(l=>l.category===category).map(l=>l.name),...defaults])];
}
export function validateAdditionalFields(p){
 if(p.university_rank&&!universityRanks.includes(p.university_rank))throw Error('ตำแหน่งทางวิชาการไม่ตรงรายการอ้างอิง');
 if(typeof p.administration_field!=='undefined'&&(typeof p.administration_field!=='string'||p.administration_field.length>200))throw Error('ด้านงานบริหารทั่วไปต้องไม่เกิน 200 ตัวอักษร');
 return p;
}
