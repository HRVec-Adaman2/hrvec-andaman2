"""Render the standalone Thai update guide without external dependencies."""
from pathlib import Path
import html
import re

root = Path(__file__).resolve().parents[1]
lines = (root / 'docs' / 'UPDATE-TEMPLATE-TH.md').read_text().splitlines()

def inline(text):
    value = html.escape(text)
    value = re.sub(r'`([^`]+)`', r'<code>\1</code>', value)
    value = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', value)
    value = re.sub(r'(https://[^\s<]+)', r'<a href="\1" target="_blank" rel="noopener">\1</a>', value)
    return value

blocks = []
i = 0
while i < len(lines):
    line = lines[i]
    if not line.strip():
        i += 1
        continue
    if line.startswith('```'):
        code = []
        i += 1
        while i < len(lines) and not lines[i].startswith('```'):
            code.append(lines[i])
            i += 1
        blocks.append('<pre><code>' + html.escape('\n'.join(code)) + '</code></pre>')
    elif line.startswith('#'):
        level = len(line) - len(line.lstrip('#'))
        blocks.append(f'<h{level}>' + inline(line[level:].strip()) + f'</h{level}>')
    elif line.startswith('|'):
        rows = []
        while i < len(lines) and lines[i].startswith('|'):
            cells = [s.strip() for s in lines[i].strip().strip('|').split('|')]
            if not all(re.fullmatch(r':?-+:?', c) for c in cells):
                rows.append(cells)
            i += 1
        table = '<div class="scroll"><table><thead><tr>' + ''.join('<th>' + inline(c) + '</th>' for c in rows[0]) + '</tr></thead><tbody>'
        table += ''.join('<tr>' + ''.join('<td>' + inline(c) + '</td>' for c in row) + '</tr>' for row in rows[1:])
        blocks.append(table + '</tbody></table></div>')
        continue
    elif re.match(r'^(\d+\. |\- )', line):
        ordered = bool(re.match(r'^\d+\. ', line))
        pattern = r'^\d+\. ' if ordered else r'^\- '
        tag = 'ol' if ordered else 'ul'
        items = []
        while i < len(lines) and re.match(pattern, lines[i]):
            items.append('<li>' + inline(re.sub(pattern, '', lines[i])) + '</li>')
            i += 1
        blocks.append(f'<{tag}>' + ''.join(items) + f'</{tag}>')
        continue
    else:
        blocks.append('<p>' + inline(line) + '</p>')
    i += 1

style = 'body{margin:0;background:#f0f5fc;color:#20344d;font:16px Tahoma,sans-serif;line-height:1.85}main{max-width:1020px;margin:32px auto;padding:34px;background:white;border:1px solid #d9e5f5;border-radius:16px}h1{color:#315b91;font-size:29px;line-height:1.5}h2{color:#315b91;font-size:22px;margin-top:35px}p,li{overflow-wrap:anywhere}li{margin:8px 0}a{color:#245bb0}pre{padding:20px;background:#eef4ff;border-radius:10px;overflow:auto;line-height:1.7}code{font-family:Consolas,monospace}table{border-collapse:collapse;width:100%;margin:18px 0}th{background:#315b91;color:white;text-align:left}th,td{padding:12px 15px;border-bottom:1px solid #e0e8f3;vertical-align:top}tbody tr:nth-child(even){background:#f5f8fe}.scroll{overflow-x:auto}@media(max-width:700px){main{margin:0;border-radius:0;padding:20px}h1{font-size:24px}h2{font-size:20px}body{font-size:15px}}@media print{body{background:white;font-size:12px}main{border:0;margin:0;padding:0}h2{break-after:avoid}tr,pre{break-inside:avoid}}'
page = '<!doctype html><html lang="th"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>HRVec-Andaman2 คู่มืออัปเดตแม่แบบ</title><style>' + style + '</style><body><main>' + '\n'.join(blocks) + '</main></body></html>'
target = root / 'dist' / 'UPDATE-TEMPLATE-TH.html'
target.write_text(page)
print(f'Created {target.name}: {target.stat().st_size} bytes')
