"""Genera og-image.png (1200x630) per l'anteprima dei link (WhatsApp, Telegram, ecc.).

Uso (dalla radice del repo):
    python tools/make_og_image.py            -> scrive ./og-image.png
    python tools/make_og_image.py out.png    -> percorso personalizzato

Richiede Pillow. Disegna una griglia 6x6 stilizzata con le aree colorate del gioco
e alberi disegnati a forme (niente font emoji, cosi' il risultato e' uguale ovunque).
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
SCALE = 2  # disegno a 2x e riduco: bordi antialiasing

# Colori dal tema (style.css)
BG = (238, 242, 245)
CARD = (255, 255, 255)
DARK = (44, 62, 80)
GREEN_DARK = (39, 174, 96)
GREY = (102, 102, 102)
REGION_COLORS = [
    (255, 255, 255), (187, 222, 251), (255, 224, 178), (200, 230, 201),
    (248, 187, 208), (225, 190, 231), (240, 244, 195), (207, 216, 220),
]

# Griglia 6x6: una soluzione valida (1 albero per riga/colonna/area, nessun contatto)
REGIONS = [
    [0, 0, 1, 1, 1, 2],
    [0, 0, 1, 1, 2, 2],
    [3, 3, 3, 1, 2, 2],
    [3, 4, 4, 4, 5, 2],
    [3, 4, 4, 5, 5, 5],
    [4, 4, 4, 4, 5, 5],
]
TREES = [(0, 1), (1, 3), (2, 5), (3, 0), (4, 2), (5, 4)]


def load_font(names, size):
    font_dirs = [os.path.join(os.environ.get('WINDIR', 'C:\\Windows'), 'Fonts'),
                 '/usr/share/fonts/truetype/dejavu', '/Library/Fonts']
    for name in names:
        for d in font_dirs:
            path = os.path.join(d, name)
            if os.path.exists(path):
                return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def draw_tree(draw, cx, cy, cell):
    """Albero stilizzato: tronco + chioma a tre cerchi."""
    trunk_w, trunk_h = cell * 0.12, cell * 0.28
    draw.rectangle([cx - trunk_w / 2, cy + cell * 0.05, cx + trunk_w / 2, cy + cell * 0.05 + trunk_h],
                   fill=(121, 85, 72))
    r = cell * 0.2
    for dx, dy, col in [(-0.14, 0.0, (46, 158, 79)), (0.14, 0.0, (46, 158, 79)),
                        (0.0, -0.17, (56, 183, 94))]:
        x, y = cx + dx * cell, cy + dy * cell - cell * 0.05
        draw.ellipse([x - r, y - r, x + r, y + r], fill=col)


def main(out_path):
    s = SCALE
    img = Image.new('RGB', (W * s, H * s), BG)
    d = ImageDraw.Draw(img)

    # Card bianca di sfondo
    d.rounded_rectangle([40 * s, 40 * s, (W - 40) * s, (H - 40) * s], radius=32 * s, fill=CARD)

    # Griglia a sinistra
    n = len(REGIONS)
    cell = 76 * s
    gx, gy = 90 * s, (H * s - cell * n) // 2
    for r in range(n):
        for c in range(n):
            x0, y0 = gx + c * cell, gy + r * cell
            d.rectangle([x0, y0, x0 + cell, y0 + cell], fill=REGION_COLORS[REGIONS[r][c] % 8])
    # Linee sottili
    for i in range(n + 1):
        d.line([gx + i * cell, gy, gx + i * cell, gy + n * cell], fill=(200, 205, 210), width=2 * s)
        d.line([gx, gy + i * cell, gx + n * cell, gy + i * cell], fill=(200, 205, 210), width=2 * s)
    # Bordi spessi tra aree diverse
    thick = 5 * s
    for r in range(n):
        for c in range(n):
            x0, y0 = gx + c * cell, gy + r * cell
            if c < n - 1 and REGIONS[r][c] != REGIONS[r][c + 1]:
                d.line([x0 + cell, y0, x0 + cell, y0 + cell], fill=DARK, width=thick)
            if r < n - 1 and REGIONS[r][c] != REGIONS[r + 1][c]:
                d.line([x0, y0 + cell, x0 + cell, y0 + cell], fill=DARK, width=thick)
    d.rectangle([gx, gy, gx + n * cell, gy + n * cell], outline=DARK, width=7 * s)
    for (r, c) in TREES:
        draw_tree(d, gx + c * cell + cell / 2, gy + r * cell + cell / 2, cell)

    # Testi a destra
    tx = gx + n * cell + 70 * s
    title_font = load_font(['segoeuib.ttf', 'arialbd.ttf', 'DejaVuSans-Bold.ttf'], 120 * s)
    sub_font = load_font(['segoeui.ttf', 'arial.ttf', 'DejaVuSans.ttf'], 40 * s)
    small_font = load_font(['seguisb.ttf', 'arialbd.ttf', 'DejaVuSans-Bold.ttf'], 30 * s)

    d.text((tx, 170 * s), 'Alberi', font=title_font, fill=GREEN_DARK)
    d.text((tx, 330 * s), 'Un puzzle di logica', font=sub_font, fill=DARK)
    d.text((tx, 382 * s), 'ogni giorno', font=sub_font, fill=DARK)

    # "Pillola" in basso
    pill = 'Gioca gratis'
    pw = d.textlength(pill, font=small_font)
    py = 470 * s
    d.rounded_rectangle([tx, py, tx + pw + 50 * s, py + 62 * s], radius=31 * s, fill=(46, 204, 113))
    d.text((tx + 25 * s, py + 12 * s), pill, font=small_font, fill=(255, 255, 255))

    img = img.resize((W, H), Image.LANCZOS)
    img.save(out_path, 'PNG', optimize=True)
    print('Scritto', out_path, img.size)


if __name__ == '__main__':
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    main(sys.argv[1] if len(sys.argv) > 1 else os.path.join(repo_root, 'og-image.png'))
