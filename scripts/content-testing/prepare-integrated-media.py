"""Rasterize existing private creative-library evidence, no platform data refresh."""
import json,sys,hashlib,subprocess
from pathlib import Path
from PIL import Image
import shutil
root=Path(sys.argv[1]);library=Path('/home/ubuntu/work/emw3-anc/bluevua/.local/creative-library');assets=json.loads((library/'manifest.json').read_text())['assets'];refs={}
for p in (root/'inputs').glob('*.json'):
 for r in json.loads(p.read_text()).get('creative_references',[]):refs.setdefault(r['id'],r)
media=[];(root/'media').mkdir(exist_ok=True)
def save(source,asset_id,state,timestamp=None):
 ref=refs[asset_id];key=hashlib.sha256((asset_id+str(timestamp)).encode()).hexdigest()[:24];im=Image.open(source).convert('RGB');im.thumbnail((1600,1600));dest=root/'media'/f'{key}.webp';im.save(dest,'WEBP',quality=88)
 media.append({'key':key,'asset_id':asset_id,'name':ref['name'],'kind':'frame' if timestamp is not None else 'image','timestamp_seconds':timestamp,'width':im.width,'height':im.height,'file':dest.name,'source_path':str(dest),'sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'url':ref.get('url'),'channel':ref.get('channel'),'campaigns':sorted({r['campaign'] for r in state.get('references',[]) if r.get('campaign')})})
for key,state in assets.items():
 asset_id=key.removeprefix('google-').removeprefix('meta-').removeprefix('reddit-').removeprefix('social-')
 if asset_id not in refs:continue
 if state.get('kind')=='image' and state.get('image_paths'):
  source=Path(state['image_paths'][0])
  if source.is_file():save(source,asset_id,state)
for previous in json.loads(Path('/tmp/pmax-readable-20261104/media-index.json').read_text()):
 if previous['kind']!='frame' or previous['asset_id'] not in refs:continue
 dest=root/'media'/previous['file'];shutil.copy2(previous['source_path'],dest);media.append({**previous,'source_path':str(dest),'channel':'google-pmax'})
for asset_id,ref in refs.items():
 if ref.get('channel')!='social':continue
 source=Path('/tmp/bluevua-testing-media-20261020')/f'Social-{asset_id}.png'
 if source.is_file():save(source,asset_id,{'references':[{'campaign':'social-selected-posts'}]})
(root/'media-index.json').write_text(json.dumps(media,ensure_ascii=False,indent=2));print(json.dumps({'media':len(media),'channels':sorted({m['channel'] for m in media})}))
