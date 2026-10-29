from pathlib import Path
import cv2
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1]
import argparse
parser = argparse.ArgumentParser(description='Inspect supplied reference videos')
parser.add_argument('reference_directory', type=Path)
base = parser.parse_args().reference_directory
out = root / 'qa' / 'new-references'
out.mkdir(parents=True, exist_ok=True)
for name, filename in [('ref-a','8bd1904016b4713c563cdcd5205b83a7.mp4'),('ref-b','be3b87cd3d6e4936239723257c20a043.mp4')]:
    video = cv2.VideoCapture(str(base / filename))
    fps, total = video.get(cv2.CAP_PROP_FPS), video.get(cv2.CAP_PROP_FRAME_COUNT)
    duration = total / fps
    print(name, 'seconds', duration, 'size', video.get(3), video.get(4))
    sheet = Image.new('RGB', (1200, 720), '#e8e3ed')
    draw = ImageDraw.Draw(sheet)
    for index, fraction in enumerate([.03,.18,.34,.50,.66,.84]):
        video.set(cv2.CAP_PROP_POS_MSEC, duration * fraction * 1000)
        ok, frame = video.read()
        if not ok:
            continue
        im = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        im.save(out / f'{name}-{index}.jpg', quality=96)
        im.thumbnail((398, 330))
        x, y = index % 3 * 400, index // 3 * 360
        sheet.paste(im, (x + (400-im.width)//2, y))
        draw.text((x+10,y+335), f'{name} {duration*fraction:.1f}s', fill='#30243e')
    video.release()
    sheet.save(out / f'{name}-contact.jpg', quality=92)
