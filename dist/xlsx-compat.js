// Workbook API used by the app, backed by the locally shipped ExcelJS browser build.
// Formula cells are preserved as metadata so the importer can reject them.
import {templateValidations,templateNamedRanges} from './template.js?v=1.12.1';
import {normalizedDate,excelBuddhistFormat} from './dates.js';
const address=(r,c)=>{let letters='';for(let n=c+1;n;n=Math.floor((n-1)/26))letters=String.fromCharCode(65+(n-1)%26)+letters;return letters+(r+1);};
const position=s=>{const m=/^([A-Z]+)([1-9]\d*)$/i.exec(s);if(!m)throw Error('ขอบเขต Excel ไม่ถูกต้อง');let c=0;for(const x of m[1].toUpperCase())c=c*26+x.charCodeAt(0)-64;return {r:+m[2]-1,c:c-1};};
export function normalizeXlsx(data,zip){
 if(!zip)throw Error('ตัวอ่าน Excel ยังไม่พร้อม กรุณาโหลดหน้าใหม่');
 let total=0,count=0,changed=false;
 const files=zip.unzipSync(new Uint8Array(data),{filter(file){total+=file.originalSize;count++;if(total>50*1024*1024||file.originalSize>20*1024*1024||count>1000)throw Error('ข้อมูลภายใน Excel ใหญ่เกินกำหนด');return true;}});
 // ExcelJS expects the main spreadsheet namespace without a prefix. Normalize
 // valid prefixed OOXML produced by earlier templates, preserving r:id and formulas.
 const uri='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
 for(const name of Object.keys(files)){if(!name.endsWith('.xml'))continue;let xml=zip.strFromU8(files[name]);const prefixes=[...xml.matchAll(/xmlns:([A-Za-z_][\w.-]*)=["']http:\/\/schemas\.openxmlformats\.org\/spreadsheetml\/2006\/main["']/g)].map(m=>m[1]);if(!prefixes.length)continue;
  for(const prefix of prefixes){const p=prefix.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');xml=xml.replace(new RegExp('(<\\/?)(?:'+p+'):','g'),'$1').replace(new RegExp('\\s+xmlns:'+p+'=["\\\']'+uri.replaceAll('/','\\/')+'["\\\']','g'),'');}
  if(!xml.includes('xmlns="'+uri+'"')&&!xml.includes("xmlns='"+uri+"'"))xml=xml.replace(/<([A-Za-z_][\w.-]*)(?=[\s/>])/,'<$1 xmlns="'+uri+'"');files[name]=zip.strToU8(xml);changed=true;
 }return changed?zip.zipSync(files,{level:1}):new Uint8Array(data);
}
export function workbookAPI(ExcelJS,saveFile,zip=typeof window!=='undefined'?window.fflate:null){
 const utils={book_new:()=>({SheetNames:[],Sheets:{}}),
  book_append_sheet(wb,sheet,name){wb.SheetNames.push(name);wb.Sheets[name]=sheet;},
  decode_range(ref){const [start,end=start]=ref.split(':');return {s:position(start),e:position(end)};},
  aoa_to_sheet(rows){const sheet={};rows.forEach((row,r)=>row.forEach((v,c)=>{if(v!==undefined&&v!==null)sheet[address(r,c)]={v,t:typeof v==='number'?'n':'s'};}));sheet['!ref']='A1:'+address(Math.max(0,rows.length-1),Math.max(0,...rows.map(r=>r.length-1)));return sheet;},
  sheet_to_json(sheet,{defval='',blankrows=true}={}){const range=utils.decode_range(sheet['!ref']||'A1');const rows=[];for(let r=range.s.r;r<=range.e.r;r++){const row=[];for(let c=range.s.c;c<=range.e.c;c++)row.push(sheet[address(r,c)]?.v??defval);if(blankrows||row.some(v=>v!==''))rows.push(row);}return rows;}
 };
 return {utils,
  async read(data){
   const source=new ExcelJS.Workbook();await source.xlsx.load(normalizeXlsx(data,zip),{ignoreNodes:['tableParts','drawing']});const result=utils.book_new();
   for(const ws of source.worksheets){if(ws.rowCount>10001||ws.columnCount>51)throw Error('ขอบเขตชีต '+ws.name+' ใหญ่เกินไป กรุณาใช้แม่แบบ');const sheet={'!ref':'A1:'+address(Math.max(0,ws.rowCount-1),Math.max(0,ws.columnCount-1))};
    ws.eachRow({includeEmpty:false},(row,r)=>row.eachCell({includeEmpty:false},(cell,c)=>{let v=cell.value;const out={};if(v&&typeof v==='object'){
     if(v instanceof Date)v=new Date(v.getUTCFullYear(),v.getUTCMonth(),v.getUTCDate());
     else if('formula' in v||'sharedFormula' in v){out.f=v.formula||v.sharedFormula;v=v.result??'';}
     else if(v.richText)v=v.richText.map(t=>t.text).join('');else if(v.text!==undefined)v=v.text;else if(v.error)v=v.error;else v=String(v);
    }out.v=v;sheet[address(r-1,c-1)]=out;}));utils.book_append_sheet(result,sheet,ws.name);
   }return result;
  },
  async writeFile(book,name){
   const output=new ExcelJS.Workbook();output.creator='HRVec-Andaman2';
   const isTemplate=Boolean(book.Sheets['รายการอ้างอิง']&&book.Sheets['บุคลากร']),refRows=isTemplate?utils.sheet_to_json(book.Sheets['รายการอ้างอิง']):[],units=refRows.slice(1).filter(r=>typeof r[0]==='number').length;
   for(const name of book.SheetNames)output.addWorksheet(name);
   if(isTemplate){for(const {name,range}of templateNamedRanges(refRows,units))output.definedNames.add(range,name);output.views=[{activeTab:Math.max(0,book.SheetNames.indexOf('บุคลากร')),firstSheet:0}];}
   for(const name of book.SheetNames){const source=book.Sheets[name],ws=output.getWorksheet(name),rows=utils.sheet_to_json(source);ws.addRows(rows);ws.views=[{state:'frozen',ySplit:1,...(isTemplate&&['บุคลากร','ใบรับรองวิชาชีพ'].includes(name)?{activeCell:name==='บุคลากร'?'C2':'B2',topLeftCell:'A2'}:{})}];
    ws.getRow(1).font={name:'Tahoma',bold:true,color:{argb:'FFFFFFFF'},size:11};ws.getRow(1).height=isTemplate?44:30;
    ws.getRow(1).eachCell(cell=>{cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF315B91'}};cell.alignment={vertical:'middle',wrapText:true};});
    if(source['!cols'])ws.columns.forEach((col,i)=>{col.width=source['!cols'][i]?.wch||22;});
    const lastInputRow=isTemplate&&name==='บุคลากร'?501:isTemplate&&name==='ใบรับรองวิชาชีพ'?5001:200;
    for(let i=2;i<=Math.max(ws.rowCount,lastInputRow);i++){const row=ws.getRow(i);if(i<=ws.rowCount){row.font={name:'Tahoma',size:11};row.alignment={vertical:'top',wrapText:true};}if(['บุคลากร','ใบรับรองวิชาชีพ'].includes(name)){for(let c=1;c<=rows[0].length;c++)row.getCell(c).numFmt='@';}}
    if(isTemplate&&['บุคลากร','ใบรับรองวิชาชีพ'].includes(name)){
     for(const rule of templateValidations(name,units))ws.dataValidations.add(rule.range,{type:rule.type,formulae:[rule.formula],allowBlank:true,showErrorMessage:rule.strict||rule.type==='custom',errorStyle:'stop',errorTitle:'ข้อมูลไม่ตรงรูปแบบ',error:rule.type==='custom'?'กรอกวันที่ วว/ดด/ปี พ.ศ. 4 หลัก':'เลือกรายการจากข้อมูลอ้างอิง',showInputMessage:true,promptTitle:rule.label,prompt:rule.type==='custom'?'วว/ดด/ปี พ.ศ. เช่น 29/10/2569':rule.strict?'เลือกจากรายการอ้างอิง':'เลือกจากรายการหรือกรอกข้อความเพิ่มเติม'});
     ws.autoFilter={from:{row:1,column:1},to:{row:1,column:rows[0].length}};
     const choices=name==='บุคลากร'?['C','D','E','G','L','N','O']:['A','B'];
     for(const col of choices){for(let row=2;row<=lastInputRow;row++){const cell=ws.getCell(col+row);cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFEDF4FF'}};cell.font={name:'Tahoma',size:11,color:{argb:'FF24518A'}};}}
     for(const [col,width]of Object.entries(name==='บุคลากร'?{C:48,D:36,E:42,G:28,L:28,N:30,O:34}:{A:24,B:44}))ws.getColumn(col).width=width;
    }
    if(['บุคลากร','ใบรับรองวิชาชีพ','ตัวอย่าง','ตัวอย่างใบรับรอง'].includes(name)){
     const labels=rows[0]||[];for(const label of ['วันเกิด','วันเริ่มงาน','วันที่ออก','วันหมดอายุ']){
      const col=labels.indexOf(label)+1;if(!col)continue;ws.getColumn(col).width=24;ws.getColumn(col).numFmt='@';
      for(let r=2;r<=rows.length;r++){const cell=ws.getCell(r,col);if(cell.value!==''&&cell.value!=null){cell.value=new Date(normalizedDate(cell.value)+'T00:00:00Z');cell.numFmt=excelBuddhistFormat;}}
     }
    }
   }
   const bytes=await output.xlsx.writeBuffer();await saveFile(new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),name);
  }
 };
}
if(typeof window!=='undefined'&&window.ExcelJS)window.XLSX=workbookAPI(window.ExcelJS,(blob,name)=>{const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=name;a.hidden=true;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);});
