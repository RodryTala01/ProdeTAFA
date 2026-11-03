#!/usr/bin/env python3
"""Generate Prode TAFA PWA branding from the existing official crest.

Run: python -m pip install Pillow && python scripts/generate-tafa-icons.py
The original artwork stays unchanged at public/brand/tafa.png.
"""
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "public" / "brand" / "tafa.png"
OUT = ROOT / "public" / "icons"
OUT.mkdir(parents=True, exist_ok=True)
RESAMPLE = Image.Resampling.LANCZOS
DARK = (9, 10, 9, 255)

source = Image.open(SOURCE).convert("RGBA")
alpha = source.getchannel("A")
# Preserve the original transparent silhouette; opaque source files have their
# background removed only if it can be reliably identified from the corners.
if alpha.getextrema()[0] >= 245:
    rgb = source.convert("RGB")
    corners = [rgb.getpixel((x, y)) for x in (0, rgb.width-1) for y in (0, rgb.height-1)]
    background = tuple(round(sum(c[i] for c in corners) / len(corners)) for i in range(3))
    diff = ImageChops.difference(rgb, Image.new("RGB", rgb.size, background)).convert("L")
    tentative = diff.point(lambda n: min(255, max(0, (n - 22) * 4)))
    bounds = tentative.getbbox()
    if bounds and (bounds[2]-bounds[0])*(bounds[3]-bounds[1]) < rgb.width*rgb.height*0.93:
        source.putalpha(tentative)
        alpha = tentative

bbox = alpha.point(lambda v: 255 if v > 18 else 0).getbbox()
if bbox:
    source = source.crop(bbox)

def centered_icon(size, scale, transparent=False):
    background = (0, 0, 0, 0) if transparent else DARK
    result = Image.new("RGBA", (size, size), background)
    max_side = round(size * scale)
    ratio = min(max_side / source.width, max_side / source.height)
    render = source.resize((max(1, round(source.width * ratio)), max(1, round(source.height * ratio))), RESAMPLE)
    result.alpha_composite(render, ((size-render.width)//2, (size-render.height)//2))
    return result

centered_icon(192, 0.82).save(OUT / "tafa-192.png", optimize=True)
centered_icon(512, 0.82).save(OUT / "tafa-512.png", optimize=True)
# The safe zone for Android adaptive icons is the central ~66% of the image.
centered_icon(512, 0.62).save(OUT / "tafa-maskable-512.png", optimize=True)
centered_icon(180, 0.78).convert("RGB").save(ROOT / "public" / "apple-touch-icon.png", optimize=True)
centered_icon(32, 0.86).save(OUT / "favicon-32.png", optimize=True)
centered_icon(64, 0.82).save(ROOT / "public" / "favicon.ico", format="ICO", sizes=[(16,16),(32,32),(48,48),(64,64)])

# Android badges must be alpha-only white silhouettes on fully transparent
# backgrounds. Do not reuse the full-color app icon as a badge.
badge = Image.new("RGBA", (96, 96), (0,0,0,0))
source_alpha = source.getchannel("A")
bbox = source_alpha.point(lambda v: 255 if v > 30 else 0).getbbox()
if bbox:
    silhouette = source_alpha.crop(bbox)
    # A completely opaque rectangle yields a solid square: use an outline of
    # a shield as an intentional fall-back instead.
    if silhouette.getextrema()[0] >= 245:
        shield = Image.new("L", (96, 96), 0)
        d = ImageDraw.Draw(shield)
        d.polygon([(16,11),(80,11),(80,55),(68,74),(48,87),(28,74),(16,55)], fill=255)
        silhouette = shield
        white = Image.new("RGBA", (96,96), (255,255,255,0))
        white.putalpha(silhouette)
        badge = white
    else:
        scale = min(78/silhouette.width, 78/silhouette.height)
        silhouette = silhouette.resize((max(1,round(silhouette.width*scale)), max(1,round(silhouette.height*scale))), RESAMPLE)
        white = Image.new("RGBA", silhouette.size, (255,255,255,0))
        white.putalpha(silhouette)
        badge.alpha_composite(white, ((96-white.width)//2, (96-white.height)//2))
badge.save(OUT / "tafa-badge-96.png", optimize=True)

for path in sorted([*OUT.glob("*.png"), ROOT/"public"/"apple-touch-icon.png", ROOT/"public"/"favicon.ico"]):
    print(f"{path.relative_to(ROOT)}: {path.stat().st_size} bytes")
