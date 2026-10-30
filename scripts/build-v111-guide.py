"""Create an offline Thai installation guide and source viewer; includes no live data."""
from pathlib import Path
import html,json,re,shutil
root=Path(__file__).resolve().parents[1]
output=Path('/workspace/scratch/ed13a3c698ab/outputs/hrvec-v111-20261030')
output.mkdir(parents=True,exist_ok=True)
def inline(s):
 s=html.escape(s)
 s=re.sub(r'`([^`]+)`',r'<code>\1</code>',s)
 s=re.sub(r'\*\*([^*]+)\*\*',r'<strong>\1</strong>',s)
 s=re.sub(r'(https://[^\s<]+)',r'<a href="\1" target="_blank" rel="noopener">\1</a>',s)
 return s
lines=(root/'docs/INSTALL-v1.11-TH.md').read_text().splitlines();blocks=[];i=0
while i<len(lines):
 line=lines[i]
 if not line.strip():i+=1;continue
 if line.startswith('```'):
  code=[];i+=1
  while i<len(lines) and not lines[i].startswith('```'):code.append(lines[i]);i+=1
  blocks.append('<div class="codeblock"><button class="copy-block">คัดลอก</button><pre><code>'+html.escape('\n'.join(code))+'</code></pre></div>')
 elif line.startswith('#'):
  level=len(line)-len(line.lstrip('#'));blocks.append(f'<h{level}>'+inline(line[level:].strip())+f'</h{level}>')
 elif line.startswith('|'):
  rows=[]
  while i<len(lines) and lines[i].startswith('|'):
   cells=[c.strip() for c in lines[i].strip().strip('|').split('|')]
   if not all(re.fullmatch(r':?-+:?',c) for c in cells):rows.append(cells)
   i+=1
  blocks.append('<div class="scroll"><table><thead><tr>'+''.join('<th>'+inline(c)+'</th>' for c in rows[0])+'</tr></thead><tbody>'+''.join('<tr>'+''.join('<td>'+inline(c)+'</td>' for c in row)+'</tr>' for row in rows[1:])+'</tbody></table></div>');continue
 elif re.match(r'^(\d+\. |- )',line):
  ordered=bool(re.match(r'^\d+\. ',line));pat=r'^\d+\. ' if ordered else r'^- ';tag='ol' if ordered else 'ul';items=[]
  while i<len(lines) and re.match(pat,lines[i]):items.append('<li>'+inline(re.sub(pat,'',lines[i]))+'</li>');i+=1
  blocks.append(f'<{tag}>'+''.join(items)+f'</{tag}>');continue
 else:blocks.append('<p>'+inline(line)+'</p>')
 i+=1
paths=[root/'README.md',root/'package.json',root/'.github/workflows/pages.yml',root/'.env.example',root/'supabase/config.toml',root/'supabase/schema.sql',root/'supabase/upgrade-v1.11.sql',root/'scripts/bootstrap-admin.mjs',root/'scripts/bootstrap.env.example']
paths+=sorted((root/'dist').glob('*.js'))+[root/'dist/index.html',root/'dist/style.css',root/'dist/theme.css']
paths+=sorted((root/'supabase/functions').rglob('*.ts'))+sorted((root/'supabase/functions').rglob('*.js'))
paths+=sorted((root/'apps-script').glob('*'))+[root/'tests/photos.test.mjs',root/'tests/personnel-order.test.mjs',root/'tests/privacy-flow.test.mjs',root/'tests/v111-db.mjs']
files=[]
for p in paths:
 if not p.is_file():continue
 name=str(p.relative_to(root));program='VS Code → GitHub Pages'
 if name.startswith('supabase/') and p.suffix=='.sql':program='Supabase Dashboard → SQL Editor'
 elif name.startswith('supabase/'):program='VS Code → Supabase CLI'
 elif name.startswith('apps-script/'):program='Google Apps Script'
 elif name.startswith('scripts/') or name.startswith('tests/'):program='VS Code → Terminal'
 elif name.startswith('.github/'):program='GitHub → Actions'
 files.append({'name':name,'program':program,'code':p.read_text()})
payload=json.dumps(files,ensure_ascii=False).replace('<','\\u003c')
css='''body{margin:0;background:#f0f5fc;color:#213754;font:16px Tahoma,Arial,sans-serif;line-height:1.85}header{background:#234c80;color:white;padding:25px max(24px,calc((100vw - 1180px)/2))}header strong{font-size:25px}header p{margin:6px 0}.nav{position:sticky;top:0;z-index:2;padding:12px 20px;background:#e7effb;display:flex;gap:12px;border-bottom:1px solid #c6d9f1}button{font:inherit;border:1px solid #b2c9e6;border-radius:8px;background:white;color:#224c80;cursor:pointer;padding:8px 15px}.nav button.active{background:#315b91;color:white}main{max-width:1180px;margin:24px auto;padding:0 24px 40px}article{background:white;padding:30px;border-radius:14px;border:1px solid #d8e4f5}h1{font-size:28px;line-height:1.5;color:#234c80}h2{font-size:22px;color:#234c80;margin-top:36px;scroll-margin-top:90px}h3{font-size:19px}p,li{overflow-wrap:anywhere}li{margin:8px 0}a{color:#245bac}table{border-collapse:collapse;width:100%;font-size:15px}th{background:#315b91;color:white;text-align:left}td,th{padding:12px 15px;border-bottom:1px solid #e0e8f3;vertical-align:top}tbody tr:nth-child(even){background:#f6f9ff}.scroll{overflow:auto;margin:20px 0}pre{background:#f0f5ff;overflow:auto;padding:20px;border-radius:10px;line-height:1.7;white-space:pre;font:14px/1.8 Consolas,monospace}code{font-family:Consolas,monospace}.codeblock{position:relative}.copy-block{position:absolute;right:8px;top:8px;font-size:12px;padding:3px 8px}.sourcegrid{display:grid;grid-template-columns:300px minmax(0,1fr);gap:20px}.sourcepanel{background:white;padding:18px;border-radius:12px}.sourcepanel input{width:100%;box-sizing:border-box;padding:10px;border:1px solid #cbd9eb;border-radius:8px;font:inherit}.filelist{max-height:70vh;overflow:auto;margin-top:12px}.filelist button{display:block;border:0;text-align:left;width:100%;font:13px/1.6 Consolas,monospace;overflow-wrap:anywhere;padding:10px 7px}.filelist button.selected{background:#e7effb}.filename{font:18px Consolas,monospace;overflow-wrap:anywhere}.status{min-height:24px;color:#245a37}#source[hidden],#guide[hidden]{display:none}.sourcehead{display:flex;justify-content:space-between;gap:16px;align-items:start}#sourcecode{max-height:75vh;overflow:auto}@media(max-width:750px){main{padding:0 12px 24px;margin-top:12px}article{padding:18px}.sourcegrid{grid-template-columns:1fr}.filelist{max-height:220px}h1{font-size:23px}h2{font-size:20px}table{min-width:620px}header{padding:20px}.sourcehead{display:block}}@media print{header,.nav,.copy-block,#source{display:none!important}body{background:white;font-size:12px}main{margin:0;padding:0}article{border:0;padding:0}h2{break-after:avoid}pre,tr{break-inside:avoid}table{font-size:11px}a{color:inherit}pre{white-space:pre-wrap}}'''
script='''const files=JSON.parse(document.getElementById('files').textContent);let chosen=files[0];const $=id=>document.getElementById(id);function tab(id){$('guide').hidden=id!=='guide';$('source').hidden=id!=='source';document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===id));}async function copy(text){try{await navigator.clipboard.writeText(text);}catch{const t=document.createElement('textarea');t.value=text;document.body.append(t);t.select();if(!document.execCommand('copy'))throw Error('copy');t.remove();}}function select(file){chosen=file;$('filename').textContent=file.name;$('program').textContent=file.program;$('sourcecode').textContent=file.code;list();}function list(){const q=$('search').value.toLowerCase();$('filelist').replaceChildren();for(const f of files.filter(f=>f.name.toLowerCase().includes(q))){const b=document.createElement('button');b.textContent=f.name;b.classList.toggle('selected',f===chosen);b.onclick=()=>select(f);$('filelist').append(b);}}document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>tab(b.dataset.tab));document.querySelectorAll('.copy-block').forEach(b=>b.onclick=async()=>{try{await copy(b.parentNode.querySelector('code').textContent);b.textContent='คัดลอกแล้ว';}catch{b.textContent='เลือกข้อความแล้วกด Ctrl+C';}});$('copyfile').onclick=async()=>{try{await copy(chosen.code);$('status').textContent='คัดลอกโค้ดทั้งไฟล์แล้ว';}catch{$('status').textContent='เลือกข้อความโค้ดแล้วกด Ctrl+C';}};$('search').oninput=list;select(chosen);'''
page='<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>HRVec-Andaman2 1.11 คู่มือติดตั้งและโค้ด</title><style>'+css+'</style></head><body><header><strong>HRVec-Andaman2 1.11</strong><p>คู่มือติดตั้งและโค้ดหน้า–หลังบ้าน · 30 ตุลาคม 2569</p></header><nav class="nav"><button data-tab="guide" class="active">ขั้นตอนนำไปใช้จริง</button><button data-tab="source">ดูและคัดลอกโค้ด</button><button onclick="window.print()">พิมพ์คู่มือ / บันทึก PDF</button></nav><main><section id="guide"><article>'+''.join(blocks)+'</article></section><section id="source" hidden><div class="sourcegrid"><aside class="sourcepanel"><input id="search" placeholder="ค้นหาชื่อไฟล์" aria-label="ค้นหาชื่อไฟล์"><div id="filelist" class="filelist"></div></aside><article><div class="sourcehead"><div><h2 id="filename" class="filename"></h2><p id="program"></p></div><button id="copyfile">คัดลอกโค้ดทั้งไฟล์</button></div><p id="status" class="status" role="status"></p><pre id="sourcecode"></pre></article></div></section></main><script type="application/json" id="files">'+payload+'</script><script>'+script+'</script></body></html>'
name='HRVec-Andaman2-v1.11-Guide-and-Code.html'
(root/'docs'/name).write_text(page)
(output/name).write_text(page)
print(json.dumps({'guide':name,'sourceFiles':len(files),'bytes':len(page.encode())}))
