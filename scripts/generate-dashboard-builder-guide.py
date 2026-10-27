"""Encode an actual-UI Dashboard Builder walkthrough from CUA screenshot frames.

No UI is generated, repainted, cropped or animated. Each input screenshot is held
for the requested duration. The only added content is an English subtitle strip
below the source image. Output is silent H264/yuv420p with fast-start metadata.

Manifest example:
{"frames":[{"file":"01.png","duration":2,"caption":"Ask a question"}],
 "poster":"01.png","fps":15,"max_width":1600}

Paths may be absolute or relative to the manifest. `poster` may also be a
zero-based frame index. Requires Pillow and ffmpeg (or imageio-ffmpeg).
"""
from __future__ import annotations
import argparse,json,math,os,shutil,subprocess,tempfile
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageOps


def ffmpeg_binary():
    binary=os.environ.get('FFMPEG_BINARY') or shutil.which('ffmpeg')
    if binary:return binary
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError as error:
        raise RuntimeError('Set FFMPEG_BINARY or install imageio-ffmpeg for encoding.') from error


def frame_path(value,base):
    if not isinstance(value,str) or not value.strip():raise ValueError('Each frame needs a file path.')
    path=Path(value).expanduser()
    if not path.is_absolute():path=base/path
    path=path.resolve(strict=True)
    if not path.is_file():raise ValueError(f'Not an image file: {path}')
    return path


def wrap_caption(text,font,width):
    words=text.split();lines=[];line=''
    for word in words:
        candidate=(line+' '+word).strip()
        if font.getlength(candidate)<=width or not line:line=candidate
        else:lines.append(line);line=word
    if line:lines.append(line)
    return lines


def encode(manifest_path,output,poster_output,font_path,vtt_output):
    manifest_path=Path(manifest_path).resolve(strict=True);base=manifest_path.parent
    manifest=json.loads(manifest_path.read_text());frames=manifest.get('frames') or manifest.get('segments')
    if not isinstance(frames,list) or not frames:raise ValueError('Manifest needs a non-empty frames array.')
    fps=int(manifest.get('fps',15))
    if not 1<=fps<=30:raise ValueError('fps must be between 1 and 30.')
    items=[]
    for raw in frames:
        path=frame_path(raw.get('file',raw.get('path')),base)
        duration=float(raw.get('duration',raw.get('seconds',1)))
        caption=raw.get('caption',raw.get('text',''))
        if not math.isfinite(duration) or not .05<=duration<=30:raise ValueError('Frame duration must be 0.05–30 seconds.')
        if not isinstance(caption,str) or len(caption)>240:raise ValueError('Captions must be at most 240 characters.')
        if any('\u4e00'<=c<='\u9fff' for c in caption):raise ValueError('Only English captions are permitted.')
        with Image.open(path) as image:
            if image.format not in ['PNG','JPEG','WEBP']:raise ValueError('Use actual PNG/JPEG/WebP screenshots.')
            size=image.size
        items.append({'file':path,'duration':duration,'caption':caption,'size':size})
    if sum(item['duration'] for item in items)>180:raise ValueError('Walkthrough exceeds three minutes.')
    # A common canvas preserves the full first viewport, fitting other frames
    # without distortion if their dimensions differ. No source UI is cropped.
    source_width,source_height=items[0]['size'];max_width=int(manifest.get('max_width',1600))
    width=min(source_width,max_width);width=max(320,width//2*2)
    screenshot_height=max(180,round(source_height*width/source_width)//2*2)
    font_size=max(20,min(32,round(width*.019)))
    font=ImageFont.truetype(str(font_path),font_size)
    prepared=[wrap_caption(item['caption'],font,width-80) for item in items]
    max_lines=max(1,max(len(lines) for lines in prepared))
    subtitle_height=max(72,max_lines*(font_size+10)+32);subtitle_height=(subtitle_height+1)//2*2
    height=screenshot_height+subtitle_height
    output=Path(output).resolve();output.parent.mkdir(parents=True,exist_ok=True)
    temporary=output.with_name(output.stem+'.encoding.mp4');temporary.unlink(missing_ok=True)
    args=[ffmpeg_binary(),'-y','-loglevel','error','-f','rawvideo','-pixel_format','rgb24','-video_size',f'{width}x{height}','-framerate',str(fps),'-i','-','-c:v','libx264','-preset','medium','-crf','19','-pix_fmt','yuv420p','-an','-movflags','+faststart',str(temporary)]
    with tempfile.TemporaryFile() as errors:
        process=subprocess.Popen(args,stdin=subprocess.PIPE,stdout=subprocess.DEVNULL,stderr=errors)
        count=0
        try:
            for item,lines in zip(items,prepared):
                frame=Image.new('RGB',(width,height),(17,20,25))
                with Image.open(item['file']) as source:
                    source=ImageOps.exif_transpose(source).convert('RGB')
                    source.thumbnail((width,screenshot_height),Image.Resampling.LANCZOS)
                    frame.paste(source,((width-source.width)//2,(screenshot_height-source.height)//2))
                draw=ImageDraw.Draw(frame)
                line_height=font_size+10;top=screenshot_height+(subtitle_height-len(lines)*line_height)//2
                for index,line in enumerate(lines):
                    x=(width-font.getlength(line))/2
                    draw.text((x,top+index*line_height),line,font=font,fill=(250,251,253))
                data=frame.tobytes();repeats=max(1,round(item['duration']*fps))
                for _ in range(repeats):process.stdin.write(data)
                count+=repeats
            process.stdin.close();code=process.wait()
            if code:
                errors.seek(0);raise RuntimeError(errors.read().decode(errors='replace')[-4000:])
        except Exception:
            process.kill();process.wait();temporary.unlink(missing_ok=True);raise
    temporary.replace(output)
    poster=manifest.get('poster',0)
    poster_path=items[poster]['file'] if isinstance(poster,int) else frame_path(poster,base)
    poster_output=Path(poster_output).resolve();poster_output.parent.mkdir(parents=True,exist_ok=True)
    # Poster is a real screenshot, with no added header or reconstructed UI.
    with Image.open(poster_path) as image:ImageOps.exif_transpose(image).convert('RGB').save(poster_output)
    def stamp(seconds):
        milliseconds=round(seconds*1000);hours,milliseconds=divmod(milliseconds,3600000);minutes,milliseconds=divmod(milliseconds,60000);seconds,milliseconds=divmod(milliseconds,1000)
        return f'{hours:02d}:{minutes:02d}:{seconds:02d}.{milliseconds:03d}'
    cues=[];elapsed=0.0
    for item in items:
        end=elapsed+max(1,round(item['duration']*fps))/fps
        if item['caption']:
            if cues and cues[-1][2]==item['caption'] and abs(cues[-1][1]-elapsed)<.001:cues[-1]=(cues[-1][0],end,item['caption'])
            else:cues.append((elapsed,end,item['caption']))
        elapsed=end
    vtt_output=Path(vtt_output).resolve();vtt_output.parent.mkdir(parents=True,exist_ok=True)
    vtt_output.write_text('WEBVTT\n\n'+'\n\n'.join(f'{stamp(start)} --> {stamp(end)}\n{caption}' for start,end,caption in cues)+'\n')
    print(json.dumps({'output':str(output),'poster':str(poster_output),'captions':str(vtt_output),'frames':count,'fps':fps,'duration':count/fps,'width':width,'height':height,'subtitle_height':subtitle_height,'audio':False,'bytes':output.stat().st_size}))


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--manifest',default='/tmp/dashboard-builder-real/manifest.json')
    parser.add_argument('--output',default='/tmp/dashboard-builder-guide-real.mp4')
    parser.add_argument('--poster-output',default='/tmp/dashboard-builder-guide-real.png')
    parser.add_argument('--vtt-output',default='/tmp/dashboard-builder-guide-real.en.vtt')
    parser.add_argument('--font',default='/System/Library/Fonts/Supplemental/Arial Unicode.ttf')
    args=parser.parse_args();encode(args.manifest,args.output,args.poster_output,args.font,args.vtt_output)
