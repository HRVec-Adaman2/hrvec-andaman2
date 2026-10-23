"""Build the standalone Thai upgrade guide from the tracked Markdown source."""
from pathlib import Path
import html,re,shutil
root=Path(__file__).resolve().parents[1]
lines=(root/'docs/UPGRADE-v1.9-TH.md').read_text().splitlines()
def inline(s):
 s=html.escape(s)
 s=re.sub(r'!\[([^]]*)\]\(([^)]+)\)',r'<img alt="\1" src="\2">',s)
 s=re.sub(r'\[([^]]+)\]\(([^)]+)\)',r'<a href="\2">\1</a>',s)
 s=re.sub(r'`([^`]+)`',r'<code>\1</code>',s)
 s=re.sub(r'\*\*([^*]+)\*\*',r'<strong>\1</strong>',s)
 return s
out=[];i=0
while i<len(lines):
 s=lines[i]
 if not s.strip():i+=1;continue
 if s.startswith('```'):
  code=[];i+=1
  while i<len(lines) and not lines[i].startswith('```'):code.append(lines[i]);i+=1
  out.append('<pre><code>'+html.escape('\n'.join(code))+'</code></pre>');i+=1;continue
 h=re.match(r'^(#{1,3}) (.*)',s)
 if h:level=len(h[1]);out.append(f'<h{level}>{inline(h[2])}</h{level}>');i+=1;continue
 if s.startswith('|'):
  rows=[]
  while i<len(lines) and lines[i].startswith('|'):
   row=lines[i].strip('|').split('|')
   if not all(re.fullmatch(r'\s*:?-+:?\s*',c) for c in row):rows.append(row)
   i+=1
  out.append('<div class="scroll"><table>')
  for j,row in enumerate(rows):tag='th' if j==0 else 'td';out.append('<tr>'+''.join(f'<{tag}>{inline(c.strip())}</{tag}>' for c in row)+'</tr>')
  out.append('</table></div>');continue
 listmatch=re.match(r'^(\d+\. |\- )(.*)',s)
 if listmatch:
  ordered=listmatch[1]!='- ';tag='ol' if ordered else 'ul';out.append('<'+tag+'>')
  while i<len(lines):
   m=re.match(r'^(\d+\. |\- )(.*)',lines[i])
   if not m or (m[1]!='- ')!=ordered:break
   out.append('<li>'+inline(m[2])+'</li>');i+=1
  out.append('</'+tag+'>');continue
 out.append('<p>'+inline(s)+'</p>');i+=1
body='\n'.join(out).replace('src="images/','src="guide-images/')
style='body{font:16px/1.85 Tahoma,sans-serif;color:#203b59;background:#f4f7fd;max-width:1050px;margin:auto;padding:40px}main{padding:42px;background:white;border:1px solid #dce7f5;border-radius:20px}h1,h2,h3{color:#315b91;line-height:1.45}h1{font-size:28px}h2{margin-top:36px;font-size:21px;border-bottom:1px solid #dce7f5;padding-bottom:10px}a{color:#255bb0;overflow-wrap:anywhere}table{border-collapse:collapse;width:100%;margin:15px 0}th,td{border:1px solid #dce7f5;padding:12px;text-align:left;vertical-align:top}th{background:#edf3ff}pre{padding:18px;background:#f0f5fc;border:1px solid #dce7f5;border-radius:12px;overflow:auto}code{font-size:13px}p,li{overflow-wrap:anywhere}img{max-width:100%;height:auto;border:1px solid #dce7f5;border-radius:14px}.scroll{overflow:auto}@media(max-width:640px){body{padding:12px}main{padding:20px}h1{font-size:23px}th,td{padding:9px}}@media print{body{padding:0;background:white}main{padding:0;border:0}pre{white-space:pre-wrap}img{max-height:230mm;object-fit:contain}h2{break-after:avoid}tr{break-inside:avoid}}'
page='<!doctype html><html lang="th"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>คู่มือ HRVec-Andaman2 รุ่น 1.9</title><style>'+style+'</style><main>'+body+'</main></html>'
for name in ['UPGRADE-v1.9.html','README.html']:(root/'dist'/name).write_text(page)
(root/'dist/guide-images').mkdir(exist_ok=True);shutil.copyfile(root/'docs/images/permissions-v1.8.jpg',root/'dist/guide-images/permissions-v1.8.jpg')
print('Created installation guides from the same Markdown source')
