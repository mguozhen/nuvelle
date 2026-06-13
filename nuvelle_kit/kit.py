#!/usr/bin/env python3
"""
Nuvelle publishing kit — drop an episode mp4, get cover + teaser + caption.

  python3 kit.py EPISODE.mp4 --title "MY WIFE" --ep 1 --sub "The 1 AM Tragedy"
      [--handle @nuvelle] [--out DIR] [--cover-ts 27] [--beats 24,83,95,107]
      [--no-ai]   # skip the vision model, use evenly-spaced defaults

Outputs in <out>/: cover.jpg, teaser.mp4, caption.txt, plan.json
"""
import argparse, base64, json, os, re, subprocess, sys, urllib.request
from PIL import Image, ImageDraw, ImageFilter
import brand as B

K = os.environ.get("FLATKEY_API_KEY", "")  # set FLATKEY_API_KEY in your env (see .env.example)
FLATKEY = os.environ.get("FLATKEY_BASE", "https://router.flatkey.ai") + "/v1/chat/completions"
N_SAMPLES = 12


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True)


def probe(mp4):
    r = run(["ffprobe", "-v", "error", "-select_streams", "v:0",
             "-show_entries", "stream=width,height,r_frame_rate",
             "-show_entries", "format=duration", "-of", "json", mp4])
    j = json.loads(r.stdout)
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


def plan_with_ai(sheet, frames, meta):
    idxs = list(range(len(frames)))
    prompt = f"""You are a viral TikTok short-drama editor for the brand "Nuvelle".
This contact sheet shows {len(frames)} numbered frames (0-{len(frames)-1}) sampled in time order from a vertical short-drama episode titled "{meta['title']}".

Return STRICT JSON only (no markdown), with these keys:
- "cover_idx": the frame number that makes the BEST cover — a clear emotional face roughly in the MIDDLE of the frame (empty space above the head and below), dramatic, minimal burned-in subtitle. Prefer a wounded/crying/shocked close-ish shot.
- "beat_idxs": array of EXACTLY 4 frame numbers in increasing time order that form an escalating teaser (setup -> tension -> betrayal/shock -> climax). Pick the most dramatic, varied moments.
- "genre": 2-4 word genre (e.g. "Revenge Romance").
- "hook": array of EXACTLY 3 short ALL-CAPS lines for the cover headline; punchy, emotional, the 3rd line is the twist. No emojis.
- "logline": one short sentence (<=8 words), Title Case, no period.
- "caption": a TikTok caption for an account-warming post (goal = FOLLOWERS). 1-2 sentences, strong hook, 2-3 emojis, ends asking them to FOLLOW for the next part. No hashtags inside.
- "hashtags": array of 10-12 lowercase hashtags (strings starting with #), mixing broad (#fyp #shortdrama) and niche (theme-specific).
Frames available: {idxs}."""
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
    plan["hook"] = [str(x).upper() for x in plan["hook"]][:3]
    while len(plan["hook"]) < 3: plan["hook"].append("")
    return plan


def fallback_plan(frames, meta):
    n = len(frames)
    return {
        "cover_idx": n//3,
        "beat_idxs": sorted({int(n*0.18), int(n*0.45), int(n*0.72), int(n*0.9)}),
        "genre": meta.get("genre", "Short Drama"),
        "hook": ["SHE TRUSTED HIM.", "SHE WAS WRONG.", "NOW SHE WANTS REVENGE."],
        "logline": "Betrayed. Pregnant. Out for blood",
        "caption": f"You won't believe what he did to her. 💔 Wait for the ending… 👀 Follow for Part 2!",
        "hashtags": ["#fyp", "#foryou", "#shortdrama", "#reelshort", "#drama",
                     "#betrayal", "#revenge", "#cheating", "#storytime", "#plottwist", "#miniseries"],
    }


# ---------------------------------------------------------------- COVER
def render_cover(frame_path, plan, meta, out):
    W, H = 1080, 1920
    im = Image.open(frame_path).convert("RGB")
    sc = max(W/im.width, H/im.height)
    im = im.resize((int(im.width*sc), int(im.height*sc)), Image.LANCZOS)
    im = im.crop(((im.width-W)//2, (im.height-H)//2, (im.width-W)//2+W, (im.height-H)//2+H))
    from PIL import ImageEnhance
    im = ImageEnhance.Contrast(im).enhance(1.05); im = ImageEnhance.Color(im).enhance(1.05)
    # blur a band low on the body to kill any burned subtitle, then scrim
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
    # hook lines — auto-fit width
    lines = [l for l in plan["hook"] if l]
    MARGIN = 56; max_w = W - 2*MARGIN
    def line_w(txt, f): bb = d.textbbox((0,0), txt, font=f); return bb[2]-bb[0]
    size = 96
    while size > 40:
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
    tag = plan.get("logline", "") or f"Only on Nuvelle"
    tg = B.font(B.F_BOLD, 32); tgb = d.textbbox((0,0), tag, font=tg); tgw = tgb[2]-tgb[0]
    d.text(((W-tgw)//2, 1560), tag, font=tg, fill=(214,206,224,255))
    d.line([(W*0.34, 1620), (W*0.66, 1620)], fill=(255,95,191,180), width=2)
    d.text((W//2, 1648), "NEW DRAMAS EVERY WEEK  ·  nuvelle.ai", font=B.font(B.F_BOLD, 26), fill=(168,160,186,255), anchor="ma")
    # Ribbon-N bug bottom
    bug = B.logo_bug(300); ov.alpha_composite(bug, ((W-300)//2, 1716))
    Image.alpha_composite(im.convert("RGBA"), ov).convert("RGB").save(out, quality=92)
    return out


# ---------------------------------------------------------------- TEASER
def build_teaser(mp4, beats_ts, src_dur, outro_jpg, bug_png, out, target=30):
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
    fc, labels = [], []
    for i, (s, ln) in enumerate(segs):
        fc.append(f"[1:v]trim={s}:{s+ln},setpts=PTS-STARTPTS,scale=1080:1920,setsar=1,fps=25,format=yuv420p[v{i}];")
        fo = round(ln-0.18, 2)
        fc.append(f"[1:a]atrim={s}:{s+ln},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.08,afade=t=out:st={fo}:d=0.12[a{i}];")
        labels += [f"[v{i}]", f"[a{i}]"]
    fc.append("[0:v]scale=1080:1920,setsar=1,fps=25,format=yuv420p[ov];")
    fc.append(f"anullsrc=channel_layout=stereo:sample_rate=44100,atrim=0:{outro},asetpts=PTS-STARTPTS[oa];")
    fc.append("".join(labels)+"[ov][oa]concat=n="+str(len(segs)+1)+":v=1:a=1[vc][ac];")
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


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("mp4")
    ap.add_argument("--title", required=True)
    ap.add_argument("--ep", default="1")
    ap.add_argument("--sub", default="")
    ap.add_argument("--handle", default="@nuvelle")
    ap.add_argument("--genre", default="Short Drama")
    ap.add_argument("--out", default=None)
    ap.add_argument("--cover-ts", type=float, default=None)
    ap.add_argument("--beats", default=None, help="comma ts, e.g. 24,83,95,107")
    ap.add_argument("--no-ai", action="store_true")
    ap.add_argument("--plan", default=None, help="reuse a saved plan.json (skips AI)")
    ap.add_argument("--dur", type=int, default=13, help="teaser length in seconds (default 13; <=18 = fast 3-beat cut)")
    a = ap.parse_args()

    meta = {"title": a.title, "ep": a.ep, "sub": a.sub, "handle": a.handle, "genre": a.genre}
    slug = re.sub(r"[^a-z0-9]+", "_", a.title.lower()).strip("_") + f"_e{a.ep}"
    outdir = a.out or os.path.join(os.path.dirname(os.path.abspath(__file__)), "out", slug)
    work = os.path.join(outdir, "_work"); os.makedirs(work, exist_ok=True)

    info = probe(a.mp4); print(f"[probe] {info['w']}x{info['h']} {info['dur']:.0f}s {info['fps']:.0f}fps")
    frames = sample(a.mp4, info["dur"], work); print(f"[sample] {len(frames)} frames")
    sheet = contact_sheet(frames, os.path.join(work, "contact.jpg"))

    if a.plan:
        plan = json.load(open(a.plan)); print("[plan] reused from", a.plan)
        if a.cover_ts is None and "_cover_ts" in plan: a.cover_ts = plan["_cover_ts"]
        if a.beats is None and "_beats_ts" in plan: a.beats = ",".join(str(x) for x in plan["_beats_ts"])
    elif a.no_ai:
        plan = fallback_plan(frames, meta); print("[plan] fallback (no AI)")
    else:
        try:
            plan = plan_with_ai(sheet, frames, meta); print("[plan] AI ok ·", plan["hook"])
        except Exception as e:
            print("[plan] AI failed -> fallback:", str(e)[:140]); plan = fallback_plan(frames, meta)

    # resolve timestamps (CLI overrides win)
    cover_ts = a.cover_ts if a.cover_ts is not None else frames[plan["cover_idx"]][0]
    if a.beats:
        beats_ts = [float(x) for x in a.beats.split(",")][:4]
    else:
        beats_ts = [frames[i][0] for i in plan["beat_idxs"]]
    plan["_cover_ts"], plan["_beats_ts"] = cover_ts, beats_ts
    print(f"[ts] cover@{cover_ts}s  beats@{beats_ts}")

    # render cover from a fresh full-res grab at cover_ts
    cov_src = os.path.join(work, "cover_src.jpg"); grab(a.mp4, cover_ts, cov_src, w=1080)
    cover = render_cover(cov_src, plan, meta, os.path.join(outdir, "cover.jpg"))
    outro = render_coming_soon(cov_src, plan, meta, os.path.join(work, "outro.jpg"))
    bug = os.path.join(work, "bug.png"); B.logo_bug(430).save(bug)
    teaser = build_teaser(a.mp4, beats_ts, info["dur"], outro, bug, os.path.join(outdir, "teaser.mp4"), target=a.dur)

    tags = " ".join(plan["hashtags"])
    cap = f"{plan['caption']}\n\n{tags}\n"
    open(os.path.join(outdir, "caption.txt"), "w").write(cap)
    json.dump(plan, open(os.path.join(outdir, "plan.json"), "w"), ensure_ascii=False, indent=2)

    print("\n=== DONE ===")
    print("cover  :", cover)
    print("teaser :", teaser)
    print("caption:", os.path.join(outdir, "caption.txt"))
    print("\n--- caption ---\n"+cap)


if __name__ == "__main__":
    main()
