"""Render the Natefy macOS app icon (1024x1024, Apple icon grid) to a PNG."""
import math
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

out = sys.argv[1]
BLEED = len(sys.argv) > 2 and sys.argv[2] == 'bleed'  # square, edge-to-edge (the OS rounds it)
SS = 2  # supersample factor
N = 1024 * SS


def squircle_mask(size, a, cx, cy, n=5.0):
    pts = []
    for i in range(2000):
        t = 2 * math.pi * i / 2000
        c, s = math.cos(t), math.sin(t)
        pts.append((cx + a * math.copysign(abs(c) ** (2 / n), c), cy + a * math.copysign(abs(s) ** (2 / n), s)))
    m = Image.new('L', (size, size), 0)
    ImageDraw.Draw(m).polygon(pts, fill=255)
    return m


def lerp(c1, c2, t):
    return np.array(c1, float)[None, None, :] * (1 - t[..., None]) + np.array(c2, float)[None, None, :] * t[..., None]


def rgb(arr):
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)).convert('RGBA')


yy, xx = np.mgrid[0:N, 0:N].astype(np.float64) / SS  # coordinates in 1024 space

# Body: vertical gradient plus a soft teal glow behind the logo.
t = np.clip((yy - 100) / 824, 0, 1)
top, mid, bot = (20, 81, 74), (10, 47, 42), (4, 26, 23)
body = np.where((t < 0.55)[..., None], lerp(top, mid, t / 0.55), lerp(mid, bot, (t - 0.55) / 0.45))
d = np.sqrt((xx - 512) ** 2 + (yy - 530) ** 2) / 380
glow = np.clip(1 - d, 0, 1) ** 1.6 * 0.30
body = body * (1 - glow[..., None]) + np.array((45, 212, 191), float)[None, None, :] * glow[..., None]
body += (np.random.rand(N, N, 1) - 0.5) * 1.2  # dither against banding

mask = Image.new('L', (N, N), 255) if BLEED else squircle_mask(N, 412 * SS, 512 * SS, 512 * SS)
canvas = Image.new('RGBA', (N, N), (0, 0, 0, 0))

# Outer drop shadow, like other macOS icons.
sh = Image.new('L', (N, N), 0)
sh.paste(mask, (0, 10 * SS))
sh = sh.filter(ImageFilter.GaussianBlur(12 * SS)).point(lambda v: int(v * 0.35))
if not BLEED:
    canvas.paste((0, 0, 0, 255), (0, 0), sh)
canvas.paste(rgb(body), (0, 0), mask)

# Logo bars (the 56x44 logo, scaled up) with a soft shadow.
S = 9.5 * SS
ox, oy = 512 * SS - 56 * S / 2, 512 * SS - 44 * S / 2 + 6 * SS
bars = [(2, 6, 7, 32, 't'), (13, 12, 7, 14, 't'), (24, 18, 7, 14, 't'), (35, 6, 7, 32, 't'), (47, 14, 7, 16, 'm')]
grads = {'t': ((122, 240, 220), (22, 184, 163)), 'm': ((198, 251, 208), (116, 227, 154))}

bshadow = Image.new('L', (N, N), 0)
dsh = ImageDraw.Draw(bshadow)
for x, y, w, h, _ in bars:
    dsh.rounded_rectangle(
        [ox + x * S, oy + y * S + 8 * SS, ox + (x + w) * S, oy + (y + h) * S + 8 * SS], radius=w * S / 2, fill=255
    )
bshadow = bshadow.filter(ImageFilter.GaussianBlur(10 * SS))
bshadow = Image.fromarray((np.array(bshadow, float) * 0.45 * np.array(mask, float) / 255).astype(np.uint8))
canvas.paste((0, 17, 14, 255), (0, 0), bshadow)

rows = np.arange(N, dtype=float)[:, None].repeat(N, 1)
for x, y, w, h, g in bars:
    x0, y0, x1, y1 = ox + x * S, oy + y * S, ox + (x + w) * S, oy + (y + h) * S
    m = Image.new('L', (N, N), 0)
    ImageDraw.Draw(m).rounded_rectangle([x0, y0, x1, y1], radius=w * S / 2, fill=255)
    canvas.paste(rgb(lerp(*grads[g], np.clip((rows - y0) / (y1 - y0), 0, 1))), (0, 0), m)

# Subtle glassy rim highlight along the top edge.
inner = squircle_mask(N, 412 * SS - 3 * SS, 512 * SS, 512 * SS + 2 * SS)
rim = np.array(mask, float) - np.array(inner, float)
fade = np.clip(1 - (yy - 100) / 240, 0, 1)
if not BLEED:
    canvas.paste((255, 255, 255, 255), (0, 0), Image.fromarray(np.clip(rim * fade * 0.30, 0, 255).astype(np.uint8)))
else:
    canvas = canvas.crop((100 * SS, 100 * SS, 924 * SS, 924 * SS))

canvas.resize((1024, 1024), Image.LANCZOS).save(out)
print('saved', out)
