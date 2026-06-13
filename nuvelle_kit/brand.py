#!/usr/bin/env python3
"""Nuvelle brand kit — shared palette, Ribbon-N mark, Didot wordmark, text helpers.
Used by the cover / teaser / asset renderers in the publishing pipeline."""
from PIL import Image, ImageDraw, ImageFont, ImageFilter

# ---- feminine bright Aurora palette ----
P_TOP = (178, 92, 255)    # violet  #b25cff
P_MID = (255, 95, 191)    # hot pink #ff5fbf
P_BOT = (255, 150, 208)   # rose    #ff96d0
BG    = (11, 13, 22)      # #0b0d16
INK   = (238, 240, 248)
DIM   = (154, 162, 192)

import os
SUP = "/System/Library/Fonts/Supplemental/"
CORE = "/System/Library/Fonts/"
_FD = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fonts")  # bundled fonts (travel with cloud deploy)
def _f(name, fallback):
    p = os.path.join(_FD, name)
    return p if os.path.exists(p) else fallback
F_BLACK = _f("Arial Black.ttf", SUP + "Arial Black.ttf")
F_BOLD  = _f("Arial Bold.ttf",  SUP + "Arial Bold.ttf")
F_REG   = _f("Arial.ttf",       SUP + "Arial.ttf")
F_DIDOT = _f("Didot.ttc",       SUP + "Didot.ttc")        # drama-title serif
F_GROTESK = _f("SpaceGrotesk.ttf", os.path.join(os.path.dirname(os.path.abspath(__file__)), "SpaceGrotesk.ttf"))  # brand wordmark (locked: 方案2)


def font(path, size):
    return ImageFont.truetype(path, size)


def fit_font(text, path, max_w, start, min_s=40):
    """Largest size of `path` font where `text` fits within max_w px."""
    probe = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    for s in range(start, min_s-1, -2):
        f = ImageFont.truetype(path, s)
        bb = probe.textbbox((0, 0), text, font=f)
        if bb[2]-bb[0] <= max_w:
            return f
    return ImageFont.truetype(path, min_s)


def grotesk(size, wght=600):
    """Space Grotesk (variable) at a given weight — the locked Nuvelle wordmark font."""
    f = ImageFont.truetype(F_GROTESK, size)
    try:
        f.set_variation_by_axes([wght])
    except Exception:
        pass
    return f


def vgrad(w, h, c0, c1):
    g = Image.new("RGB", (max(1, w), max(1, h)))
    d = ImageDraw.Draw(g)
    for y in range(max(1, h)):
        t = y / max(1, h - 1)
        d.line([(0, y), (w, y)], fill=(int(c0[0]+(c1[0]-c0[0])*t),
                                       int(c0[1]+(c1[1]-c0[1])*t),
                                       int(c0[2]+(c1[2]-c0[2])*t)))
    return g


def hgrad(w, h, c0, c1):
    g = Image.new("RGB", (max(1, w), max(1, h)))
    d = ImageDraw.Draw(g)
    for x in range(max(1, w)):
        t = x / max(1, w - 1)
        d.line([(x, 0), (x, h)], fill=(int(c0[0]+(c1[0]-c0[0])*t),
                                       int(c0[1]+(c1[1]-c0[1])*t),
                                       int(c0[2]+(c1[2]-c0[2])*t)))
    return g


def _fill_poly(canvas, pts, c0, c1):
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    x0, y0, x1, y1 = int(min(xs)), int(min(ys)), int(max(xs))+1, int(max(ys))+1
    w, h = x1-x0, y1-y0
    g = vgrad(w, h, c0, c1).convert("RGBA")
    m = Image.new("L", (w, h), 0)
    ImageDraw.Draw(m).polygon([(p[0]-x0, p[1]-y0) for p in pts], fill=255)
    canvas.paste(g, (x0, y0), m)


def ribbon_n(S=260):
    """The Nuvelle Ribbon-N mark as an RGBA image (transparent bg)."""
    im = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    u = S / 72.0
    def P(x, y): return (x*u, y*u)
    _fill_poly(im, [P(16,15), P(27,15), P(27,57), P(16,57)], P_TOP, P_MID)            # left bar
    _fill_poly(im, [P(16,15), P(27,15), P(56,57), P(45,57)], P_MID, P_BOT)            # diagonal
    _fill_poly(im, [P(27,15), P(33,15), P(56,52), P(50,52)], (255,208,232), P_BOT)    # fold highlight
    _fill_poly(im, [P(45,15), P(56,15), P(56,57), P(45,57)], P_TOP, P_MID)            # right bar
    return im


def grad_text(text, fnt, c0=P_TOP, c1=P_BOT, horizontal=False):
    """Gradient-filled text tile (RGBA) + (w,h)."""
    bb = ImageDraw.Draw(Image.new("RGBA", (1, 1))).textbbox((0, 0), text, font=fnt)
    tw, th = bb[2]-bb[0], bb[3]-bb[1]
    base = (hgrad if horizontal else vgrad)(tw+4, th+4, c0, c1).convert("RGBA")
    m = Image.new("L", (tw+4, th+4), 0)
    ImageDraw.Draw(m).text((2-bb[0], 2-bb[1]), text, font=fnt, fill=255)
    out = Image.new("RGBA", (tw+4, th+4), (0, 0, 0, 0))
    return Image.composite(base, out, m), (tw, th)


def shadow_text(draw, cx, y, text, fnt, fill, anchor="ma", blur=False):
    for dx, dy in [(-3, 3), (3, 3), (0, 4)]:
        draw.text((cx+dx, y+dy), text, font=fnt, fill=(0, 0, 0, 170), anchor=anchor)
    draw.text((cx, y), text, font=fnt, fill=fill, anchor=anchor)


def bottom_scrim(W, H, top, max_a=238, power=0.62, rgb=(6, 8, 16)):
    s = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(s)
    for y in range(top, H):
        t = (y-top)/max(1, H-top)
        a = int(max_a*(t**power))
        d.line([(0, y), (W, y)], fill=(rgb[0], rgb[1], rgb[2], min(a, max_a)))
    return s


def logo_bug(width=430):
    """Horizontal Nuvelle lockup (Ribbon-N + Didot wordmark) on transparent bg."""
    h = int(width*0.21)
    im = Image.new("RGBA", (width, h), (0, 0, 0, 0))
    mk = ribbon_n(int(h*0.92))
    im.alpha_composite(mk, (0, (h-mk.height)//2))
    wm, (tw, th) = grad_text("Nuvelle", grotesk(int(h*0.55), 600), (255, 255, 255), (255, 255, 255))
    im.alpha_composite(wm, (mk.width+int(h*0.16), (h-th)//2 - int(h*0.04)))
    return im
