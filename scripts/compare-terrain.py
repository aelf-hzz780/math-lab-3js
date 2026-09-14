"""Compose actual old/new screenshots; requires Pillow, never edits their scene pixels."""
from pathlib import Path
from io import BytesIO
import hashlib
import json
import subprocess
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parents[1]
before_commit = '264088b14963a23a3c5bcea3e6ec94b7cacdcd64'
image_path = 'docs/screenshots/18-iridescent-terrain.jpg'
before_bytes = subprocess.run(['git', 'show', f'{before_commit}:{image_path}'], cwd=root, check=True, capture_output=True).stdout
after_bytes = (root / image_path).read_bytes()
manifest = json.loads((root / 'docs/screenshots/manifest.json').read_text())
example = next(item for item in manifest['examples'] if item['id'] == 'iridescent-terrain')
width, height, header = 800, 500, 44
output = Image.new('RGB', (width*2, height+header), '#0b1013')
draw = ImageDraw.Draw(output)
font = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 20) if Path('/System/Library/Fonts/Supplemental/Arial.ttf').exists() else ImageFont.load_default(size=20)
for offset, data, label in [(0, before_bytes, 'BEFORE / 1.2.0'), (width, after_bytes, 'AFTER / 1.2.1')]:
    image = Image.open(BytesIO(data)).convert('RGB')
    assert image.size == (1280,800), 'Comparison requires matching capture dimensions'
    output.paste(image.resize((width,height),Image.Resampling.LANCZOS),(offset,header))
    draw.text((offset+20,11),label,font=font,fill='#dce5e9')
out = root / 'docs/comparisons/iridescent-terrain.jpg'
output.save(out, quality=88, optimize=True)
metadata = {
    'description': {'zh':'同一 seed、时间与相机；旧版与柔和版应用的真实截图，仅缩放并并排排版。','en':'Actual old/new application screenshots with the same seed, time and camera; only resized and placed side by side.'},
    'before': {'commit':before_commit,'source':image_path,'sha256':hashlib.sha256(before_bytes).hexdigest()},
    'after': {'bundleSha256':manifest['bundle']['sha256'],'source':image_path,'sha256':hashlib.sha256(after_bytes).hexdigest(),'state':example['capturedState']},
    'comparison': {'path':str(out.relative_to(root)),'width':output.width,'height':output.height,'bytes':out.stat().st_size,'sha256':hashlib.sha256(out.read_bytes()).hexdigest()},
    'reproduce':'python3 scripts/compare-terrain.py (Pillow required; the 1.2.0 commit must be available locally)'
}
(root / 'docs/comparisons/iridescent-terrain.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n')
print(f'Comparison: {out.stat().st_size} bytes')
