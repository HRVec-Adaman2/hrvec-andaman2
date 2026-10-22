/** HRVec-Andaman2 private Google bridge. No public file URLs or service credentials in frontend. */
function prop_(name) { var v=PropertiesService.getScriptProperties().getProperty(name);if(!v)throw new Error('Missing Script Property: '+name);return v; }
function output_(v){return ContentService.createTextOutput(JSON.stringify(v)).setMimeType(ContentService.MimeType.JSON);}
function doGet(){return output_({service:'HRVec-Andaman2',status:'POST signed requests only'});}
function doPost(e){try{
 if(!e||!e.postData)throw new Error('POST required');
 if(e.postData.contents.length>15000000)throw new Error('Request too large');
 var envelope=JSON.parse(e.postData.contents);if(typeof envelope.text!=='string'||typeof envelope.signature!=='string')throw new Error('Invalid envelope');
 var expected=Utilities.computeHmacSha256Signature(envelope.text,prop_('BRIDGE_SECRET'),Utilities.Charset.UTF_8).map(function(b){return ('0'+(b&255).toString(16)).slice(-2);}).join('');
 var diff=expected.length^envelope.signature.length;for(var i=0;i<expected.length;i++)diff|=expected.charCodeAt(i)^(envelope.signature.charCodeAt(i)||0);if(diff!==0)throw new Error('Invalid signature');
 var message=JSON.parse(envelope.text);if(typeof message.stamp!=='number'||Math.abs(Date.now()-message.stamp)>300000||!/^[0-9a-f-]{36}$/.test(message.nonce))throw new Error('Expired request');
 var lock=LockService.getScriptLock();lock.waitLock(30000);try{var props=PropertiesService.getScriptProperties();var nonceKey='nonce:'+message.nonce;if(props.getProperty(nonceKey))throw new Error('Replayed request');props.setProperty(nonceKey,String(Date.now()));var all=props.getProperties();Object.keys(all).filter(function(k){return k.indexOf('nonce:')===0&&Number(all[k])<Date.now()-600000;}).forEach(function(k){props.deleteProperty(k);});}finally{lock.releaseLock();}
 var payload=JSON.parse(message.payload);var result=execute_(message.action,payload);return output_(Object.assign({ok:true},result));
 }catch(err){console.error(String(err));return output_({ok:false,error:String(err.message||err)});}}
function root_(){return DriveApp.getFolderById(prop_('DRIVE_FOLDER_ID'));}
function checkFile_(id){var f=DriveApp.getFileById(id);var parents=f.getParents(),allowed=false;while(parents.hasNext()){if(parents.next().getId()===prop_('DRIVE_FOLDER_ID'))allowed=true;}if(!allowed)throw new Error('File outside HR folder');return f;}
function execute_(action,p){
 if(action==='upload'){
  if(!['application/pdf','image/jpeg','image/png','image/webp'].includes(p.mime))throw new Error('Unsupported MIME');
  var bytes=Utilities.base64Decode(p.base64);if(!bytes.length||bytes.length>10485760)throw new Error('Invalid file size');
  var f=root_().createFile(Utilities.newBlob(bytes,p.mime,p.name));f.setSharing(DriveApp.Access.PRIVATE,DriveApp.Permission.NONE);f.setDescription('HRVec-Andaman2 personnel '+p.personnel_id);return {file_id:f.getId()};
 }
 if(action==='download'){var file=checkFile_(p.file_id);return {base64:Utilities.base64Encode(file.getBlob().getBytes())};}
 if(action==='discard'){checkFile_(p.file_id).setTrashed(true);return {};}
 if(action==='sync'){sync_(p.snapshot);return {};}
 if(action==='backup')return backup_(p.snapshot,p.generated_at);
 throw new Error('Unsupported action');
}
function safeCell_(value){if(value===null||value===undefined)return '';var s=typeof value==='object'?JSON.stringify(value):String(value);return /^[=+\-@\t\r]/.test(s)?"'"+s:s;}
function sync_(snapshot){var lock=LockService.getScriptLock();lock.waitLock(30000);try{var ss=SpreadsheetApp.openById(prop_('SHEET_ID'));Object.keys(snapshot).forEach(function(name){var rows=snapshot[name];var sheet=ss.getSheetByName(name)||ss.insertSheet(name);sheet.clearContents();if(!rows.length)return;var keys=Object.keys(rows[0]).filter(function(k){return k!=='avatar_data';});var values=[keys].concat(rows.map(function(r){return keys.map(function(k){return safeCell_(r[k]);});}));if(sheet.getMaxRows()<values.length)sheet.insertRowsAfter(sheet.getMaxRows(),values.length-sheet.getMaxRows());if(sheet.getMaxColumns()<keys.length)sheet.insertColumnsAfter(sheet.getMaxColumns(),keys.length-sheet.getMaxColumns());sheet.getRange(1,1,values.length,keys.length).setNumberFormat('@').setValues(values);sheet.setFrozenRows(1);sheet.getRange(1,1,1,keys.length).setFontWeight('bold').setBackground('#d9efed');});}finally{lock.releaseLock();}}
function backup_(snapshot,stamp){var f=root_().createFile(Utilities.newBlob(JSON.stringify({version:1,app_version:'1.8.0',generated_at:stamp,tables:snapshot}), 'application/json','HRVec-Andaman2-backup-'+Utilities.formatDate(new Date(),'Asia/Bangkok','yyyyMMdd-HHmmss')+'.json'));f.setSharing(DriveApp.Access.PRIVATE,DriveApp.Permission.NONE);return {file_id:f.getId()};}
function rest_(path){var res=UrlFetchApp.fetch(prop_('SUPABASE_URL')+'/rest/v1/'+path,{headers:{apikey:prop_('SUPABASE_SERVICE_ROLE_KEY'),Authorization:'Bearer '+prop_('SUPABASE_SERVICE_ROLE_KEY')},muteHttpExceptions:true});if(res.getResponseCode()!==200)throw new Error('Supabase request failed: '+res.getResponseCode());return JSON.parse(res.getContentText());}
function readAll_(table){var rows=[];for(var from=0;;from+=500){var part=rest_(table+'?select=*&order='+(table==='lookups'?'category,name':'id')+'&offset='+from+'&limit=500');rows=rows.concat(part);if(part.length<500)return rows;}}
function dailyMaintenance(){var tables=['schools','personnel','documents','certificates','document_types','lookups','settings','status_history','personnel_changes','personnel_requests','profiles','school_assignments','administration_changes','audit_log'];var snapshot={};tables.forEach(function(t){snapshot[t]=readAll_(t);});backup_(snapshot,new Date().toISOString());sync_(snapshot);var settings=snapshot.settings[0];if(settings&&settings.notifications&&settings.notify_email){var cutoff=new Date();cutoff.setDate(cutoff.getDate()+settings.expiry_days);var end=Utilities.formatDate(cutoff,'Asia/Bangkok','yyyy-MM-dd');var activeIds={};snapshot.personnel.forEach(function(p){if(!p.deleted_at)activeIds[p.id]=true;});var certificates=snapshot.certificates.filter(function(c){return activeIds[c.personnel_id]&&c.expires_on&&c.expires_on<=end;});var pending=snapshot.documents.filter(function(d){return activeIds[d.personnel_id]&&d.status==='pending';});if(certificates.length||pending.length)MailApp.sendEmail(settings.notify_email,'HRVec-Andaman2: สรุปรายการที่ต้องติดตาม','เอกสารรอตรวจสอบ '+pending.length+' รายการ\nใบอนุญาตหมดอายุหรือใกล้หมดอายุ '+certificates.length+' รายการ\nกรุณาเข้าสู่ระบบ HRVec-Andaman2 เพื่อตรวจรายละเอียด');}}
function installDailyTrigger(){ScriptApp.getProjectTriggers().filter(function(t){return t.getHandlerFunction()==='dailyMaintenance';}).forEach(function(t){ScriptApp.deleteTrigger(t);});ScriptApp.newTrigger('dailyMaintenance').timeBased().everyDays(1).atHour(2).create();}
function testConfiguration(){var folder=root_();var sheet=SpreadsheetApp.openById(prop_('SHEET_ID'));rest_('schools?select=id&limit=1');console.log('Configuration OK; Drive and Sheets accessible.');}
