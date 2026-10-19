"""检查背景图尺寸、整体亮度与主色，确认真的是深底粉紫蓝。"""

from __future__ import annotations

import sys
from collections import Counter
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
IMAGE = ROOT / "frontend" / "public" / "dream_bg.png"


def region_color(image: Image.Image, box: tuple[float, float, float, float]) -> tuple[int, int, int]:
    left, top, right, bottom = box
    crop = image.crop(
        (
            int(image.width * left),
            int(image.height * top),
            int(image.width * right),
            int(image.height * bottom),
        )
    )
    pixels = list(crop.resize((1, 1), Image.LANCZOS).getdata())
    return pixels[0]


def main() -> None:
    image = Image.open(IMAGE).convert("RGB")
    print(f"size: {image.width}x{image.height}")
    small = image.resize((160, 90))
    quantized = small.quantize(colors=10, method=Image.MEDIANCUT).convert("RGB")
    counter = Counter(quantized.getdata())
    total = sum(counter.values())
    for rgb, hits in counter.most_common(6):
        print(f"  #{rgb[0]:02x}{rgb[1]:02x}{rgb[2]:02x}  {hits / total * 100:.1f}%")
    luminance = sum(0.299 * r + 0.587 * g + 0.114 * b for r, g, b in small.getdata()) / (160 * 90)
    print(f"mean luminance: {luminance:.1f} / 255")
    text_zone = region_color(image, (0.10, 0.36, 0.55, 0.64))
    right_top = region_color(image, (0.68, 0.16, 0.88, 0.36))
    print(f"text zone avg: #{text_zone[0]:02x}{text_zone[1]:02x}{text_zone[2]:02x}")
    print(f"right-top avg: #{right_top[0]:02x}{right_top[1]:02x}{right_top[2]:02x}")


if __name__ == "__main__":
    sys.exit(main())
