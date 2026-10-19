"""生成入口页背景图：云端两座浮岛，一座绿意建筑，一座围墙内是星云，中间有人奔跑。

对应提示词：
two floating islands in the sky, one is made of lush greenery and buildings on it,
the other island has nebulae and stars inside its walls, a person runs between them,
by artgerm, dreamy fantasy landscape, surrealistic, colorful, bright

输出：frontend/public/dream_bg.png（1920x1080）
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

WIDTH = 1920
HEIGHT = 1080
SEED = 20261015
ROOT = Path(__file__).resolve().parents[1]
OUT_PATH = ROOT / "frontend" / "public" / "dream_bg.png"


def smooth_noise(rng: np.random.Generator, octaves: int = 6, base: int = 3) -> np.ndarray:
    total = np.zeros((HEIGHT, WIDTH), dtype=np.float32)
    amplitude = 1.0
    norm = 0.0
    for index in range(octaves):
        grid_w = max(2, int(base * (2**index)))
        grid_h = max(2, int(grid_w * HEIGHT / WIDTH))
        grid = (rng.random((grid_h, grid_w)) * 255).astype(np.uint8)
        layer = np.asarray(
            Image.fromarray(grid).resize((WIDTH, HEIGHT), Image.BICUBIC), dtype=np.float32
        ) / 255.0
        total += layer * amplitude
        norm += amplitude
        amplitude *= 0.52
    return total / norm


def vertical_ramp(stops: list[tuple[float, tuple[int, int, int]]]) -> np.ndarray:
    ys = np.linspace(0, 1, HEIGHT, dtype=np.float32)[:, None]
    out = np.zeros((HEIGHT, 3), dtype=np.float32)
    for index in range(len(stops) - 1):
        top_t, top_color = stops[index]
        bottom_t, bottom_color = stops[index + 1]
        span = (ys[:, 0] >= top_t) & (ys[:, 0] <= bottom_t)
        if not span.any():
            continue
        local = np.clip((ys[span, 0] - top_t) / max(bottom_t - top_t, 1e-6), 0, 1)[:, None]
        out[span] = (
            np.array(top_color, dtype=np.float32) * (1 - local)
            + np.array(bottom_color, dtype=np.float32) * local
        )
    return out[:, None, :]


def composite(layer: np.ndarray, mask: np.ndarray) -> None:
    alpha = mask[:, :, None]
    base[:] = base * (1 - alpha) + layer * alpha


def radial(cx: float, cy: float, radius: float) -> np.ndarray:
    ys, xs = np.mgrid[0:HEIGHT, 0:WIDTH]
    distance = np.sqrt((xs - cx) ** 2 + (ys - cy) ** 2)
    return np.exp(-((distance / radius) ** 2)).astype(np.float32)


def mask_from_draw(draw_fn) -> np.ndarray:
    layer = Image.new("L", (WIDTH, HEIGHT), 0)
    draw_fn(ImageDraw.Draw(layer))
    return np.asarray(layer, dtype=np.float32) / 255.0


def island_body(cx: float, cy: float, top_w: float, depth: float, taper: float) -> np.ndarray:
    """上宽下尖的浮岛岩体轮廓。"""

    def draw(pen: ImageDraw.ImageDraw) -> None:
        points = []
        steps = 26
        for index in range(steps + 1):
            t = index / steps
            x = cx - top_w / 2 + top_w * t
            wobble = np.sin(t * 7.2) * top_w * 0.02
            points.append((x + wobble, cy + np.sin(t * 5.1) * 6))
        tip_y = cy + depth
        points.append((cx + top_w * taper, cy + depth * 0.62))
        points.append((cx, tip_y))
        points.append((cx - top_w * taper, cy + depth * 0.62))
        pen.polygon(points, fill=255)

    return mask_from_draw(draw)


def main() -> None:
    global base
    rng = np.random.default_rng(SEED)

    # 天空：上深蓝，中青，接近地平线转为暖奶白
    base = vertical_ramp(
        [
            (0.00, (34, 92, 186)),
            (0.34, (104, 176, 232)),
            (0.62, (176, 214, 240)),
            (0.82, (244, 226, 208)),
            (1.00, (252, 238, 222)),
        ]
    )
    base = np.repeat(base, WIDTH, axis=1).astype(np.float32)

    # 高处暖阳
    sun = radial(WIDTH * 0.80, HEIGHT * 0.14, 460)
    base += sun[:, :, None] * np.array([70, 52, 18], dtype=np.float32)

    # 云海：噪声做层次，越靠近下方越厚重
    cloud = smooth_noise(rng, octaves=7, base=3)
    horizon = np.linspace(0, 1, HEIGHT, dtype=np.float32)[:, None]
    cloud_mask = np.clip((cloud - 0.42) * 2.6, 0, 1) * np.clip(horizon * 1.5 - 0.12, 0, 1)
    cloud_mask = np.clip(cloud_mask, 0, 1)[:, :, None]
    composite(np.array([252, 250, 252], dtype=np.float32)[None, None, :], cloud_mask[:, :, 0])

    # 远景淡云
    far = smooth_noise(np.random.default_rng(SEED + 1), octaves=5, base=2)
    far_mask = np.clip((far - 0.58) * 2.2, 0, 1) * np.clip(0.72 - np.abs(horizon - 0.42) * 2.4, 0, 1)
    composite(np.array([236, 242, 252], dtype=np.float32)[None, None, :], np.clip(far_mask, 0, 1))

    rock_texture = smooth_noise(np.random.default_rng(SEED + 2), octaves=6, base=5)

    # 浮岛在云海上的投影，让岛"浮"起来
    shadow = Image.new("L", (WIDTH, HEIGHT), 0)
    pen_shadow = ImageDraw.Draw(shadow)
    pen_shadow.ellipse([WIDTH * 0.44, HEIGHT * 0.52, WIDTH * 0.90, HEIGHT * 0.66], fill=90)
    pen_shadow.ellipse([WIDTH * 0.72, HEIGHT * 0.24, WIDTH * 0.99, HEIGHT * 0.36], fill=70)
    shadow_mask = np.asarray(shadow.filter(ImageFilter.GaussianBlur(46)), dtype=np.float32) / 255.0
    base *= (1 - shadow_mask[:, :, None] * 0.42)

    # ---------- 左岛：绿意与建筑 ----------
    cx_a, cy_a = WIDTH * 0.66, HEIGHT * 0.50
    body_a = island_body(cx_a, cy_a, 620, 240, 0.42)
    rock = np.zeros((HEIGHT, WIDTH, 3), dtype=np.float32)
    shade = np.clip(1.0 - rock_texture * 1.5, 0, 1)[:, :, None]
    rock[:, :, 0] = 96 * shade[:, :, 0] + 52
    rock[:, :, 1] = 84 * shade[:, :, 0] + 44
    rock[:, :, 2] = 74 * shade[:, :, 0] + 38
    composite(rock, body_a * 0.96)

    grass = np.zeros((HEIGHT, WIDTH, 3), dtype=np.float32)
    grass[:, :, 0] = 86
    grass[:, :, 1] = 158
    grass[:, :, 2] = 78
    grass_top = mask_from_draw(
        lambda pen: pen.ellipse(
            [cx_a - 300, cy_a - 40, cx_a + 300, cy_a + 62], fill=255
        )
    )
    composite(grass, grass_top * 0.95)

    # 建筑：塔楼 + 尖顶 + 窗
    building_layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    pen = ImageDraw.Draw(building_layer)
    towers = [
        (cx_a - 150, 150, 74, (232, 220, 198)),
        (cx_a - 40, 196, 92, (244, 232, 210)),
        (cx_a + 86, 130, 64, (226, 210, 188)),
        (cx_a + 176, 96, 48, (238, 224, 202)),
    ]
    for x, height, width, color in towers:
        top = cy_a - 22 - height
        pen.rectangle([x, top, x + width, cy_a + 8], fill=color)
        pen.polygon(
            [(x - 12, top), (x + width + 12, top), (x + width / 2, top - 60)],
            fill=(176, 96, 92),
        )
        for wy in range(int(top) + 22, int(cy_a) - 6, 34):
            for wx in range(int(x) + 12, int(x + width) - 8, 24):
                pen.rectangle([wx, wy, wx + 10, wy + 14], fill=(96, 120, 152))
    pen.ellipse([cx_a - 210, cy_a - 96, cx_a - 60, cy_a - 4], fill=(120, 172, 92))
    pen.ellipse([cx_a + 30, cy_a - 104, cx_a + 190, cy_a - 6], fill=(104, 158, 84))
    pen.ellipse([cx_a + 190, cy_a - 84, cx_a + 300, cy_a - 12], fill=(126, 178, 96))
    base = base * (1 - 0.98 * body_a[:, :, None]) + (
        np.asarray(building_layer.convert("RGB"), dtype=np.float32)
        * (np.asarray(building_layer.split()[3], dtype=np.float32) / 255.0)[:, :, None]
    )

    # ---------- 右岛：围墙内的星云 ----------
    cx_b, cy_b = WIDTH * 0.86, HEIGHT * 0.26
    body_b = island_body(cx_b, cy_b, 420, 200, 0.4)
    composite(np.array([92, 86, 104], dtype=np.float32)[None, None, :], body_b * 0.92)

    interior = mask_from_draw(
        lambda pen: pen.ellipse([cx_b - 196, cy_b - 52, cx_b + 196, cy_b + 56], fill=255)
    )
    nebula = smooth_noise(np.random.default_rng(SEED + 3), octaves=6, base=2)
    nebula_colors = np.zeros((HEIGHT, WIDTH, 3), dtype=np.float32)
    nebula_colors[:, :, 0] = 60 + nebula * 150
    nebula_colors[:, :, 1] = 40 + nebula * 70
    nebula_colors[:, :, 2] = 120 + nebula * 120
    composite(nebula_colors, interior * 0.95)
    stars = mask_from_draw(
        lambda pen: [
            pen.ellipse([x, y, x + rng.uniform(1.6, 3.6), y + rng.uniform(1.6, 3.6)], fill=255)
            for x, y in zip(
                rng.uniform(cx_b - 190, cx_b + 190, 200),
                rng.uniform(cy_b - 46, cy_b + 50, 200),
            )
        ]
    )
    composite(np.array([248, 246, 255], dtype=np.float32)[None, None, :], stars * interior)

    # 围墙
    wall = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    pen = ImageDraw.Draw(wall)
    pen.arc(
        [cx_b - 214, cy_b - 74, cx_b + 214, cy_b + 78],
        start=186,
        end=354,
        fill=(226, 216, 206, 255),
        width=16,
    )
    for angle in np.linspace(190, 350, 13):
        rad = np.deg2rad(angle)
        px = cx_b + np.cos(rad) * 214
        py = cy_b - 8 + np.sin(rad) * 76
        pen.rectangle([px - 9, py - 14, px + 9, py + 6], fill=(214, 204, 194, 255))
    base = base * (1 - 0.95 * (np.asarray(wall.split()[3], dtype=np.float32) / 255.0)[:, :, None]) + (
        np.asarray(wall.convert("RGB"), dtype=np.float32)
        * (np.asarray(wall.split()[3], dtype=np.float32) / 255.0)[:, :, None]
    )

    # ---------- 两岛之间的奔跑者 ----------
    path_mask = mask_from_draw(
        lambda pen: pen.line(
            [(cx_a - 240, cy_a - 10), (cx_b - 210, cy_b + 40)], fill=255, width=9
        )
    )
    path_mask = np.asarray(
        Image.fromarray((np.clip(path_mask, 0, 1) * 255).astype(np.uint8)).filter(
            ImageFilter.GaussianBlur(1.6)
        ),
        dtype=np.float32,
    ) / 255.0
    composite(np.array([246, 236, 214], dtype=np.float32)[None, None, :], path_mask * 0.5)

    runner = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    pen = ImageDraw.Draw(runner)
    px, py, scale = WIDTH * 0.775, HEIGHT * 0.455, 1.0
    pen.ellipse([px - 8 * scale, py - 46 * scale, px + 8 * scale, py - 28 * scale], fill=(28, 26, 40, 255))
    pen.polygon(
        [
            (px - 9 * scale, py - 28 * scale),
            (px + 9 * scale, py - 28 * scale),
            (px + 6 * scale, py + 4 * scale),
            (px - 6 * scale, py + 4 * scale),
        ],
        fill=(32, 30, 46, 255),
    )
    pen.line([(px - 3 * scale, py + 4 * scale), (px - 22 * scale, py + 30 * scale)], fill=(32, 30, 46, 255), width=8)
    pen.line([(px + 3 * scale, py + 4 * scale), (px + 20 * scale, py + 24 * scale)], fill=(32, 30, 46, 255), width=8)
    pen.line([(px - 6 * scale, py - 22 * scale), (px + 20 * scale, py - 34 * scale)], fill=(32, 30, 46, 255), width=7)
    pen.line([(px + 6 * scale, py - 22 * scale), (px - 20 * scale, py - 30 * scale)], fill=(32, 30, 46, 255), width=7)
    runner_alpha = (np.asarray(runner.split()[3], dtype=np.float32) / 255.0)[:, :, None]
    base = base * (1 - runner_alpha) + np.asarray(runner.convert("RGB"), dtype=np.float32) * runner_alpha

    # 前方飘过的云，虚化处理制造纵深
    front = smooth_noise(np.random.default_rng(SEED + 4), octaves=6, base=4)
    front_mask = np.clip((front - 0.52) * 3.0, 0, 1) * (
        np.clip((np.linspace(0, 1, HEIGHT)[:, None] - 0.74) * 4.2, 0, 1)
    )
    front_layer = np.array([252, 250, 250], dtype=np.float32)[None, None, :]
    base = base * (1 - np.clip(front_mask, 0, 1)[:, :, None] * 0.9) + (
        front_layer * np.clip(front_mask, 0, 1)[:, :, None] * 0.9
    )

    # 左侧正文区压深，保证白字可读
    ys, xs = np.mgrid[0:HEIGHT, 0:WIDTH]
    nx = xs / WIDTH
    ny = ys / HEIGHT
    text_zone = np.clip(1 - np.abs(nx - 0.22) / 0.3, 0, 1) * np.clip(1 - np.abs(ny - 0.5) / 0.32, 0, 1)
    base *= 1 - text_zone[:, :, None] * 0.58
    base *= 1 - (np.clip(1 - nx / 0.34, 0, 1) ** 1.4)[:, :, None] * 0.22

    # 高光溢出，做梦幻光感
    luminance = base.mean(axis=2, keepdims=True)
    bloom = np.clip((luminance - 176) / 79, 0, 1) ** 1.4
    bloom_soft = np.asarray(
        Image.fromarray((bloom[:, :, 0] * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(26)),
        dtype=np.float32,
    )[:, :, None] / 255.0
    base = np.clip(base + bloom_soft * 86, 0, 255)

    # 暗角
    radius = np.sqrt((nx - 0.5) ** 2 + (ny - 0.5) ** 2)
    base *= (1 - np.clip(radius * 1.18, 0, 1) ** 2 * 0.34)[:, :, None]

    image = Image.fromarray(np.clip(base, 0, 255).astype(np.uint8), mode="RGB")
    image = Image.blend(image, image.filter(ImageFilter.GaussianBlur(2.4)), 0.3)

    grain = rng.normal(0, 1.7, (HEIGHT, WIDTH, 1)).astype(np.float32)
    image = Image.fromarray(
        np.clip(np.asarray(image, dtype=np.float32) + grain, 0, 255).astype(np.uint8), mode="RGB"
    )

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    image.save(OUT_PATH, format="PNG", optimize=True)
    print(f"saved {OUT_PATH} ({OUT_PATH.stat().st_size / 1024 / 1024:.2f} MB)")


if __name__ == "__main__":
    main()
