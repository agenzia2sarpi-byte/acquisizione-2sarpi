#!/usr/bin/env python3
"""Genera le icone di 'Acquisizione 2 Sarpi' (PNG + set per .icns).

Uso:  python3 genera_icone.py
Richiede: Pillow (gia' presente sul Mac di Gaetano).
"""
from PIL import Image, ImageDraw, ImageFont
import os

QUI = os.path.dirname(os.path.abspath(__file__))

ROSSO_ALTO = (176, 31, 31)
ROSSO_BASSO = (134, 22, 22)
CREMA = (245, 242, 234)
CREMA_TENUE = (245, 242, 234, 150)

BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
BLACK = "/System/Library/Fonts/Supplemental/Arial Black.ttf"


def font(path, size):
    try:
        return ImageFont.truetype(path, size)
    except Exception:
        return ImageFont.load_default()


def disegna(lato: int) -> Image.Image:
    # Si lavora a 4x e si riduce: bordi puliti senza librerie extra.
    S = lato * 4
    img = Image.new("RGB", (S, S), ROSSO_ALTO)
    d = ImageDraw.Draw(img, "RGBA")

    # Fondo pieno: poche tinte, file leggerissimi (contano per un'icona che deve caricare ovunque)

    # Filetto superiore, come la testata dei due piani
    d.rectangle([S * 0.14, S * 0.135, S * 0.86, S * 0.135 + max(2, S * 0.018)], fill=CREMA)

    # Monogramma
    testo = "2S"
    f = font(BLACK, int(S * 0.46))
    bb = d.textbbox((0, 0), testo, font=f)
    tw, th = bb[2] - bb[0], bb[3] - bb[1]
    d.text(((S - tw) / 2 - bb[0], S * 0.50 - th / 2 - bb[1]), testo, font=f, fill=CREMA)

    # Filetto inferiore + dicitura (solo sulle misure grandi, altrimenti sporca)
    if lato >= 128:
        d.rectangle([S * 0.30, S * 0.735, S * 0.70, S * 0.735 + max(2, S * 0.010)], fill=CREMA_TENUE)
        f2 = font(BOLD, int(S * 0.072))
        cap = "ACQUISIZIONE"
        # spaziatura tra lettere, a mano
        sp = int(S * 0.022)
        larg = sum(d.textbbox((0, 0), ch, font=f2)[2] - d.textbbox((0, 0), ch, font=f2)[0] for ch in cap) + sp * (len(cap) - 1)
        x = (S - larg) / 2
        for ch in cap:
            d.text((x, S * 0.795), ch, font=f2, fill=CREMA_TENUE)
            b = d.textbbox((0, 0), ch, font=f2)
            x += (b[2] - b[0]) + sp

    return img.resize((lato, lato), Image.LANCZOS)


MISURE = [16, 32, 48, 64, 128, 152, 167, 180, 192, 256, 512, 1024]

if __name__ == "__main__":
    for m in MISURE:
        im = disegna(m).quantize(colors=16, method=Image.MEDIANCUT)
        im.save(os.path.join(QUI, f"icona-{m}.png"), optimize=True)
    disegna(1024).quantize(colors=16).save(os.path.join(QUI, "icona.png"), optimize=True)
    for m in MISURE:
        p = os.path.join(QUI, f"icona-{m}.png")
        print(f"  icona-{m}.png  {os.path.getsize(p)/1024:.1f} KB")
    print("Icone generate in", QUI)
