"""Build source download without credentials, runtime data, or recursive archives."""
from pathlib import Path
import zipfile
import shutil
root = Path(__file__).resolve().parents[1]
output = root / 'dist' / 'HRVec-Andaman2-source.zip'
folders = ['dist', 'supabase', 'apps-script', 'tests', 'scripts', '.github']
files = [root / name for name in ['README.md', 'package.json', '.gitignore', '.env.example']]
for folder in folders:
    files.extend(p for p in (root / folder).rglob('*') if p.is_file())
with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as archive:
    for p in sorted(set(files)):
        rel = p.relative_to(root)
        if p.name == 'HR-Andaman2-Personnel-Template.xlsx' or p.suffix == '.zip' or '.temp' in rel.parts or '__pycache__' in rel.parts or p.name.startswith('.env') and p.name != '.env.example':
            continue
        archive.write(p, Path('HRVec-Andaman2') / rel)
print(f'Created {output.name}: {output.stat().st_size} bytes')

# Keep the earlier download URL working for existing bookmarks.
shutil.copy2(output, root / 'dist' / 'HR-Andaman2-source.zip')
