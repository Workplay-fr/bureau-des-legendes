#!/usr/bin/env python3
"""Vidéo « Ce qui se passe côté exploitant » — Bureau des Légendes × Nexudus (repris du montage StockBox).
Effets : zoom avant, zoom arrière, travelling, projecteur (le reste s'assombrit), clic, écran partagé site / Nexudus.
Transitions : fondu à l'intérieur d'un chapitre, glissement latéral entre chapitres. Sous-titres qui montent en fondu.
Usage : montage.py [--preview t1,t2,...] | montage.py sortie.mp4"""
import sys, subprocess, os
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops

W, H, FPS = 1920, 1080, 30
FADE, PUSH = 0.45, 0.6
CAPS = "/home/claude/video-bdl/caps/"
BG = (239, 237, 230)
INK = (20, 32, 28)
EMERALD = (15, 92, 69)
TANGERINE = (242, 140, 40)
F = "/usr/share/fonts/opentype/inter/"
font = lambda name, size: ImageFont.truetype(F + name, size)
F_CAP = font("Inter-Medium.otf", 38)
F_TAG = font("Inter-SemiBold.otf", 21)
F_T1 = font("InterDisplay-SemiBold.otf", 84)
F_T2 = font("Inter-Regular.otf", 36)
F_SMALL = font("Inter-Medium.otf", 24)
F_LAB = font("Inter-SemiBold.otf", 26)
F_ITEM = font("InterDisplay-Medium.otf", 50)

CARD_W, CARD_H = 1680, 900
CARD_X, CARD_Y = (W - CARD_W) // 2, 34
SW, SH = 1512, 810
AR = SW / SH

def S(img, dur, tag, cap, fx, **kw):
    return dict(img=img, dur=dur, tag=tag, cap=cap, fx=fx, **kw)

SCENES = [
    S("INTRO1", 4.5, None, None, "intro1"),
    S("INTRO2", 6.5, None, None, "intro2"),
    S("01_accueil.jpg", 5.0, "Le matin", "Chaque matin, Nexudus ouvre sur l'essentiel de la journée.", "spot", rect=(346, 262, 1382, 440)),
    S("02_chiffres.jpg", 5.0, "Le matin", "Contrats actifs, facturé ce mois-ci, unités occupées : tout est à jour.", "zoom_in", c=(864, 320), w=1150),
    S("03_unites.jpg", 5.0, "L'espace", "Chaque bureau et chaque poste, libre ou occupé, avec son prix.", "pan", c0=(560, 330), c1=(560, 520), w=1050),
    S("04_unite_matahari.jpg", 4.5, "L'espace", "Un clic sur un bureau occupé : le client et son contrat.", "spot", rect=(823, 214, 1417, 298), clic=(380, 395, 0.5)),
    S("05_contrat.jpg", 4.5, "L'espace", "Le contrat, son plan et sa facturation, au même endroit.", "spot", rect=(1043, 178, 1327, 395)),
    S("06_previsions.jpg", 4.5, "L'espace", "Et les factures à venir, mois par mois.", "pan", c0=(750, 300), c1=(750, 560), w=1250),
    S("20_site_hp.jpg", 4.5, "Une réservation en ligne", "Côté client : le site du Bureau des Légendes, branché sur Nexudus.", "zoom_out", c=(750, 400), w=950),
    S("21_site_poste.jpg", 4.0, "Une réservation en ligne", "Un poste pour aujourd'hui ? Les disponibilités sont réelles…", "spot", rect=(1005, 247, 1232, 278), clic=(1150, 186, 2.8)),
    S("22_site_plateau.jpg", 4.0, "Une réservation en ligne", "…il choisit son poste, directement sur le plan…", "zoom_in", c=(1060, 450), w=1150, clic=(1056, 421, 2.9)),
    S("23_site_c17.jpg", 4.0, "Une réservation en ligne", "…voit le créneau et le prix…", "spot", rect=(1180, 280, 1487, 476)),
    S("24_site_infos.jpg", 3.5, "Une réservation en ligne", "…donne quelques informations…", "pan", c0=(900, 250), c1=(1050, 520), w=1150),
    S("25_site_paiement.jpg", 3.5, "Une réservation en ligne", "…puis paie (ici, un paiement simulé).", "spot", rect=(1181, 208, 1487, 431)),
    S("SPLIT", 6.0, "Une réservation en ligne", "Poste réservé… et la réservation est déjà dans Nexudus.", "split",
      a="26_site_confirm.jpg", b="27_flow_resa.jpg", la="Sur le site", lb="Dans Nexudus", ra=(1170, 95, 1495, 465), rb=(797, 671, 1335, 712)),
    S("28_flow_resa_lea.jpg", 4.5, "Une réservation en ligne", "Cliente créée, poste C17 attribué, montant calculé.", "spot", rect=(1043, 178, 1327, 395)),
    S("30_agent_offres.jpg", 4.5, "Un prospect", "Sur le site, l'agent répond et propose les bureaux libres…", "zoom_in", c=(749, 470), w=950),
    S("31_agent_recap.jpg", 4.0, "Un prospect", "…prépare le récapitulatif du devis…", "spot", rect=(569, 445, 915, 703)),
    S("SPLIT", 6.0, "Un prospect", "…et la demande arrive dans le CRM, à la bonne étape.", "split",
      a="32_agent_devis.jpg", b="33_crm_carte.jpg", la="Sur le site", lb="Dans Nexudus", ra=(569, 497, 915, 703), rb=(266, 231, 550, 311)),
    S("34_crm_prospect.jpg", 4.5, "Un prospect", "La fiche prospect est prête, avec son responsable.", "zoom_out", c=(700, 330), w=1050),
    S("35_crm_taches.jpg", 4.5, "Un prospect", "Et les tâches de suivi se créent d'elles-mêmes.", "spot", rect=(176, 270, 1336, 377)),
    S("36_factures.jpg", 4.5, "Facturation et pilotage", "Les factures et les impayés se suivent d'un coup d'œil.", "pan", c0=(860, 300), c1=(860, 560), w=1300),
    S("37_question.jpg", 4.0, "Facturation et pilotage", "Une question ? Il suffit de la poser.", "zoom_in", c=(756, 190), w=1100),
    S("38_reponse_ia.jpg", 6.0, "Facturation et pilotage", "Nexudus répond à partir des données de l'espace.", "spot", rect=(662, 200, 1205, 640)),
    S("FIN", 19.66, None, None, "fin2"),
]

def ease(x):
    x = max(0.0, min(1.0, x))
    return x * x * (3 - 2 * x)

def ease_out(x):
    x = max(0.0, min(1.0, x))
    return 1 - (1 - x) ** 3

def rounded_mask(w, h, r):
    m = Image.new("L", (w, h), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, w - 1, h - 1), r, fill=255)
    return m

def shadow_bg(cards):
    bg = Image.new("RGB", (W, H), BG)
    sh = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(sh)
    for (x, y, w, h) in cards:
        d.rounded_rectangle((x + 6, y + 18, x + w - 6, y + h + 14), 26, fill=70)
    sh = sh.filter(ImageFilter.GaussianBlur(22))
    bg.paste(Image.new("RGB", (W, H), (120, 115, 100)), (0, 0), sh)
    return bg

MASK = rounded_mask(CARD_W, CARD_H, 22)
BG_IMG = shadow_bg([(CARD_X, CARD_Y, CARD_W, CARD_H)])
CLIP = Image.new("L", (W, H), 0); CLIP.paste(MASK, (CARD_X, CARD_Y))
_cache = {}

def load(name):
    if name not in _cache:
        im = Image.open(CAPS + name).convert("RGB")
        if im.size != (SW, SH):
            im = im.resize((SW, SH), Image.LANCZOS)
        if name == "38_reponse_ia.jpg":  # floute un nom réel présent dans les données de démo
            box = (684, 400, 900, 430)
            im.paste(im.crop(box).filter(ImageFilter.GaussianBlur(9)), box[:2])
        _cache[name] = im
    return _cache[name]

def rect_for(center, width):
    w = width; h = w / AR
    x = min(max(center[0] - w / 2, 0), SW - w)
    y = min(max(center[1] - h / 2, 0), SH - h)
    return (x, y, x + w, y + h)

def lerp_rect(a, b, k):
    return tuple(a[i] + (b[i] - a[i]) * k for i in range(4))

FULL = (0, 0, SW, SH)

def text_center(d, y, txt, f, fill, cx=W / 2):
    tw = d.textlength(txt, font=f)
    d.text((cx - tw / 2, y), txt, font=f, fill=fill)

def mix(c1, c2, a):
    return tuple(int(c1[i] + (c2[i] - c1[i]) * a) for i in range(3))

def caption(im, sc, t, y_base):
    """Chapitre + sous-titre, qui montent en fondu au début de la scène."""
    a = ease_out((t - 0.15) / 0.5)
    layer = Image.new("RGBA", (W, 110), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    text_center(d, 0, sc["tag"].upper(), F_TAG, TANGERINE + (255,))
    text_center(d, 34, sc["cap"], F_CAP, INK + (255,))
    if a < 1:
        layer.putalpha(layer.split()[3].point(lambda v: int(v * a)))
    im.paste(layer, (0, y_base + int(18 * (1 - a))), layer)

def to_card(r_view, pt):
    x0, y0, x1, y1 = r_view
    return (CARD_X + (pt[0] - x0) / (x1 - x0) * CARD_W, CARD_Y + (pt[1] - y0) / (y1 - y0) * CARD_H)

def draw_click(im, r_view, clic, t):
    x, y, tc = clic
    dt = t - tc
    if dt < -0.35 or dt > 0.9:
        return
    px, py = to_card(r_view, (x, y))
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
    if dt < 0:
        a = 1 - (-dt / 0.35)
        d.ellipse((px - 14, py - 14, px + 14, py + 14), fill=TANGERINE + (int(170 * a),))
    else:
        r = 14 + 60 * ease_out(dt / 0.9)
        d.ellipse((px - r, py - r, px + r, py + r), outline=TANGERINE + (int(200 * (1 - dt / 0.9)),), width=5)
        if dt < 0.25:
            d.ellipse((px - 14, py - 14, px + 14, py + 14), fill=TANGERINE + (int(170 * (1 - dt / 0.25)),))
    im.paste(ov, (0, 0), ov)

def title_frame(fx, t):
    im = Image.new("RGB", (W, H), EMERALD); d = ImageDraw.Draw(im)
    a1, a2, a3 = (ease_out((t - s) / 0.7) for s in (0.1, 0.45, 0.8))
    if fx == "titre":
        text_center(d, 420 + 20 * (1 - a1), "Ce qui se passe côté exploitant.", F_T1, mix(EMERALD, (255, 255, 255), a1))
        text_center(d, 545 + 20 * (1 - a2), "Une journée du centre StockBox, gérée avec Nexudus.", F_T2, mix(EMERALD, (215, 215, 215), a2))
        ly = 630
    else:
        text_center(d, 380 + 20 * (1 - a1), "Réservation, contrats, CRM, facturation.", F_T1, mix(EMERALD, (255, 255, 255), a1))
        text_center(d, 500 + 20 * (1 - a2), "Un seul outil, et beaucoup moins de saisie.", F_T2, mix(EMERALD, (215, 215, 215), a2))
        text_center(d, 650, "StockBox est un centre fictif. Les écrans Nexudus sont réels.", F_SMALL, mix(EMERALD, (170, 200, 188), a3))
        ly = 590
    lw = int(220 * ease_out((t - 0.3) / 1.0))
    if lw > 0:
        d.rectangle((W / 2 - lw / 2, ly, W / 2 + lw / 2, ly + 3), fill=TANGERINE)
    text_center(d, 960, "STOCKBOX  ×  NEXUDUS", F_TAG, mix(EMERALD, TANGERINE, a3))
    return im

ITEMS = ["Les postes et les bureaux, en temps réel",
         "La réservation des salles et des postes",
         "Les abonnements et les contrats",
         "La facturation, chaque mois"]

def intro_frame(fx, t):
    im = Image.new("RGB", (W, H), EMERALD); d = ImageDraw.Draw(im)
    a = [ease_out((t - s) / 0.7) for s in (0.1, 0.5, 0.9)]
    if fx == "intro1":
        text_center(d, 380 + 20 * (1 - a[0]), "Nexudus est un logiciel de gestion", F_T1, mix(EMERALD, (255, 255, 255), a[0]))
        text_center(d, 480 + 20 * (1 - a[0]), "pour les espaces que l'on loue.", F_T1, mix(EMERALD, (255, 255, 255), a[0]))
        text_center(d, 620 + 20 * (1 - a[1]), "Coworkings, bureaux, self-stockage : plus de 4 000 espaces dans 90 pays.", F_T2, mix(EMERALD, (215, 215, 215), a[1]))
    else:
        text_center(d, 250 + 20 * (1 - a[0]), "Pour un centre de self-stockage, il gère :", F_T2, mix(EMERALD, (215, 215, 215), a[0]))
        for n, txt in enumerate(ITEMS):
            ai = ease_out((t - 0.6 - n * 0.55) / 0.6)
            if ai <= 0:
                continue
            y = 345 + n * 92
            bw = max(d.textlength(it, font=F_ITEM) for it in ITEMS) + 40
            x = int((W - bw) / 2) - int(30 * (1 - ai))
            d.ellipse((x, y + 22, x + 14, y + 36), fill=mix(EMERALD, TANGERINE, ai))
            d.text((x + 40, y), txt, font=F_ITEM, fill=mix(EMERALD, (255, 255, 255), ai))
        af = ease_out((t - 3.4) / 0.8)
        text_center(d, 770 + 16 * (1 - af), "Voici une journée au centre StockBox.", F_T2, mix(EMERALD, TANGERINE, af))
    text_center(d, 960, "STOCKBOX  ×  NEXUDUS", F_TAG, mix(EMERALD, TANGERINE, a[2]))
    return im

PLUS = [
    "Le contrôle d'accès digital",
    "Une application mobile pour les membres",
    "Un portail membre",
    "Les événements et la communauté",
    "Des prix qui s'ajustent à la demande",
    "Les espaces et les plans modifiés par l'IA",
    "Prélèvements et relances automatiques",
    "Plusieurs sites dans un seul outil",
    "Tableaux de bord et rapports sur mesure",
]
F_PLUS = font("InterDisplay-Medium.otf", 46)
F_PLUS_T = font("Inter-Regular.otf", 40)

def fin_frame(t, dur):
    im = Image.new("RGB", (W, H), EMERALD); d = ImageDraw.Draw(im)
    a1 = ease_out((t - 0.1) / 0.7)
    up = ease((t - 2.4) / 0.8)  # le titre remonte pour laisser la place au défilé
    ty = 470 - 290 * up
    text_center(d, ty + 20 * (1 - a1), "Réservations, contrats, CRM, facturation.", F_T1, mix(EMERALD, (255, 255, 255), a1))
    a2 = ease_out((t - 2.9) / 0.6)
    if a2 > 0:
        text_center(d, 300 + 14 * (1 - a2), "… et bien plus encore.", F_PLUS_T, mix(EMERALD, TANGERINE, a2))
    # défilé vertical : la ligne au centre est en blanc, les autres s'estompent vers les bords
    t0, top, bot = 3.4, 370, 860
    if t > t0:
        speed = 72.0  # px/s
        gap = 76
        cy = (top + bot) / 2
        off = (t - t0) * speed
        fade_in = ease_out((t - t0) / 0.6)
        fade_out = 1 - ease((t - (dur - 0.9)) / 0.8)
        for n, txt in enumerate(PLUS):
            y = bot + 20 + n * gap - off
            if y < top - 40 or y > bot + 40:
                continue
            dist = abs(y + 25 - cy) / ((bot - top) / 2)
            al = max(0.0, 1 - dist ** 1.6) * fade_in * fade_out
            col = mix(EMERALD, (255, 255, 255), al * (0.55 + 0.45 * max(0, 1 - dist * 2.2)))
            text_center(d, y, txt, F_PLUS, col)
    a3 = ease_out((t - (dur - 1.8)) / 0.8)
    if a3 > 0:
        text_center(d, 900, "StockBox est un centre fictif. Les écrans Nexudus sont réels.", F_SMALL, mix(EMERALD, (170, 200, 188), a3))
    text_center(d, 970, "STOCKBOX  ×  NEXUDUS", F_TAG, mix(EMERALD, TANGERINE, ease_out((t - 0.8) / 0.7)))
    return im

def scene_frame(sc, t):
    fx, dur = sc["fx"], sc["dur"]
    if fx in ("intro1", "intro2"):
        return intro_frame(fx, t)
    if fx == "fin2":
        return fin_frame(t, dur)
    if fx in ("titre", "fin"):
        return title_frame(fx, t)
    if fx == "split":
        return split_frame(sc, t)
    src = load(sc["img"])
    k = ease((t - 0.35) / max(dur - 0.9, 0.1))
    if fx == "zoom_in":
        r = lerp_rect(FULL, rect_for(sc["c"], sc["w"]), k)
    elif fx == "zoom_out":
        r = lerp_rect(rect_for(sc["c"], sc["w"]), FULL, k)
    elif fx == "pan":
        r = lerp_rect(rect_for(sc["c0"], sc["w"]), rect_for(sc["c1"], sc["w"]), k)
    else:  # spot : léger rapprochement, puis le reste s'assombrit
        rc = ((sc["rect"][0] + sc["rect"][2]) / 2, (sc["rect"][1] + sc["rect"][3]) / 2)
        r = lerp_rect(FULL, rect_for(rc, SW * 0.95), k)
    im = BG_IMG.copy()
    im.paste(src.resize((CARD_W, CARD_H), Image.BICUBIC, box=r), (CARD_X, CARD_Y), MASK)
    if fx == "spot":
        a = ease((t - 0.6) / 0.7)
        if a > 0:
            x0, y0 = to_card(r, sc["rect"][:2]); x1, y1 = to_card(r, sc["rect"][2:])
            box = (x0 - 10, y0 - 10, x1 + 10, y1 + 10)
            dark = Image.new("L", (W, H), int(125 * a))
            ImageDraw.Draw(dark).rounded_rectangle(box, 14, fill=0)
            dark = ImageChops.multiply(dark, CLIP)
            im.paste(Image.new("RGB", (W, H), INK), (0, 0), dark)
            ImageDraw.Draw(im).rounded_rectangle(box, 14, outline=mix((255, 255, 255), TANGERINE, a), width=3)
    if "clic" in sc:
        draw_click(im, r, sc["clic"], t)
    caption(im, sc, t, CARD_Y + CARD_H + 22)
    return im

SPLIT_W = 880
SPLIT_H = int(SPLIT_W / AR)
SPLIT_Y = 250
SPLIT_XA, SPLIT_XB = 60, W - 60 - SPLIT_W
SMASK = rounded_mask(SPLIT_W, SPLIT_H, 18)
BG_SPLIT = shadow_bg([(SPLIT_XA, SPLIT_Y, SPLIT_W, SPLIT_H), (SPLIT_XB, SPLIT_Y, SPLIT_W, SPLIT_H)])
BG_SPLIT_A = shadow_bg([(SPLIT_XA, SPLIT_Y, SPLIT_W, SPLIT_H)])
_scache = {}

def small(name):
    if name not in _scache:
        _scache[name] = load(name).resize((SPLIT_W, SPLIT_H), Image.LANCZOS)
    return _scache[name]

def split_frame(sc, t):
    a_in = ease_out(t / 0.6)
    b_in = ease_out((t - 1.6) / 0.7)
    im = Image.blend(Image.blend(Image.new("RGB", (W, H), BG), BG_SPLIT_A, a_in), BG_SPLIT, max(0.0, b_in))
    sa, sb = small(sc["a"]), small(sc["b"])
    im.paste(Image.blend(Image.new("RGB", sa.size, BG), sa, a_in), (SPLIT_XA - int(80 * (1 - a_in)), SPLIT_Y), SMASK)
    d = ImageDraw.Draw(im)
    text_center(d, SPLIT_Y - 56, sc["la"].upper(), F_LAB, mix(BG, EMERALD, a_in), cx=SPLIT_XA + SPLIT_W / 2)
    if b_in > 0:
        im.paste(Image.blend(Image.new("RGB", sb.size, BG), sb, b_in), (SPLIT_XB + int(120 * (1 - b_in)), SPLIT_Y), SMASK)
        text_center(d, SPLIT_Y - 56, sc["lb"].upper(), F_LAB, mix(BG, EMERALD, b_in), cx=SPLIT_XB + SPLIT_W / 2)
        ax, ay = W / 2, SPLIT_Y + SPLIT_H / 2
        d.ellipse((ax - 30, ay - 30, ax + 30, ay + 30), fill=mix(BG, TANGERINE, b_in))
        wc = mix(BG, (255, 255, 255), b_in)
        d.line((ax - 12, ay, ax + 12, ay), fill=wc, width=4)
        d.line((ax + 2, ay - 10, ax + 12, ay), fill=wc, width=4)
        d.line((ax + 2, ay + 10, ax + 12, ay), fill=wc, width=4)
    for key, x0c, t0 in (("ra", SPLIT_XA, 0.8), ("rb", SPLIT_XB, 2.5)):
        if key in sc:
            al = ease((t - t0) / 0.5)
            if al > 0:
                r = sc[key]; f = SPLIT_W / SW
                box = (x0c + r[0] * f - 6, SPLIT_Y + r[1] * f - 6, x0c + r[2] * f + 6, SPLIT_Y + r[3] * f + 6)
                d.rounded_rectangle(box, 10, outline=mix(BG, TANGERINE, al), width=4)
    caption(im, sc, t, SPLIT_Y + SPLIT_H + 70)
    return im

STARTS = []
acc = 0.0
for sc in SCENES:
    STARTS.append(acc); acc += sc["dur"]
TOTAL = acc

def chapter_change(i):
    a, b = SCENES[i], SCENES[i + 1]
    return a["tag"] is not None and b["tag"] is not None and a["tag"] != b["tag"]

def frame_at(t):
    i = max(j for j, s in enumerate(STARTS) if s <= t + 1e-9)
    sc = SCENES[i]
    lt = t - STARTS[i]
    im = scene_frame(sc, lt)
    if i + 1 < len(SCENES):
        if chapter_change(i):
            if lt > sc["dur"] - PUSH:
                a = ease((lt - (sc["dur"] - PUSH)) / PUSH)
                nxt = scene_frame(SCENES[i + 1], 0.0)
                out = Image.new("RGB", (W, H), BG)
                dx = int(W * a)
                out.paste(im, (-dx, 0)); out.paste(nxt, (W - dx, 0))
                im = out
        elif lt > sc["dur"] - FADE:
            a = (lt - (sc["dur"] - FADE)) / FADE
            im = Image.blend(im, scene_frame(SCENES[i + 1], 0.0), ease(a))
    if t < 0.4:
        im = Image.blend(Image.new("RGB", (W, H), EMERALD), im, ease(t / 0.4))
    return im

if __name__ == "__main__":
    if len(sys.argv) > 2 and sys.argv[1] == "--preview":
        for s in sys.argv[2].split(","):
            frame_at(float(s)).save(f"/home/claude/video-bdl/preview_{float(s):06.2f}.jpg", quality=90)
        print("total", TOTAL)
        sys.exit()
    out = sys.argv[1] if len(sys.argv) > 1 else "/home/claude/video-bdl/video.mp4"
    tmp = out[:-4] + ".tmp.mp4"
    p = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                          "-c:v", "libx264", "-crf", "18", "-preset", "veryfast", "-pix_fmt", "yuv420p", "-movflags", "+faststart", tmp], stdin=subprocess.PIPE)
    n = int(round(TOTAL * FPS))
    for f in range(n):
        p.stdin.write(frame_at(f / FPS).tobytes())
    p.stdin.close()
    if p.wait() == 0:
        os.replace(tmp, out); print("ok", out, TOTAL)
    else:
        print("ffmpeg error")
