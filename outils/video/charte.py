#!/usr/bin/env python3
"""Habillage à la charte du site du Bureau des Légendes, appliqué au montage (montage.py).
Typo : Jost (Google Fonts, variable). Couleurs du site : noir #19110B, crème #F6F1EB, gris #6B635C, bleu lustre #3C6A9E.
Écrans d'ouverture et de fin sur l'entrée de l'immeuble, assombrie, avec le logo en haut à gauche comme sur le site.
Usage : charte.py [--preview t1,t2,...] | charte.py sortie.mp4"""
import sys, os, subprocess
from PIL import Image, ImageDraw, ImageFont
import montage as M

FD = "/home/claude/video-bdl/fonts/"
IMG = "/home/claude/bureau-des-legendes/img/"

def jost(size, wght):
    f = ImageFont.truetype(FD + "Jost.ttf", size)
    f.set_variation_by_axes([wght]); return f

# Couleurs du site (index.html, :root)
NOIR, CREME, GRIS, BLANC = (25, 17, 11), (246, 241, 235), (107, 99, 92), (255, 255, 255)
BLEU, BLEU_F, BLEU_C, GLACE = (60, 106, 158), (44, 84, 134), (127, 166, 214), (228, 238, 249)
W, H = M.W, M.H

M.BG, M.INK, M.EMERALD, M.TANGERINE = CREME, NOIR, NOIR, BLEU
M.F_CAP = jost(38, 400)
M.F_TAG = jost(17, 500)
M.F_LAB = jost(24, 500)
M.F_ITEM = jost(50, 400)
M.F_PLUS = jost(48, 400)
M.F_SMALL = jost(24, 400)
F_HERO = jost(84, 400)
F_SOUS = jost(34, 300)
M.BG_IMG = M.shadow_bg([(M.CARD_X, M.CARD_Y, M.CARD_W, M.CARD_H)])
M.BG_SPLIT = M.shadow_bg([(M.SPLIT_XA, M.SPLIT_Y, M.SPLIT_W, M.SPLIT_H), (M.SPLIT_XB, M.SPLIT_Y, M.SPLIT_W, M.SPLIT_H)])
M.BG_SPLIT_A = M.shadow_bg([(M.SPLIT_XA, M.SPLIT_Y, M.SPLIT_W, M.SPLIT_H)])

ease, ease_out, mix = M.ease, M.ease_out, M.mix

def espace(d, xy, txt, f, fill, track):
    """Texte en capitales espacées, comme les titres du site (letter-spacing)."""
    x, y = xy
    for ch in txt:
        d.text((x, y), ch, font=f, fill=fill)
        x += d.textlength(ch, font=f) + track
    return x

def largeur_espace(d, txt, f, track):
    return sum(d.textlength(ch, font=f) + track for ch in txt) - track

def espace_centre(d, y, txt, f, fill, track, cx=W / 2):
    espace(d, (cx - largeur_espace(d, txt, f, track) / 2, y), txt, f, fill, track)

# Logo du site (B + « Bureau des Légendes »), en blanc sur l'image
LOGO = Image.open(IMG + "logo-blanc.png").convert("RGBA")
LOGO = LOGO.resize((int(LOGO.width * 64 / LOGO.height), 64), Image.LANCZOS)

# Entrée de l'immeuble (ouverture) et verrière de nuit (fin), légèrement agrandies pour un lent mouvement
def fond(nom):
    im = Image.open(IMG + nom).convert("RGB")
    s = 1.12 * max(W / im.width, H / im.height)
    return im.resize((int(im.width * s), int(im.height * s)), Image.LANCZOS)
ENTREE, VERRIERE = fond("entree.webp"), fond("verriere-nuit.jpg")
VOILE = Image.new("L", (W, H))
dv = ImageDraw.Draw(VOILE)
for y in range(H):  # voile noir, plus dense au centre (texte) et en bas
    dv.line((0, y, W, y), fill=int(170 + 55 * (1 - abs(y - H * 0.5) / (H * 0.5)) ** 0.6))

def image_bg(src, t, dur):
    k = ease(t / max(dur, 0.1))
    z = 1.0 + 0.05 * k
    x0 = (src.width - W / z) / 2 + 18 * k
    y0 = (src.height - H / z) * 0.4
    im = src.resize((W, H), Image.BICUBIC, box=(x0, y0, x0 + W / z, y0 + H / z))
    im.paste(Image.new("RGB", (W, H), NOIR), (0, 0), VOILE)
    return im

def entete(im, a):
    """Logo en haut à gauche et badge « Powered by Nexudus », comme sur le site."""
    if a <= 0: return
    lg = LOGO.copy()
    if a < 1: lg.putalpha(lg.split()[3].point(lambda v: int(v * a)))
    im.paste(lg, (150, 80), lg)
    d = ImageDraw.Draw(im)
    f = jost(15, 500)
    col = mix(NOIR, (230, 226, 221), a)
    tw = largeur_espace(d, "POWERED BY NEXUDUS", f, 3)
    x1 = W - 150
    d.rectangle((x1 - tw - 28, 96, x1, 128), outline=col, width=1)
    espace(d, (x1 - tw - 14, 103), "POWERED BY NEXUDUS", f, col, 3)

def tc(d, y, txt, f, fill, cx=W / 2):
    M.text_center(d, y, txt, f, fill, cx)

def intro_frame(fx, t):
    im = image_bg(ENTREE, t + (0 if fx == "intro1" else 4.5), 11.0)
    d = ImageDraw.Draw(im)
    a = [ease_out((t - s) / 0.7) for s in (0.1, 0.5, 0.9)]
    entete(im, 1.0 if fx == "intro2" else ease_out(t / 0.6))
    if fx == "intro1":
        tc(d, 360 + 24 * (1 - a[0]), "Nexudus, le logiciel de gestion", F_HERO, mix(NOIR, BLANC, a[0]))
        tc(d, 465 + 24 * (1 - a[0]), "des espaces que l'on loue.", F_HERO, mix(NOIR, BLANC, a[0]))
        lw = int(90 * ease_out((t - 0.6) / 0.8))
        if lw > 0: d.rectangle((W / 2 - lw / 2, 590, W / 2 + lw / 2, 592), fill=BLEU_C)
        tc(d, 622 + 20 * (1 - a[1]), "Coworkings, bureaux, self-stockage : plus de 4 000 espaces dans 90 pays.", F_SOUS, mix(NOIR, (226, 220, 213), a[1]))
    else:
        espace_centre(d, 262 + 20 * (1 - a[0]), "POUR UN ESPACE DE COWORKING, IL GÈRE :", jost(24, 500), mix(NOIR, (226, 220, 213), a[0]), 5)
        bw = max(d.textlength(it, font=M.F_ITEM) for it in M.ITEMS) + 44
        for n, txt in enumerate(M.ITEMS):
            ai = ease_out((t - 0.6 - n * 0.55) / 0.6)
            if ai <= 0: continue
            y = 345 + n * 92
            x = int((W - bw) / 2) - int(30 * (1 - ai))
            d.rectangle((x, y + 27, x + 9, y + 36), fill=mix(NOIR, BLEU_C, ai))  # petit carré bleu des titres du site
            d.text((x + 44, y), txt, font=M.F_ITEM, fill=mix(NOIR, BLANC, ai))
        af = ease_out((t - 3.4) / 0.8)
        tc(d, 772 + 16 * (1 - af), "Voici une journée au Bureau des Légendes.", jost(40, 400), mix(NOIR, BLEU_C, af))
    return im

def fin_frame(t, dur):
    im = image_bg(VERRIERE, t, dur)
    d = ImageDraw.Draw(im)
    a1 = ease_out((t - 0.1) / 0.7)
    up = ease((t - 2.4) / 0.8)
    entete(im, ease_out(t / 0.6) * (1 - up))  # l'en-tête s'efface quand le titre remonte
    ty = 450 - 270 * up
    tc(d, ty + 20 * (1 - a1), "Réservations, contrats, CRM, facturation.", F_HERO, mix(NOIR, BLANC, a1))
    a2 = ease_out((t - 2.9) / 0.6)
    if a2 > 0:
        tc(d, 298 + 14 * (1 - a2), "… et bien plus encore.", jost(42, 400), mix(NOIR, BLEU_C, a2))
    t0, top, bot = 3.4, 370, 860
    if t > t0:
        cy = (top + bot) / 2
        off = (t - t0) * 72.0
        fade_in = ease_out((t - t0) / 0.6)
        fade_out = 1 - ease((t - (dur - 0.9)) / 0.8)
        for n, txt in enumerate(M.PLUS):
            y = bot + 20 + n * 76 - off
            if y < top - 40 or y > bot + 40: continue
            dist = abs(y + 25 - cy) / ((bot - top) / 2)
            al = max(0.0, 1 - dist ** 1.6) * fade_in * fade_out
            col = mix(NOIR, BLANC, al * (0.55 + 0.45 * max(0, 1 - dist * 2.2)))
            tc(d, y, txt, M.F_PLUS, col)
    a3 = ease_out((t - (dur - 1.8)) / 0.8)
    if a3 > 0:
        tc(d, 950, "Le Bureau des Légendes est un espace fictif. Les écrans Nexudus sont réels.", M.F_SMALL, mix(NOIR, (200, 192, 184), a3))
    return im

def caption(im, sc, t, y_base):
    """Chapitre en capitales espacées précédé du petit carré bleu (comme « ■ COWORKING · 1ER ÉTAGE » sur le site), puis sous-titre."""
    a = ease_out((t - 0.15) / 0.5)
    layer = Image.new("RGBA", (W, 120), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    tag = sc["tag"].upper()
    tw = largeur_espace(d, tag, M.F_TAG, 4) + 22
    x0 = (W - tw) / 2
    d.rectangle((x0, 9, x0 + 8, 17), fill=BLEU + (255,))
    espace(d, (x0 + 22, 2), tag, M.F_TAG, GRIS + (255,), 4)
    M.text_center(d, 38, sc["cap"], M.F_CAP, NOIR + (255,))
    if a < 1:
        layer.putalpha(layer.split()[3].point(lambda v: int(v * a)))
    im.paste(layer, (0, y_base - 4 + int(18 * (1 - a))), layer)

M.intro_frame, M.fin_frame, M.caption = intro_frame, fin_frame, caption

# Le fondu d'ouverture part du noir du site (et non de l'émeraude StockBox)
_frame_at = M.frame_at
def frame_at(t):
    if t < 0.4:
        M.EMERALD = NOIR
    return _frame_at(t)
M.frame_at = frame_at

if __name__ == "__main__":
    if len(sys.argv) > 2 and sys.argv[1] == "--preview":
        for s_ in sys.argv[2].split(","):
            M.frame_at(float(s_)).save(f"/home/claude/video-bdl/preview_{float(s_):06.2f}.jpg", quality=90)
        print("total", M.TOTAL); sys.exit()
    out = sys.argv[1]
    tmp = out[:-4] + ".tmp.mp4"
    p = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(M.FPS), "-i", "-",
                          "-c:v", "libx264", "-crf", "18", "-preset", "veryfast", "-pix_fmt", "yuv420p", "-movflags", "+faststart", tmp], stdin=subprocess.PIPE)
    for f in range(int(round(M.TOTAL * M.FPS))):
        p.stdin.write(M.frame_at(f / M.FPS).tobytes())
    p.stdin.close()
    if p.wait() == 0:
        os.replace(tmp, out); print("ok", out, M.TOTAL)
