#!/usr/bin/env python3
"""Regenerate og.png — the social-preview card for ~david.

One-off asset generator, NOT part of serving the site (the site itself stays
build-step-free / dependency-free). Reproduces the live palette, the giant
chromatic-aberration "DAVID", and a real frame of the ASCII plasma.

    pip install pillow && python3 make-og.py

VT323 is fetched from Google Fonts on demand (same font the site loads from the
CDN) and cached under the system temp dir, so the TTF is not vendored here.
"""
import math, os, tempfile, urllib.request
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops

HERE = os.path.dirname(os.path.abspath(__file__))
OUT  = os.path.join(HERE, "og.png")

# VT323 — fetched on demand, cached in temp (not vendored, matches site's CDN use)
VT323 = os.path.join(tempfile.gettempdir(), "VT323-Regular.ttf")
if not os.path.exists(VT323):
    urllib.request.urlretrieve(
        "https://github.com/google/fonts/raw/main/ofl/vt323/VT323-Regular.ttf", VT323)
# system monospace for body text
MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"

# ---- palette (from david_terminal.css :root) ----
BG    = (10, 10, 14)      # #0a0a0e
INK   = (212, 206, 184)   # #d4ceb8
MUTED = (107, 102, 85)    # #6b6655
DIM   = (60, 58, 48)      # #3c3a30
HI    = (236, 229, 196)   # #ece5c4
AMBER = (212, 167, 62)    # #d4a73e
PINK  = (255, 45, 149)    # #ff2d95
CYAN  = (0, 229, 255)     # #00e5ff
GREEN = (80, 255, 128)    # #50ff80
YELLOW= (255, 234, 0)     # #ffea00

W, H = 1200, 630
MX = 70  # left/right margin

def f_vt(size):   return ImageFont.truetype(VT323, size)
def f_mono(size): return ImageFont.truetype(MONO, size)

# ---- rainbow gradient (matches .plasma 90deg stops) ----
STOPS = [(0.00, PINK), (0.25, YELLOW), (0.50, GREEN), (0.75, CYAN), (1.00, PINK)]
def rainbow(p):
    p = max(0.0, min(1.0, p))
    for i in range(len(STOPS) - 1):
        a, ca = STOPS[i]; b, cb = STOPS[i + 1]
        if a <= p <= b:
            t = (p - a) / (b - a) if b > a else 0
            return tuple(int(ca[k] + (cb[k] - ca[k]) * t) for k in range(3))
    return STOPS[-1][1]

# ---- plasma (exact port of plasmaFrame from david_terminal.js) ----
RAMP = "  .,-:;!=*#%@"
def plasma_frame(cols, rows, t):
    cx, cy = cols / 2, rows / 2
    grid = []
    for y in range(rows):
        row = []
        for x in range(cols):
            dx = x - cx; dy = (y - cy) * 2
            r = math.sqrt(dx * dx + dy * dy)
            v = (math.sin(x * 0.22 + t * 1.7) +
                 math.sin(y * 0.42 + t * 1.3) +
                 math.sin((x + y) * 0.18 + t * 1.0) +
                 math.sin(r * 0.30 - t * 2.1))
            idx = ((v + 4) / 8) * (len(RAMP) - 1)
            idx = max(0, min(len(RAMP) - 1, int(idx)))
            row.append(RAMP[idx])
        grid.append(row)
    return grid

img = Image.new("RGB", (W, H), BG)
d = ImageDraw.Draw(img)

# ===== prompt bar =====
pb_y = 48
fm = f_mono(27)
x = MX
for txt, col in [("$ ", AMBER), ("less", GREEN), (" ~/david/index.txt", MUTED)]:
    d.text((x, pb_y), txt, font=fm, fill=col)
    x += d.textlength(txt, font=fm)
meta = "last edit: 2026-05-24"
fm2 = f_mono(22)
d.text((W - MX - d.textlength(meta, font=fm2), pb_y + 4), meta, font=fm2, fill=DIM)
# thin rule under prompt bar
d.line([(MX, pb_y + 44), (W - MX, pb_y + 44)], fill=DIM, width=1)

# ===== DAVID title with chromatic aberration + pink glow =====
title = "DAVID"
ft = f_vt(280)
tw = d.textlength(title, font=ft)
tx = MX - 6
ty = 92
# pink glow layer
glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
gd = ImageDraw.Draw(glow)
gd.text((tx, ty), title, font=ft, fill=(255, 60, 180, 90))
glow = glow.filter(ImageFilter.GaussianBlur(14))
img.paste(Image.alpha_composite(img.convert("RGBA"), glow).convert("RGB"), (0, 0))
d = ImageDraw.Draw(img)
# aberration: pink left, cyan right, ink on top
d.text((tx - 7, ty), title, font=ft, fill=PINK)
d.text((tx + 7, ty), title, font=ft, fill=CYAN)
d.text((tx, ty), title, font=ft, fill=INK)

# ===== byline (auto-fit to width) =====
by_y = ty + 250
segs = [("david godlewski", INK), ("  /  ", DIM), ("problem solver", MUTED),
        ("  /  ", DIM), ("systems & homebrew", MUTED),
        ("  /  ", DIM), ("rust on weird hardware", MUTED),
        ("  ·  ", DIM), ("cambridge, ma", MUTED)]
bsz = 23
while bsz > 14:
    fb = f_mono(bsz)
    total = sum(d.textlength(t, font=fb) for t, _ in segs)
    if total <= W - 2 * MX:
        break
    bsz -= 1
x = MX
for txt, col in segs:
    d.text((x, by_y), txt, font=fb, fill=col)
    x += d.textlength(txt, font=fb)

# ===== status line =====
st_y = by_y + 40
fs = f_mono(22)
d.ellipse([(MX, st_y + 6), (MX + 11, st_y + 17)], fill=GREEN)
x = MX + 24
d.text((x, st_y), "STATUS ", font=fs, fill=AMBER)
x += d.textlength("STATUS ", font=fs)
d.text((x, st_y), "open to new roles — systems, infra, backend, security.", font=fs, fill=INK)

# ===== rainbow ASCII plasma block (fills width, sits inside bottom margin) =====
fp = f_mono(20)
chw = d.textlength("M", font=fp)
chh = 25
px0 = MX
py0 = st_y + 50
rows = 7
cols = int((W - 2 * MX) / chw)            # fill content width, keep right margin
grid = plasma_frame(cols, rows, 4.2)
for ry in range(rows):
    for rx in range(cols):
        ch = grid[ry][rx]
        if ch == " ":
            continue
        col = rainbow(rx / (cols - 1))
        d.text((px0 + rx * chw, py0 + ry * chh), ch, font=fp, fill=col)

# ===== scanline overlay (screen blend, very subtle) =====
scan = Image.new("RGB", (W, H), (0, 0, 0))
sd = ImageDraw.Draw(scan)
for y in range(0, H, 3):
    sd.line([(0, y), (W, y)], fill=(8, 8, 8), width=1)
img = ImageChops.screen(img, scan)

img.save(OUT, optimize=True)
print("wrote", OUT, img.size, os.path.getsize(OUT), "bytes")
