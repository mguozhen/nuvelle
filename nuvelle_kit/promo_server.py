#!/usr/bin/env python3
"""
Nuvelle promo-shorts service — local HTTP wrapper around kit.py.
The admin dashboard (admin.nuvelle.ai) calls this to generate a promo pack
(13s teaser + cover + title + caption + tags) from an uploaded video OR a video URL.

Run:  python3 promo_server.py            # listens on 127.0.0.1:8799
Expose: cloudflared tunnel --url http://localhost:8799   -> https URL for the dashboard
"""
import json, os, re, subprocess, threading, time, uuid, cgi, urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
DASH = os.path.join(os.path.dirname(HERE), "nuvelle_dash")  # serve the Scout dashboard locally
OUT = os.path.join(HERE, "out")
TMP = os.path.join(HERE, "_uploads"); os.makedirs(TMP, exist_ok=True)
JOBS = {}  # id -> {status, log, slug, files}
VOTES_FILE = os.path.join(HERE, "votes.json")
try:
    VOTES = json.load(open(VOTES_FILE))   # {drama_id(str): [{taster, verdict, tags, ts}]}
except Exception:
    VOTES = {}
_vlock = threading.Lock()
def save_votes():
    with _vlock:
        try: json.dump(VOTES, open(VOTES_FILE, "w"))
        except Exception: pass


def slugify(t):
    return re.sub(r"[^a-z0-9]+", "_", (t or "promo").lower()).strip("_") or "promo"


def run_job(job_id, src_path, title, ep, dur, beats=None, prompt=""):
    j = JOBS[job_id]
    try:
        j["status"] = "rendering"
        cmd = ["python3", os.path.join(HERE, "kit.py"), src_path,
               "--title", title, "--ep", str(ep), "--dur", str(dur)]
        if prompt:
            cmd += ["--prompt", prompt]
        if beats:
            bs = [round(float(b), 1) for b in beats if float(b) > 0.3]
            if bs:
                cmd += ["--beats", ",".join(str(b) for b in bs), "--cover-ts", str(bs[0])]
        p = subprocess.run(cmd, capture_output=True, text=True, cwd=HERE, timeout=600)
        j["log"] = (p.stdout or "")[-1500:] + (p.stderr or "")[-800:]
        slug = slugify(title) + f"_e{ep}"
        d = os.path.join(OUT, slug)
        if p.returncode == 0 and os.path.exists(os.path.join(d, "teaser.mp4")):
            cap = ""
            cp = os.path.join(d, "caption.txt")
            if os.path.exists(cp):
                cap = open(cp).read()
            tt_safe, tt_notes, cover_warn = True, "", ""
            pj = os.path.join(d, "plan.json")
            if os.path.exists(pj):
                try:
                    pl = json.load(open(pj)); tt_safe = pl.get("tt_safe", True); tt_notes = pl.get("tt_notes", ""); cover_warn = pl.get("cover_warn", "")
                except Exception: pass
            j.update(status="done", slug=slug,
                     files={"teaser": f"/file?slug={slug}&n=teaser.mp4",
                            "cover": f"/file?slug={slug}&n=cover.jpg"},
                     caption=cap, title=title, tt_safe=tt_safe, tt_notes=tt_notes, cover_warn=cover_warn)
        else:
            j["status"] = "error"
    except Exception as e:
        j["status"] = "error"; j["log"] = str(e)
    finally:
        if src_path.startswith(TMP):
            try: os.remove(src_path)
            except Exception: pass


def download_and_run(job_id, url, title, ep, dur, beats=None, prompt=""):
    """Background: download the URL then render (so /gen returns immediately)."""
    try:
        JOBS[job_id]["status"] = "downloading"
        src = fetch_url_to_mp4(url, job_id)
    except Exception as e:
        JOBS[job_id]["status"] = "error"; JOBS[job_id]["log"] = "download: " + str(e)[:300]; return
    run_job(job_id, src, title, ep, dur, beats=beats, prompt=prompt)


def fetch_url_to_mp4(url, job_id):
    """Download an m3u8/mp4 URL to a local mp4 for the pipeline."""
    dst = os.path.join(TMP, f"{job_id}.mp4")
    # -c copy works for HLS->mp4; re-mux audio for aac-in-ts
    r = subprocess.run(["ffmpeg", "-nostdin", "-loglevel", "error", "-y",
                        "-i", url, "-c", "copy", "-bsf:a", "aac_adtstoasc", dst],
                       capture_output=True, text=True, timeout=420)
    if r.returncode != 0 or not os.path.exists(dst):
        # fallback: re-encode
        r = subprocess.run(["ffmpeg", "-nostdin", "-loglevel", "error", "-y",
                            "-i", url, "-c:v", "libx264", "-crf", "23", "-preset", "veryfast",
                            "-c:a", "aac", dst], capture_output=True, text=True, timeout=600)
    if not os.path.exists(dst):
        raise RuntimeError("download failed: " + r.stderr[-300:])
    return dst


class H(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _json(self, obj, code=200):
        body = json.dumps(obj).encode()
        self.send_response(code); self._cors()
        self.send_header("Content-Type", "application/json"); self.end_headers()
        self.wfile.write(body)

    def log_message(self, *a): pass

    def do_OPTIONS(self):
        self.send_response(204); self._cors(); self.end_headers()

    def do_GET(self):
        u = urllib.parse.urlparse(self.path); q = urllib.parse.parse_qs(u.query)
        if u.path == "/health":
            return self._json({"ok": True, "service": "nuvelle-promo-shorts"})
        if u.path == "/votes":   # shared vote store for multi-reviewer dedup
            return self._json({"rated": list(VOTES.keys()), "votes": VOTES,
                               "count": sum(len(v) for v in VOTES.values())})
        if u.path == "/job":
            jid = q.get("id", [""])[0]
            return self._json(JOBS.get(jid, {"status": "unknown"}))
        if u.path == "/file":
            slug = q.get("slug", [""])[0]; n = q.get("n", [""])[0]
            fp = os.path.join(OUT, os.path.basename(slug), os.path.basename(n))
            if not os.path.exists(fp): return self._json({"error": "not found"}, 404)
            ct = "video/mp4" if n.endswith(".mp4") else "image/jpeg" if n.endswith(".jpg") else "text/plain"
            data = open(fp, "rb").read()
            self.send_response(200); self._cors()
            self.send_header("Content-Type", ct); self.send_header("Content-Length", str(len(data)))
            self.end_headers(); self.wfile.write(data); return
        # serve the Scout dashboard locally (same-origin → generate works with no tunnel)
        relp = (u.path.lstrip("/") or "index.html")
        fp = os.path.normpath(os.path.join(DASH, relp))
        if fp.startswith(DASH) and os.path.isfile(fp):
            ext = relp.rsplit(".", 1)[-1].lower()
            ct = {"html": "text/html", "json": "application/json", "js": "application/javascript",
                  "css": "text/css", "png": "image/png", "jpg": "image/jpeg", "ico": "image/x-icon"}.get(ext, "application/octet-stream")
            data = open(fp, "rb").read()
            self.send_response(200); self._cors()
            self.send_header("Content-Type", ct); self.send_header("Content-Length", str(len(data)))
            self.end_headers(); self.wfile.write(data); return
        self._json({"error": "not found"}, 404)

    def do_POST(self):
        path = urllib.parse.urlparse(self.path).path
        if path == "/vote":   # record a reviewer's rating (multi-user dedup + consensus)
            ln = int(self.headers.get("Content-Length", 0))
            try: b = json.loads(self.rfile.read(ln) or b"{}")
            except Exception: return self._json({"error": "bad json"}, 400)
            did = str(b.get("drama_id"))
            if did and did != "None":
                VOTES.setdefault(did, []).append({"taster": b.get("taster", "anon"), "verdict": b.get("verdict"),
                                                  "tags": b.get("tags", []), "ts": b.get("ts")})
                save_votes()
            return self._json({"ok": True, "rated": len(VOTES)})
        if path != "/gen":
            return self._json({"error": "not found"}, 404)
        ctype = self.headers.get("Content-Type", "")
        jid = uuid.uuid4().hex[:10]; JOBS[jid] = {"status": "queued", "log": ""}
        beats = None; prompt = ""
        try:
            if ctype.startswith("multipart/form-data"):
                form = cgi.FieldStorage(fp=self.rfile, headers=self.headers,
                                        environ={"REQUEST_METHOD": "POST", "CONTENT_TYPE": ctype})
                title = form.getvalue("title", "Promo"); ep = form.getvalue("ep", "1"); dur = form.getvalue("dur", "13"); prompt = form.getvalue("prompt", "")
                fitem = form["file"] if "file" in form else None
                if fitem is None or not fitem.file:
                    return self._json({"error": "no file"}, 400)
                src = os.path.join(TMP, f"{jid}.mp4")
                with open(src, "wb") as f: f.write(fitem.file.read())
            else:
                ln = int(self.headers.get("Content-Length", 0))
                body = json.loads(self.rfile.read(ln) or b"{}")
                title = body.get("title", "Promo"); ep = body.get("ep", 1); dur = body.get("dur", 13)
                beats = body.get("beats") or None; prompt = body.get("prompt", "")
                url = body.get("video_url", "")
                if not url: return self._json({"error": "no video_url"}, 400)
                JOBS[jid]["status"] = "downloading"
                threading.Thread(target=download_and_run, args=(jid, url, title, ep, int(dur)), kwargs={"beats": beats, "prompt": prompt}, daemon=True).start()
                return self._json({"job_id": jid})
            threading.Thread(target=run_job, args=(jid, src, title, ep, int(dur)), kwargs={"beats": beats, "prompt": prompt}, daemon=True).start()
            return self._json({"job_id": jid})
        except Exception as e:
            JOBS[jid] = {"status": "error", "log": str(e)}
            return self._json({"job_id": jid, "error": str(e)}, 500)


if __name__ == "__main__":
    port = int(os.environ.get("PORT") or os.environ.get("PROMO_PORT", "8799"))
    host = os.environ.get("HOST", "0.0.0.0")
    print(f"Nuvelle promo-shorts service on http://{host}:{port}")
    ThreadingHTTPServer((host, port), H).serve_forever()
