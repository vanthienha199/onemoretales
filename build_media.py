"""Compress the Shorts into v/<id>.mp4, posters into p/<id>.jpg, write videos.json.

Re-encode one video (for example after a new cut):  python3 build_media.py rotminator
Then rebuild the page:                              python3 build_index.py
"""
import json, os, subprocess, sys

D = os.path.expanduser('~/Downloads/')
V = [
    # id, source video, cover, title, hook, ep label, views (fb+ig, youtube) or a badge
    dict(id='no-shadow', src='One More Tales 2 - The Boy With No Shadow (60s).mp4',
         cover='One More Tales 2 - thumbnail (1080x1920).jpg',
         title='The Boy With No Shadow', ep='Tale #2',
         hook='He had no shadow... until the storm came.', fb='25.4K', yt='12.9K', total='39K+'),
    dict(id='skip-button', src='One More Tales 1 - The Skip Button (60s).mp4',
         cover='One More Tales 1 - thumbnail (1080x1920).jpg',
         title='The Skip Button', ep='Tale #1',
         hook='She skipped every boring day... even Sundays with Grandpa.', fb='7.1K', yt='1.8K'),
    dict(id='masked-hero', src='One More Tales 3 - The Masked Hero (60s).mp4',
         cover='One More Tales 3 - thumbnail FINAL (1080x1920).jpg',
         title='The Masked Hero', ep='Tale #3',
         hook='In this town, my dad was the most boring man alive...', fb='4.8K', yt='1.6K'),
    dict(id='minimalist', src='Hattrick Lame - Part 1 - The Minimalist (60s).mp4',
         cover='Hattrick Lame - Part 1 - thumbnail (1080x1920).jpg',
         title='Hattrick Lame: The Minimalist', ep='Series · Part 1',
         hook="My name is Hattrick Lame, the world's most famous Minimalist...", badge='New', fb='2.9K', yt='1.2K', note='in its first 6 hours'),
    dict(id='rotminator', src='The Rotminator - Part 1 - The Last Brainrot (60s).mp4',
         cover='The Rotminator - Part 1 - thumbnail (1080x1920).jpg',
         title='The Rotminator: The Last Brainrot', ep='Series · Part 1',
         hook="In this world, I'm the guy who travels through time to destroy brainrot...", badge='New series'),
    dict(id="vn-no-shadow", src="One More Tales 2 - Tieng Viet (60s).mp4", cover="One More Tales 2 - Tieng Viet thumbnail.jpg",
         title="The Boy With No Shadow (Vietnamese)", ep="Tale #2 · VN", hook="", lang="vi"),
    dict(id="vn-skip-button", src="One More Tales 1 - Tieng Viet (60s).mp4", cover="One More Tales 1 - Tieng Viet thumbnail.jpg",
         title="The Skip Button (Vietnamese)", ep="Tale #1 · VN", hook="", lang="vi"),
    dict(id="vn-masked-hero", src="One More Tales 3 - Tieng Viet (60s).mp4", cover="One More Tales 3 - Tieng Viet thumbnail FINAL.jpg",
         title="The Masked Hero (Vietnamese)", ep="Tale #3 · VN", hook="", lang="vi"),
]

force = set(sys.argv[1:])
out = []
for d in V:
    vid, src, cov = d['id'], D + d['src'], D + d['cover']
    assert os.path.exists(src), src
    assert os.path.exists(cov), cov
    mp4, jpg = f'v/{vid}.mp4', f'p/{vid}.jpg'
    if vid in force:
        for f in (mp4, jpg):
            if os.path.exists(f):
                os.remove(f)
    pr = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries',
                                    'stream=width,height:format=duration', '-of', 'json', src],
                                   capture_output=True, text=True).stdout)
    w, h, dur = pr['streams'][0]['width'], pr['streams'][0]['height'], float(pr['format']['duration'])
    if not os.path.exists(mp4):
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-map', '0:v:0', '-map', '0:a:0?',
                        '-vf', 'scale=-2:1280' if h >= w else 'scale=1280:-2', '-r', '30',
                        '-c:v', 'libx264', '-crf', '27', '-preset', 'slow', '-pix_fmt', 'yuv420p',
                        '-c:a', 'aac', '-b:a', '96k', '-ac', '2', '-movflags', '+faststart', mp4], check=True)
    if not os.path.exists(jpg):
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', cov, '-vf', 'scale=720:1280', '-q:v', '4', jpg], check=True)
    o = {k: v for k, v in d.items() if k not in ('src', 'cover')}
    o.update(dur=round(dur), mb=round(os.path.getsize(mp4) / 1048576, 1))
    out.append(o)
    print(vid, w, h, round(dur), o['mb'], 'MB', flush=True)

json.dump(out, open('videos.json', 'w'), ensure_ascii=False, indent=1)
print('total video MB', round(sum(o['mb'] for o in out), 1))
