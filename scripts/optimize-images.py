"""Generate WebP assets without resizing sprite sheets or removing PNG sources.

Run with: py scripts/optimize-images.py (requires Pillow).
"""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]

def convert(source):
    target = source.with_suffix('.webp')
    with Image.open(source) as image:
        lossless = source.parent.name != 'backgrounds' or 'castle' in source.stem
        image.save(target, 'WEBP', lossless=lossless, quality=84, method=6, exact=True)
    return source.stat().st_size, target.stat().st_size

if __name__ == '__main__':
    sources = sorted((ROOT / 'assets').rglob('*.png'))
    with ThreadPoolExecutor(max_workers=4) as executor:
        results = list(executor.map(convert, sources))
    before, after = map(sum, zip(*results))
    print(f'{len(results)} images: {before:,} -> {after:,} bytes ({1-after/before:.1%} smaller)')
