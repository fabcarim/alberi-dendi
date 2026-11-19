"""Genera le icone dell'app installabile (PWA) in ./icons/.

Uso (dalla radice del repo):
    python tools/make_icons.py

Scrive:
    icons/icon-192.png, icons/icon-512.png   icona normale (angoli arrotondati)
    icons/maskable-512.png                   icona "maskable" (Android ritaglia
                                             cerchio/goccia: tutto il disegno
                                             importante sta nell'80% centrale)
    icons/apple-touch-icon.png (180)         icona per iPhone/iPad
Richiede Pillow. Riusa colori e albero di tools/make_og_image.py.
"""
import os

from PIL import Image, ImageDraw

from make_og_image import DARK, REGION_COLORS, draw_tree

GREEN = (46, 204, 113)
SS = 4  # supersampling per bordi morbidi


def draw_icon(size, maskable=False, rounded=True):
    S = size * SS
    img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if rounded and not maskable:
        d.rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * 0.22), fill=GREEN)
    else:
        d.rectangle([0, 0, S, S], fill=GREEN)

    # Griglia 2x2 di aree colorate al centro (piu' piccola se maskable)
    frac = 0.56 if maskable else 0.70
    g = int(S * frac)
    x0 = y0 = (S - g) // 2
    half = g // 2
    colors = [REGION_COLORS[1], REGION_COLORS[2], REGION_COLORS[3], REGION_COLORS[4]]
    for i, col in enumerate(colors):
        cx, cy = x0 + (i % 2) * half, y0 + (i // 2) * half
        d.rectangle([cx, cy, cx + half, cy + half], fill=col)
    w = max(2, int(S * 0.02))
    d.line([x0 + half, y0, x0 + half, y0 + g], fill=DARK, width=w)
    d.line([x0, y0 + half, x0 + g, y0 + half], fill=DARK, width=w)
    d.rectangle([x0, y0, x0 + g, y0 + g], outline=DARK, width=int(w * 1.6))

    # Albero grande al centro
    draw_tree(d, S / 2, S / 2 + g * 0.04, g * 0.95)

    return img.resize((size, size), Image.LANCZOS)


def main():
    repo = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    out = os.path.join(repo, 'icons')
    os.makedirs(out, exist_ok=True)
    targets = [
        ('icon-192.png', draw_icon(192)),
        ('icon-512.png', draw_icon(512)),
        ('maskable-512.png', draw_icon(512, maskable=True)),
        # iOS arrotonda da solo e non vuole trasparenze
        ('apple-touch-icon.png', draw_icon(180, rounded=False).convert('RGB')),
    ]
    for name, img in targets:
        path = os.path.join(out, name)
        img.save(path, 'PNG', optimize=True)
        print('Scritto', path, img.size)


if __name__ == '__main__':
    main()
