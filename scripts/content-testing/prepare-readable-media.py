"""Read cached PMax media only; create immutable raster evidence for a local trial."""
import json,sys,hashlib,shutil,subprocess
from pathlib import Path
from PIL import Image
import imageio_ffmpeg
root=Path(sys.argv[1]).resolve();packet=json.loads((root/'inputs/google-pmax.json').read_text())
library=Path('/home/ubuntu/work/emw3-anc/bluevua/.local/creative-library')
manifest=json.loads((library/'manifest.json').read_text())['assets']
refs={r['id']:r for r in packet['creative_references']};allowed=set(refs);media=[]
(root/'media').mkdir(exist_ok=True)
def save_image(source,asset_id,timestamp=None):
 ref=refs[asset_id];key=f'{asset_id}-{int(timestamp*1000) if timestamp is not None else "image"}'
 image=Image.open(source).convert('RGB');image.thumbnail((1600,1600))
 target=root/'media'/f'{key}.webp';image.save(target,'WEBP',quality=90)
 media.append({'key':key,'asset_id':asset_id,'name':ref['name'],'kind':'frame' if timestamp is not None else 'image','timestamp_seconds':timestamp,'width':image.width,'height':image.height,'file':target.name,'source_path':str(target),'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'url':ref.get('url'),'campaigns':sorted({r['campaign'] for r in manifest[f'google-{asset_id}'].get('references',[]) if 'PMAX' in r.get('campaign','')})})
video_count=0;seen=set()
for key,state in manifest.items():
 asset_id=key.removeprefix('google-')
 if asset_id not in allowed:continue
 if state.get('kind')=='image' and state.get('image_paths'):
  source=Path(state['image_paths'][0])
  if source.is_file():save_image(source,asset_id)
 elif state.get('kind') in ('youtube','video') and video_count<3:
  digest=state.get('media',{}).get('sha256')
  if digest in seen:continue
  source=library/'assets'/key/state.get('media',{}).get('local_file','missing')
  if not source.is_file():continue
  reader=imageio_ffmpeg.read_frames(str(source));duration=float(next(reader)['duration']);reader.close()
  for timestamp in [0,2,5,max(0,round(duration-1,2))]:
   temp=root/'media'/'frame.png'
   subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(),'-hide_banner','-loglevel','error','-y','-ss',str(timestamp),'-i',str(source),'-frames:v','1',str(temp)],check=True)
   save_image(temp,asset_id,timestamp)
  temp.unlink(missing_ok=True);seen.add(digest);video_count+=1
(root/'media-index.json').write_text(json.dumps(media,ensure_ascii=False,indent=2))
packet['media_index_file']=str(root/'media-index.json');packet['media_evidence']=media
(root/'inputs/google-pmax.json').write_text(json.dumps(packet,ensure_ascii=False,indent=2))
print(json.dumps({'images':sum(m['kind']=='image' for m in media),'video_frames':sum(m['kind']=='frame' for m in media),'videos':video_count}))
