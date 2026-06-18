#!/usr/bin/env python3
"""
Nuvelle publishing kit — drop an episode mp4, get cover + teaser + caption.

  python3 -m nuvelle_kit.cli EPISODE.mp4 --title "MY WIFE" --ep 1 --sub "The 1 AM Tragedy"
      [--handle @nuvelle] [--out DIR] [--cover-ts 27] [--beats 24,83,95,107]
      [--no-ai]   # skip the vision model, use evenly-spaced defaults

Outputs in <out>/: cover.jpg, teaser.mp4, caption.txt, plan.json
"""
import base64, json, os, re, subprocess, urllib.request
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

from . import brand as B
from .schemas import PromoGenerationRequest, PromoGenerationResult
from .storage import default_output_dir

K = os.environ.get("FLATKEY_API_KEY", "")  # set FLATKEY_API_KEY in your env (see .env.example)
FLATKEY = os.environ.get("FLATKEY_BASE", "https://router.flatkey.ai") + "/v1/chat/completions"
N_SAMPLES = 12


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True)


def probe(mp4):
    r = run(["ffprobe", "-v", "error", "-select_streams", "v:0",
             "-show_entries", "stream=width,height,r_frame_rate",
             "-show_entries", "format=duration", "-of", "json", mp4])
    if r.returncode != 0:
        raise RuntimeError("ffprobe failed:\n" + (r.stderr or r.stdout)[-800:])
    j = json.loads(r.stdout)
    if not j.get("streams"):
        raise RuntimeError("ffprobe found no video streams")
    st = j["streams"][0]
    num, den = st["r_frame_rate"].split("/")
    return {"w": int(st["width"]), "h": int(st["height"]),
            "fps": float(num)/float(den), "dur": float(j["format"]["duration"])}


def grab(mp4, t, out, w=1080):
    run(["ffmpeg", "-nostdin", "-loglevel", "error", "-ss", f"{t}", "-i", mp4,
         "-frames:v", "1", "-vf", f"scale={w}:-1", "-q:v", "3", out, "-y"])


def sample(mp4, dur, workdir):
    """Evenly sample N frames across 6%..94%. Returns list of (ts, path)."""
    lo, hi = dur*0.06, dur*0.94
    out = []
    for i in range(N_SAMPLES):
        t = lo + (hi-lo)*i/(N_SAMPLES-1)
        p = os.path.join(workdir, f"f{i:02d}.jpg")
        grab(mp4, t, p, w=1080)
        out.append((round(t, 1), p))
    return out


def contact_sheet(frames, path):
    """Tile sampled frames 4x3 with big index numbers for the vision model."""
    cols, tw = 4, 330
    thumbs = []
    for i, (_, p) in enumerate(frames):
        im = Image.open(p).convert("RGB")
        th = int(im.height*tw/im.width)
        im = im.resize((tw, th))
        d = ImageDraw.Draw(im)
        tag = str(i)
        d.rectangle([0, 0, 78, 60], fill=(11, 13, 22))
        d.text((14, 4), tag, font=B.font(B.F_BLACK, 46), fill=(255, 110, 199))
        thumbs.append(im)
    th = max(t.height for t in thumbs)
    rows = (len(thumbs)+cols-1)//cols
    sheet = Image.new("RGB", (cols*tw+(cols+1)*8, rows*th+(rows+1)*8), (6, 8, 16))
    for i, t in enumerate(thumbs):
        r, c = divmod(i, cols)
        sheet.paste(t, (8+c*(tw+8), 8+r*(th+8)))
    sheet.save(path, quality=88)
    return path


def ai_vision(image_path, prompt, model="claude-sonnet-4-6", max_tokens=900):
    b = base64.b64encode(open(image_path, "rb").read()).decode()
    body = json.dumps({"model": model, "max_tokens": max_tokens, "messages": [
        {"role": "user", "content": [
            {"type": "text", "text": prompt},
            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b}"}}]}]}).encode()
    req = urllib.request.Request(FLATKEY, data=body,
                                 headers={"Authorization": f"Bearer {K}", "Content-Type": "application/json"})
    r = json.load(urllib.request.urlopen(req, timeout=120))
    return r["choices"][0]["message"]["content"]


def gen_poster_art(art_prompt, out):
    """Generate a cinematic vertical key-art poster via nano-banana (gemini-2.5-flash-image)."""
    prompt = ((art_prompt or "cinematic vertical movie poster").strip()
              + " Vertical 9:16 premium cinematic short-drama movie poster, photorealistic, dramatic cinematic lighting,"
              + " rich color grade, glossy magazine quality, shallow depth of field, fully clothed, tasteful."
              + " COMPOSITION: place the main subject(s) in the LOWER 60% of the frame; keep the TOP THIRD as darker,"
              + " clean negative space (sky / wall / shadow) reserved for a title overlay; faces fully visible, sharp and"
              + " UNOBSTRUCTED, not cropped, in the middle band. NO text, no letters, no title, no watermark, no logo.")
    body = json.dumps({"model": "gemini-2.5-flash-image",
                       "messages": [{"role": "user", "content": prompt}]}).encode()
    req = urllib.request.Request(FLATKEY, data=body,
                                 headers={"Authorization": f"Bearer {K}", "Content-Type": "application/json"})
    r = json.load(urllib.request.urlopen(req, timeout=220))
    msg = r["choices"][0]["message"]
    content = msg.get("content") if isinstance(msg.get("content"), str) else json.dumps(msg.get("content"))
    m = re.search(r'base64,([A-Za-z0-9+/=]+)', content or "")
    if not m and msg.get("images"):
        m = re.search(r'base64,([A-Za-z0-9+/=]+)', msg["images"][0]["image_url"]["url"])
    if not m:
        raise RuntimeError("no image returned")
    open(out, "wb").write(base64.b64decode(m.group(1)))
    return out


def check_cover(cover_path):
    """QA the finished cover: does the headline text cover a face, and is the layout clean/friendly?"""
    try:
        raw = ai_vision(cover_path,
            'You are a QA checker for a TikTok drama cover. Return STRICT JSON only: '
            '{"face_covered":bool,"friendly":bool,"note":"<short>"}. '
            'face_covered = true if the overlaid headline/title text overlaps or hides ANY person\'s face. '
            'friendly = true if the layout is clean and readable (text not clipped at edges, good contrast, balanced).',
            max_tokens=120)
        m = re.search(r"\{.*\}", raw, re.S)
        j = json.loads(m.group(0))
        return bool(j.get("face_covered")), bool(j.get("friendly", True)), str(j.get("note", ""))[:120]
    except Exception:
        return False, True, ""


def plan_with_ai(sheet, frames, meta, steer=""):
    idxs = list(range(len(frames)))
    prompt = f"""You are a viral but POLICY-COMPLIANT TikTok short-drama editor for the brand "Nuvelle".
This contact sheet shows {len(frames)} numbered frames (0-{len(frames)-1}) sampled in time order from a vertical short-drama episode titled "{meta['title']}".

⚠️ CRITICAL — TIKTOK SAFETY (overrides everything; one flagged clip = the account is banned):
Pick frames and write copy that PASS TikTok moderation. For BOTH cover_idx and beat_idxs you MUST choose only NON-SEXUAL, non-suggestive moments. STRICTLY AVOID any frame showing: kissing or making out, two people intimate in/on a bed, undressing / lingerie / towel / shirtless-intimate, nudity or partial nudity, cleavage- or body-focused framing, straddling / lying-together / sexually suggestive poses or camera angles. Instead PREFER emotional & conflict moments — crying, shock, fear, anger, a slap, a confrontation, tears, a shocking reveal (a document / phone / photo), someone storming off, a wounded face. These are both policy-safe AND more clickable.

Return STRICT JSON only (no markdown), with these keys:
- "cover_idx": best cover frame — a clear EMOTIONAL face (crying / shocked / wounded / angry) roughly centered, dramatic, minimal burned-in subtitle, and FULLY non-sexual.
- "beat_idxs": EXACTLY 4 frame numbers in increasing time order forming an escalating, NON-SEXUAL teaser (setup -> tension -> shock -> climax). Skip any suggestive frame even if it looks dramatic.
- "tt_safe": true only if you could pick a cover and 4 beats that are ALL non-sexual / TikTok-safe; false if this episode is so intimate that a safe selection was not possible.
- "tt_notes": one short note if tt_safe is false (what's risky), else "".
- "genre": 2-4 word genre (e.g. "Revenge Romance").
- "art_prompt": ONE vivid sentence describing a CINEMATIC VERTICAL MOVIE POSTER for this drama — the key character(s), setting, wardrobe, mood, dramatic film lighting, premium glossy movie-poster look (think ReelShort/Netflix key art). Fully clothed, NON-sexual. End with: "no text, no letters, no watermark."
- "hook": EXACTLY 3 short ALL-CAPS cover lines; punchy, emotional, 3rd line is the twist. No emojis, no sexual words.
- "logline": one short sentence (<=8 words), Title Case, no period.
- "caption": a TikTok caption for an account-warming post (goal = FOLLOWERS). 1-2 sentences, strong EMOTIONAL hook, 2-3 emojis, ends asking them to FOLLOW for the next part. No hashtags inside. POLICY: no sexual or suggestive enticement; never use words like spicy/steamy/hot/seductive/uncensored/18+/naughty/bed — keep it emotional and dramatic only.
- "hashtags": array of 10-12 lowercase hashtags (#fyp #shortdrama + theme). No sexual or suggestive tags.
Frames available: {idxs}."""
    if steer:
        prompt += f"\n\n🎨 REVIEWER CREATIVE DIRECTION (honor this, but NEVER break the TikTok safety rules above): {steer}"
    raw = ai_vision(sheet, prompt)
    m = re.search(r"\{.*\}", raw, re.S)
    plan = json.loads(m.group(0))
    # sanitize
    plan["cover_idx"] = int(plan["cover_idx"]) % len(frames)
    bi = [int(x) % len(frames) for x in plan["beat_idxs"]][:4]
    bi = sorted(dict.fromkeys(bi))
    while len(bi) < 4:
        cand = (bi[-1]+2) % len(frames)
        if cand not in bi: bi.append(cand)
        else: bi.append((bi[-1]+1) % len(frames))
    plan["beat_idxs"] = sorted(bi)[:4]
    plan["hook"] = [tt_clean(str(x)).upper() for x in plan["hook"]][:3]
    while len(plan["hook"]) < 3: plan["hook"].append("")
    plan.setdefault("tt_safe", True); plan.setdefault("tt_notes", "")
    plan.setdefault("art_prompt", f"Cinematic vertical movie poster for '{meta.get('title','a drama')}', dramatic film lighting, premium glossy key art")
    plan["caption"] = tt_clean(plan.get("caption", ""))
    plan["hashtags"] = [h for h in plan.get("hashtags", []) if not _BANNED.search(h)]
    plan["logline"] = tt_clean(plan.get("logline", ""))
    return plan


# TikTok content-policy guard: scrub sexual/suggestive words from any generated copy
_BANNED = re.compile(r"\b(spicy|steamy|seductive|seduce|uncensored|18\+?|nsfw|sexy|naughty|strip|lingerie|in bed|bedroom|undress|nude|nudity|sensual|thirst|horny|kinky)\b", re.I)
def tt_clean(s):
    s = _BANNED.sub("", s or "")
    return re.sub(r"\s{2,}", " ", s).strip(" ,.-")


def fallback_plan(frames, meta):
    n = len(frames)
    return {
        "cover_idx": n//3,
        "beat_idxs": sorted({int(n*0.18), int(n*0.45), int(n*0.72), int(n*0.9)}),
        "genre": meta.get("genre", "Short Drama"),
        "hook": ["SHE TRUSTED HIM.", "SHE WAS WRONG.", "NOW SHE WANTS REVENGE."],
        "logline": "Betrayed. Pregnant. Out for blood",
        "caption": "You won't believe what he did to her. 💔 Wait for the ending… 👀 Follow for Part 2!",
        "hashtags": ["#fyp", "#foryou", "#shortdrama", "#reelshort", "#drama",
                     "#betrayal", "#revenge", "#cheating", "#storytime", "#plottwist", "#miniseries"],
    }


# ---------------------------------------------------------------- COVER
def render_cover(frame_path, plan, meta, out, is_art=False, official=False):
    W, H = 1080, 1920
    im = Image.open(frame_path).convert("RGB")
    if official:
        # official covers bake their own title + "ReelShort Original" mark into the BOTTOM band.
        # Crop that band off (keep the character art); we re-brand with our own title/CTA below.
        im = im.crop((0, 0, im.width, int(im.height*0.66)))
    sc = max(W/im.width, H/im.height)
    im = im.resize((int(im.width*sc), int(im.height*sc)), Image.LANCZOS)
    im = im.crop(((im.width-W)//2, 0, (im.width-W)//2+W, H))
    from PIL import ImageEnhance
    im = ImageEnhance.Contrast(im).enhance(1.05); im = ImageEnhance.Color(im).enhance(1.05)
    if not is_art and not official:
        # frame fallback: blur a band low on the body to kill any burned subtitle
        band = (0, 1150, W, 1470)
        im.paste(im.crop(band).filter(ImageFilter.GaussianBlur(22)), band)
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ov = Image.alpha_composite(ov, B.bottom_scrim(W, H, 1130))
    # top scrim so logo + hook stay legible over bright frames
    ts = Image.new("RGBA", (W, H), (0, 0, 0, 0)); td = ImageDraw.Draw(ts)
    for y in range(0, 700):
        a = int(195*(1-y/700)**1.25)
        td.line([(0, y), (W, y)], fill=(6, 8, 16, a))
    ov = Image.alpha_composite(ov, ts)
    d = ImageDraw.Draw(ov)
    # logo bug top-left
    bug = B.logo_bug(360); ov.alpha_composite(bug, (44, 50))
    # kicker pill
    kick = f"EPISODE {meta['ep']}".upper() + (f"  ·  {meta['sub'].upper()}" if meta.get("sub") else "")
    kf = B.font(B.F_BOLD, 26); kb = d.textbbox((0,0), kick, font=kf); kw = kb[2]-kb[0]
    kx = (W-kw)//2
    d.rounded_rectangle([kx-22, 232, kx+kw+22, 286], radius=27, fill=(178,92,255,235))
    d.text((kx, 244), kick, font=kf, fill=(255,255,255,255))
    # hook lines — auto-fit width. SKIP on official covers (characters fill the frame → hook would cover faces)
    lines = [] if official else [l for l in plan["hook"] if l]
    MARGIN = 56; max_w = W - 2*MARGIN
    def line_w(txt, f): bb = d.textbbox((0,0), txt, font=f); return bb[2]-bb[0]
    size = 96
    while lines and size > 40:
        f = B.font(B.F_BLACK, size)
        if all(line_w(l, f) <= max_w for l in lines): break
        size -= 2
    f = B.font(B.F_BLACK, size); gap = int(size*1.06)
    y = 320
    for i, l in enumerate(lines):
        col = (255, 95, 191, 255) if i == len(lines)-1 and len(lines) > 1 else (255, 255, 255, 255)
        B.shadow_text(d, W//2, y, l, f, col)
        y += gap
    # bottom title (Didot, gradient, auto-fit width) + logline + chip
    tfont = B.fit_font(meta["title"], B.F_DIDOT, W-120, 150, 56)
    title, (tw, th) = B.grad_text(meta["title"], tfont, B.P_TOP, B.P_BOT)
    ov.alpha_composite(title, ((W-tw)//2, 1470+(150-th)//3))
    log = plan.get("logline", "")
    lf = B.font(B.F_BOLD, 36); lb = d.textbbox((0,0), log, font=lf); lw = lb[2]-lb[0]
    d.text(((W-lw)//2, 1664), log, font=lf, fill=(230,224,240,255))
    cta = "WATCH NOW  ·  EP " + str(meta["ep"]); cf = B.font(B.F_BLACK, 34)
    cb = d.textbbox((0,0), cta, font=cf); cw = cb[2]-cb[0]; chw = cw+128; chx=(W-chw)//2; cyc=1734
    d.rounded_rectangle([chx, cyc, chx+chw, cyc+82], radius=41, fill=(178,92,255,255))
    px = chx+44; d.polygon([(px,cyc+27),(px,cyc+55),(px+26,cyc+41)], fill=(255,255,255,255))
    d.text((chx+86, cyc+22), cta, font=cf, fill=(255,255,255,255))
    Image.alpha_composite(im.convert("RGBA"), ov).convert("RGB").save(out, quality=92)
    return out


# ---------------------------------------------------------------- OUTRO CARD
def render_outro(plan, meta, out):
    W, H = 1080, 1920
    card = Image.new("RGBA", (W, H), (11, 13, 22, 255))
    rad = Image.new("RGBA", (W, H), (0, 0, 0, 0)); rd = ImageDraw.Draw(rad)
    rd.ellipse([W*0.5-760, H*0.30-760, W*0.5+760, H*0.30+760], fill=(178,92,255,46))
    card = Image.alpha_composite(card, rad.filter(ImageFilter.GaussianBlur(50)))
    d = ImageDraw.Draw(card)
    mk = B.ribbon_n(210); card.alpha_composite(mk, ((W-210)//2, 372))
    wm, (ww, wh) = B.grad_text("Nuvelle", B.grotesk(112, 600), (255,255,255), (255,255,255))
    card.alpha_composite(wm, ((W-ww)//2, 614))
    d.text((W//2, 760), "THE HOME OF AI SHORTS", font=B.font(B.F_BOLD, 26), fill=(182,164,230,255), anchor="ma")
    d.line([(W*0.30, 826), (W*0.70, 826)], fill=(178,92,255,200), width=3)
    tt, (tw, th) = B.grad_text(meta["title"], B.fit_font(meta["title"], B.F_DIDOT, W-150, 118, 48), B.P_TOP, B.P_BOT)
    card.alpha_composite(tt, ((W-tw)//2, 876))
    epl = f"EPISODE {meta['ep']}" + (f"  ·  {meta['sub'].upper()}" if meta.get("sub") else "")
    d.text((W//2, 1030), epl, font=B.font(B.F_BOLD, 32), fill=(235,228,245,255), anchor="ma")
    d.text((W//2, 1086), plan.get("logline",""), font=B.font(B.F_BOLD, 30), fill=(154,162,192,255), anchor="ma")
    cta = "FOLLOW  FOR  EPISODE  " + str(int(meta["ep"])+1)
    cf = B.font(B.F_BLACK, 46); cb = d.textbbox((0,0), cta, font=cf); cw = cb[2]-cb[0]
    chw = cw+200; chx = (W-chw)//2; cyc = 1250; chh = 120
    chip = B.hgrad(chw, chh, B.P_TOP, B.P_MID).convert("RGBA")
    mask = Image.new("L", (chw, chh), 0); ImageDraw.Draw(mask).rounded_rectangle([0,0,chw,chh], radius=chh//2, fill=255)
    card.paste(chip, (chx, cyc), mask)
    px = chx+70; d.polygon([(px,cyc+38),(px,cyc+82),(px+38,cyc+60)], fill=(255,255,255,255))
    d.text((chx+130, cyc+chh//2), cta, font=cf, fill=(255,255,255,255), anchor="lm")
    d.text((W//2, 1440), "New AI dramas every week  ·  nuvelle.ai", font=B.font(B.F_BOLD, 30), fill=(150,158,184,255), anchor="ma")
    d.text((W//2, 1510), meta["handle"], font=B.font(B.F_BLACK, 40), fill=(199,155,255,255), anchor="ma")
    card.convert("RGB").save(out, quality=92)
    return out


# ---------------------------------------------------------------- COMING SOON POSTER CARD
def render_coming_soon(frame_path, plan, meta, out):
    """ReelShort-style book-cover end card: cinematic key-art + COMING SOON + serif title + Nuvelle EXCLUSIVE."""
    from PIL import ImageEnhance
    W, H = 1080, 1920
    im = Image.open(frame_path).convert("RGB")
    sc = max(W/im.width, H/im.height)
    im = im.resize((int(im.width*sc), int(im.height*sc)), Image.LANCZOS)
    im = im.crop(((im.width-W)//2, (im.height-H)//2, (im.width-W)//2+W, (im.height-H)//2+H))
    # cinematic grade: contrast + warm red + darken
    im = ImageEnhance.Contrast(im).enhance(1.22)
    im = ImageEnhance.Color(im).enhance(1.18)
    im = ImageEnhance.Brightness(im).enhance(0.82)
    r, g, b = im.split()
    r = r.point(lambda v: min(255, int(v*1.10)))
    im = Image.merge("RGB", (r, g, b))
    # blur the lower band where source subtitles/title text will sit, so nothing ghosts through
    band = (0, 1230, W, 1400)
    im.paste(im.crop(band).filter(ImageFilter.GaussianBlur(20)), band)
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    # vignette + top/bottom scrims
    vg = Image.new("RGBA", (W, H), (0, 0, 0, 0)); vd = ImageDraw.Draw(vg)
    for yy in range(H):
        a = int(150*max(0, (abs(yy-H/2)/(H/2))**2.2))
        vd.line([(0, yy), (W, yy)], fill=(8, 2, 6, a))
    ov = Image.alpha_composite(ov, vg)
    ov = Image.alpha_composite(ov, B.bottom_scrim(W, H, 980, max_a=232, power=0.85, rgb=(10, 3, 8)))
    ts = Image.new("RGBA", (W, H), (0, 0, 0, 0)); td2 = ImageDraw.Draw(ts)
    for yy in range(0, 520):
        td2.line([(0, yy), (W, yy)], fill=(8, 2, 6, int(180*(1-yy/520)**1.2)))
    ov = Image.alpha_composite(ov, ts)
    d = ImageDraw.Draw(ov)
    # COMING SOON (letter-spaced serif)
    cs = "C O M I N G   S O O N"
    cf = B.fit_font(cs, B.F_DIDOT, W-120, 76, 40)
    cw = d.textbbox((0,0), cs, font=cf); cx = (W-(cw[2]-cw[0]))//2
    for dx,dy in [(-2,2),(2,2),(0,3)]:
        d.text((cx+dx, 150+dy), cs, font=cf, fill=(0,0,0,160))
    d.text((cx, 150), cs, font=cf, fill=(245,240,250,255))
    # bottom: EXCLUSIVE badge + title + tagline
    badge = "● NUVELLE EXCLUSIVE"
    bf = B.font(B.F_BOLD, 28); bb = d.textbbox((0,0), badge, font=bf); bw = bb[2]-bb[0]
    bx = (W-bw)//2
    d.rounded_rectangle([bx-18, 1300, bx+bw+18, 1352], radius=26, outline=(255,95,191,230), width=2, fill=(178,92,255,40))
    d.text((bx, 1310), badge, font=bf, fill=(255,255,255,245))
    # title (serif, gradient, auto-fit)
    tfont = B.fit_font(meta["title"], B.F_DIDOT, W-110, 158, 56)
    title, (tw, th) = B.grad_text(meta["title"], tfont, (255,255,255), (255,170,210))
    ov.alpha_composite(title, ((W-tw)//2, 1378))
    # tagline
    tag = plan.get("logline", "") or "Only on Nuvelle"
    tg = B.font(B.F_BOLD, 32); tgb = d.textbbox((0,0), tag, font=tg); tgw = tgb[2]-tgb[0]
    d.text(((W-tgw)//2, 1560), tag, font=tg, fill=(214,206,224,255))
    d.line([(W*0.34, 1620), (W*0.66, 1620)], fill=(255,95,191,180), width=2)
    d.text((W//2, 1648), "NEW DRAMAS EVERY WEEK  ·  nuvelle.ai", font=B.font(B.F_BOLD, 26), fill=(168,160,186,255), anchor="ma")
    # Ribbon-N bug bottom
    bug = B.logo_bug(300); ov.alpha_composite(bug, ((W-300)//2, 1716))
    Image.alpha_composite(im.convert("RGBA"), ov).convert("RGB").save(out, quality=92)
    return out


# ---------------------------------------------------------------- TEASER
def build_teaser(mp4, beats_ts, src_dur, outro_jpg, bug_png, out, target=30, music=None):
    """Assemble a `target`-second vertical teaser: N drama beats + a brand end card.
    Short targets (<=18s, e.g. 13s) use 3 fast beats + a 2.6s card; long use 4 beats + 3.5s."""
    short = target <= 18
    outro = 2.6 if short else 3.5
    n = 3 if short else 4
    drama = max(4.0, target - outro)
    # pick N beats preserving the setup->shock->climax arc
    bts = list(beats_ts)
    if len(bts) >= n:
        chosen = [bts[0], bts[len(bts)//2], bts[-1]] if n == 3 and len(bts) >= 3 else bts[:n]
    else:
        chosen = bts
    blen = round(drama/len(chosen), 2)
    segs = [(round(max(0, min(t, src_dur-blen-0.2)), 2), blen) for t in chosen]
    # strip source watermark (ReelShort 'R' moves between corners) — delogo all four
    DL = ("delogo=x=40:y=92:w=164:h=150,delogo=x=876:y=26:w=160:h=150,"
          "delogo=x=40:y=1648:w=164:h=150,delogo=x=876:y=1644:w=160:h=150")
    # KEEP ORIGINAL AUDIO of the (safe) beats — dialogue + conflict are the hook that drives clicks.
    fc, labels = [], []
    for i, (s, ln) in enumerate(segs):
        fc.append(f"[1:v]trim={s}:{s+ln},setpts=PTS-STARTPTS,scale=1080:1920,setsar=1,{DL},fps=25,format=yuv420p[v{i}];")
        fo = round(ln-0.15, 2)
        fc.append(f"[1:a]atrim={s}:{s+ln},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.06,afade=t=out:st={fo}:d=0.1[a{i}];")
        labels += [f"[v{i}]", f"[a{i}]"]
    fc.append("[0:v]scale=1080:1920,setsar=1,fps=25,format=yuv420p[ov];")
    fc.append(f"anullsrc=channel_layout=stereo:sample_rate=44100,atrim=0:{outro},asetpts=PTS-STARTPTS[oa];")
    fc.append("".join(labels) + f"[ov][oa]concat=n={len(segs)+1}:v=1:a=1[vc][ac];")
    drama_dur = round(sum(ln for _, ln in segs), 2)
    fc.append(f"[vc][2:v]overlay=40:48:enable='lt(t,{drama_dur})'[vout]")
    fpath = out+".filter.txt"; open(fpath, "w").write("\n".join(fc))
    r = run(["ffmpeg", "-nostdin", "-loglevel", "error",
             "-loop", "1", "-t", str(outro), "-i", outro_jpg,
             "-i", mp4, "-i", bug_png,
             "-filter_complex_script", fpath,
             "-map", "[vout]", "-map", "[ac]",
             "-c:v", "libx264", "-crf", "20", "-preset", "medium", "-pix_fmt", "yuv420p", "-r", "25",
             "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", out, "-y"])
    os.remove(fpath)
    if r.returncode != 0:
        raise RuntimeError("ffmpeg teaser failed:\n"+r.stderr[-800:])
    return out


def generate_promo(request: PromoGenerationRequest) -> PromoGenerationResult:
    meta = {
        "title": request.title,
        "ep": request.episode,
        "sub": request.subtitle,
        "handle": request.handle,
        "genre": request.genre,
    }
    package_dir = Path(__file__).resolve().parent
    outdir = request.output_dir or default_output_dir(package_dir / "out", request)
    work = outdir / "_work"
    work.mkdir(parents=True, exist_ok=True)

    mp4 = os.fspath(request.mp4)
    info = probe(mp4); print(f"[probe] {info['w']}x{info['h']} {info['dur']:.0f}s {info['fps']:.0f}fps")
    frames = sample(mp4, info["dur"], work); print(f"[sample] {len(frames)} frames")
    sheet = contact_sheet(frames, os.path.join(work, "contact.jpg"))

    cover_ts_override = request.cover_ts
    beats_override = request.beats

    if request.plan_path:
        plan = json.load(open(request.plan_path)); print("[plan] reused from", request.plan_path)
        if cover_ts_override is None and "_cover_ts" in plan:
            cover_ts_override = plan["_cover_ts"]
        if beats_override is None and "_beats_ts" in plan:
            beats_override = [float(x) for x in plan["_beats_ts"]]
    elif request.no_ai:
        plan = fallback_plan(frames, meta); print("[plan] fallback (no AI)")
    else:
        try:
            plan = plan_with_ai(sheet, frames, meta, steer=request.prompt); print("[plan] AI ok ·", plan["hook"])
        except Exception as e:
            print("[plan] AI failed -> fallback:", str(e)[:140]); plan = fallback_plan(frames, meta)
    if not plan.get("tt_safe", True):
        print("⚠️ [tt-safety] intimate episode — REVIEW before posting:", plan.get("tt_notes", ""))

    # resolve timestamps (CLI overrides win)
    cover_ts = cover_ts_override if cover_ts_override is not None else frames[plan["cover_idx"]][0]
    if beats_override:
        beats_ts = beats_override[:4]
    else:
        beats_ts = [frames[i][0] for i in plan["beat_idxs"]]
    plan["_cover_ts"], plan["_beats_ts"] = cover_ts, beats_ts
    print(f"[ts] cover@{cover_ts}s  beats@{beats_ts}")

    # render cover from a fresh full-res grab at cover_ts
    cov_src = os.path.join(work, "cover_src.jpg"); grab(mp4, cover_ts, cov_src, w=1080)
    # cover = AI-generated cinematic poster (sharp, has taste); fall back to the frame if gen fails
    art_path = os.path.join(work, "art.png"); poster_ok = False
    if request.cover_image_url:
        # an official cover exists — use it directly (no need to generate)
        try:
            req = urllib.request.Request(request.cover_image_url, headers={"User-Agent": "Mozilla/5.0"})
            open(art_path, "wb").write(urllib.request.urlopen(req, timeout=40).read())
            poster_ok = True; print("[art] using provided official cover")
        except Exception as e:
            print("[art] official cover dl failed:", str(e)[:100])
    if not poster_ok and not request.no_ai:
        try:
            gen_poster_art(plan.get("art_prompt", ""), art_path); poster_ok = True; print("[art] poster generated")
        except Exception as e:
            print("[art] poster gen failed -> frame:", str(e)[:120])
    base = art_path if poster_ok else cov_src
    used_official = bool(request.cover_image_url) and poster_ok
    cover = render_cover(base, plan, meta, os.path.join(outdir, "cover.jpg"), is_art=poster_ok, official=used_official)
    # 图文完整性 QA: flag if the headline covers a face or the layout isn't clean
    plan["cover_warn"] = ""
    if not request.no_ai:
        fcov, friendly, note = check_cover(cover)
        if fcov:
            plan["cover_warn"] = "Headline may cover the subject's face — regenerate for a cleaner layout"
            print("⚠️ [cover-qa] face covered")
    outro = render_coming_soon(base, plan, meta, os.path.join(work, "outro.jpg"))
    bug = os.path.join(work, "bug.png"); B.logo_bug(430).save(bug)
    teaser = build_teaser(
        mp4,
        beats_ts,
        info["dur"],
        outro,
        bug,
        os.path.join(outdir, "teaser.mp4"),
        target=request.duration,
        music=os.fspath(request.music_path) if request.music_path else None,
    )

    tags = " ".join(plan["hashtags"])
    cap = f"{plan['caption']}\n\n{tags}\n"
    caption_path = outdir / "caption.txt"
    plan_path = outdir / "plan.json"
    open(caption_path, "w").write(cap)
    json.dump(plan, open(plan_path, "w"), ensure_ascii=False, indent=2)

    print("\n=== DONE ===")
    print("cover  :", cover)
    print("teaser :", teaser)
    print("caption:", caption_path)
    print("\n--- caption ---\n"+cap)

    return PromoGenerationResult(
        output_dir=outdir,
        cover_path=Path(cover),
        teaser_path=Path(teaser),
        caption_path=caption_path,
        plan_path=plan_path,
        caption_text=cap,
    )
