"""Build source download without credentials, runtime data, or recursive archives."""
from pathlib import Path
import zipfile
import shutil
root = Path(__file__).resolve().parents[1]
output = root / 'dist' / 'HRVec-Andaman2-source.zip'
folders = ['dist', 'supabase', 'apps-script', 'tests', 'scripts', '.github', 'docs', 'deployment']
files = [root / name for name in ['README.md', 'package.json', '.gitignore', '.env.example']]
for folder in folders:
    files.extend(p for p in (root / folder).rglob('*') if p.is_file())
with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as archive:
    for p in sorted(set(files)):
        rel = p.relative_to(root)
        if p.name == 'HR-Andaman2-Personnel-Template.xlsx' or p.suffix == '.zip' or '.temp' in rel.parts or '__pycache__' in rel.parts or p.name.startswith('.env') and p.name != '.env.example':
            continue
        if str(rel) == 'dist/config.js':
            # Only the public project URL and publishable key are bundled for GitHub.
            public_config = (root / 'deployment' / 'config.production.js').read_text()
            if 'sb_secret_' in public_config or 'SUPABASE_SERVICE_ROLE_KEY=' in public_config:
                raise ValueError('Server credentials are not allowed in browser configuration')
            archive.writestr(str(rel), public_config)
        else:
            archive.write(p, rel)
print(f'Created {output.name}: {output.stat().st_size} bytes')

# Keep the earlier download URL working for existing bookmarks.
shutil.copy2(output, root / 'dist' / 'HR-Andaman2-source.zip')

# Existing installations keep their own browser connection settings.
update = root / 'dist' / 'HRVec-Andaman2-update.zip'
with zipfile.ZipFile(output) as source, zipfile.ZipFile(update, 'w', zipfile.ZIP_DEFLATED) as archive:
    for name in source.namelist():
        if name != 'dist/config.js':
            archive.writestr(name, source.read(name))
print(f'Created {update.name}: {update.stat().st_size} bytes; existing config.js preserved')
