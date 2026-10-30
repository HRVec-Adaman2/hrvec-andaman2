export const photoTypes=['image/jpeg','image/png','image/webp'];
export function validatePhotoFile(file){
 if(!file||!file.size)throw Error('กรุณาเลือกรูปถ่าย');
 if(file.size>10*1024*1024)throw Error('รูปต้องไม่เกิน 10 MB');
 if(!photoTypes.includes(file.type))throw Error('รองรับ JPEG, PNG, WebP เท่านั้น');
 return file;
}
export function photoSource(value){return typeof value==='string'&&/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value)?value:'';}
