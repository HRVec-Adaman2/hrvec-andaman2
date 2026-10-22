// Workbook API used by the app, backed by the locally shipped ExcelJS browser build.
// Formula cells are preserved as metadata so the importer can reject them.
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
   for(const name of book.SheetNames){const source=book.Sheets[name],ws=output.addWorksheet(name),rows=utils.sheet_to_json(source);ws.addRows(rows);ws.views=[{state:'frozen',ySplit:1}];
    ws.getRow(1).font={name:'Tahoma',bold:true,color:{argb:'FFFFFFFF'},size:11};ws.getRow(1).height=30;
    ws.getRow(1).eachCell(cell=>{cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF315B91'}};cell.alignment={vertical:'middle',wrapText:true};});
    if(source['!cols'])ws.columns.forEach((col,i)=>{col.width=source['!cols'][i]?.wch||22;});
    for(let i=2;i<=Math.max(ws.rowCount,200);i++){const row=ws.getRow(i);if(i<=ws.rowCount){row.font={name:'Tahoma',size:11};row.alignment={vertical:'top',wrapText:true};}if(['บุคลากร','ใบรับรองวิชาชีพ'].includes(name)){for(let c=1;c<=rows[0].length;c++)row.getCell(c).numFmt='@';}}
   }
   const bytes=await output.xlsx.writeBuffer();await saveFile(new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),name);
  }
 };
}
if(typeof window!=='undefined'&&window.ExcelJS)window.XLSX=workbookAPI(window.ExcelJS,(blob,name)=>{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);});
