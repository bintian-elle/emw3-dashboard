#!/usr/bin/env python3
"""Local-network companion for public YouTube sources blocked on EC2.
Verifies source metadata/captions; downloads only new or changed media.
"""
import argparse,hashlib,json,subprocess,sys,re,time
from pathlib import Path
from urllib.parse import urlparse,parse_qs
import imageio_ffmpeg,requests
from youtube_transcript_api import YouTubeTranscriptApi
class TimedSession(requests.Session):
 def request(self,*args,**kwargs):kwargs.setdefault('timeout',20);return super().request(*args,**kwargs)
def main():
 p=argparse.ArgumentParser();p.add_argument('--ids',type=Path,required=True);p.add_argument('--output',type=Path,required=True);p.add_argument('--retry-missing',action='store_true');args=p.parse_args();ids=json.loads(args.ids.read_text());root=args.output;root.mkdir(parents=True,exist_ok=True)
 captions=root/'youtube-captions';media=root/'youtube-media';metadata=root/'youtube-metadata'
 for directory in [captions,media,metadata]:directory.mkdir(exist_ok=True)
 api=YouTubeTranscriptApi(http_client=TimedSession())
 for video in sorted(set(ids.values())):
  if not re.fullmatch(r'[A-Za-z0-9_-]{11}',video):raise ValueError('Invalid YouTube video ID')
  output=media/(video+'.mp4');meta_path=metadata/(video+'.json');prior=json.loads(meta_path.read_text()) if meta_path.exists() else {};meta={**prior,'checked_at':time.time()};changed=False
  base=[sys.executable,'-m','yt_dlp','--quiet','--no-warnings','--no-playlist','--js-runtimes','node','--ffmpeg-location',imageio_ffmpeg.get_ffmpeg_exe(),'--socket-timeout','15','--retries','0','--max-filesize','100M','-f','bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/best[height<=480]','-o',str(output)]
  try:
   check=subprocess.run(base+['--dump-single-json','--skip-download','https://www.youtube.com/watch?v='+video],capture_output=True,text=True,timeout=90,check=True);info=json.loads(check.stdout)
   selected=info.get('requested_formats') or info.get('requested_downloads') or [info]
   versions=[{k:fmt.get(k) for k in ['format_id','filesize','filesize_approx','width','height','vcodec','acodec']}|{'last_modified':parse_qs(urlparse(fmt.get('url','')).query).get('lmt')} for fmt in selected]
   fingerprint=hashlib.sha256(json.dumps([info.get('duration'),versions],sort_keys=True).encode()).hexdigest()
   meta.update(title=info.get('title'),description=info.get('description'),duration=info.get('duration'),upload_date=info.get('upload_date'),checked_fingerprint=fingerprint);meta.pop('refresh_error',None)
   # Existing captures from the initial run can be seeded without retransferring
   # when YouTube reports the encoded source was modified before capture.
   modified=[int(v['last_modified'][0])/1e6 for v in versions if v.get('last_modified') and v['last_modified'][0].isdigit()]
   seed=output.exists() and not prior.get('content_fingerprint') and modified and max(modified)<=output.stat().st_mtime
   changed=not output.exists() or (prior.get('content_fingerprint')!=fingerprint and not seed)
   if changed:
    result=subprocess.run(base+['--force-overwrites','--no-continue','https://www.youtube.com/watch?v='+video],capture_output=True,timeout=120)
    if result.returncode:raise RuntimeError('Video download failed; retaining previous capture')
   if output.exists():meta['content_fingerprint']=fingerprint
  except Exception as error:meta['refresh_error']=type(error).__name__
  meta_path.write_text(json.dumps(meta,ensure_ascii=False));meta_path.chmod(0o600)
  target=captions/(video+'.json');previous=json.loads(target.read_text()) if target.exists() else {}
  try:
   tracks=api.list(video);track=next((t for t in tracks if t.language_code.startswith('en')),None) or next(iter(tracks));segments=track.fetch();value={'transcript':'\n'.join(f'[{s.start:.1f}s–{s.start+s.duration:.1f}s] {s.text}' for s in segments),'language':track.language_code,'is_generated':track.is_generated}
  except Exception as error:value={**previous,'error':type(error).__name__}
  target.write_text(json.dumps(value));target.chmod(0o600)
  print(json.dumps({'video_id':video,'captions':bool(value.get('transcript')),'media':output.exists(),'source_changed':changed,'refresh_error':meta.get('refresh_error')}),flush=True)
if __name__=='__main__':main()
